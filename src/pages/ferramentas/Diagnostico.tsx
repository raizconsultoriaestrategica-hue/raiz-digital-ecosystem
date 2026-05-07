import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useDiagnostico } from "@/features/diagnostico/hooks/useDiagnostico";
import { IntroScreen } from "@/features/diagnostico/screens/IntroScreen";
import { DadosScreen } from "@/features/diagnostico/screens/DadosScreen";
import { DiagScreen } from "@/features/diagnostico/screens/DiagScreen";
import { LoadingScreen } from "@/features/diagnostico/screens/LoadingScreen";
import { ResultScreen } from "@/features/diagnostico/screens/ResultScreen";

export default function Diagnostico() {
  const dx = useDiagnostico();
  const [params] = useSearchParams();

  // Pré-seleção de cliente via ?cliente=ID (vindo do painel admin). Vai direto para "dados"
  useEffect(() => {
    const cid = params.get("cliente");
    if (cid && cid !== dx.state.clienteId) {
      dx.setClienteId(cid);
      if (dx.state.step === "intro") dx.goTo("dados");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Loading → Result com pequeno delay (UX)
  useEffect(() => {
    if (dx.state.step !== "loading") return;
    const t = setTimeout(() => dx.goTo("result"), 1800);
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

  // Quebrar fora do padding do AppLayout para experiência full-screen
  return (
    <div className="-m-6 md:-m-10">
      <AnimatePresence mode="wait">
        {dx.state.step === "intro" && (
          <SlideStage key="intro">
            <IntroScreen
              ramo={dx.state.ramo}
              onRamoChange={dx.setRamo}
              onStart={() => dx.goTo("dados")}
            />
          </SlideStage>
        )}

        {dx.state.step === "dados" && (
          <SlideStage key="dados">
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
              onLoadPrevious={dx.loadPrevious}
              onBack={() => dx.goTo("intro")}
              onNext={() => dx.startDiag()}
            />
          </SlideStage>
        )}

        {dx.state.step === "diag" && (
          <SlideStage key="diag">
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
          </SlideStage>
        )}

        {dx.state.step === "loading" && (
          <SlideStage key="loading">
            <LoadingScreen />
          </SlideStage>
        )}

        {dx.state.step === "result" && (
          <SlideStage key="result">
            <ResultScreen
              client={dx.state.client}
              selOpts={dx.state.selOpts}
              scores={dx.state.scores}
              ramo={dx.state.ramo}
              clienteId={dx.state.clienteId}
              notas={dx.state.notas}
              analise={dx.state.analise}
              kpisIniciais={dx.state.kpisIniciais}
              activePilares={dx.activePilares}
              onNotasChange={dx.setNotas}
              onAnaliseChange={dx.setAnalise}
              onRestart={dx.reset}
            />
          </SlideStage>
        )}
      </AnimatePresence>
    </div>
  );
}

function SlideStage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -40, opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
