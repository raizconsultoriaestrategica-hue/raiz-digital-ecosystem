-- =============================================================
-- Fase 5 / Bloco C: View v_saude_plataforma
-- =============================================================
-- Objetivo:
--   Snapshot agregado do estado atual do negocio para o painel
--   /saude-plataforma. Retorna 1 row com metricas globais.
--
-- DEPENDENCIAS:
--   - clientes (status, created_at)
--   - contratos_raiz (status)
--   - pagamentos_raiz (status, data_pagamento, valor)
--   - diagnostics (created_at)
--   - diagnosticos_financeiros (created_at)
--   - v_saude_financeira_cliente (Bloco A): fonte canonica do MRR
--     por cliente (contrato prioritario ativo > renovacao_pendente).
--     Usada aqui para garantir consistencia numerica com /dashboard
--     e /financeiro-raiz (principio 4).
--
-- DECISOES:
--   1. "No mes" = mes corrente no fuso America/Sao_Paulo.
--      Boundaries calculados com (now() AT TIME ZONE 'America/Sao_Paulo').
--      Comparacoes com created_at (timestamptz) tambem convertidas para
--      SP local antes do truncamento.
--   2. Clientes ativos = clientes.status = 'projeto_ativo'.
--   3. Clientes sem contrato = ativos - clientes_com_contrato_ativo
--      (clamp >= 0).
--   4. MRR total, ticket medio e clientes_com_contrato_ativo vem de
--      v_saude_financeira_cliente (1 contrato prioritario por cliente).
--      Garantia matematica: SUM(mrr_atual) da view por cliente == MRR
--      do snapshot.
--   5. Contratos ativos e em renovacao pendente sao counts de linhas
--      de contratos_raiz (visibilidade do backlog de contratos, nao
--      do MRR efetivo). Por isso ficam em CTE separada de mrr/ticket.
--   6. Taxa de retencao = clientes_ativos / (clientes_ativos +
--      clientes_encerrados). Denominador eh o funil que ja foi
--      assinado, nao o cadastro total (que inclui leads e prospects).
--      Indicador grosso, util para alerta. Churn detalhado fica para
--      Fase 7.
--   7. Diag 360 e Diag Financeiro contados separadamente: nomenclatura
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
      date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::DATE                          AS mes_atual_inicio,
      (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') + INTERVAL '1 month')::DATE   AS mes_atual_fim
  ),
  clientes_agg AS (
    SELECT
      COUNT(*)                                             AS total_clientes,
      COUNT(*) FILTER (WHERE status = 'projeto_ativo')     AS clientes_ativos,
      COUNT(*) FILTER (WHERE status = 'encerrado')         AS clientes_encerrados,
      COUNT(*) FILTER (
        WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= (SELECT mes_atual_inicio FROM agora)
          AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE <  (SELECT mes_atual_fim    FROM agora)
      )                                                    AS novos_clientes_no_mes
    FROM public.clientes
  ),
  saude_fin_agg AS (
    -- MRR canonico vem do Bloco A: 1 contrato prioritario por cliente.
    -- SUM aqui sempre bate com o somatorio que /dashboard usa.
    SELECT
      COUNT(*) FILTER (WHERE mrr_atual > 0)                                   AS clientes_com_contrato_ativo,
      COALESCE(SUM(mrr_atual), 0)::NUMERIC(14,2)                              AS mrr_total,
      COALESCE(AVG(mrr_atual) FILTER (WHERE mrr_atual > 0), 0)::NUMERIC(12,2) AS ticket_medio_contratos
    FROM public.v_saude_financeira_cliente
  ),
  contratos_raw AS (
    -- Contagem direta de linhas em contratos_raiz para visibilidade
    -- do backlog. NAO usado para MRR (que vem de saude_fin_agg).
    SELECT
      COUNT(*) FILTER (WHERE status = 'ativo')              AS contratos_ativos,
      COUNT(*) FILTER (WHERE status = 'renovacao_pendente') AS contratos_renovacao_pendente
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
    WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= (SELECT mes_atual_inicio FROM agora)
      AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE <  (SELECT mes_atual_fim    FROM agora)
  ),
  diag_fin_agg AS (
    SELECT
      COUNT(*) AS diag_fin_no_mes
    FROM public.diagnosticos_financeiros
    WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= (SELECT mes_atual_inicio FROM agora)
      AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE <  (SELECT mes_atual_fim    FROM agora)
  )
SELECT
  (SELECT mes_atual_inicio FROM agora)                   AS mes_referencia,

  -- Clientes
  c.total_clientes,
  c.clientes_ativos,
  c.clientes_encerrados,
  c.novos_clientes_no_mes,
  GREATEST(c.clientes_ativos - sf.clientes_com_contrato_ativo, 0) AS clientes_ativos_sem_contrato,

  -- Contratos e MRR (MRR vem do Bloco A, counts vem de contratos_raw)
  sf.clientes_com_contrato_ativo,
  cr.contratos_ativos,
  cr.contratos_renovacao_pendente,
  sf.mrr_total,
  sf.ticket_medio_contratos,

  -- Pagamentos
  pa.pagamentos_atrasados,
  pa.pagamentos_pendentes,
  pa.receita_recebida_no_mes,

  -- Diagnosticos no mes
  d360.diag_360_no_mes,
  dfin.diag_fin_no_mes,

  -- Retencao: ativos / (ativos + encerrados). Exclui leads e prospects
  -- do denominador. Proxy honesto de "quem assinou continua".
  CASE
    WHEN (c.clientes_ativos + c.clientes_encerrados) > 0
      THEN ROUND(
        (c.clientes_ativos::NUMERIC / (c.clientes_ativos + c.clientes_encerrados)::NUMERIC) * 100,
        1
      )
    ELSE 0
  END AS taxa_retencao_pct

FROM clientes_agg    c
CROSS JOIN saude_fin_agg   sf
CROSS JOIN contratos_raw   cr
CROSS JOIN pagamentos_agg  pa
CROSS JOIN diag_360_agg    d360
CROSS JOIN diag_fin_agg    dfin;

GRANT SELECT ON public.v_saude_plataforma TO authenticated;

-- =============================================================
-- ROLLBACK
-- =============================================================
-- View sem dados proprios. Drop seguro.
-- DROP VIEW IF EXISTS public.v_saude_plataforma;
