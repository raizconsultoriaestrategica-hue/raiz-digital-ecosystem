-- Tabela de perfis do consultor (admin) para armazenar WhatsApp e dados de contato
CREATE TABLE IF NOT EXISTS public.consultor_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  whatsapp_consultor TEXT,
  email_consultor TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consultor_profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuário lê e atualiza apenas o próprio perfil
CREATE POLICY "consultor_profiles_self_select"
  ON public.consultor_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "consultor_profiles_self_insert"
  ON public.consultor_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "consultor_profiles_self_update"
  ON public.consultor_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Admin acesso total
CREATE POLICY "consultor_profiles_admin_all"
  ON public.consultor_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_consultor_profiles_updated_at
  BEFORE UPDATE ON public.consultor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();