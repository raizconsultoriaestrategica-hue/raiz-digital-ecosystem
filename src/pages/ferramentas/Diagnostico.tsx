import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useDiagnostico } from "@/features/diagnostico/hooks/useDiagnostico";
import { DadosScreen } from "@/features/diagnostico/screens/DadosScreen";
import { DiagScreen } from "@/features/diagnostico/screens/DiagScreen";
import { LoadingScreen } from "@/features/diagnostico/screens/LoadingScreen";
import { ResultScreen } from "@/features/diagnostico/screens/ResultScreen";

export default function Diagnostico() {
  const dx = useDiagnostico();
  const [params] = useSearchParams();

  // Inicia direto na seleção de cliente
  useEffect(() => {
    if (dx.state.step === "intro") dx.goTo("dados");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="-m-4 md:-m-6 lg:-m-8">
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
    </div>
  );
}
