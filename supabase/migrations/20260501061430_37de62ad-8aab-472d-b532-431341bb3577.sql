CREATE TABLE public.simulacoes_precificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome_clinica TEXT,
  segmento TEXT,
  posicionamento TEXT,
  multiplicador NUMERIC DEFAULT 1.0,
  horas_dia NUMERIC DEFAULT 8,
  dias_mes INTEGER DEFAULT 22,
  custos_fixos JSONB DEFAULT '[]'::jsonb,
  procedimentos JSONB DEFAULT '[]'::jsonb,
  resultados_globais JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.simulacoes_precificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_acesso_total_simulacoes_precificacao"
ON public.simulacoes_precificacao
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cliente_ve_proprias_simulacoes_precificacao"
ON public.simulacoes_precificacao
FOR SELECT
USING (cliente_id IN (SELECT id FROM public.clientes WHERE user_id = auth.uid()));

CREATE TRIGGER trg_simulacoes_precificacao_updated_at
BEFORE UPDATE ON public.simulacoes_precificacao
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at();