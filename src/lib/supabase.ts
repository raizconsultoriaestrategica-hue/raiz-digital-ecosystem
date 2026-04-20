import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Raiz] Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. Crie um arquivo .env baseado em .env.example."
  );
}

export const supabase = createClient(url ?? "https://placeholder.supabase.co", anon ?? "placeholder-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export const isSupabaseConfigured = Boolean(url && anon);
