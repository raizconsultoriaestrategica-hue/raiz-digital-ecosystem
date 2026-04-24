import { fmtDate } from "../logic";
import type { ClienteCfg } from "../types";

interface Props {
  cfg: ClienteCfg;
  avgPct: number;
}

const CIRC = 289; // 2π × 46

export default function HeroCard({ cfg, avgPct }: Props) {
  const offset = CIRC - (CIRC * Math.max(0, Math.min(100, avgPct))) / 100;
  const tags = [
    cfg.inicio_consultoria ? `Início: ${fmtDate(cfg.inicio_consultoria)}` : null,
    cfg.mes_referencia ? `Mês: ${cfg.mes_referencia}` : null,
    cfg.especialidade,
    cfg.cidade,
  ].filter(Boolean) as string[];

  const titulo = cfg.nome_clinica || cfg.cliente_nome || "Clínica";
  const eyebrow =
    cfg.ramo === "medico"
      ? "Consultoria Estratégica em Medicina"
      : "Consultoria Estratégica em Odontologia";

  return (
    <section className="rounded-xl bg-verde-raiz px-6 py-7 shadow-editorial sm:px-9 sm:py-8">
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-dourado">
            {eyebrow}
          </span>
          <h1 className="mt-2 font-display text-[28px] leading-tight text-linho sm:text-[34px]">
            {titulo}
          </h1>
          <p className="mt-1 text-sm text-linho/55">
            {[cfg.especialidade, cfg.cidade].filter(Boolean).join(" · ") || "—"}
          </p>
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-linho/20 bg-linho/5 px-3 py-1 text-[11px] text-linho/85"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center md:justify-end">
          <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(30 22% 93% / 0.12)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="46"
              fill="none"
              stroke="#C9A84C"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
            />
            <text
              x="50" y="50"
              textAnchor="middle"
              dominantBaseline="central"
              transform="rotate(90 50 50)"
              className="font-display"
              fill="#F0EDEA"
              fontSize="22"
            >
              {avgPct}%
            </text>
          </svg>
        </div>
      </div>
    </section>
  );
}
