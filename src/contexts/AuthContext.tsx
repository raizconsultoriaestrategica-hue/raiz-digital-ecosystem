import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AppRole = "admin" | "cliente";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  primeiroAcesso: boolean | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshPrimeiroAcesso: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [primeiroAcesso, setPrimeiroAcesso] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string): Promise<AppRole | null> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error || !data) return null;
    const roles = data.map((r: { role: AppRole }) => r.role);
    if (roles.includes("admin")) return "admin";
    if (roles.includes("cliente")) return "cliente";
    return null;
  };

  const fetchPrimeiroAcesso = async (userId: string): Promise<boolean | null> => {
    const { data, error } = await supabase
      .from("clientes")
      .select("primeiro_acesso")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return !!data.primeiro_acesso;
  };

  const refreshPrimeiroAcesso = async () => {
    if (!user) return;
    const v = await fetchPrimeiroAcesso(user.id);
    setPrimeiroAcesso(v);
  };

  const hydrateUser = async (uid: string) => {
    try {
      const r = await fetchRole(uid);
      setRole(r);
      if (r === "cliente") {
        const pa = await fetchPrimeiroAcesso(uid);
        setPrimeiroAcesso(pa);
      } else {
        setPrimeiroAcesso(false);
      }
    } catch (e) {
      console.error("[Auth] hydrateUser error", e);
      setRole(null);
      setPrimeiroAcesso(null);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer to avoid deadlocks inside the auth callback
        setTimeout(() => {
          hydrateUser(newSession.user.id);
        }, 0);
      } else {
        setRole(null);
        setPrimeiroAcesso(null);
      }
    });

    supabase.auth
      .getSession()
      .then(async ({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await hydrateUser(s.user.id);
        }
      })
      .catch((e) => console.error("[Auth] getSession error", e))
      .finally(() => setLoading(false));

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setPrimeiroAcesso(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, role, primeiroAcesso, loading, signIn, signOut, refreshPrimeiroAcesso }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
