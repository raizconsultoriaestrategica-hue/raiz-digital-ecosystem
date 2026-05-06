-- =============================================================
-- M7 (Fase 2): Backfill de diagnostics e kpis_mensais
--              a partir de dashboard_data (modelo EAV legado)
-- =============================================================
-- Contexto:
--   Descoberta no fim do Bloco 1: a tabela `diagnostics` está vazia
--   em produção. O front nunca insere nela, apenas em dashboard_data
--   (modelo EAV em TEXT). A view v_cliente_completo (M6) consequente-
--   mente retorna NULL para ultimo_diagnostico_score.
--
--   Esta migração reconstrói os dados em formato tipado para que a
--   view e o auto-preenchimento da Fase 3 funcionem para clientes
--   já existentes (Edna, Patrick).
--
-- O que faz:
--   1) Reconstrói 1 registro em `diagnostics` para cada cliente que
--      tenha SCORE_TOTAL salvo em dashboard_data.
--   2) Reconstrói N registros em `kpis_mensais` (1 por cliente/mes)
--      para cada cliente que tenha KPIs mensais em dashboard_data.
--   3) Reprocessa o backfill de orcamentos.diagnostic_id (que rodou
--      na M4 com diagnostics vazia e ficou tudo NULL). Agora que a
--      Parte 1 populou diagnostics, o UPDATE encontra os registros.
--
-- O que NÃO faz:
--   - Não apaga nem altera dashboard_data (legado preservado).
--   - Não migra dados futuros: o front continua escrevendo só em
--     dashboard_data. O dual-write em diagnostics será adicionado
--     no Bloco 2 (patch em persistence.ts).
--
-- Convenção de total_pct:
--   Armazenado como percentual 0..100 (ex: 41.41 para 41/99). É o
--   formato que PastaDoCliente.tsx e loadFromDashboardData.ts esperam.
--   O Math.round() do front converte 41.41 para 41 na tela.
--
-- Idempotência:
--   - diagnostics: WHERE NOT EXISTS por (client_id, created_at).
--   - kpis_mensais: ON CONFLICT (cliente_id, mes_referencia) DO NOTHING
--     (UNIQUE da M2).
--
-- Marcação para rollback cirúrgico:
--   - diagnostics: client_data jsonb recebe `__backfill_m7: true`.
--   - kpis_mensais: observacoes = '__backfill_m7'.
-- =============================================================

-- ============= PARTE 1: Backfill diagnostics =============
WITH diag_pivot AS (
  SELECT
    cliente_id AS client_id,
    MAX(valor) FILTER (WHERE campo = 'SCORE_TOTAL') AS total_score_str,
    MAX(benchmark) FILTER (WHERE campo = 'SCORE_TOTAL') AS total_max_str,
    MAX(valor) FILTER (WHERE campo = 'CLASSIFICACAO') AS classif_raw,
    MAX(benchmark) FILTER (WHERE campo = 'CLASSIFICACAO') AS plano_name_raw,
    MAX(valor) FILTER (WHERE campo = 'RAMO') AS ramo_raw,
    MAX(valor) FILTER (WHERE campo = 'SCORES_JSON') AS scores_json_raw,
    MAX(valor) FILTER (WHERE campo = 'CLIENT_JSON') AS client_json_raw,
    MAX(created_at) FILTER (WHERE campo = 'SCORE_TOTAL') AS source_created_at
  FROM public.dashboard_data
  WHERE tipo = 'PILAR' AND mes = 'Diagnóstico'
  GROUP BY cliente_id
)
INSERT INTO public.diagnostics (
  client_id,
  total_score,
  total_max,
  total_pct,
  classif_label,
  plano_name,
  ramo,
  scores,
  client_data,
  created_at
)
SELECT
  dp.client_id,
  -- total_score: numérico bruto da soma dos pilares
  CASE WHEN dp.total_score_str ~ '^-?[0-9]+(\.[0-9]+)?$'
       THEN dp.total_score_str::numeric ELSE 0 END,
  -- total_max: numérico bruto do máximo possível
  CASE WHEN dp.total_max_str ~ '^-?[0-9]+(\.[0-9]+)?$'
       THEN dp.total_max_str::numeric ELSE 0 END,
  -- total_pct: percentual 0..100 (Opção A confirmada com Patrick)
  -- Para Edna (41/99): ROUND(41/99 * 100, 2) = 41.41
  -- Math.round() do front converte para 41 na tela.
  CASE
    WHEN dp.total_max_str ~ '^-?[0-9]+(\.[0-9]+)?$' AND dp.total_max_str::numeric > 0
         AND dp.total_score_str ~ '^-?[0-9]+(\.[0-9]+)?$'
    THEN ROUND(dp.total_score_str::numeric / dp.total_max_str::numeric * 100, 2)
    ELSE 0
  END,
  -- classif_label limpo: remove emoji/caracteres não-letra do início
  trim(regexp_replace(COALESCE(dp.classif_raw, ''), '^[^A-Za-z]+', '')),
  COALESCE(dp.plano_name_raw, 'Raiz de Crescimento'),
  COALESCE(dp.ramo_raw, 'dentista'),
  -- scores jsonb com fallback seguro
  COALESCE(
    CASE WHEN dp.scores_json_raw IS NOT NULL
         THEN dp.scores_json_raw::jsonb
         ELSE '{}'::jsonb END,
    '{}'::jsonb
  ),
  -- client_data recebe marcador __backfill_m7 para rollback cirúrgico
  COALESCE(
    CASE WHEN dp.client_json_raw IS NOT NULL
         THEN dp.client_json_raw::jsonb
         ELSE '{}'::jsonb END,
    '{}'::jsonb
  ) || jsonb_build_object('__backfill_m7', true),
  COALESCE(dp.source_created_at, now())
