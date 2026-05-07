-- =============================================================
-- M1 (Fase 2): Enriquecer cadastro de clientes
-- =============================================================
-- Objetivo:
--   Adicionar campos críticos para a operação (contato, financeiro,
--   identificação) que hoje não existem em clientes. Estes campos
--   destravam o cadastro completo via UI e as automações futuras
--   (Resend, dashboard financeiro Raiz).
--
-- Decisões importantes:
--   1. NÃO renomear coluna `especialidade` legada (15 arquivos do
--      front a referenciam). Adicionamos `especialidade_clinica`
--      em paralelo. Migração de referências fica para Fase 3.
--   2. Todas as colunas com IF NOT EXISTS (idempotente). Se alguma
--      já existir em produção via drift do Studio, não quebra.
--   3. Sem FOREIGN KEY para `especialidades` por enquanto: a tabela
--      especialidades só será criada na M5. UI valida via dropdown.
--      FK pode ser adicionada em migração futura.
--   4. Normalização de `ramo` antes do CHECK: registros legados
--      podem ter 'dentista' (default antigo) ou 'medico'. São
--      mapeados para 'odontologia' e 'medicina' respectivamente
--      para não quebrar a constraint.
-- =============================================================

-- 1) Campos de contato e identificação
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email_cliente TEXT,
  ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS observacoes_relacionamento TEXT;

-- 2) Campos financeiros / cobrança recorrente
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER,
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;

-- 3) Especialidade tipada (nova). NÃO mexer em `especialidade` legada.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS especialidade_clinica TEXT;

-- 4) Consolidar no schema versionado as colunas que o front lê mas
--    não estão em migrações commitadas (drift do Studio). IF NOT EXISTS
--    garante que não duplicamos se já existirem.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS meta_faturamento NUMERIC,
  ADD COLUMN IF NOT EXISTS ramo TEXT DEFAULT 'odontologia',
  ADD COLUMN IF NOT EXISTS mes_referencia TEXT,
  ADD COLUMN IF NOT EXISTS pilares_foco TEXT,
  ADD COLUMN IF NOT EXISTS modulos_ativos TEXT;

-- 4.5) Normalizar valores legados de `ramo` antes de aplicar o CHECK
--      'dentista' (default antigo do schema) -> 'odontologia'
--      'medico'  (visto em referências do front)  -> 'medicina'
--      No-op se não houver registros com esses valores.
UPDATE public.clientes SET ramo = 'odontologia' WHERE ramo = 'dentista';
UPDATE public.clientes SET ramo = 'medicina'   WHERE ramo = 'medico';

-- 5) CHECK constraints (com guard para idempotência)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_dia_vencimento_check') THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_dia_vencimento_check
      CHECK (dia_vencimento IS NULL OR dia_vencimento BETWEEN 1 AND 31);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_forma_pagamento_check') THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_forma_pagamento_check
      CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('pix','boleto','cartao','transferencia'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_ramo_check') THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_ramo_check
      CHECK (ramo IS NULL OR ramo IN ('odontologia','medicina','estetica','outros'));
  END IF;
END$$;

-- 6) Índices úteis para queries de listagem e cobrança automática
CREATE INDEX IF NOT EXISTS idx_clientes_status ON public.clientes(status);
CREATE INDEX IF NOT EXISTS idx_clientes_dia_vencimento ON public.clientes(dia_vencimento) WHERE dia_vencimento IS NOT NULL;

-- =============================================================
-- ROLLBACK (manual, executar APENAS em caso de problema crítico)
-- =============================================================
-- ATENÇÃO: o rollback APAGA dados das colunas removidas.
-- Antes do rollback, fazer backup de:
--   SELECT id, telefone, email_cliente, cpf_cnpj, endereco,
--          data_nascimento, instagram, observacoes_relacionamento,
--          dia_vencimento, forma_pagamento, especialidade_clinica
--   FROM public.clientes;
--
-- Não removemos `meta_faturamento`, `ramo`, `mes_referencia`,
-- `pilares_foco`, `modulos_ativos` no rollback porque já existiam
-- antes desta migração (drift do Studio). Se você criou o registro
-- via Studio e não quer perder a coluna, mantenha.
--
-- ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_dia_vencimento_check;
-- ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_forma_pagamento_check;
-- ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_ramo_check;
-- DROP INDEX IF EXISTS public.idx_clientes_status;
-- DROP INDEX IF EXISTS public.idx_clientes_dia_vencimento;
-- ALTER TABLE public.clientes
--   DROP COLUMN IF EXISTS telefone,
--   DROP COLUMN IF EXISTS email_cliente,
--   DROP COLUMN IF EXISTS cpf_cnpj,
--   DROP COLUMN IF EXISTS endereco,
--   DROP COLUMN IF EXISTS data_nascimento,
--   DROP COLUMN IF EXISTS instagram,
--   DROP COLUMN IF EXISTS observacoes_relacionamento,
--   DROP COLUMN IF EXISTS dia_vencimento,
--   DROP COLUMN IF EXISTS forma_pagamento,
--   DROP COLUMN IF EXISTS especialidade_clinica;
