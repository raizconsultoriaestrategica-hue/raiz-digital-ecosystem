import KpiCard from "./KpiCard";
import { GRUPO_LABEL, KPI_BY_KEY, type KpiMeta } from "../kpis";
import type { KpiItem } from "../types";

export default function KpiGrid({ kpis }: { kpis: KpiItem[] }) {
  if (!kpis.length) return null;

  const grupos: KpiMeta["grupo"][] = ["atendimento", "financeiro", "operacional"];

  return (
    <div className="space-y-8">
      {grupos.map((g) => {
        const items = kpis.filter((k) => KPI_BY_KEY[k.key]?.grupo === g);
        if (!items.length) return null;
        return (
          <section key={g}>
            <h3 className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-verde-musgo">
              <span className="h-px flex-1 bg-border" aria-hidden />
              <span>{GRUPO_LABEL[g]}</span>
              <span className="h-px flex-1 bg-border" aria-hidden />
            </h3>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
              {items.map((k) => <KpiCard key={k.key} kpi={k} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
