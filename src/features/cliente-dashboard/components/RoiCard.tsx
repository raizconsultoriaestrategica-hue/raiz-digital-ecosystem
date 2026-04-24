import { computeRoi, fmtBRL } from "../logic";
import type { KpiItem } from "../types";

interface Props {
  kpis: KpiItem[];
  faturamentoBase: number | null | undefined;
}

export default function RoiCard({ kpis, faturamentoBase }: Props) {
  const { combinedFat, totalImpact, anual } = computeRoi(faturamentoBase, kpis);
  if (!faturamentoBase || totalImpact <= 0) return null;

  return (
    <section className="rounded-xl bg-verde-raiz p-6 sm:p-8 shadow-editorial">
      <div className="grid gap-6 md:grid-cols-2 md:items-center">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-dourado">
            Potencial de Crescimento Identificado
          </span>
          <p className="mt-3 max-w-md text-sm text-linho/75">
            Projeção baseada no fechamento dos gaps de Conversão, Ticket Médio e
            Ocupação até o benchmark do seu segmento.
          </p>
        </div>
        <div className="md:text-right">
          <div className="font-display text-[44px] leading-none text-dourado sm:text-[48px]">
            {fmtBRL(totalImpact, { compact: true })}
            <span className="ml-2 align-baseline text-sm font-normal text-linho/60">/mês</span>
          </div>
          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-linho/55">
            Equivalente a {fmtBRL(anual, { compact: true })} / ano
          </div>
          <div className="mt-1 text-xs text-linho/55">
            Faturamento projetado: {fmtBRL(combinedFat)}
          </div>
        </div>
      </div>
    </section>
  );
}
