-- =============================================================
-- M7-FIX (Fase 2): Correção do backfill de diagnostics e kpis_mensais
-- =============================================================
-- Contexto:
--   A migration M7 (20260506100000) rodou com 0 rows afetadas em produção
--   porque referenciava nomes de coluna inexistentes no dashboard_data
--   (categoria, chave). Os nomes reais do schema EAV são: tipo, campo.
--
--   Esta migration reexecuta o backfill com os nomes corretos e com a
--   lógica refinada após inspeção dos 16 rows reais (Edna e PATRICK):
--     - Edna não tem SCORE_TOTAL nas PILARs => fallback SUM(p01..p07)
--     - PATRICK não tem p07 => COALESCE(p07, 0)
--     - total_max sempre = 99 (fixo, 7 pilares de 0..14, max efetivo 99)
--     - plano_name vem da tabela clientes via JOIN
--     - valores numéricos em formato brasileiro (60.000,00)
--
-- Sem DROP, DELETE, ou ALTER destrutivo. Apenas:
--   - INSERT ... WHERE NOT EXISTS em diagnostics (idempotente)
--   - INSERT ... ON CONFLICT em kpis_mensais (idempotente)
--   - UPDATE de orcamentos.diagnostic_id ainda nulos
--   - ADD CONSTRAINT UNIQUE em kpis_mensais se não existir (estrutura)
-- =============================================================


-- ============= PRÉ-REQ: garantir UNIQUE em kpis_mensais =============
-- Necessário para o ON CONFLICT da PARTE 2. PostgreSQL não suporta
-- ADD CONSTRAINT IF NOT EXISTS, então usamos DO block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kpis_mensais_cliente_id_mes_referencia_key'
  ) THEN
    ALTER TABLE public.kpis_mensais
      ADD CONSTRAINT kpis_mensais_cliente_id_mes_referencia_key
      UNIQUE (cliente_id, mes_referencia);
  END IF;
END $$;


-- ============= PARTE 1: Popular diagnostics =============
-- Fonte: dashboard_data WHERE tipo = 'PILAR' AND mes = 'Diagnóstico'
-- Pivot EAV agregando 1 row por cliente_id.
WITH diag_pivot AS (
  SELECT
    dd.cliente_id AS client_id,
    MAX(CASE WHEN dd.campo = 'RAMO'         THEN dd.valor END) AS ramo_raw,
    MAX(CASE WHEN dd.campo = 'SCORE_TOTAL'  THEN dd.valor END) AS score_total_raw,
    MAX(CASE WHEN dd.campo = 'CLASSIFICACAO'THEN dd.valor END) AS classif_raw,
    MAX(CASE WHEN dd.campo = 'SCORES_JSON'  THEN dd.valor END) AS scores_json_raw,
    MAX(CASE WHEN dd.campo = 'CLIENT_JSON'  THEN dd.valor END) AS client_json_raw,
    -- pilares individuais (numéricos), com NULL quando ausentes
    MAX(CASE WHEN dd.campo = 'p01' AND dd.valor ~ '^[0-9]+$' THEN dd.valor::int END) AS p01,
    MAX(CASE WHEN dd.campo = 'p02' AND dd.valor ~ '^[0-9]+$' THEN dd.valor::int END) AS p02,
    MAX(CASE WHEN dd.campo = 'p03' AND dd.valor ~ '^[0-9]+$' THEN dd.valor::int END) AS p03,
    MAX(CASE WHEN dd.campo = 'p04' AND dd.valor ~ '^[0-9]+$' THEN dd.valor::int END) AS p04,
    MAX(CASE WHEN dd.campo = 'p05' AND dd.valor ~ '^[0-9]+$' THEN dd.valor::int END) AS p05,
    MAX(CASE WHEN dd.campo = 'p06' AND dd.valor ~ '^[0-9]+$' THEN dd.valor::int END) AS p06,
    MAX(CASE WHEN dd.campo = 'p07' AND dd.valor ~ '^[0-9]+$' THEN dd.valor::int END) AS p07,
    MIN(dd.created_at) AS source_created_at
  FROM public.dashboard_data dd
  WHERE dd.tipo = 'PILAR' AND dd.mes = 'Diagnóstico'
  GROUP BY dd.cliente_id
),
diag_resolved AS (
  SELECT
    dp.client_id,
    COALESCE(NULLIF(dp.ramo_raw, ''), 'dentista') AS ramo,
    -- total_score: usa SCORE_TOTAL se válido, senão SUM dos pilares com COALESCE
    CASE
      WHEN dp.score_total_raw ~ '^[0-9]+$'
        THEN dp.score_total_raw::int
      ELSE
        COALESCE(dp.p01, 0) + COALESCE(dp.p02, 0) + COALESCE(dp.p03, 0)
        + COALESCE(dp.p04, 0) + COALESCE(dp.p05, 0) + COALESCE(dp.p06, 0)
        + COALESCE(dp.p07, 0)
    END AS total_score,
    dp.classif_raw,
    dp.scores_json_raw,
    dp.client_json_raw,
    dp.p01, dp.p02, dp.p03, dp.p04, dp.p05, dp.p06, dp.p07,
    dp.source_created_at
  FROM diag_pivot dp
)
INSERT INTO public.diagnostics (
  client_id,
  ramo,
  total_score,
  total_max,
  total_pct,
  classif_label,
  plano_name,
  scores,
  client_data,
  created_at
)
SELECT
  dr.client_id,
  dr.ramo,
  dr.total_score,
  99 AS total_max,
  ROUND(dr.total_score::numeric / 99.0 * 100, 2) AS total_pct,
  COALESCE(NULLIF(dr.classif_raw, ''), 'Sem Classificação') AS classif_label,
  COALESCE(c.plano, 'Raiz de Crescimento') AS plano_name,
  -- scores: SCORES_JSON quando existir e for jsonb válido; senão monta do EAV
  CASE
    WHEN dr.scores_json_raw IS NOT NULL AND dr.scores_json_raw <> ''
      THEN dr.scores_json_raw::jsonb
    ELSE jsonb_build_object(
      'p01', COALESCE(dr.p01, 0),
      'p02', COALESCE(dr.p02, 0),
      'p03', COALESCE(dr.p03, 0),
      'p04', COALESCE(dr.p04, 0),
      'p05', COALESCE(dr.p05, 0),
      'p06', COALESCE(dr.p06, 0),
      'p07', COALESCE(dr.p07, 0)
    )
  END AS scores,
  CASE
    WHEN dr.client_json_raw IS NOT NULL AND dr.client_json_raw <> ''
      THEN dr.client_json_raw::jsonb
    ELSE '{}'::jsonb
  END AS client_data,
  COALESCE(dr.source_created_at, now()) AS created_at
