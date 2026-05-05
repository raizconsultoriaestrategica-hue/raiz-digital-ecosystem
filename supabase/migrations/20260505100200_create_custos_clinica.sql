-- =============================================================
-- M3 (Fase 2): Tabela custos_clinica (centraliza custos do cliente)
-- =============================================================
-- Objetivo:
--   Centralizar os custos fixos e variáveis da clínica em uma única
--   tabela tipada. Hoje os custos vivem duplicados em jsonb dentro
--   de diagnosticos_financeiros e simulacoes_precificacao.
--
--   IMPORTANTE: esta migração NÃO migra os dados dos jsonbs antigos.
--   Os jsonbs continuam intocados e funcionando. Custos novos vão
--   para custos_clinica. A consolidação dos jsonbs antigos pode ser
--   feita em migração futura, caso a caso, depois que o front estiver
--   100% consumindo custos_clinica.
--
--   Quando o front migrar (Fase 3), o consultor preenche custos uma
--   única vez e ambas as ferramentas (Diagnóstico Financeiro e
--   Simulador de Precificação) leem dali.
--
-- RLS:
--   - Admin (consultor): ALL
--   - Cliente: SELECT apenas dos próprios custos (read-only)
--   - Cliente preenchendo próprios custos: Fase 6 ou nunca, depende
--     da estratégia de produto.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.custos_clinica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,

  -- Classificação
  tipo TEXT NOT NULL CHECK (tipo IN ('fixo','variavel')),
  categoria TEXT NOT NULL,           -- livre. Front usa dropdown com presets.
  descricao TEXT,                    -- opcional, anotações

  -- Valor
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Vigência (permite histórico)
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  vigencia_inicio DATE,
  vigencia_fim DATE,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT custos_clinica_vigencia_check
    CHECK (vigencia_fim IS NULL OR vigencia_inicio IS NULL OR vigencia_fim >= vigencia_inicio)
);

-- Índice para query típica: "custos fixos ativos do cliente X"
CREATE INDEX IF NOT EXISTS idx_custos_cliente_tipo
  ON public.custos_clinica (cliente_id, tipo, ativo);

-- RLS
ALTER TABLE public.custos_clinica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_acesso_total_custos_clinica" ON public.custos_clinica;
CREATE POLICY "admin_acesso_total_custos_clinica"
  ON public.custos_clinica FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cliente_ve_proprios_custos" ON public.custos_clinica;
CREATE POLICY "cliente_ve_proprios_custos"
  ON public.custos_clinica FOR SELECT
  USING (cliente_id IN (
    SELECT id FROM public.clientes WHERE user_id = auth.uid()
  ));

-- Trigger de updated_at (reusa função já existente)
DROP TRIGGER IF EXISTS trg_custos_clinica_updated_at ON public.custos_clinica;
CREATE TRIGGER trg_custos_clinica_updated_at
  BEFORE UPDATE ON public.custos_clinica
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================
-- ROLLBACK
-- =============================================================
-- ATENÇÃO: rollback APAGA a tabela e todos os custos cadastrados.
-- Backup recomendado: SELECT * FROM public.custos_clinica;
--
-- DROP TRIGGER IF EXISTS trg_custos_clinica_updated_at ON public.custos_clinica;
-- DROP POLICY IF EXISTS "cliente_ve_proprios_custos" ON public.custos_clinica;
-- DROP POLICY IF EXISTS "admin_acesso_total_custos_clinica" ON public.custos_clinica;
-- DROP TABLE IF EXISTS public.custos_clinica;
