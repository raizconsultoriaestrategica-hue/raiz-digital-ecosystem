-- =============================================================
-- Padronização de taxonomia para o CRM Notion (sync por e-mail)
-- =============================================================
-- Objetivo:
--   Deixar plano, ramo, especialidade e os campos de lead na mesma
--   linguagem do Brand Book v2.0, para o sync Supabase -> Notion casar
--   por e-mail sem ambiguidade.
--
-- Decisões (confirmadas por Patrick em 2026-06-04):
--   1. Planos canônicos: 'Raiz de Base', 'Raiz de Crescimento',
--      'Raiz de Expansão'. Sem 'Raiz Essencial' e sem variantes '· Saúde'.
--   2. Ramo único: 'odontologia','medicina','estetica','outros'.
--      diagnostics deixa de usar 'dentista'/'medico'.
--   3. especialidade_clinica é a fonte de verdade. A coluna legada
--      `especialidade` fica dormente (fallback de leitura), NÃO é dropada
--      nesta migração. Drop fica para rodada futura, após teste do fluxo.
--   4. Novas colunas de lead: faturamento_atual e origem.
--
-- Segurança: todos os UPDATE de normalização rodam ANTES dos CHECK,
--   para não barrar registros legados. Todos os blocos são idempotentes.
--
-- Contexto dos dados em produção nesta data (apurado via SELECT, tudo teste):
--   clientes.plano: 2 NULL, 2 'crescimento'
--   clientes.status: 2 projeto_ativo, 2 lead
--   clientes.ramo: 4 odontologia
--   diagnostics.ramo: 3 dentista
--   diagnostics.plano_name: 2 'Raiz de Crescimento', 1 'crescimento'
--   email_cliente: 4/4 preenchidos e únicos
-- =============================================================

-- =============================================================
-- 1) clientes.plano: normalizar -> nomes canônicos, default NULL, CHECK
-- =============================================================
UPDATE public.clientes SET plano = 'Raiz de Base'
  WHERE plano IN ('base', 'Raiz Essencial', 'Raiz de Base · Saúde');
UPDATE public.clientes SET plano = 'Raiz de Crescimento'
  WHERE plano IN ('crescimento', 'Raiz de Crescimento · Saúde');
UPDATE public.clientes SET plano = 'Raiz de Expansão'
  WHERE plano IN ('expansao', 'expansão', 'Raiz de Escala · Saúde', 'Raiz de Expansão · Saúde');

-- Default antigo ('crescimento') era ruim: punha plano falso em todo lead.
-- Lead nasce sem plano; plano passa a ser preenchido na proposta/contrato.
ALTER TABLE public.clientes ALTER COLUMN plano DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_plano_check') THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_plano_check
      CHECK (plano IS NULL OR plano IN ('Raiz de Base','Raiz de Crescimento','Raiz de Expansão'));
  END IF;
END$$;

-- =============================================================
-- 2) diagnostics.ramo e plano_name: unificar vocabulário
-- =============================================================
UPDATE public.diagnostics SET ramo = 'odontologia' WHERE ramo IN ('dentista');
UPDATE public.diagnostics SET ramo = 'medicina'    WHERE ramo IN ('medico');

UPDATE public.diagnostics SET plano_name = 'Raiz de Base'
  WHERE plano_name IN ('base', 'Raiz Essencial', 'Raiz de Base · Saúde');
UPDATE public.diagnostics SET plano_name = 'Raiz de Crescimento'
  WHERE plano_name IN ('crescimento', 'Raiz de Crescimento · Saúde');
UPDATE public.diagnostics SET plano_name = 'Raiz de Expansão'
  WHERE plano_name IN ('expansao', 'expansão', 'Raiz de Escala · Saúde', 'Raiz de Expansão · Saúde');

-- CHECK só no ramo (enum estável). plano_name fica sem CHECK de propósito:
-- é derivado da pontuação e do Brand Book; um CHECK aqui ficaria frágil
-- se a marca ajustar nomes no futuro. A normalização acima já alinha os dados.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'diagnostics_ramo_check') THEN
    ALTER TABLE public.diagnostics
      ADD CONSTRAINT diagnostics_ramo_check
      CHECK (ramo IN ('odontologia','medicina','estetica','outros'));
  END IF;
END$$;

-- =============================================================
-- 3) especialidade -> especialidade_clinica (backfill, sem dropar legada)
-- =============================================================
-- Copia o valor legado para a coluna canônica onde esta estiver vazia.
-- A coluna `especialidade` continua existindo como fallback de leitura.
UPDATE public.clientes
  SET especialidade_clinica = especialidade
  WHERE (especialidade_clinica IS NULL OR btrim(especialidade_clinica) = '')
    AND especialidade IS NOT NULL
    AND btrim(especialidade) <> '';

-- =============================================================
-- 4) Novas colunas de lead: faturamento_atual e origem
-- =============================================================
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS faturamento_atual NUMERIC,
  ADD COLUMN IF NOT EXISTS origem TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_origem_check') THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_origem_check
      CHECK (origem IS NULL OR origem IN ('site','landing_diagnostico','indicacao','instagram','whatsapp','outro'));
  END IF;
END$$;

COMMENT ON COLUMN public.clientes.faturamento_atual IS 'Faturamento mensal atual da clínica no momento do cadastro (R$). Diferente de meta_faturamento (a meta).';
COMMENT ON COLUMN public.clientes.origem IS 'Canal de origem do lead. Enum: site, landing_diagnostico, indicacao, instagram, whatsapp, outro.';

-- =============================================================
-- ROLLBACK (manual, executar só em caso de problema crítico)
-- =============================================================
-- ATENÇÃO: o rollback de colunas APAGA os dados de faturamento_atual e origem.
-- Os UPDATE de normalização (plano, ramo, plano_name, especialidade_clinica)
-- NÃO têm rollback automático: os valores antigos ('crescimento', 'dentista',
-- etc.) não são restauráveis sem backup. Faça backup antes de aplicar:
--   SELECT id, plano FROM public.clientes;
--   SELECT id, ramo, plano_name FROM public.diagnostics;
--   SELECT id, especialidade, especialidade_clinica FROM public.clientes;
--
-- ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_plano_check;
-- ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_origem_check;
-- ALTER TABLE public.diagnostics DROP CONSTRAINT IF EXISTS diagnostics_ramo_check;
-- ALTER TABLE public.clientes ALTER COLUMN plano SET DEFAULT 'crescimento';
-- ALTER TABLE public.clientes DROP COLUMN IF EXISTS faturamento_atual;
-- ALTER TABLE public.clientes DROP COLUMN IF EXISTS origem;
