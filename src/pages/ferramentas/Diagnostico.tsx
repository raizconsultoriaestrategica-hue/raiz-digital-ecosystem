import { useEffect, useState } from "react";
import { useDiagnostico } from "@/features/diagnostico/hooks/useDiagnostico";
import { IntroScreen } from "@/features/diagnostico/screens/IntroScreen";
import { DadosScreen } from "@/features/diagnostico/screens/DadosScreen";
import { DiagScreen } from "@/features/diagnostico/screens/DiagScreen";
import { LoadingScreen } from "@/features/diagnostico/screens/LoadingScreen";
import { ResultScreen } from "@/features/diagnostico/screens/ResultScreen";
import { AdminScreen } from "@/features/diagnostico/screens/AdminScreen";

export default function Diagnostico() {
  const dx = useDiagnostico();
  const [adminOpen, setAdminOpen] = useState(false);

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
      {dx.state.step === "intro" && (
        <IntroScreen onStart={() => dx.goTo("dados")} onAdmin={() => setAdminOpen(true)} />
      )}
      {dx.state.step === "dados" && (
        <DadosScreen
          client={dx.state.client}
          selOpts={dx.state.selOpts}
          clienteId={dx.state.clienteId}
          onClientField={dx.setClientField}
          onSel={dx.setSel}
          onClienteIdChange={(id) => dx.setClienteId(id)}
          onBack={() => dx.goTo("intro")}
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
          clienteId={dx.state.clienteId}
          notas={dx.state.notas}
          onNotasChange={dx.setNotas}
          onRestart={dx.reset}
        />
      )}

      <AdminScreen open={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  );
}
