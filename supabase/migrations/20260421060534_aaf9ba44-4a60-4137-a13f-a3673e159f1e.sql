ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS valor_fechado numeric,
  ADD COLUMN IF NOT EXISTS data_inicio_projeto date,
  ADD COLUMN IF NOT EXISTS duracao_meses integer,
  ADD COLUMN IF NOT EXISTS valor_mensalidade numeric;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clientes_status_check'
  ) THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_status_check
      CHECK (status IN ('lead','diagnostico_feito','proposta_enviada','projeto_ativo','encerrado'));
  END IF;
END$$;