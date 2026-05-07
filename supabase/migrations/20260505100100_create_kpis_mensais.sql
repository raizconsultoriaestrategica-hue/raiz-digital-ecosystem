-- =============================================================
-- M2 (Fase 2): Tabela kpis_mensais (substitui dashboard_data EAV)
-- =============================================================
-- Objetivo:
--   Substituir o modelo EAV em TEXT da dashboard_data por uma tabela
--   tipada com colunas numéricas. Habilita SUM/AVG/MAX direto no
--   banco e elimina conversões frágeis no front.
--
--   dashboard_data NÃO é dropada nesta migração. Continua existindo
--   por compatibilidade. A migração de dados e o desligamento da
--   EAV ficam para depois (Fase 3 ou 5, quando o front estiver
--   100% consumindo kpis_mensais).
--
-- RLS:
--   - Admin (consultor): ALL (leitura e escrita totais)
--   - Cliente: SELECT apenas dos próprios KPIs (read-only).
--     Cliente preenchendo próprio KPI fica para Fase 6 (Recomendação
--     P2.4 da auditoria).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.kpis_mensais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,

  -- Receitas
  faturamento_bruto NUMERIC(14,2) DEFAULT 0,
  faturamento_convenios NUMERIC(14,2) DEFAULT 0,
  ticket_medio NUMERIC(12,2) DEFAULT 0,
  pacientes_novos INTEGER DEFAULT 0,

  -- Conversão e qualidade
  taxa_conversao NUMERIC(5,2) DEFAULT 0,    -- %
  taxa_inadimplencia NUMERIC(5,2) DEFAULT 0, -- %
  pct_recebido_vista NUMERIC(5,2) DEFAULT 0, -- %

  -- Marketing e operação
  investimento_marketing NUMERIC(12,2) DEFAULT 0,
  taxa_no_show NUMERIC(5,2) DEFAULT 0,       -- %
  ocupacao_cadeiras NUMERIC(5,2) DEFAULT 0,  -- %

  -- Resultado
  margem_liquida NUMERIC(5,2) DEFAULT 0,     -- %

  -- Texto livre + auditoria
  observacoes TEXT,
  preenchido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT kpis_mensais_cliente_mes_unique UNIQUE (cliente_id, mes_referencia)
);

-- Índice para consulta do "último mês" (usada pela view v_cliente_completo na M6)
CREATE INDEX IF NOT EXISTS idx_kpis_cliente_mes
  ON public.kpis_mensais (cliente_id, mes_referencia DESC);

-- RLS
ALTER TABLE public.kpis_mensais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_acesso_total_kpis_mensais" ON public.kpis_mensais;
CREATE POLICY "admin_acesso_total_kpis_mensais"
  ON public.kpis_mensais FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cliente_ve_proprios_kpis" ON public.kpis_mensais;
CREATE POLICY "cliente_ve_proprios_kpis"
  ON public.kpis_mensais FOR SELECT
  USING (cliente_id IN (
    SELECT id FROM public.clientes WHERE user_id = auth.uid()
  ));

-- Trigger de updated_at (reusa função já existente no banco)
DROP TRIGGER IF EXISTS trg_kpis_mensais_updated_at ON public.kpis_mensais;
CREATE TRIGGER trg_kpis_mensais_updated_at
  BEFORE UPDATE ON public.kpis_mensais
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================
-- ROLLBACK
-- =============================================================
-- ATENÇÃO: rollback APAGA a tabela e todos os KPIs já preenchidos.
-- Backup recomendado: SELECT * FROM public.kpis_mensais;
--
-- DROP TRIGGER IF EXISTS trg_kpis_mensais_updated_at ON public.kpis_mensais;
-- DROP POLICY IF EXISTS "cliente_ve_proprios_kpis" ON public.kpis_mensais;
-- DROP POLICY IF EXISTS "admin_acesso_total_kpis_mensais" ON public.kpis_mensais;
-- DROP TABLE IF EXISTS public.kpis_mensais;
