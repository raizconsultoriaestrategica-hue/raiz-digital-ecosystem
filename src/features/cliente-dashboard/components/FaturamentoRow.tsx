import { fmtBRL, fmtDate } from "../logic";
import type { ClienteCfg } from "../types";

export default function FaturamentoRow({ cfg }: { cfg: ClienteCfg }) {
  const atual = cfg.faturamento_inicial ?? null;
  const meta = cfg.meta_faturamento ?? null;
  const pct =
    atual && meta && meta > 0 ? Math.min(100, Math.round((atual / meta) * 100)) : 0;

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <Card title="Faturamento Atual" hint="Apurado no início da consultoria">
        <span className="font-display text-4xl text-verde-raiz">{fmtBRL(atual)}</span>
      </Card>

      <Card title="Meta da Consultoria" hint={meta ? `Objetivo: ${fmtBRL(meta)}` : "Defina com o consultor"}>
        <div className="flex items-baseline justify-between">
          <span className="font-display text-4xl text-verde-raiz">{pct}%</span>
          <span className="text-xs text-quase-preto/60">do alvo</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-linho">
          <div
            className="h-full rounded-full bg-dourado transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      <Card
        title="Início da Consultoria"
        hint={meta ? `Meta: ${fmtBRL(meta)}/mês` : undefined}
      >
        <span className="font-display text-3xl text-verde-raiz">
          {fmtDate(cfg.inicio_consultoria)}
        </span>
      </Card>
    </section>
  );
}

function Card({
  title, hint, children,
}: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-soft">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-quase-preto/55">
        {title}
      </div>
      <div className="mt-3">{children}</div>
      {hint && <div className="mt-2 text-xs text-quase-preto/60">{hint}</div>}
    </div>
  );
}
