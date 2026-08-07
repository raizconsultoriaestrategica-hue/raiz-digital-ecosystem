-- ============================================================
-- M: Ramo Psicologia no Diagnóstico 360°
-- ============================================================
-- Contexto:
--   A ferramenta de Diagnóstico 360° ganha o terceiro ramo
--   (Psicologia). O vocabulário canônico de ramo passa a ser:
--   ('odontologia','medicina','estetica','psicologia','outros').
--
-- O que esta migração faz:
--   1. Recria o CHECK de clientes.ramo incluindo 'psicologia'
--   2. Recria o CHECK de diagnostics.ramo incluindo 'psicologia'
--   3. Recria o CHECK de especialidades.ramo incluindo 'psicologia'
--   4. Seed das especialidades/abordagens do ramo psicologia
--
-- Ordem de deploy:
--   Esta migração deve rodar ANTES do deploy do frontend que
--   oferece 'psicologia' nos formulários; caso contrário o banco
--   rejeita os inserts (violação de CHECK).
--
-- Rollback: ver bloco comentado no final.
-- ============================================================

-- 1) clientes.ramo
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_ramo_check;
ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_ramo_check
  CHECK (ramo IS NULL OR ramo IN ('odontologia','medicina','estetica','psicologia','outros'));

-- 2) diagnostics.ramo
ALTER TABLE public.diagnostics DROP CONSTRAINT IF EXISTS diagnostics_ramo_check;
ALTER TABLE public.diagnostics
  ADD CONSTRAINT diagnostics_ramo_check
  CHECK (ramo IS NULL OR ramo IN ('odontologia','medicina','estetica','psicologia','outros'));

-- 3) especialidades.ramo (CHECK inline da criação da tabela; nome auto-gerado)
ALTER TABLE public.especialidades DROP CONSTRAINT IF EXISTS especialidades_ramo_check;
ALTER TABLE public.especialidades
  ADD CONSTRAINT especialidades_ramo_check
  CHECK (ramo IN ('odontologia','medicina','estetica','psicologia','outros'));

-- 4) Seed: especialidades/abordagens do ramo psicologia.
--    Idempotente: só insere o que ainda não existir.
INSERT INTO public.especialidades (ramo, nome, ativo, ordem)
SELECT 'psicologia', v.nome, TRUE, v.ordem
FROM (VALUES
  ('Terapia Cognitivo-Comportamental (TCC)', 1),
  ('Psicanálise', 2),
  ('Psicologia Analítica (Junguiana)', 3),
  ('Gestalt-terapia', 4),
  ('Abordagem Centrada na Pessoa (ACP)', 5),
  ('Terapia de Casais e Família (Sistêmica)', 6),
  ('Análise do Comportamento (ABA)', 7),
  ('Neuropsicologia', 8),
  ('Psicologia Infantil', 9),
  ('Psicologia do Adolescente', 10),
  ('Avaliação Psicológica', 11),
  ('Psicologia Organizacional', 12),
  ('Outra', 13)
) AS v(nome, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.especialidades e
  WHERE e.ramo = 'psicologia' AND e.nome = v.nome
);

-- ============================================================
-- ROLLBACK (executar manualmente se necessário)
-- ============================================================
-- Pré-condição: não pode haver registros com ramo='psicologia',
-- senão o CHECK antigo falha ao ser recriado. Conferir com:
--   SELECT count(*) FROM public.clientes      WHERE ramo = 'psicologia';
--   SELECT count(*) FROM public.diagnostics   WHERE ramo = 'psicologia';
--   SELECT count(*) FROM public.especialidades WHERE ramo = 'psicologia';
--
-- DELETE FROM public.especialidades WHERE ramo = 'psicologia';
--
-- ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_ramo_check;
-- ALTER TABLE public.clientes
--   ADD CONSTRAINT clientes_ramo_check
--   CHECK (ramo IS NULL OR ramo IN ('odontologia','medicina','estetica','outros'));
--
-- ALTER TABLE public.diagnostics DROP CONSTRAINT IF EXISTS diagnostics_ramo_check;
-- ALTER TABLE public.diagnostics
--   ADD CONSTRAINT diagnostics_ramo_check
--   CHECK (ramo IS NULL OR ramo IN ('odontologia','medicina','estetica','outros'));
--
-- ALTER TABLE public.especialidades DROP CONSTRAINT IF EXISTS especialidades_ramo_check;
-- ALTER TABLE public.especialidades
--   ADD CONSTRAINT especialidades_ramo_check
--   CHECK (ramo IN ('odontologia','medicina','estetica','outros'));
