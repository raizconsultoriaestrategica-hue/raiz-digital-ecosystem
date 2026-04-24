import type { ModuloItem } from "../types";

const STATUS_BAR: Record<ModuloItem["status"], string> = {
  "Concluído":     "bg-[#22863A]",
  "Em Andamento":  "bg-dourado",
  "Pausado":       "bg-[#C0392B]",
  "Não Iniciado":  "bg-verde-musgo/30",
};
const STATUS_PILL: Record<ModuloItem["status"], string> = {
  "Concluído":     "bg-[#E2F3E6] text-[#1F6B2E]",
  "Em Andamento":  "bg-dourado/15 text-[#8B6F1E]",
  "Pausado":       "bg-[#FBE6E3] text-[#A2271B]",
  "Não Iniciado":  "bg-linho text-quase-preto/60",
};

export default function ModulesGrid({ modulos }: { modulos: ModuloItem[] }) {
  if (!modulos.length) return null;
  return (
    <section>
      <h3 className="mb-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-verde-musgo">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span>Cronograma de Módulos</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </h3>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
        {modulos.map((m, i) => (
          <article
            key={`${m.codigo}-${i}`}
            className="rounded-xl border border-border/70 bg-card p-4 shadow-soft"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-verde-raiz px-2 py-1 font-display text-sm text-dourado">
                {m.codigo}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-tight text-quase-preto">{m.nome}</div>
                {m.pilar && <div className="mt-0.5 text-[11px] text-quase-preto/55">Pilar: {m.pilar}</div>}
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-linho">
              <div
                className={`h-full rounded-full transition-all duration-700 ${STATUS_BAR[m.status]}`}
                style={{ width: `${m.pctConcluido}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-quase-preto/60">{m.pctConcluido}% concluído</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[m.status]}`}>
                {m.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
