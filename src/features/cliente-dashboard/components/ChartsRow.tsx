import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from "chart.js";
import type { KpiItem, PilarScore } from "../types";
import { fmtKpiValue } from "../logic";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface Props {
  pilares: PilarScore[];
  kpis: KpiItem[];
}

const KPIS_NO_CHART = [
  "taxa_conversao", "ticket_medio_rs", "taxa_no_show", "margem_liquida", "ocupacao_cadeiras",
];

export default function ChartsRow({ pilares, kpis }: Props) {
  const chartKpis = KPIS_NO_CHART
    .map((k) => kpis.find((x) => x.key === k))
    .filter((x): x is KpiItem => !!x && x.valor !== null && x.benchmark !== null);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {/* Evolução dos Pilares */}
      <div className="rounded-xl border border-border/70 bg-card p-5 shadow-soft">
        <h3 className="font-display text-xl text-verde-raiz">Evolução dos Pilares</h3>
        <p className="text-xs text-quase-preto/60">Score inicial → atual</p>
        <div className="mt-4 space-y-3">
          {pilares.length === 0 && (
            <p className="py-6 text-center text-sm text-quase-preto/50">
              Sem dados de pilares ainda.
            </p>
          )}
          {pilares.map((p) => {
            const max = p.max || 0;
            const ini = p.inicial ?? 0;
            const atu = p.atual ?? ini;
            const delta = p.delta;
            const deltaColor =
              delta === null ? "text-quase-preto/40"
                : delta > 0 ? "text-[#1F6B2E]"
                : delta < 0 ? "text-[#A2271B]" : "text-quase-preto/50";
            // Percentuais para largura visual e zonas de cor
            const pctIni = max > 0 ? Math.min(100, (ini / max) * 100) : 0;
            const pctAtu = max > 0 ? Math.min(100, (atu / max) * 100) : 0;
            const barColor =
              pctAtu <= 40 ? "bg-[#A2271B]"
                : pctAtu <= 70 ? "bg-[#C9A84C]"
                : "bg-[#2D5016]";
            return (
              <div key={p.key} className="pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-quase-preto">
                    <span className="mr-2 font-display text-dourado">{p.num}</span>
                    {p.label}
                  </span>
                  <span className={`font-semibold ${deltaColor}`}>
                    {ini}{p.atual !== null ? ` → ${atu}` : ""}
                    {delta !== null && (
                      <span className="ml-2">{delta > 0 ? `+${delta}` : delta}</span>
                    )}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-quase-preto/55">
                  Score: {atu} / máximo {max}
                </div>
                <div className="relative mt-3 h-2.5 w-full rounded-full bg-linho">
                  {/* Barra do score inicial (sombra leve) */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-verde-musgo/30"
                    style={{ width: `${pctIni}%` }}
                  />
                  {/* Barra do score atual com cor por zona */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
                    style={{ width: `${pctAtu}%` }}
                  />
                  {/* Marcador "Meta" em 70%. Linha tracejada espessa + label acima */}
                  <div
                    className="pointer-events-none absolute -top-3 bottom-0"
                    style={{ left: "70%", transform: "translateX(-50%)" }}
                    aria-label="Meta mínima 70%"
                  >
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-verde-raiz px-1 text-[8px] font-bold uppercase tracking-wider text-linho">
                      Meta
                    </span>
                  </div>
                  <div
                    className="pointer-events-none absolute -top-1 -bottom-1 border-l-[3px] border-dashed border-verde-raiz"
                    style={{ left: "70%" }}
                    title="Meta mínima (70%)"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Atual × Benchmark */}
      <div className="rounded-xl border border-border/70 bg-card p-5 shadow-soft">
        <h3 className="font-display text-xl text-verde-raiz">Atual × Benchmark</h3>
        <p className="text-xs text-quase-preto/60">Comparativo dos principais KPIs</p>
        <p className="mt-1 text-[11px] text-quase-preto/50">
          Valores normalizados como % do benchmark (100% = no benchmark)
        </p>
        <div className="mt-4 h-[260px]">
          {chartKpis.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-quase-preto/50">
              Sem KPIs comparáveis ainda.
            </p>
          ) : (
            <Bar
              data={{
                labels: chartKpis.map((k) => k.label),
                datasets: [
                  {
                    label: "Atual (% do benchmark)",
                    data: chartKpis.map((k) => {
                      const bench = k.benchmark as number;
                      const val = k.valor as number;
                      if (!bench || !val) return 0;
                      const pct = k.higher
                        ? (val / bench) * 100
                        : (bench / val) * 100;
                      return Math.round(pct);
                    }),
                    backgroundColor: chartKpis.map((k) => {
                      const bench = k.benchmark as number;
                      const val = k.valor as number;
                      if (!bench || !val) return "#A2271B";
                      const pct = k.higher
                        ? (val / bench) * 100
                        : (bench / val) * 100;
                      if (pct >= 85) return "#2D5016";
                      if (pct >= 60) return "#C9A84C";
                      return "#A2271B";
                    }),
                    borderRadius: 4,
                  },
                  {
                    label: "Benchmark (100%)",
                    data: chartKpis.map(() => 100),
                    backgroundColor: "rgba(201,168,76,0.4)",
                    borderRadius: 4,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                  legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const k = chartKpis[ctx.dataIndex];
                        const isAtual = ctx.datasetIndex === 0;
                        const realValue = isAtual ? (k.valor as number) : (k.benchmark as number);
                        const pct = ctx.parsed.y;
                        return `${ctx.dataset.label}: ${pct}% (${fmtKpiValue(realValue, k.unidade)})`;
                      },
                    },
                  },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: {
                    grid: { color: "rgba(0,0,0,0.05)" },
                    ticks: {
                      font: { size: 10 },
                      callback: (v) => `${v}%`,
                    },
                  },
                },
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
