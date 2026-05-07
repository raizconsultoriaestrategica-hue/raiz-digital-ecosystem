-- =============================================================
-- M4 (Fase 2): ALTER orcamentos com diagnostic_id e campos da proposta
-- =============================================================
-- Objetivo:
--   Amarrar cada orçamento formalmente ao diagnóstico que o originou
--   (FK explícita), eliminando a inferência por proximidade temporal.
--
--   Adicionar campos necessários para o PDF da proposta comercial:
--   validade da proposta, forma de pagamento oferecida e número de
--   parcelas. Estes campos serão consumidos no Bloco 3 da Fase 2.
--
-- Backfill:
--   Para orçamentos existentes, amarra ao diagnóstico mais recente
--   do cliente que existia ANTES do orçamento (não o último em geral).
--   Heurística mais precisa que a proposta original da auditoria.
--   Se nenhum diagnóstico existe antes do orçamento, diagnostic_id
--   fica NULL (FK permite).
--
-- Observação importante sobre nomenclatura:
--   diagnostics.client_id (sem 'e' final, inconsistente com orcamentos)
--   orcamentos.cliente_id (com 'e' final, padrão da plataforma)
--   Mantemos como está. Padronização ficaria para outra fase.
-- =============================================================

-- 1) Adicionar coluna diagnostic_id com FK
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS diagnostic_id UUID REFERENCES public.diagnostics(id) ON DELETE SET NULL;

-- 2) Campos da proposta comercial (PDF)
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS validade_proposta DATE,
  ADD COLUMN IF NOT EXISTS forma_pagamento_oferecida TEXT,
  ADD COLUMN IF NOT EXISTS parcelas_oferecidas INTEGER DEFAULT 1;

-- 3) CHECK constraints (com guard de idempotência)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orcamentos_forma_pagamento_check') THEN
    ALTER TABLE public.orcamentos
      ADD CONSTRAINT orcamentos_forma_pagamento_check
      CHECK (forma_pagamento_oferecida IS NULL
             OR forma_pagamento_oferecida IN ('pix','boleto','cartao','transferencia'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orcamentos_parcelas_check') THEN
    ALTER TABLE public.orcamentos
      ADD CONSTRAINT orcamentos_parcelas_check
      CHECK (parcelas_oferecidas IS NULL OR parcelas_oferecidas >= 1);
  END IF;
END$$;

-- 4) Backfill: amarrar cada orçamento ao diagnóstico mais recente
--    que existia ANTES dele. Só atualiza se diagnostic_id ainda for NULL.
UPDATE public.orcamentos o
  SET diagnostic_id = (
    SELECT d.id FROM public.diagnostics d
    WHERE d.client_id = o.cliente_id
      AND d.created_at <= o.created_at
    ORDER BY d.created_at DESC
    LIMIT 1
  )
WHERE diagnostic_id IS NULL;

-- 5) Índice para busca reversa (qual orçamento foi gerado deste diagnóstico)
CREATE INDEX IF NOT EXISTS idx_orcamentos_diagnostic_id
  ON public.orcamentos (diagnostic_id)
  WHERE diagnostic_id IS NOT NULL;

-- 6) Marcar coluna `valor` (TEXT) como DEPRECATED
COMMENT ON COLUMN public.orcamentos.valor IS
  'DEPRECATED desde Fase 2 (M4). Use valor_final_numerico (NUMERIC). Mantida para compatibilidade até o front migrar 100%.';

-- =============================================================
-- ROLLBACK
-- =============================================================
-- ATENÇÃO: rollback APAGA dados das colunas removidas (validade,
-- forma de pagamento, parcelas oferecidas). diagnostic_id também.
-- Backup recomendado antes:
--   SELECT id, diagnostic_id, validade_proposta,
--          forma_pagamento_oferecida, parcelas_oferecidas
--   FROM public.orcamentos;
--
-- DROP INDEX IF EXISTS public.idx_orcamentos_diagnostic_id;
-- ALTER TABLE public.orcamentos DROP CONSTRAINT IF EXISTS orcamentos_forma_pagamento_check;
-- ALTER TABLE public.orcamentos DROP CONSTRAINT IF EXISTS orcamentos_parcelas_check;
-- ALTER TABLE public.orcamentos
--   DROP COLUMN IF EXISTS diagnostic_id,
--   DROP COLUMN IF EXISTS validade_proposta,
--   DROP COLUMN IF EXISTS forma_pagamento_oferecida,
--   DROP COLUMN IF EXISTS parcelas_oferecidas;
-- COMMENT ON COLUMN public.orcamentos.valor IS NULL;
