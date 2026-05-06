-- =============================================================
-- M5 (Fase 2): Tabela de referência especialidades
-- =============================================================
-- Objetivo:
--   Catálogo padronizado de especialidades clínicas para popular
--   o dropdown de cadastro do cliente, do Diagnóstico 360 e das
--   demais ferramentas. Substitui o texto livre que gera variações
--   ("Implantodontia" vs "implante" vs "Cirurgia de implante").
--
-- Categorização:
--   - 9 odontológicas
--   - 5 médicas
--   - 2 estéticas
--   - 0 em "outros" (categoria existe no CHECK, pronta para crescer)
--
-- RLS:
--   - SELECT: qualquer usuário autenticado (cliente e admin precisam ler)
--   - ALL: admin (apenas consultor pode adicionar/editar especialidades)
--
-- Idempotência:
--   INSERTs com ON CONFLICT DO NOTHING. Se a migração rodar duas vezes
--   ou alguém já tiver inserido via Studio, não duplica nem falha.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.especialidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ramo TEXT NOT NULL CHECK (ramo IN ('odontologia','medicina','estetica','outros')),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT especialidades_ramo_nome_unique UNIQUE (ramo, nome)
);

-- Índice para query típica do dropdown:
-- SELECT nome FROM especialidades WHERE ramo = 'odontologia' AND ativo = true ORDER BY ordem
CREATE INDEX IF NOT EXISTS idx_especialidades_ramo_ativo
  ON public.especialidades (ramo, ativo, ordem);

-- RLS
ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "autenticado_le_especialidades" ON public.especialidades;
CREATE POLICY "autenticado_le_especialidades"
  ON public.especialidades FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_gerencia_especialidades" ON public.especialidades;
CREATE POLICY "admin_gerencia_especialidades"
  ON public.especialidades FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================================
-- Seed inicial
-- =============================================================

-- Odontologia
INSERT INTO public.especialidades (ramo, nome, ordem) VALUES
  ('odontologia', 'Clínica Geral', 1),
  ('odontologia', 'Implantodontia', 2),
  ('odontologia', 'Ortodontia', 3),
  ('odontologia', 'Estética / Harmonização', 4),
  ('odontologia', 'Endodontia', 5),
  ('odontologia', 'Periodontia', 6),
  ('odontologia', 'Odontopediatria', 7),
  ('odontologia', 'Prótese', 8),
  ('odontologia', 'Cirurgia Bucomaxilo', 9)
ON CONFLICT (ramo, nome) DO NOTHING;

-- Medicina
INSERT INTO public.especialidades (ramo, nome, ordem) VALUES
  ('medicina', 'Cardiologia', 1),
  ('medicina', 'Dermatologia', 2),
  ('medicina', 'Ortopedia', 3),
  ('medicina', 'Ginecologia', 4),
  ('medicina', 'Pediatria', 5)
ON CONFLICT (ramo, nome) DO NOTHING;

-- Estética
INSERT INTO public.especialidades (ramo, nome, ordem) VALUES
  ('estetica', 'Harmonização Facial', 1),
  ('estetica', 'Estética Corporal', 2)
ON CONFLICT (ramo, nome) DO NOTHING;

-- =============================================================
-- ROLLBACK
-- =============================================================
-- ATENÇÃO: rollback APAGA a tabela e todas as especialidades.
-- Como é dado de referência (não-transacional), o reseed via re-aplicar
-- a migração restaura o estado.
--
-- DROP POLICY IF EXISTS "admin_gerencia_especialidades" ON public.especialidades;
-- DROP POLICY IF EXISTS "autenticado_le_especialidades" ON public.especialidades;
-- DROP INDEX IF EXISTS public.idx_especialidades_ramo_ativo;
-- DROP TABLE IF EXISTS public.especialidades;
