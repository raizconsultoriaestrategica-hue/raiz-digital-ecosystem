import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TopProgress } from "@/components/ui/top-progress";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Mode = "login" | "reset";

export default function Login() {
  const { signIn, session, role } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>("login");

  // Estado do fluxo de reset
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    // Só redireciona quando session E role estiverem prontos.
    // Sem isso, o admin é mandado para /dashboard na primeira tentativa
    // (porque role ainda é null) e precisa logar de novo.
    if (session && role) {
      navigate(role === "admin" ? "/dashboard" : "/painel", { replace: true });
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
  };

  const onSubmitReset = async (e: FormEvent) => {
    e.preventDefault();
    setResetSubmitting(true);
    try {
      await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: "https://raiz-digital-ecosystem.pages.dev/nova-senha",
      });
    } catch {
      // Mensagem é neutra de qualquer forma
    } finally {
      setResetSubmitting(false);
      setResetSent(true);
    }
  };

  const voltarLogin = () => {
    setMode("login");
    setResetSent(false);
    setResetEmail("");
  };

  const showProgress = submitting || (!!session && !role);

  return (
    <>
      <TopProgress active={showProgress} />
      <div className="grid min-h-screen md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-gradient-raiz p-12 text-linho md:flex">
          <Link to="/" className="inline-block">
            <BrandLogo onDark className="h-10" />
          </Link>
          <div>
            <p className="max-w-md font-display text-3xl italic leading-snug">
              "Toda clínica forte foi, antes, uma decisão clara."
            </p>
            <div className="mt-6 font-body text-sm text-linho/70">Manifesto Raiz</div>
          </div>
          <div className="font-body text-xs text-linho/50">
            © {new Date().getFullYear()} Raiz Consultoria
          </div>
        </div>

        <div className="flex flex-col justify-center bg-off-white p-8 md:p-16">
          <div className="mx-auto w-full max-w-sm">
            <Link to="/" className="mb-8 inline-block md:hidden">
              <BrandLogo className="h-8" />
            </Link>

            {mode === "login" && (
              <>
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
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-quase-preto/60 hover:text-quase-preto"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMode("reset")}
                        className="font-body text-xs text-verde-raiz hover:text-verde-musgo hover:underline"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
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
              </>
            )}

            {mode === "reset" && (
              <>
                <h1 className="font-display text-4xl text-verde-raiz">Recuperar acesso</h1>
                <p className="mt-2 font-body text-sm text-quase-preto/70">
                  Informe seu e-mail e enviaremos as instruções para redefinir sua senha.
                </p>

                {!resetSent ? (
                  <form onSubmit={onSubmitReset} className="mt-10 space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Seu e-mail cadastrado</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="voce@clinica.com"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={resetSubmitting}
                      className="w-full bg-verde-raiz text-linho hover:bg-verde-musgo"
                    >
                      {resetSubmitting ? "Enviando..." : "Enviar instruções"}
                    </Button>
                    <button
                      type="button"
                      onClick={voltarLogin}
                      className="block w-full text-center font-body text-xs text-quase-preto/60 hover:text-quase-preto"
                    >
                      Voltar ao login
                    </button>
                  </form>
                ) : (
                  <div className="mt-10 space-y-6">
                    <div className="rounded-md border border-verde-raiz/20 bg-verde-raiz/5 p-4 font-body text-sm text-quase-preto/80">
                      Se este e-mail estiver cadastrado, você receberá as instruções em breve.
                    </div>
                    <button
                      type="button"
                      onClick={voltarLogin}
                      className="block w-full text-center font-body text-xs text-verde-raiz hover:text-verde-musgo hover:underline"
                    >
                      Voltar ao login
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
