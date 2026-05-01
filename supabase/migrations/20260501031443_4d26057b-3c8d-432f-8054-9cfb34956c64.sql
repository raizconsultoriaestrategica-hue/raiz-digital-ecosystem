-- Trigger genérico para updated_at (caso ainda não exista)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- contratos_raiz
-- =========================
CREATE TABLE IF NOT EXISTS public.contratos_raiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome text NOT NULL,
  plano text NOT NULL,
  valor_mensal numeric(12,2) NOT NULL DEFAULT 0,
  data_inicio date NOT NULL,
  data_fim date,
  status text NOT NULL DEFAULT 'ativo', -- ativo | encerrado | renovacao_pendente
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos_raiz ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_contratos_raiz" ON public.contratos_raiz;
CREATE POLICY "admin_full_contratos_raiz" ON public.contratos_raiz
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_contratos_raiz_updated ON public.contratos_raiz;
CREATE TRIGGER trg_contratos_raiz_updated
  BEFORE UPDATE ON public.contratos_raiz
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================
-- pagamentos_raiz
-- =========================
CREATE TABLE IF NOT EXISTS public.pagamentos_raiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid REFERENCES public.contratos_raiz(id) ON DELETE CASCADE,
  cliente_nome text NOT NULL,
  mes_referencia text NOT NULL, -- formato YYYY-MM
  valor numeric(12,2) NOT NULL DEFAULT 0,
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'pendente', -- pago | pendente | atrasado
  data_pagamento date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pagamentos_raiz ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_pagamentos_raiz" ON public.pagamentos_raiz;
CREATE POLICY "admin_full_pagamentos_raiz" ON public.pagamentos_raiz
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_pagamentos_raiz_updated ON public.pagamentos_raiz;
CREATE TRIGGER trg_pagamentos_raiz_updated
  BEFORE UPDATE ON public.pagamentos_raiz
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_pagamentos_raiz_vencimento ON public.pagamentos_raiz(vencimento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_raiz_status ON public.pagamentos_raiz(status);

-- =========================
-- contas_pagar_raiz
-- =========================
CREATE TABLE IF NOT EXISTS public.contas_pagar_raiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  categoria text NOT NULL DEFAULT 'avulso', -- ferramenta | freelancer | fixo | avulso
  valor numeric(12,2) NOT NULL DEFAULT 0,
  vencimento date NOT NULL,
  recorrencia text NOT NULL DEFAULT 'unico', -- mensal | anual | unico
  status text NOT NULL DEFAULT 'pendente', -- pago | pendente
  data_pagamento date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_pagar_raiz ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_contas_pagar_raiz" ON public.contas_pagar_raiz;
CREATE POLICY "admin_full_contas_pagar_raiz" ON public.contas_pagar_raiz
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_contas_pagar_raiz_updated ON public.contas_pagar_raiz;
CREATE TRIGGER trg_contas_pagar_raiz_updated
  BEFORE UPDATE ON public.contas_pagar_raiz
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_contas_pagar_raiz_vencimento ON public.contas_pagar_raiz(vencimento);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_raiz_categoria ON public.contas_pagar_raiz(categoria);