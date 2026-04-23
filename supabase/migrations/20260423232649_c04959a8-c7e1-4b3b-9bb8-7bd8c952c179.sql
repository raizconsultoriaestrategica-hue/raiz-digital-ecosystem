-- 1) Tabela de orçamentos gerados
CREATE TABLE public.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  plano TEXT NOT NULL,
  plano_nome TEXT,
  valor TEXT,
  score NUMERIC,
  score_max NUMERIC,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orcamentos_cliente ON public.orcamentos(cliente_id);
CREATE INDEX idx_orcamentos_created ON public.orcamentos(created_at DESC);

ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

-- Admin: tudo
CREATE POLICY "admin_acesso_total_orcamentos"
  ON public.orcamentos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cliente: vê apenas seus próprios orçamentos
CREATE POLICY "cliente_ve_proprios_orcamentos"
  ON public.orcamentos FOR SELECT
  USING (cliente_id IN (SELECT id FROM public.clientes WHERE user_id = auth.uid()));

-- 2) Bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('orcamentos', 'orcamentos', false)
ON CONFLICT (id) DO NOTHING;

-- 3) Storage policies
-- Admin: tudo no bucket
CREATE POLICY "admin_orcamentos_all"
  ON storage.objects FOR ALL
  USING (bucket_id = 'orcamentos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'orcamentos' AND public.has_role(auth.uid(), 'admin'));

-- Cliente: lê apenas arquivos de pasta = seu cliente_id
CREATE POLICY "cliente_le_proprios_orcamentos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'orcamentos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.clientes WHERE user_id = auth.uid()
    )
  );