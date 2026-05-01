ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS analise_ia text,
  ADD COLUMN IF NOT EXISTS ancoragem_ia text,
  ADD COLUMN IF NOT EXISTS valor_final_numerico numeric,
  ADD COLUMN IF NOT EXISTS dor_principal text;