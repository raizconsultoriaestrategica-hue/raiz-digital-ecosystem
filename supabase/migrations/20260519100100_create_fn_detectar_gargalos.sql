-- =============================================================
-- Fase 5 / Bloco B (B2): Função detectar_gargalos
-- =============================================================
-- Objetivo:
--   Cruza kpis_mensais do cliente em um mês específico com a tabela
--   benchmarks_kpis (B1) e retorna um conjunto de "gargalos" com
--   status (abaixo/dentro/acima da faixa) e severidade (critico/
--   atencao/ok) interpretada via polaridade do KPI.
--
-- Assinatura:
--   detectar_gargalos(p_cliente_id UUID, p_mes DATE)
--   RETURNS TABLE (...)
--
-- Decisões:
--   1. Join entre kpis_mensais e benchmarks_kpis NÃO pode ser feito
--      por nome de coluna dinâmico em PL/pgSQL puro sem SQL dinâmico.
--      Usamos VALUES (...) para desnormalizar o ROW do cliente em
--      pares (kpi_nome, valor). Quando um novo KPI for adicionado em
--      benchmarks_kpis, basta acrescentar uma linha aqui também.
--   2. Severidade interpreta `polaridade`:
--        positivo: abaixo do min é ruim (atenção, ou crítico se <75% do min)
--        negativo: acima do max é ruim (atenção, ou crítico se >150% do max)
--        banda   : fora da faixa é atenção; crítico se distante >25%
--   3. SECURITY INVOKER (default): respeita RLS de kpis_mensais
--      (admin lê tudo, cliente lê só os próprios). benchmarks_kpis
--      tem leitura aberta para authenticated.
--   4. STABLE: sem efeito colateral, mesmo input = mesmo output
--      dentro da transação. Permite otimizações do planner.
--   5. Ordenação prioriza gargalos onde o cliente está pior:
--      polaridade vs status, depois pilar e kpi.
-- =============================================================

