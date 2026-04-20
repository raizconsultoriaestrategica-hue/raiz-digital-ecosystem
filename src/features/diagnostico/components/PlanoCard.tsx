import type { Plano } from "../types";

interface PlanoCardProps {
  plano: Plano;
}

export function PlanoCard({ plano }: PlanoCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-verde-raiz p-6 text-linho">
      <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-dourado/10" />
      <div className="relative">
        <span className="mb-2.5 inline-block rounded-xl border border-dourado/30 bg-dourado/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dourado">
          {plano.badge}
        </span>
        <h3 className="font-display text-3xl font-semibold text-linho">{plano.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-linho/65">{plano.desc}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {plano.modulos.map((m) => (
            <span
              key={m}
              className="rounded-md border border-linho/15 bg-linho/10 px-2.5 py-1 text-[11px] text-linho/85"
            >
              {m}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-dourado/20 bg-dourado/10 px-4 py-3.5">
          <div>
            <div className="text-[11px] text-linho/50">INVESTIMENTO MENSAL</div>
            <div className="text-lg font-bold text-dourado">{plano.valor}</div>
            <div className="text-[10px] text-linho/40">{plano.duracao}</div>
          </div>
          <div className="text-right text-xs text-linho/60">
            Potencial:
            <br />
            <strong className="text-dourado">{plano.roi}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
