-- Padroniza RLS da tabela diagnostics usando has_role()
DROP POLICY IF EXISTS "admin_tudo_diags" ON public.diagnostics;
DROP POLICY IF EXISTS "cliente_proprios_diags" ON public.diagnostics;

CREATE POLICY "admin_acesso_total_diagnostics"
ON public.diagnostics
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cliente_ve_proprios_diagnostics"
ON public.diagnostics
FOR SELECT
USING (
  client_id IN (
    SELECT id FROM public.clientes WHERE user_id = auth.uid()
  )
);