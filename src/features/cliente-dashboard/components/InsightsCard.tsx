import ReactMarkdown from "react-markdown";
import { fmtBRL } from "../logic";
import type { ClienteCfg } from "../types";
import BrandSymbolBg from "@/components/brand/BrandSymbolBg";

interface Props {
  texto: string;
  cfg: ClienteCfg;
}

export default function InsightsCard({ texto, cfg }: Props) {
  if (!texto) return null;
  return (
    <section className="relative overflow-hidden rounded-xl bg-verde-raiz p-7 sm:p-9 shadow-editorial">
      <BrandSymbolBg size={280} opacity={0.08} position="bottom-right" white />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-6 left-4 select-none font-display text-[100px] leading-none text-dourado/12"
        style={{ color: "rgba(201,168,76,0.12)" }}
      >
        “
      </span>
      <div className="relative z-10">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-dourado">
          Análise Estratégica
        </span>
        <div className="mt-4 space-y-3 text-[15px] font-light leading-[1.7] text-linho/80">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="text-linho/80">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold text-linho">{children}</strong>
              ),
              em: ({ children }) => <em className="italic text-linho/90">{children}</em>,
              h1: ({ children }) => (
                <h3 className="mt-4 font-display text-xl text-dourado">{children}</h3>
              ),
              h2: ({ children }) => (
                <h3 className="mt-4 font-display text-lg text-dourado">{children}</h3>
              ),
              h3: ({ children }) => (
                <h4 className="mt-3 font-display text-base text-dourado/90">{children}</h4>
              ),
              ul: ({ children }) => (
                <ul className="ml-5 list-disc space-y-1 text-linho/75">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="ml-5 list-decimal space-y-1 text-linho/75">{children}</ol>
              ),
              li: ({ children }) => <li className="text-linho/80">{children}</li>,
              a: ({ children, href }) => (
                <a href={href} className="text-dourado underline" target="_blank" rel="noreferrer">
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="rounded bg-linho/10 px-1 py-0.5 text-[13px] text-linho">
                  {children}
                </code>
              ),
            }}
          >
            {texto}
          </ReactMarkdown>
        </div>
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
