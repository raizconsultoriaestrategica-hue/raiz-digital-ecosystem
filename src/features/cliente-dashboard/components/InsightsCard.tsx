import { fmtBRL } from "../logic";
import type { ClienteCfg } from "../types";

interface Props {
  texto: string;
  cfg: ClienteCfg;
}

export default function InsightsCard({ texto, cfg }: Props) {
  if (!texto) return null;
  return (
    <section className="relative overflow-hidden rounded-xl bg-verde-raiz p-7 sm:p-9 shadow-editorial">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-6 left-4 select-none font-display text-[100px] leading-none text-dourado/12"
        style={{ color: "rgba(201,168,76,0.12)" }}
      >
        “
      </span>
      <div className="relative">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-dourado">
          Análise Estratégica
        </span>
        <p
          className="mt-4 text-[15px] font-light leading-[1.7] text-linho/80"
          style={{ whiteSpace: "pre-line" }}
        >
          {texto}
        </p>
        {(cfg.meta_faturamento || cfg.mes_referencia) && (
          <div className="mt-6 border-t border-linho/10 pt-4 text-xs uppercase tracking-[0.18em] text-linho/55">
            {cfg.meta_faturamento ? `Meta: ${fmtBRL(cfg.meta_faturamento)}/mês` : ""}
            {cfg.meta_faturamento && cfg.mes_referencia ? " — " : ""}
            {cfg.mes_referencia || ""}
          </div>
        )}
      </div>
    </section>
  );
}