FROM diag_pivot dp
WHERE dp.total_score_str IS NOT NULL
  AND dp.total_max_str IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.diagnostics d
    WHERE d.client_id = dp.client_id
      AND d.created_at = dp.source_created_at
  );

-- ============= PARTE 2: Backfill kpis_mensais =============
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
  cliente_id,
  to_date(mes, 'MM/YYYY') AS mes_referencia,
  COALESCE(MAX(CASE
    WHEN campo = 'faturamento_bruto' AND valor ~ '^-?[0-9]+(\.[0-9]+)?$' THEN valor::numeric
    WHEN campo = 'faturamento_bruto' AND valor ~ '^-?[0-9]+,[0-9]+$' THEN replace(valor, ',', '.')::numeric
  END), 0) AS faturamento_bruto,
  COALESCE(MAX(CASE
    WHEN campo = 'ticket_medio_rs' AND valor ~ '^-?[0-9]+(\.[0-9]+)?$' THEN valor::numeric
    WHEN campo = 'ticket_medio_rs' AND valor ~ '^-?[0-9]+,[0-9]+$' THEN replace(valor, ',', '.')::numeric
  END), 0) AS ticket_medio,
  COALESCE(MAX(CASE
    WHEN campo = 'taxa_conversao' AND valor ~ '^-?[0-9]+(\.[0-9]+)?$' THEN valor::numeric
    WHEN campo = 'taxa_conversao' AND valor ~ '^-?[0-9]+,[0-9]+$' THEN replace(valor, ',', '.')::numeric
  END), 0) AS taxa_conversao,
  COALESCE(MAX(CASE
    WHEN campo = 'taxa_no_show' AND valor ~ '^-?[0-9]+(\.[0-9]+)?$' THEN valor::numeric
    WHEN campo = 'taxa_no_show' AND valor ~ '^-?[0-9]+,[0-9]+$' THEN replace(valor, ',', '.')::numeric
  END), 0) AS taxa_no_show,
  COALESCE(MAX(CASE
    WHEN campo = 'ocupacao_cadeiras' AND valor ~ '^-?[0-9]+(\.[0-9]+)?$' THEN valor::numeric
    WHEN campo = 'ocupacao_cadeiras' AND valor ~ '^-?[0-9]+,[0-9]+$' THEN replace(valor, ',', '.')::numeric
  END), 0) AS ocupacao_cadeiras,
  COALESCE(MAX(CASE
    WHEN campo = 'margem_liquida' AND valor ~ '^-?[0-9]+(\.[0-9]+)?$' THEN valor::numeric
    WHEN campo = 'margem_liquida' AND valor ~ '^-?[0-9]+,[0-9]+$' THEN replace(valor, ',', '.')::numeric
  END), 0) AS margem_liquida,
  '__backfill_m7' AS observacoes,
  COALESCE(MIN(created_at), now()) AS created_at,
  COALESCE(MAX(created_at), now()) AS updated_at
FROM public.dashboard_data
WHERE tipo = 'KPI'
  AND mes ~ '^[0-9]{2}/[0-9]{4}$'   -- só linhas com mes em formato MM/YYYY (descarta 'Inicial', 'Diagnóstico', NULL)
GROUP BY cliente_id, mes
ON CONFLICT (cliente_id, mes_referencia) DO NOTHING;

-- ============= PARTE 3: Reprocessar backfill de orcamentos.diagnostic_id =============
-- A M4 rodou o UPDATE com diagnostics vazia. Agora que a Parte 1 populou
-- diagnostics, repete a operação. Mesma heurística da M4: amarra ao
-- diagnóstico mais recente que existia ANTES do orçamento.
-- Só atualiza orçamentos que ainda estão com diagnostic_id NULL.
UPDATE public.orcamentos o
  SET diagnostic_id = (
    SELECT d.id FROM public.diagnostics d
    WHERE d.client_id = o.cliente_id
      AND d.created_at <= o.created_at
    ORDER BY d.created_at DESC
    LIMIT 1
  )
WHERE diagnostic_id IS NULL;

-- =============================================================
-- ROLLBACK (apaga apenas as linhas marcadas como __backfill_m7)
-- =============================================================
-- Verificação antes:
--   SELECT count(*) FROM public.diagnostics
--     WHERE client_data ->> '__backfill_m7' = 'true';
--   SELECT count(*) FROM public.kpis_mensais
--     WHERE observacoes = '__backfill_m7';
--
-- DELETE FROM public.diagnostics
--   WHERE client_data ->> '__backfill_m7' = 'true';
--
-- DELETE FROM public.kpis_mensais
--   WHERE observacoes = '__backfill_m7';
--
-- Para o reprocessamento da Parte 3, reverter os diagnostic_ids
-- amarrados é equivalente a rodar:
--   UPDATE public.orcamentos SET diagnostic_id = NULL
--     WHERE diagnostic_id IN (
--       SELECT id FROM public.diagnostics
--       WHERE client_data ->> '__backfill_m7' = 'true'
--     );
-- Se rodar isso ANTES do DELETE de diagnostics, mantém a integridade
-- referencial (a FK ON DELETE SET NULL também faria isso automaticamente).
--
-- ATENÇÃO: se o consultor editou observacoes de algum kpi mensal
-- depois do backfill, o rollback pula essa linha. O marcador funciona
-- enquanto não for sobrescrito.
