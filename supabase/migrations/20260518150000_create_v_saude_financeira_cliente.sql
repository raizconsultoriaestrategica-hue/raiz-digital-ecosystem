-- =============================================================
-- Fase 5: View v_saude_financeira_cliente (unificação financeira)
-- =============================================================
-- Objetivo:
--   Consolidar a saúde financeira de cada cliente em uma única
--   view, agregando contratos, pagamentos, KPIs mensais, custos
--   da clínica e o último diagnóstico financeiro.
--
--   Atende o indicador de sucesso #1 do HANDOFF (MRR e Ticket
--   Médio do painel admin batem com a soma real dos contratos)
--   e o princípio #4 (consistência numérica acima de tudo).
--
-- DEPENDÊNCIAS:
--   - clientes (com colunas M1: especialidade_clinica, ramo, ...)
--   - kpis_mensais (M2)
--   - custos_clinica (M3)
--   - contratos_raiz, pagamentos_raiz (Fase 0/1)
--   - diagnosticos_financeiros (Fase 0/1)
--
-- DECISÕES:
--   1. MRR vem de contratos_raiz.valor_mensal do contrato com
--      maior prioridade (ativo > renovacao_pendente > resto), mais
--      recente por data_inicio. clientes.valor_mensalidade é
--      exposto em paralelo como `valor_mensalidade_cadastro` para
--      o admin detectar divergências entre cadastro e contrato.
--   2. Média móvel: últimos 3 meses de kpis_mensais via window
--      function. Se o cliente tem menos de 3 meses preenchidos,
--      `meses_preenchidos_3m` reflete o número real.
--   3. Custos: SUM por tipo (fixo, variavel) com `ativo = true`.
--      Histórico (ativo = false) é ignorado na agregação atual.
--   4. Pagamentos: agregados por contrato.cliente_id (não por
--      pagamento.cliente_id, que não existe).
--   5. Diagnóstico financeiro: apenas referência ao último, sem
--      expandir indicadores JSONB. Telas que precisarem dos
--      indicadores fazem JOIN explícito.
--
-- ============= ALERTA DE SEGURANÇA =============
-- WITH (security_invoker = true) garante que a view respeita
-- as RLS das tabelas underlying:
--   - Admin: vê tudo (RLS ALL nas 5 tabelas)
--   - Cliente: vê só a própria linha (RLS de clientes filtra
--     por user_id = auth.uid())
--   - Não autenticado: nada
-- ===============================================
-- =============================================================

-- Índices de apoio (idempotentes)
CREATE INDEX IF NOT EXISTS idx_contratos_raiz_cliente_status
  ON public.contratos_raiz (cliente_id, status, data_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_pagamentos_raiz_contrato_status
  ON public.pagamentos_raiz (contrato_id, status);

CREATE INDEX IF NOT EXISTS idx_diag_financeiros_cliente_created
  ON public.diagnosticos_financeiros (cliente_id, created_at DESC);

-- View canônica de saúde financeira por cliente
CREATE OR REPLACE VIEW public.v_saude_financeira_cliente
WITH (security_invoker = true) AS
WITH
  -- Último KPI mensal por cliente
  ultimo_kpi AS (
    SELECT DISTINCT ON (cliente_id)
      cliente_id,
      mes_referencia,
      faturamento_bruto,
      ticket_medio,
      taxa_conversao,
      margem_liquida,
      taxa_inadimplencia,
      investimento_marketing
    FROM public.kpis_mensais
    ORDER BY cliente_id, mes_referencia DESC
  ),
  -- Média móvel últimos 3 meses por cliente
  kpis_3m AS (
    SELECT
      cliente_id,
      AVG(faturamento_bruto)::NUMERIC(14,2) AS faturamento_medio_3m,
      AVG(ticket_medio)::NUMERIC(12,2)     AS ticket_medio_3m,
      AVG(margem_liquida)::NUMERIC(5,2)    AS margem_liquida_3m,
      COUNT(*)                              AS meses_preenchidos_3m
    FROM (
      SELECT
        cliente_id,
        faturamento_bruto,
        ticket_medio,
        margem_liquida,
        ROW_NUMBER() OVER (
          PARTITION BY cliente_id
          ORDER BY mes_referencia DESC
        ) AS rn
      FROM public.kpis_mensais
    ) t
    WHERE rn <= 3
    GROUP BY cliente_id
  ),
  -- Custos agregados (apenas ativos)
  custos_agg AS (
    SELECT
      cliente_id,
      COALESCE(SUM(valor) FILTER (WHERE tipo = 'fixo'),     0)::NUMERIC(12,2) AS custo_fixo_total,
      COALESCE(SUM(valor) FILTER (WHERE tipo = 'variavel'), 0)::NUMERIC(12,2) AS custo_variavel_total
    FROM public.custos_clinica
    WHERE ativo = TRUE
    GROUP BY cliente_id
  ),
  -- Contrato prioritário: ativo > renovacao_pendente > demais,
  -- desempate por data_inicio mais recente
  contrato_prioritario AS (
    SELECT DISTINCT ON (cliente_id)
      cliente_id,
      id            AS contrato_id,
      plano         AS contrato_plano,
      valor_mensal  AS mrr_atual,
      status        AS contrato_status,
      data_inicio   AS contrato_data_inicio,
      data_fim      AS contrato_data_fim
    FROM public.contratos_raiz
    WHERE cliente_id IS NOT NULL
    ORDER BY
      cliente_id,
      CASE status
        WHEN 'ativo'                THEN 1
        WHEN 'renovacao_pendente'   THEN 2
        ELSE 3
      END,
      data_inicio DESC
  ),
  -- Pagamentos agregados pelo cliente do contrato
  pagamentos_agg AS (
    SELECT
      c.cliente_id,
      COUNT(*) FILTER (WHERE p.status = 'atrasado') AS pagamentos_atrasados,
      COUNT(*) FILTER (WHERE p.status = 'pendente') AS pagamentos_pendentes,
      COUNT(*) FILTER (WHERE p.status = 'pago')     AS pagamentos_quitados,
      MAX(p.data_pagamento)                          AS ultimo_pagamento_data,
      COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'pago'), 0)::NUMERIC(14,2) AS total_pago
    FROM public.pagamentos_raiz p
    JOIN public.contratos_raiz c ON c.id = p.contrato_id
    WHERE c.cliente_id IS NOT NULL
    GROUP BY c.cliente_id
  ),
  -- Último diagnóstico financeiro
  diag_fin AS (
    SELECT DISTINCT ON (cliente_id)
      cliente_id,
      id          AS diagnostico_financeiro_id,
      created_at  AS diagnostico_financeiro_data
    FROM public.diagnosticos_financeiros
    WHERE cliente_id IS NOT NULL
    ORDER BY cliente_id, created_at DESC
  )
