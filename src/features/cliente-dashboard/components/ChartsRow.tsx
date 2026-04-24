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
            const ini = p.inicial ?? 0;
            const atu = p.atual ?? ini;
            const delta = p.delta;
            const deltaColor =
              delta === null ? "text-quase-preto/40"
                : delta > 0 ? "text-[#1F6B2E]"
                : delta < 0 ? "text-[#A2271B]" : "text-quase-preto/50";
            return (
              <div key={p.key}>
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
                <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-linho">
                  <div className="absolute inset-y-0 left-0 bg-verde-musgo/40" style={{ width: `${ini}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-verde-raiz" style={{ width: `${atu}%` }} />
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
                    label: "Atual",
                    data: chartKpis.map((k) => k.valor as number),
                    backgroundColor: "#4A7C5F",
                    borderRadius: 4,
                  },
                  {
                    label: "Benchmark",
                    data: chartKpis.map((k) => k.benchmark as number),
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
                        return `${ctx.dataset.label}: ${fmtKpiValue(ctx.parsed.y, k.unidade)}`;
                      },
                    },
                  },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 10 } } },
                },
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
