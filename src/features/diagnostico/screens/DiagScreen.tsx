import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScoreButtons } from "../components/ScoreButtons";
import { countUnanswered, fillUnansweredWithZero, getActiveQuestions, isAutonomo } from "../logic";
import type { Pilar, ScoresMap, SelOpts } from "../types";
import BrandSymbolBg from "@/components/brand/BrandSymbolBg";

interface DiagScreenProps {
  activePilares: Pilar[];
  currentPilar: number;
  scores: ScoresMap;
  selOpts: SelOpts;
  onSetScore: (pid: string, qi: number, score: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onFillNullWithZero: (pid: string) => void;
}

export function DiagScreen({
  activePilares, currentPilar, scores, selOpts, onSetScore, onPrev, onNext, onFillNullWithZero,
}: DiagScreenProps) {
  if (activePilares.length === 0) return null;
  const p = activePilares[currentPilar];
  const aq = getActiveQuestions(p, selOpts);
  const isFirst = currentPilar === 0;
  const isLast = currentPilar === activePilares.length - 1;
  const progress = ((currentPilar) / activePilares.length) * 100;
  const auto = isAutonomo(selOpts);

  const handleNext = () => {
    const unanswered = countUnanswered(scores, p.id);
    if (unanswered > 0) {
      const ok = window.confirm(`Há ${unanswered} pergunta(s) sem resposta neste pilar. Continuar mesmo assim?`);
      if (!ok) return;
    }
    onFillNullWithZero(p.id);
    onNext();
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-background pb-28">
      <header className="relative overflow-hidden bg-verde-raiz px-6 py-5 md:px-8">
        <BrandSymbolBg size={300} opacity={0.06} position="center" white />
        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="flex items-start justify-between">
            <span className="text-[11px] uppercase tracking-wider text-linho/50">
              Pilar {p.num} de {activePilares.length}
            </span>
            <span className="text-[11px] text-linho/40">{aq.length} questões</span>
          </div>
          <h2 className="mt-1 font-body text-lg font-semibold text-linho md:text-xl">{p.name}</h2>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-linho/15">
            <div
              className="h-full rounded-full bg-dourado transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={p.id}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="mx-auto max-w-3xl px-6 py-6 md:px-8"
          >
            <div className="mb-5 rounded-lg border-l-[3px] border-verde-musgo bg-card px-3.5 py-2.5 text-xs leading-relaxed text-quase-preto/70">
              ▸ {p.desc}
            </div>
            {p.questions.map((q, i) => {
              if (q.onlyWithTeam && auto) return null;
              const v = scores[p.id]?.[i];
              const value = v === "SKIP" ? null : (typeof v === "number" ? v : null);
              return (
                <div key={i} className="mb-3 rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 text-sm font-medium leading-snug text-quase-preto">{q.text}</div>
                  <ScoreButtons
                    labels={q.labels}
                    value={value}
                    onChange={(s) => onSetScore(p.id, i, s)}
                  />
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card px-6 py-3.5">
        <div className="mx-auto flex max-w-3xl gap-2.5">
          <Button variant="outline" onClick={onPrev} disabled={isFirst} className="disabled:opacity-30">
            ← Anterior
          </Button>
          <Button onClick={handleNext} className="flex-1 bg-verde-raiz text-linho hover:bg-verde-musgo">
            {isLast ? "Ver Diagnóstico →" : "Próximo Pilar →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
