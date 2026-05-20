-- =============================================================
-- Fase 5 / Bloco C: View v_saude_plataforma
-- =============================================================
-- Objetivo:
--   Snapshot agregado do estado atual do negocio para o painel
--   /saude-plataforma. Retorna 1 row com metricas globais.
--
-- DEPENDENCIAS:
--   - clientes (status, created_at)
--   - contratos_raiz (status, valor_mensal)
--   - pagamentos_raiz (status, data_pagamento, valor)
--   - diagnostics (created_at)
--   - diagnosticos_financeiros (created_at)
--
-- DECISOES:
--   1. "No mes" = no mes corrente segundo date_trunc('month', now()).
--      Sem fuso horario explicito: confia em time zone do servidor.
--   2. Clientes ativos = clientes.status = 'projeto_ativo'.
--   3. Clientes sem contrato = ativos com 0 contratos onde status='ativo'.
--   4. Taxa de retencao = clientes_ativos / total_clientes * 100.
--      Indicador grosso, util para alerta. Churn detalhado fica para Fase 7.
--   5. Diag 360 e Diag Financeiro contados separadamente: nomenclatura
--      do produto trata os dois como diagnosticos distintos.
--
-- ============= ALERTA DE SEGURANCA =============
-- WITH (security_invoker = true) garante que a view respeita as
-- RLS das tabelas subjacentes. Apenas admins veem o agregado.
-- ===============================================
-- =============================================================

CREATE OR REPLACE VIEW public.v_saude_plataforma
WITH (security_invoker = true) AS
WITH
  agora AS (
    SELECT
      date_trunc('month', now())::DATE AS mes_atual_inicio,
      (date_trunc('month', now()) + INTERVAL '1 month')::DATE AS mes_atual_fim
  ),
  clientes_agg AS (
    SELECT
      COUNT(*)                                             AS total_clientes,
      COUNT(*) FILTER (WHERE status = 'projeto_ativo')     AS clientes_ativos,
      COUNT(*) FILTER (WHERE status = 'encerrado')         AS clientes_encerrados,
      COUNT(*) FILTER (
        WHERE created_at >= (SELECT mes_atual_inicio FROM agora)
          AND created_at <  (SELECT mes_atual_fim    FROM agora)
      )                                                    AS novos_clientes_no_mes
    FROM public.clientes
  ),
  contratos_agg AS (
    SELECT
      COUNT(DISTINCT cliente_id) FILTER (WHERE status = 'ativo')           AS clientes_com_contrato_ativo,
      COALESCE(SUM(valor_mensal) FILTER (WHERE status = 'ativo'), 0)::NUMERIC(14,2) AS mrr_total,
      COALESCE(AVG(valor_mensal) FILTER (WHERE status = 'ativo'), 0)::NUMERIC(12,2) AS ticket_medio_contratos,
      COUNT(*)        FILTER (WHERE status = 'ativo')                      AS contratos_ativos,
      COUNT(*)        FILTER (WHERE status = 'renovacao_pendente')         AS contratos_renovacao_pendente
    FROM public.contratos_raiz
    WHERE cliente_id IS NOT NULL
  ),
  pagamentos_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'atrasado') AS pagamentos_atrasados,
      COUNT(*) FILTER (WHERE status = 'pendente') AS pagamentos_pendentes,
      COALESCE(SUM(valor) FILTER (
        WHERE status = 'pago'
          AND data_pagamento >= (SELECT mes_atual_inicio FROM agora)
          AND data_pagamento <  (SELECT mes_atual_fim    FROM agora)
      ), 0)::NUMERIC(14,2) AS receita_recebida_no_mes
    FROM public.pagamentos_raiz
  ),
  diag_360_agg AS (
    SELECT
      COUNT(*) AS diag_360_no_mes
    FROM public.diagnostics
    WHERE created_at >= (SELECT mes_atual_inicio FROM agora)
      AND created_at <  (SELECT mes_atual_fim    FROM agora)
  ),
  diag_fin_agg AS (
    SELECT
      COUNT(*) AS diag_fin_no_mes
    FROM public.diagnosticos_financeiros
    WHERE created_at >= (SELECT mes_atual_inicio FROM agora)
      AND created_at <  (SELECT mes_atual_fim    FROM agora)
  )
SELECT
  (SELECT mes_atual_inicio FROM agora)                   AS mes_referencia,

  -- Clientes
  c.total_clientes,
  c.clientes_ativos,
  c.clientes_encerrados,
  c.novos_clientes_no_mes,
  GREATEST(c.clientes_ativos - co.clientes_com_contrato_ativo, 0) AS clientes_ativos_sem_contrato,

  -- Contratos e MRR
  co.clientes_com_contrato_ativo,
  co.contratos_ativos,
  co.contratos_renovacao_pendente,
  co.mrr_total,
  co.ticket_medio_contratos,

  -- Pagamentos
  pa.pagamentos_atrasados,
  pa.pagamentos_pendentes,
  pa.receita_recebida_no_mes,

  -- Diagnosticos no mes
  d360.diag_360_no_mes,
  dfin.diag_fin_no_mes,

  -- Indicador grosso de retencao
  CASE
    WHEN c.total_clientes > 0
      THEN ROUND((c.clientes_ativos::NUMERIC / c.total_clientes::NUMERIC) * 100, 1)
    ELSE 0
  END AS taxa_retencao_pct

FROM clientes_agg   c
CROSS JOIN contratos_agg   co
CROSS JOIN pagamentos_agg  pa
CROSS JOIN diag_360_agg    d360
CROSS JOIN diag_fin_agg    dfin;

GRANT SELECT ON public.v_saude_plataforma TO authenticated;

-- =============================================================
-- ROLLBACK
-- =============================================================
-- View sem dados proprios. Drop seguro.
-- DROP VIEW IF EXISTS public.v_saude_plataforma;