CREATE OR REPLACE FUNCTION public.detectar_gargalos(
  p_cliente_id UUID,
  p_mes DATE
)
RETURNS TABLE (
  kpi TEXT,
  pilar TEXT,
  unidade TEXT,
  polaridade TEXT,
  valor_atual NUMERIC,
  benchmark_min NUMERIC,
  benchmark_max NUMERIC,
  status TEXT,
  severidade TEXT,
  descricao TEXT,
  fonte TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_especialidade TEXT;
  v_row public.kpis_mensais%ROWTYPE;
BEGIN
  -- 1) Especialidade-alvo dos benchmarks vem do ramo do cliente.
  --    Hoje os clientes em produção têm ramo IN ('odontologia',
  --    'medicina', 'estetica', 'outros'). Match direto com
  --    benchmarks_kpis.especialidade.
  SELECT c.ramo INTO v_especialidade
  FROM public.clientes c
  WHERE c.id = p_cliente_id;

  IF v_especialidade IS NULL THEN
    RETURN;
  END IF;

  -- 2) Carrega KPIs do mês solicitado (linha única graças à UNIQUE
  --    em (cliente_id, mes_referencia)).
  SELECT * INTO v_row
  FROM public.kpis_mensais k
  WHERE k.cliente_id = p_cliente_id
    AND k.mes_referencia = p_mes
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 3) Desnormaliza o ROW em pares (kpi_nome, valor) e cruza com
  --    benchmarks_kpis da especialidade do cliente.
  RETURN QUERY
  WITH valores(v_kpi, v_valor) AS (
    VALUES
      ('taxa_conversao'::text,     v_row.taxa_conversao::numeric),
      ('taxa_inadimplencia'::text, v_row.taxa_inadimplencia::numeric),
      ('taxa_no_show'::text,       v_row.taxa_no_show::numeric),
      ('ocupacao_cadeiras'::text,  v_row.ocupacao_cadeiras::numeric),
      ('margem_liquida'::text,     v_row.margem_liquida::numeric),
      ('ticket_medio'::text,       v_row.ticket_medio::numeric)
  ),
  comparado AS (
    SELECT
      b.kpi          AS c_kpi,
      b.pilar        AS c_pilar,
      b.unidade      AS c_unidade,
      b.polaridade   AS c_polaridade,
      v.v_valor      AS c_valor,
      b.min          AS c_min,
      b.max          AS c_max,
      b.descricao    AS c_descricao,
      b.fonte        AS c_fonte,
      CASE
        WHEN v.v_valor < b.min THEN 'abaixo'
        WHEN v.v_valor > b.max THEN 'acima'
        ELSE 'dentro'
      END AS c_status
    FROM public.benchmarks_kpis b
    JOIN valores v ON v.v_kpi = b.kpi
    WHERE b.especialidade = v_especialidade
  )
  SELECT
    c.c_kpi          AS kpi,
    c.c_pilar        AS pilar,
    c.c_unidade      AS unidade,
    c.c_polaridade   AS polaridade,
    c.c_valor        AS valor_atual,
    c.c_min          AS benchmark_min,
    c.c_max          AS benchmark_max,
    c.c_status       AS status,
    CASE
      -- Polaridade positiva (alto = bom): só abaixo do min é ruim.
      WHEN c.c_polaridade = 'positivo' AND c.c_status = 'abaixo'
           AND c.c_valor < c.c_min * 0.75 THEN 'critico'
      WHEN c.c_polaridade = 'positivo' AND c.c_status = 'abaixo' THEN 'atencao'
      WHEN c.c_polaridade = 'positivo'                          THEN 'ok'

      -- Polaridade negativa (baixo = bom): só acima do max é ruim.
      WHEN c.c_polaridade = 'negativo' AND c.c_status = 'acima'
           AND c.c_valor > c.c_max * 1.5  THEN 'critico'
      WHEN c.c_polaridade = 'negativo' AND c.c_status = 'acima' THEN 'atencao'
      WHEN c.c_polaridade = 'negativo'                          THEN 'ok'

      -- Polaridade banda: fora da faixa é problema dos dois lados.
      WHEN c.c_polaridade = 'banda' AND c.c_status = 'dentro' THEN 'ok'
      WHEN c.c_polaridade = 'banda' AND c.c_status = 'abaixo'
           AND c.c_valor < c.c_min * 0.75 THEN 'critico'
      WHEN c.c_polaridade = 'banda' AND c.c_status = 'abaixo' THEN 'atencao'
      WHEN c.c_polaridade = 'banda' AND c.c_status = 'acima'
           AND c.c_valor > c.c_max * 1.25 THEN 'critico'
      WHEN c.c_polaridade = 'banda' AND c.c_status = 'acima'  THEN 'atencao'

      ELSE 'ok'
    END AS severidade,
    c.c_descricao    AS descricao,
    c.c_fonte        AS fonte
  FROM comparado c
  ORDER BY
    -- 1: críticos primeiro; 2: atenção; 3: ok
    CASE
      WHEN c.c_polaridade = 'positivo' AND c.c_status = 'abaixo' AND c.c_valor < c.c_min * 0.75 THEN 1
      WHEN c.c_polaridade = 'negativo' AND c.c_status = 'acima'  AND c.c_valor > c.c_max * 1.5  THEN 1
      WHEN c.c_polaridade = 'banda'    AND c.c_status = 'abaixo' AND c.c_valor < c.c_min * 0.75 THEN 1
      WHEN c.c_polaridade = 'banda'    AND c.c_status = 'acima'  AND c.c_valor > c.c_max * 1.25 THEN 1
      WHEN c.c_polaridade IN ('positivo','negativo','banda') AND c.c_status <> 'dentro'
           AND NOT (c.c_polaridade = 'positivo' AND c.c_status = 'acima')
           AND NOT (c.c_polaridade = 'negativo' AND c.c_status = 'abaixo')
           THEN 2
      ELSE 3
    END,
    c.c_pilar,
    c.c_kpi;
END;
$$;

COMMENT ON FUNCTION public.detectar_gargalos(UUID, DATE) IS
  'Cruza kpis_mensais do cliente com benchmarks_kpis (via ramo) e retorna gargalos com status e severidade. Vazio se o cliente não tem dados no mês.';

-- Permissões: authenticated (admin e cliente) pode executar.
-- RLS de kpis_mensais já filtra naturalmente os dados visíveis.
GRANT EXECUTE ON FUNCTION public.detectar_gargalos(UUID, DATE) TO authenticated;

-- =============================================================
-- ROLLBACK
-- =============================================================
-- DROP FUNCTION IF EXISTS public.detectar_gargalos(UUID, DATE);
