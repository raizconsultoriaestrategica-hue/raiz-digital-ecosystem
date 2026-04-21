CREATE OR REPLACE FUNCTION public.marcar_primeiro_acesso_concluido()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clientes
  SET primeiro_acesso = false
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_primeiro_acesso_concluido() TO authenticated;