SELECT
  -- Identificação
  cl.id                       AS cliente_id,
  cl.nome_cliente,
  cl.nome_clinica,
  cl.cidade,
  cl.ramo,
  cl.especialidade_clinica,
  cl.status                   AS cliente_status,

  -- MRR e contrato
  COALESCE(cp.mrr_atual, 0)   AS mrr_atual,
  cp.contrato_id,
  cp.contrato_plano,
  cp.contrato_status,
  cp.contrato_data_inicio,
  cp.contrato_data_fim,
  cl.valor_mensalidade        AS valor_mensalidade_cadastro,
  (cp.mrr_atual IS DISTINCT FROM cl.valor_mensalidade)
                              AS mrr_diverge_cadastro,

  -- Último KPI mensal (cliente)
  uk.mes_referencia           AS ultimo_kpi_mes,
  uk.faturamento_bruto        AS ultimo_faturamento,
  uk.ticket_medio             AS ultimo_ticket_medio,
  uk.margem_liquida           AS ultima_margem_liquida,
  uk.taxa_conversao           AS ultima_taxa_conversao,
  uk.taxa_inadimplencia       AS ultima_taxa_inadimplencia,
  uk.investimento_marketing   AS ultimo_investimento_marketing,

  -- Média móvel 3 meses
  k3.faturamento_medio_3m,
  k3.ticket_medio_3m,
  k3.margem_liquida_3m,
  COALESCE(k3.meses_preenchidos_3m, 0) AS meses_preenchidos_3m,

  -- Custos do cliente
  COALESCE(cu.custo_fixo_total, 0)                              AS custo_fixo_total,
  COALESCE(cu.custo_variavel_total, 0)                          AS custo_variavel_total,
  (COALESCE(cu.custo_fixo_total, 0) + COALESCE(cu.custo_variavel_total, 0))::NUMERIC(12,2)
                                                                AS custo_total,

  -- Pagamentos Raiz (recebíveis da consultoria por este cliente)
  COALESCE(pa.pagamentos_atrasados, 0) AS pagamentos_atrasados,
  COALESCE(pa.pagamentos_pendentes, 0) AS pagamentos_pendentes,
  COALESCE(pa.pagamentos_quitados, 0)  AS pagamentos_quitados,
  COALESCE(pa.total_pago, 0)           AS total_pago,
  pa.ultimo_pagamento_data,

  -- Diagnóstico financeiro (referência)
  df.diagnostico_financeiro_id,
  df.diagnostico_financeiro_data,

  -- Flags
  (uk.cliente_id IS NOT NULL) AS tem_kpis_mensais,
  (df.cliente_id IS NOT NULL) AS tem_diagnostico_financeiro,
  (cp.cliente_id IS NOT NULL) AS tem_contrato

FROM public.clientes cl
LEFT JOIN ultimo_kpi          uk ON uk.cliente_id = cl.id
LEFT JOIN kpis_3m             k3 ON k3.cliente_id = cl.id
LEFT JOIN custos_agg          cu ON cu.cliente_id = cl.id
LEFT JOIN contrato_prioritario cp ON cp.cliente_id = cl.id
LEFT JOIN pagamentos_agg      pa ON pa.cliente_id = cl.id
LEFT JOIN diag_fin            df ON df.cliente_id = cl.id;

-- GRANT explícito (documenta intent, não confia no default)
GRANT SELECT ON public.v_saude_financeira_cliente TO authenticated;

-- =============================================================
-- ROLLBACK (sem perda de dados, view não tem dados próprios)
-- =============================================================
-- DROP VIEW IF EXISTS public.v_saude_financeira_cliente;
-- DROP INDEX IF EXISTS public.idx_diag_financeiros_cliente_created;
-- DROP INDEX IF EXISTS public.idx_pagamentos_raiz_contrato_status;
-- DROP INDEX IF EXISTS public.idx_contratos_raiz_cliente_status;
