-- =============================================================
-- P2.1 (Fase 2.1): Tabela reunioes (Pasta do Cliente)
-- =============================================================
-- Objetivo:
--   Persistir reuniões entre consultor e cliente. Hoje a Pasta do
--   Cliente (src/pages/PastaDoCliente.tsx) já consome essa tabela
--   defensivamente (try/catch). Sem ela, a aba "Reuniões" mostra
--   empty state. Esta migração habilita o fluxo completo:
--   consultor cadastra reunião pelo admin, cliente vê na Pasta.
--
-- Campos:
--   - data + hora_inicio + duracao_minutos: agendamento
--   - titulo: rótulo curto exibido como CardTitle
--   - link_meet: URL Zoom/Meet pra reunião futura
--   - ata: texto livre do que foi discutido (pós-reunião)
--   - proximos_passos: decisões e ações (destaque visual na Pasta)
--   - url_gravacao: link do vídeo gravado, opcional
--   - status: agendada (default) | realizada | cancelada
--
-- RLS:
--   - Admin (consultor): ALL
--   - Cliente: SELECT apenas das próprias reuniões (read-only)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.reunioes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,

  -- Agendamento
  data DATE NOT NULL,
  hora_inicio TIME,
  duracao_minutos INTEGER CHECK (duracao_minutos IS NULL OR duracao_minutos > 0),

  -- Conteúdo
  titulo TEXT,
  link_meet TEXT,
  ata TEXT,
  proximos_passos TEXT,
  url_gravacao TEXT,

  -- Estado
  status TEXT NOT NULL DEFAULT 'agendada'
    CHECK (status IN ('agendada','realizada','cancelada')),

  -- Auditoria
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para query típica: "reuniões do cliente X em ordem cronológica"
CREATE INDEX IF NOT EXISTS idx_reunioes_cliente_data
  ON public.reunioes (cliente_id, data DESC);

-- RLS
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_acesso_total_reunioes" ON public.reunioes;
CREATE POLICY "admin_acesso_total_reunioes"
  ON public.reunioes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cliente_ve_proprias_reunioes" ON public.reunioes;
CREATE POLICY "cliente_ve_proprias_reunioes"
  ON public.reunioes FOR SELECT
  USING (cliente_id IN (
    SELECT id FROM public.clientes WHERE user_id = auth.uid()
  ));

-- Trigger de updated_at (reusa função já existente)
DROP TRIGGER IF EXISTS trg_reunioes_updated_at ON public.reunioes;
CREATE TRIGGER trg_reunioes_updated_at
  BEFORE UPDATE ON public.reunioes
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- =============================================================
-- ROLLBACK
-- =============================================================
-- ATENÇÃO: rollback APAGA a tabela e todas as reuniões cadastradas.
-- Backup recomendado: SELECT * FROM public.reunioes;
--
-- DROP TRIGGER IF EXISTS trg_reunioes_updated_at ON public.reunioes;
-- DROP POLICY IF EXISTS "cliente_ve_proprias_reunioes" ON public.reunioes;
-- DROP POLICY IF EXISTS "admin_acesso_total_reunioes" ON public.reunioes;
-- DROP INDEX IF EXISTS public.idx_reunioes_cliente_data;
-- DROP TABLE IF EXISTS public.reunioes;
