-- =============================================================
-- Fase 5 / Bloco B (B1): Tabela benchmarks_kpis + seed odontologia
-- =============================================================
-- Objetivo:
--   Tabela de referência com faixas saudáveis (min, max) para os
--   KPIs operacionais e financeiros das clínicas. Alimenta a função
--   detectar_gargalos (B2), que cruza kpis_mensais do cliente com
--   esses benchmarks para apontar pontos fora da curva.
--
-- Decisões:
--   1. A coluna `especialidade` casa hoje com `clientes.ramo`
--      ('odontologia', 'medicina', 'estetica', 'outros'), porque é o
--      campo padronizado nos clientes em produção. Futuramente pode
--      evoluir para benchmarks por sub-especialidade clínica
--      ('implantodontia', 'ortodontia' etc.) sem migração de schema:
--      basta inserir linhas com a especialidade fina.
--   2. O valor de `kpi` deve ser o NOME CANÔNICO da coluna em
--      kpis_mensais. Isso permite que a função detectar_gargalos
--      faça a comparação por nome sem mapeamento manual.
--   3. `unidade` documenta a escala (%, BRL, score etc.) para a
--      apresentação no front. Não é validada em CHECK.
--   4. RLS: leitura aberta a authenticated (cliente e admin podem
--      ver os benchmarks), escrita só admin.
--   5. `polaridade` indica a direção saudável do KPI:
--        - 'positivo': quanto maior, melhor (ex: margem_liquida)
--        - 'negativo': quanto menor, melhor (ex: taxa_inadimplencia)
--        - 'banda'   : ideal é ficar dentro da faixa (ex: ocupacao)
--      Permite que detectar_gargalos infira severidade sem hardcode.
--   6. Seed inicial de 6 KPIs odontologia, todos com coluna direta
--      em kpis_mensais. KPIs derivados (CPL, CAC, NPS, LTV) ficam
--      fora desta versão porque dependem de cálculos cross-tabela
--      que ainda não estão padronizados. Podem ser adicionados em
--      migrações futuras (INSERT puro, sem ALTER).
--
-- Fonte do seed (validada cruzando com 08_Pesquisas):
--   - Guia de KPIs e Benchmarks Diagnóstico 360 (08_Pesquisas)
--   - Doctoralia, Iclinic, GestãoDS
--   - Panorama das Clínicas e Hospitais 2025
--   - Agência KOS Planejamento Estratégico Saúde 2026
-- =============================================================

CREATE TABLE IF NOT EXISTS public.benchmarks_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  especialidade TEXT NOT NULL,
  kpi TEXT NOT NULL,
  min NUMERIC(12,2) NOT NULL,
  max NUMERIC(12,2) NOT NULL,
  unidade TEXT NOT NULL,
  pilar TEXT,
  polaridade TEXT NOT NULL DEFAULT 'banda',
  descricao TEXT,
  fonte TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT benchmarks_kpis_min_max_check CHECK (max >= min),
  CONSTRAINT benchmarks_kpis_polaridade_check
    CHECK (polaridade IN ('positivo','negativo','banda')),
  CONSTRAINT benchmarks_kpis_especialidade_kpi_unique UNIQUE (especialidade, kpi)
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_especialidade_kpi
  ON public.benchmarks_kpis (especialidade, kpi);

-- RLS
ALTER TABLE public.benchmarks_kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_le_benchmarks_kpis" ON public.benchmarks_kpis;
CREATE POLICY "auth_le_benchmarks_kpis"
  ON public.benchmarks_kpis FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_escreve_benchmarks_kpis" ON public.benchmarks_kpis;
CREATE POLICY "admin_escreve_benchmarks_kpis"
  ON public.benchmarks_kpis FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at (reusa função existente)
DROP TRIGGER IF EXISTS trg_benchmarks_kpis_updated_at ON public.benchmarks_kpis;
CREATE TRIGGER trg_benchmarks_kpis_updated_at
  BEFORE UPDATE ON public.benchmarks_kpis
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================
-- Seed inicial: 6 KPIs odontologia
-- =============================================================
INSERT INTO public.benchmarks_kpis
  (especialidade, kpi, min, max, unidade, pilar, polaridade, descricao, fonte)
VALUES
('odontologia', 'taxa_conversao', 10, 25, '%', 'comercial', 'positivo',
 'Porcentagem de leads que viram consulta agendada. Media de mercado 10-15%; alta performance > 25% com script de vendas.',
 'Doctoralia/Iclinic/GestaoDS 2024-2025; Panorama Clinicas 2025'),

('odontologia', 'taxa_inadimplencia', 0, 5, '%', 'financeiro', 'negativo',
 'Percentual de pagamentos nao recebidos em modelo particular. Acima de 5% indica problema de credito/cobranca.',
 'Panorama das Clinicas e Hospitais 2025'),

('odontologia', 'taxa_no_show', 0, 20, '%', 'comercial', 'negativo',
 'Pacientes que agendam e nao comparecem. 11-20% e saudavel; acima de 30% e ponto de alerta critico.',
 'Agencia KOS - Planejamento Estrategico Saude 2026'),

('odontologia', 'ocupacao_cadeiras', 80, 95, '%', 'operacional', 'banda',
 'Horas de cadeira ocupadas vs horas disponiveis. 80-85% e meta ideal; acima de 95% indica falta de folga para imprevistos.',
 'Consultorias especializadas em odontologia 2024-2025'),

('odontologia', 'margem_liquida', 20, 30, '%', 'financeiro', 'positivo',
 'Lucro real apos todas as despesas e impostos. 20-30% e saudavel; 30-40% e alta eficiencia.',
 'Dados consolidados de consultorias especializadas em saude 2024-2025'),

('odontologia', 'ticket_medio', 300, 1200, 'BRL', 'financeiro', 'positivo',
 'Valor medio cobrado por atendimento particular. Range cobre consulta clinica geral ate procedimentos de media complexidade.',
 'Doctoralia/GestaoDS 2025; mercado odontologico particular')

ON CONFLICT (especialidade, kpi) DO NOTHING;

-- =============================================================
-- ROLLBACK
-- =============================================================
-- Apaga a tabela e o seed. Como benchmarks sao referencia, nao ha
-- perda de dado do cliente.
--
-- DROP TRIGGER IF EXISTS trg_benchmarks_kpis_updated_at ON public.benchmarks_kpis;
-- DROP POLICY IF EXISTS "admin_escreve_benchmarks_kpis" ON public.benchmarks_kpis;
-- DROP POLICY IF EXISTS "auth_le_benchmarks_kpis" ON public.benchmarks_kpis;
-- DROP INDEX IF EXISTS public.idx_benchmarks_especialidade_kpi;
-- DROP TABLE IF EXISTS public.benchmarks_kpis;
