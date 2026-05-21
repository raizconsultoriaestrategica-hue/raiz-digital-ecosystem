-- =============================================================
-- Fase 5 / Bloco C: View v_evolucao_negocio_mensal
-- =============================================================
-- Objetivo:
--   Serie temporal mensal dos ultimos 12 meses para alimentar o
--   grafico de evolucao do negocio no painel /saude-plataforma.
--
--   Retorna 12 rows (inclusive meses sem dados, com zero) para
--   o grafico nao ficar "buracos visuais".
--
-- DEPENDENCIAS:
--   - pagamentos_raiz (data_pagamento, valor, status)
--   - diagnostics (created_at)
--   - diagnosticos_financeiros (created_at)
--   - clientes (created_at)
--
-- DECISOES:
--   1. Receita mensal vem de pagamentos_raiz com status='pago' e
--      data_pagamento no mes. Espelha o calculo ja usado em
--      /financeiro-raiz. NAO e MRR retroativo (que exigiria
--      historico de contratos, fora do escopo).
--   2. Janela = ultimos 12 meses (mes atual + 11 anteriores) no
--      fuso America/Sao_Paulo. Boundaries calculados com
--      (now() AT TIME ZONE 'America/Sao_Paulo').
--   3. generate_series gera os meses, garantindo que meses sem
--      dados aparecam com zero.
--   4. data_pagamento eh DATE (sem fuso), comparacao direta funciona.
--      created_at eh TIMESTAMPTZ, convertido para SP local antes
--      do truncamento para alinhar o corte mensal com o calendario
--      do consultor.
--
-- ============= ALERTA DE SEGURANCA =============
-- WITH (security_invoker = true). Apenas admins veem.
-- ===============================================
-- =============================================================

CREATE OR REPLACE VIEW public.v_evolucao_negocio_mensal
WITH (security_invoker = true) AS
WITH
  meses AS (
    SELECT date_trunc('month', g)::DATE AS mes
    FROM generate_series(
      date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '11 months'),
      date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')),
      INTERVAL '1 month'
    ) g
  ),
  receita_por_mes AS (
    SELECT
      date_trunc('month', data_pagamento)::DATE AS mes,
      SUM(valor)::NUMERIC(14,2)                 AS receita_mensal
    FROM public.pagamentos_raiz
    WHERE status = 'pago'
      AND data_pagamento IS NOT NULL
    GROUP BY 1
  ),
  diag_360_por_mes AS (
    SELECT
      date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS mes,
      COUNT(*)::INTEGER                                                      AS qt
    FROM public.diagnostics
    GROUP BY 1
  ),
  diag_fin_por_mes AS (
    SELECT
      date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS mes,
      COUNT(*)::INTEGER                                                      AS qt
    FROM public.diagnosticos_financeiros
    GROUP BY 1
  ),
  novos_clientes_por_mes AS (
    SELECT
      date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS mes,
      COUNT(*)::INTEGER                                                      AS qt
    FROM public.clientes
    GROUP BY 1
  )
SELECT
  m.mes,
  to_char(m.mes, 'YYYY-MM')             AS mes_label,
  COALESCE(r.receita_mensal, 0)::NUMERIC(14,2) AS receita_mensal,
  COALESCE(d360.qt, 0)                  AS diag_360_criados,
  COALESCE(dfin.qt, 0)                  AS diag_fin_criados,
  COALESCE(nc.qt, 0)                    AS novos_clientes
FROM meses m
LEFT JOIN receita_por_mes        r    ON r.mes    = m.mes
LEFT JOIN diag_360_por_mes       d360 ON d360.mes = m.mes
LEFT JOIN diag_fin_por_mes       dfin ON dfin.mes = m.mes
LEFT JOIN novos_clientes_por_mes nc   ON nc.mes   = m.mes
ORDER BY m.mes;

GRANT SELECT ON public.v_evolucao_negocio_mensal TO authenticated;

-- =============================================================
-- ROLLBACK
-- =============================================================
-- View sem dados proprios. Drop seguro.
-- DROP VIEW IF EXISTS public.v_evolucao_negocio_mensal;