FROM diag_resolved dr
LEFT JOIN public.clientes c ON c.id = dr.client_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.diagnostics d
  WHERE d.client_id = dr.client_id
);


-- ============= PARTE 2: Popular kpis_mensais =============
-- Fonte: dashboard_data WHERE tipo = 'KPI' AND mes ~ '^\d{2}/\d{4}$'
-- Pivot EAV por (cliente_id, mes). Conversão BR-aware:
--   '60.000,00' -> 60000.00 ; 'não sei' -> NULL.
INSERT INTO public.kpis_mensais (
  cliente_id,
  mes_referencia,
  faturamento_bruto,
  ticket_medio,
  taxa_conversao,
  taxa_no_show,
  ocupacao_cadeiras,
  margem_liquida,
  observacoes,
  created_at,
  updated_at
)
SELECT
  dd.cliente_id,
  TO_DATE('01/' || dd.mes, 'DD/MM/YYYY') AS mes_referencia,
  MAX(CASE
    WHEN dd.campo = 'faturamento_bruto' AND dd.valor ~ '^[0-9]'
      THEN REPLACE(REPLACE(dd.valor, '.', ''), ',', '.')::numeric
  END) AS faturamento_bruto,
  MAX(CASE
    WHEN dd.campo = 'ticket_medio_rs' AND dd.valor ~ '^[0-9]'
      THEN REPLACE(REPLACE(dd.valor, '.', ''), ',', '.')::numeric
  END) AS ticket_medio,
  MAX(CASE
    WHEN dd.campo = 'taxa_conversao' AND dd.valor ~ '^[0-9]'
      THEN REPLACE(REPLACE(dd.valor, '.', ''), ',', '.')::numeric
  END) AS taxa_conversao,
  MAX(CASE
    WHEN dd.campo = 'taxa_no_show' AND dd.valor ~ '^[0-9]'
      THEN REPLACE(REPLACE(dd.valor, '.', ''), ',', '.')::numeric
  END) AS taxa_no_show,
  MAX(CASE
    WHEN dd.campo = 'ocupacao_cadeiras' AND dd.valor ~ '^[0-9]'
      THEN REPLACE(REPLACE(dd.valor, '.', ''), ',', '.')::numeric
  END) AS ocupacao_cadeiras,
  MAX(CASE
    WHEN dd.campo = 'margem_liquida' AND dd.valor ~ '^[0-9]'
      THEN REPLACE(REPLACE(dd.valor, '.', ''), ',', '.')::numeric
  END) AS margem_liquida,
  '__backfill_m7_fix' AS observacoes,
  COALESCE(MIN(dd.created_at), now()) AS created_at,
  COALESCE(MAX(dd.created_at), now()) AS updated_at
FROM public.dashboard_data dd
WHERE dd.tipo = 'KPI'
  AND dd.mes ~ '^[0-9]{2}/[0-9]{4}$'
GROUP BY dd.cliente_id, dd.mes
ON CONFLICT (cliente_id, mes_referencia) DO NOTHING;


-- ============= PARTE 3: Vincular orcamentos.diagnostic_id =============
-- Agora que diagnostics está populada, amarra orçamentos órfãos ao
-- diagnóstico do cliente. Só atualiza linhas com diagnostic_id NULL.
UPDATE public.orcamentos o
SET diagnostic_id = d.id
FROM public.diagnostics d
WHERE d.client_id = o.cliente_id
  AND o.diagnostic_id IS NULL;
