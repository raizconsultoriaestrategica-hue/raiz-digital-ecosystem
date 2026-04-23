import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDiagnostico } from "@/features/diagnostico/hooks/useDiagnostico";
import { DadosScreen } from "@/features/diagnostico/screens/DadosScreen";
import { DiagScreen } from "@/features/diagnostico/screens/DiagScreen";
import { LoadingScreen } from "@/features/diagnostico/screens/LoadingScreen";
import { ResultScreen } from "@/features/diagnostico/screens/ResultScreen";
import { RepositorioDiagnosticos } from "@/features/diagnostico/screens/RepositorioDiagnosticos";
import { cn } from "@/lib/utils";

type Tab = "novo" | "repo";

export default function Diagnostico() {
  const dx = useDiagnostico();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "repo" ? "repo" : "novo";

  // Inicia direto na seleção de cliente
  useEffect(() => {
    if (tab === "novo" && dx.state.step === "intro") dx.goTo("dados");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Pré-seleção de cliente via ?cliente=ID (vindo do painel admin)
  useEffect(() => {
    const cid = params.get("cliente");
    if (cid && cid !== dx.state.clienteId) dx.setClienteId(cid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Loading → Result com pequeno delay (preserva UX original)
  useEffect(() => {
    if (dx.state.step !== "loading") return;
    const t = setTimeout(() => dx.goTo("result"), 1600);
    return () => clearTimeout(t);
  }, [dx.state.step, dx]);

  const handleNextPilar = () => {
    if (dx.state.currentPilar < dx.activePilares.length - 1) {
      dx.setCurrentPilar(dx.state.currentPilar + 1);
    } else {
      dx.goTo("loading");
    }
  };

  const handlePrevPilar = () => {
    if (dx.state.currentPilar > 0) dx.setCurrentPilar(dx.state.currentPilar - 1);
    else dx.goTo("dados");
  };

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    if (t === "novo") next.delete("tab");
    else next.set("tab", "repo");
    setParams(next, { replace: true });
  };

  return (
    <div className="-m-4 md:-m-6 lg:-m-8">
      {/* Sub-header com tabs (escondido durante o fluxo do diagnóstico) */}
      {(tab === "repo" || dx.state.step === "dados" || dx.state.step === "intro") && (
        <div className="border-b border-border bg-card px-5 py-3 md:px-8">
          <div className="mx-auto flex max-w-5xl gap-1.5">
            <TabBtn active={tab === "novo"} onClick={() => setTab("novo")}>
              Novo diagnóstico
            </TabBtn>
            <TabBtn active={tab === "repo"} onClick={() => setTab("repo")}>
              Repositório
            </TabBtn>
          </div>
        </div>
      )}

      {tab === "repo" ? (
        <RepositorioDiagnosticos />
      ) : (
        <>
          {(dx.state.step === "intro" || dx.state.step === "dados") && (
            <DadosScreen
              client={dx.state.client}
              selOpts={dx.state.selOpts}
              ramo={dx.state.ramo}
              kpisIniciais={dx.state.kpisIniciais}
              clienteId={dx.state.clienteId}
              onClientField={dx.setClientField}
              onSel={dx.setSel}
              onRamoChange={dx.setRamo}
              onKpiChange={dx.setKpi}
              onClienteIdChange={(id) => dx.setClienteId(id)}
              onBack={() => window.history.back()}
              onNext={() => dx.startDiag()}
            />
          )}
          {dx.state.step === "diag" && (
            <DiagScreen
              activePilares={dx.activePilares}
              currentPilar={dx.state.currentPilar}
              scores={dx.state.scores}
              selOpts={dx.state.selOpts}
              onSetScore={dx.setScore}
              onPrev={handlePrevPilar}
              onNext={handleNextPilar}
              onFillNullWithZero={dx.fillNullWithZero}
            />
          )}
          {dx.state.step === "loading" && <LoadingScreen />}
          {dx.state.step === "result" && (
            <ResultScreen
              client={dx.state.client}
              selOpts={dx.state.selOpts}
              scores={dx.state.scores}
              ramo={dx.state.ramo}
              clienteId={dx.state.clienteId}
              notas={dx.state.notas}
              analise={dx.state.analise}
              onNotasChange={dx.setNotas}
              onAnaliseChange={dx.setAnalise}
              onRestart={dx.reset}
            />
          )}
        </>
      )}
    </div>
  );
}

function TabBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
        active
          ? "bg-verde-raiz text-linho"
          : "text-quase-preto/65 hover:bg-muted hover:text-quase-preto",
      )}
    >
      {children}
    </button>
  );
}
