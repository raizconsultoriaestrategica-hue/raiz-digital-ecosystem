import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TopProgress } from "@/components/ui/top-progress";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

export default function Login() {
  const { signIn, session, role } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      navigate(role === "admin" ? "/ferramentas" : "/dashboard", { replace: true });
    }
  }, [session, role, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.");
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      setSubmitting(false);
      toast.error(error);
      return;
    }
    toast.success("Bem-vindo de volta.");
    // Mantém submitting=true até o useEffect detectar session+role e redirecionar.
  };

  // Mostra a barra dourada enquanto valida credenciais OU enquanto a sessão chega
  // mas o role ainda não foi carregado (transição até o redirect).
  const showProgress = submitting || (!!session && !role);

  return (
    <>
      <TopProgress active={showProgress} />
      <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-raiz p-12 text-linho md:flex">
        <Link to="/" className="font-display text-3xl">
          Raiz<span className="text-dourado">.</span>
        </Link>
        <div>
          <p className="max-w-md font-display text-3xl italic leading-snug">
            “Toda clínica forte foi, antes, uma decisão clara.”
          </p>
          <div className="mt-6 font-body text-sm text-linho/70">Manifesto Raiz</div>
        </div>
        <div className="font-body text-xs text-linho/50">
          © {new Date().getFullYear()} Raiz Consultoria
        </div>
      </div>

      <div className="flex flex-col justify-center bg-off-white p-8 md:p-16">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-8 inline-block font-display text-2xl text-verde-raiz md:hidden">
            Raiz<span className="text-dourado">.</span>
          </Link>
          <h1 className="font-display text-4xl text-verde-raiz">Acessar área</h1>
          <p className="mt-2 font-body text-sm text-quase-preto/70">
            Entre com suas credenciais para continuar.
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@clinica.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-verde-raiz text-linho hover:bg-verde-musgo"
            >
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-8 text-center font-body text-xs text-quase-preto/60">
            Acesso fornecido pelo seu consultor Raiz.
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
