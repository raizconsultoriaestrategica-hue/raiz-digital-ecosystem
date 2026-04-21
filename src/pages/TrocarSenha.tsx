import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TopProgress } from "@/components/ui/top-progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TrocarSenha() {
  const { user, role, primeiroAcesso, refreshPrimeiroAcesso, signOut } = useAuth();
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  if (role === "admin") return <Navigate to="/dashboard" replace />;
  if (role === "cliente" && primeiroAcesso === false) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 8) {
      toast.error("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    const { error: authErr } = await supabase.auth.updateUser({ password: novaSenha });
    if (authErr) {
      setSubmitting(false);
      toast.error(authErr.message);
      return;
    }
    const { error: dbErr } = await supabase.rpc("marcar_primeiro_acesso_concluido" as never);
    if (dbErr) {
      setSubmitting(false);
      toast.error("Senha alterada, mas falhou ao atualizar perfil: " + dbErr.message);
      return;
    }
    await refreshPrimeiroAcesso();
    setSubmitting(false);
    toast.success("Senha atualizada com sucesso.");
    navigate("/dashboard", { replace: true });
  };

  const handleSair = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <TopProgress active={submitting} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-raiz p-6">
        <div className="w-full max-w-md rounded-lg bg-off-white p-8 shadow-2xl md:p-10">
          <div className="mb-6">
            <div className="font-display text-2xl text-verde-raiz">
              Raiz<span className="text-dourado">.</span>
            </div>
            <h1 className="mt-4 font-display text-3xl text-verde-raiz">Defina sua nova senha</h1>
            <p className="mt-2 font-body text-sm text-quase-preto/70">
              Por segurança, troque a senha provisória antes de continuar.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nova">Nova senha</Label>
              <Input
                id="nova"
                type="password"
                required
                minLength={8}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conf">Confirmar nova senha</Label>
              <Input
                id="conf"
                type="password"
                required
                minLength={8}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-verde-raiz text-linho hover:bg-verde-musgo"
            >
              {submitting ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>

          <button
            type="button"
            onClick={handleSair}
            className="mt-6 block w-full text-center font-body text-xs text-quase-preto/60 hover:text-quase-preto"
          >
            Sair
          </button>
        </div>
      </div>
    </>
  );
}
