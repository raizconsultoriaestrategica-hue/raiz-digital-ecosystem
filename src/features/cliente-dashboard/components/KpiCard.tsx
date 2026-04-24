import { fmtKpiValue } from "../logic";
import type { KpiItem } from "../types";

const STATUS_COLOR: Record<KpiItem["status"], { bar: string; pill: string; ring: string }> = {
  ok:      { bar: "bg-[#22863A]", pill: "bg-[#E2F3E6] text-[#1F6B2E]", ring: "ring-[#22863A]/30" },
  warn:    { bar: "bg-dourado",   pill: "bg-dourado/15 text-[#8B6F1E]", ring: "ring-dourado/30" },
  crit:    { bar: "bg-[#C0392B]", pill: "bg-[#FBE6E3] text-[#A2271B]", ring: "ring-[#C0392B]/25" },
  neutral: { bar: "bg-verde-musgo/40", pill: "bg-linho text-quase-preto/60", ring: "ring-border" },
};

export default function KpiCard({ kpi }: { kpi: KpiItem }) {
  const c = STATUS_COLOR[kpi.status];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-soft transition-transform duration-200 hover:-translate-y-0.5">
      <div className={`h-[3px] w-full ${c.bar}`} />
      <div className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-quase-preto/55">
          {kpi.label}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`font-display leading-none text-verde-raiz ${
              kpi.valorTexto ? "text-[22px]" : "text-[36px]"
            }`}
          >
            {kpi.valorTexto ?? fmtKpiValue(kpi.valor, kpi.unidade)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="text-quase-preto/60">
            {kpi.benchmarkTexto
              ? kpi.benchmarkTexto
              : kpi.noCompare || kpi.benchmark === null
                ? "Sem benchmark"
                : `Meta ${fmtKpiValue(kpi.benchmark, kpi.unidade)}`}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.pill}`}>
            {kpi.statusLabel}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-linho">
          <div
            className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
            style={{ width: `${Math.max(2, kpi.pct)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
