import { Button } from "@/components/ui/button";
import { PILARES } from "../data";

interface IntroScreenProps {
  onStart: () => void;
  onAdmin: () => void;
}

export function IntroScreen({ onStart, onAdmin }: IntroScreenProps) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-verde-raiz text-linho">
      <div className="mx-auto flex max-w-6xl flex-col px-6 py-10 md:px-10 md:py-12">
        <div className="mb-6 flex items-start justify-between">
          <div className="font-display text-2xl font-semibold tracking-tight">Raiz.</div>
          <button
            onClick={onAdmin}
            className="rounded-md border border-linho/15 bg-linho/5 px-3 py-1 text-[11px] text-linho/60 transition-colors hover:bg-linho/15 hover:text-linho"
          >
            Painel admin
          </button>
        </div>

        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-dourado/25 bg-dourado/10 px-3.5 py-1 text-[11px] font-medium tracking-wider text-dourado">
              FERRAMENTA INTERNA · CONSULTOR
            </span>
            <h1 className="font-display text-4xl font-semibold leading-tight md:text-6xl">
              Diagnóstico <span className="text-dourado">360°</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-linho/65 md:text-base">
              Mapa completo da maturidade da clínica em 7 pilares. Conduza a entrevista, gere o diagnóstico e
              recomende o plano certo na hora.
            </p>
            <div className="mt-8 max-w-xs">
              <Button onClick={onStart} className="h-12 w-full bg-dourado text-verde-raiz hover:bg-dourado/90">
                Iniciar diagnóstico
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {PILARES.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-lg border border-linho/10 bg-linho/5 px-3 py-3 text-xs text-linho/80"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-dourado/20 text-[10px] font-bold text-dourado">
                  {p.num}
                </span>
                <span className="truncate">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <footer className="mt-10 text-center text-[10px] tracking-wider text-linho/25">
          RAIZ CONSULTORIA ESTRATÉGICA · DIAGNÓSTICO INTERNO
        </footer>
      </div>
    </div>
  );
}
