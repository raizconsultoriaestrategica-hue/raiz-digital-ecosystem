-- Tabela de diagnósticos financeiros
CREATE TABLE public.diagnosticos_financeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  
  -- Etapa 1: Dados do consultório
  nome_profissional TEXT,
  especialidade TEXT,
  cidade TEXT,
  regime_tributario TEXT,
  num_profissionais INTEGER DEFAULT 1,
  dias_trabalhados INTEGER DEFAULT 22,
  horas_clinicas_dia NUMERIC DEFAULT 8,
  atendimentos_dia NUMERIC DEFAULT 0,
  
  -- Etapa 2: Receitas
  faturamento_bruto NUMERIC DEFAULT 0,
  faturamento_convenios NUMERIC DEFAULT 0,
  ticket_medio NUMERIC DEFAULT 0,
  pacientes_novos_mes INTEGER DEFAULT 0,
  taxa_conversao NUMERIC DEFAULT 0,
  taxa_inadimplencia NUMERIC DEFAULT 0,
  pct_vista NUMERIC DEFAULT 0,
  investimento_marketing NUMERIC DEFAULT 0,
  no_show NUMERIC DEFAULT 0,
  ocupacao_agenda NUMERIC DEFAULT 0,
  
  -- Etapa 3: Custos (jsonb para flexibilidade)
  custos_fixos JSONB DEFAULT '{}'::jsonb,
  custos_variaveis JSONB DEFAULT '{}'::jsonb,
  financiamentos JSONB DEFAULT '{}'::jsonb,
  
  -- Resultados calculados
  indicadores JSONB DEFAULT '{}'::jsonb,
  alertas JSONB DEFAULT '[]'::jsonb,
  
  -- Storage
  storage_path TEXT,
  file_name TEXT,
  
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnosticos_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_acesso_total_diag_financeiro"
ON public.diagnosticos_financeiros
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cliente_ve_proprio_diag_financeiro"
ON public.diagnosticos_financeiros
FOR SELECT
USING (cliente_id IN (SELECT id FROM public.clientes WHERE user_id = auth.uid()));

CREATE TRIGGER diag_financeiro_updated_at
BEFORE UPDATE ON public.diagnosticos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Bucket de PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('diagnosticos-financeiros', 'diagnosticos-financeiros', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin_diag_fin_storage_all"
ON storage.objects
FOR ALL
USING (bucket_id = 'diagnosticos-financeiros' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'diagnosticos-financeiros' AND public.has_role(auth.uid(), 'admin'));