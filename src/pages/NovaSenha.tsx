import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TopProgress } from "@/components/ui/top-progress";
import { supabase } from "@/lib/supabase";

export default function NovaSenha() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showNova, setShowNova] = useState(false);
  const [showConf, setShowConf] = useState(false);

  useEffect(() => {
    let mounted = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
        setLoading(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (session?.user) {
          setSessionReady(true);
          setLoading(false);
        }
      })
      .catch(() => {});

    const timeoutId = window.setTimeout(() => {
      if (!mounted) return;
      setLoading((prev) => {
        if (prev) {
          setSessionReady(false);
          return false;
        }
        return prev;
      });
    }, 5000);

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => navigate("/login", { replace: true }), 2000);
    return () => window.clearTimeout(t);
  }, [navigate, success]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (novaSenha.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha });

    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    setSessionReady(false);
    await supabase.auth.signOut();
    setSubmitting(false);
    setSuccess(true);
  };

  return (
    <>
      <TopProgress active={loading || submitting} />

      <div className="grid min-h-screen md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-gradient-raiz p-12 text-linho md:flex">
          <Link to="/" className="font-display text-3xl">
            Raiz<span className="text-dourado">.</span>
          </Link>

          <div>
            <p className="max-w-md font-display text-3xl italic leading-snug">
              "Toda clínica forte foi, antes, uma decisão clara."
            </p>
            <div className="mt-6 font-body text-sm text-linho/70">Manifesto Raiz</div>
          </div>

          <div className="font-body text-xs text-linho/50">© {new Date().getFullYear()} Raiz Consultoria</div>
        </div>

        <div className="flex flex-col justify-center bg-off-white p-8 md:p-16">
          <div className="mx-auto w-full max-w-sm">
            <Link to="/" className="mb-8 inline-block font-display text-2xl text-verde-raiz md:hidden">
              Raiz<span className="text-dourado">.</span>
            </Link>

            <h1 className="font-display text-4xl text-verde-raiz">Redefinir senha</h1>

            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-verde-raiz" aria-hidden="true" />
              </div>
            ) : !sessionReady ? (
              <div className="mt-10 space-y-6">
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 font-body text-sm text-quase-preto/80">
                  Link inválido ou expirado.
                </div>
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full bg-verde-raiz text-linho hover:bg-verde-musgo"
                >
                  Voltar ao login
                </Button>
              </div>
            ) : success ? (
              <div className="mt-10 space-y-4">
                <div className="rounded-md border border-verde-musgo/20 bg-verde-musgo/5 p-4 font-body text-sm text-quase-preto/80">
                  Senha redefinida com sucesso. Você será redirecionado para o login em instantes.
                </div>
              </div>
            ) : (
              <>
                <p className="mt-2 font-body text-sm text-quase-preto/70">
                  Defina uma nova senha para acessar sua conta.
                </p>

                <form onSubmit={onSubmit} className="mt-10 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="nova">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="nova"
                        type={showNova ? "text" : "password"}
                        minLength={8}
                        required
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNova((s) => !s)}
                        aria-label={showNova ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-quase-preto/60 hover:text-quase-preto"
                      >
                        {showNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conf">Confirmar nova senha</Label>
                    <div className="relative">
                      <Input
                        id="conf"
                        type={showConf ? "text" : "password"}
                        minLength={8}
                        required
                        value={confirmar}
                        onChange={(e) => setConfirmar(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConf((s) => !s)}
                        aria-label={showConf ? "Ocultar senha" : "Mostrar senha"}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-quase-preto/60 hover:text-quase-preto"
                      >
                        {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-verde-raiz text-linho hover:bg-verde-musgo"
                  >
                    {submitting ? "Salvando..." : "Salvar nova senha"}
                  </Button>

                  {error && <p className="font-body text-xs text-destructive">{error}</p>}
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
