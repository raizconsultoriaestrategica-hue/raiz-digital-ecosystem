import { useEffect } from "react";
import KpiCard from "./KpiCard";
import RoiCard from "./RoiCard";
import { fmtDate } from "../logic";
import type { ClienteCfg, KpiItem, PilarScore } from "../types";
import BrandSymbolBg from "@/components/brand/BrandSymbolBg";

interface Props {
  open: boolean;
  onClose: () => void;
  cfg: ClienteCfg;
  kpis: KpiItem[];
  pilares: PilarScore[];
}

const TOP8 = [
  "taxa_conversao", "ticket_medio_rs", "taxa_no_show", "ocupacao_cadeiras",
  "margem_liquida", "faturamento_bruto", "nps", "inadimplencia",
];

export default function PresentationMode({ open, onClose, cfg, kpis, pilares }: Props) {
  useEffect(() => {
    if (!open) return;
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.exitFullscreen?.().catch(() => {});
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [open, onClose]);

  if (!open) return null;
  const top = TOP8.map((k) => kpis.find((x) => x.key === k)).filter((x): x is KpiItem => !!x);
  const titulo = cfg.nome_clinica || cfg.cliente_nome || "Clínica";

  return (
    <div className="fixed inset-0 z-[9999] overflow-auto" style={{ backgroundColor: "#0D2218" }}>
      <BrandSymbolBg size={500} opacity={0.05} position="center" white className="!fixed" />
      <div className="relative z-10 mx-auto max-w-[1400px] px-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-dourado">
              Modo Apresentação
            </span>
            <h1 className="font-display text-4xl text-linho">{titulo}</h1>
            <p className="text-sm text-linho/60">
              {[cfg.especialidade, cfg.cidade].filter(Boolean).join(" · ")}
              {cfg.mes_referencia ? ` · ${cfg.mes_referencia}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-linho/20 bg-linho/5 px-4 py-2 text-sm text-linho hover:bg-linho/15"
          >
            Sair (Esc)
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {top.map((k) => <KpiCard key={k.key} kpi={k} />)}
        </div>

        <div className="mt-6">
          <RoiCard kpis={kpis} faturamentoBase={cfg.faturamento_inicial} />
        </div>

        <div className="mt-6 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
          {pilares.map((p) => (
            <div key={p.key} className="rounded-lg border border-linho/10 bg-linho/5 p-3">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-linho/60">
                <span>{p.num}</span>
                <span>{p.atual ?? p.inicial ?? "—"}</span>
              </div>
              <div className="mt-1 text-sm text-linho">{p.label}</div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-linho/10">
                <div className="h-full bg-dourado" style={{ width: `${p.atual ?? p.inicial ?? 0}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center text-xs uppercase tracking-[0.2em] text-linho/40">
          Raiz Consultoria Estratégica · {fmtDate(new Date().toISOString())}
        </div>
      </div>
    </div>
  );
}
