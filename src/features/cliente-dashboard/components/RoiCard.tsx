import type { KpiItem } from "../types";
import { fmtBRL } from "../logic";

interface Props {
  kpis: KpiItem[];
  faturamentoBase: number | null | undefined;
}

interface GapImpact {
  key: string;
  label: string;
  atual: number;
  benchmark: number;
  unidade: string;
  gapPct: number;       // tamanho relativo do gap (para ranking)
  impactoRS: number;    // impacto financeiro mensal estimado (R$)
  descricao: string;    // descrição curta do cálculo
}

/**
 * Calcula impacto financeiro estimado por KPI ao atingir o benchmark.
 * Usa faturamento atual + ticket + conversão para derivar volume base.
 */
function calcImpacts(kpis: KpiItem[], faturamento: number): GapImpact[] {
  const get = (k: string) => kpis.find((x) => x.key === k);
  const conv = get("taxa_conversao");
  const ticket = get("ticket_medio_rs");
  const ocup = get("ocupacao_cadeiras");

  // Volume base derivado: atendimentos/mês ≈ faturamento / ticket
  const ticketAtual = ticket?.valor && ticket.valor > 0 ? ticket.valor : null;
  const convAtual = conv?.valor && conv.valor > 0 ? conv.valor : null;
  const atendimentosMes = ticketAtual ? faturamento / ticketAtual : 0;
  // Leads/mês ≈ atendimentos / (conversão / 100)
  const leadsMes = convAtual && atendimentosMes > 0 ? atendimentosMes / (convAtual / 100) : 0;

  const out: GapImpact[] = [];

  // Taxa de Conversão (higher) — leads ganhos extras × ticket atual
  if (conv && conv.valor !== null && conv.benchmark !== null && conv.valor < conv.benchmark && leadsMes > 0 && ticketAtual) {
    const ganhoPct = (conv.benchmark - conv.valor) / 100;
    const impacto = ganhoPct * leadsMes * ticketAtual;
    if (impacto > 0) {
      out.push({
        key: conv.key,
        label: conv.label,
        atual: conv.valor,
        benchmark: conv.benchmark,
        unidade: "%",
        gapPct: (conv.benchmark - conv.valor) / conv.benchmark,
        impactoRS: impacto,
        descricao: `+${(conv.benchmark - conv.valor).toFixed(0)} p.p. × ~${Math.round(leadsMes)} leads/mês`,
      });
    }
  }

  // Ticket Médio (higher) — ganho por atendimento × atendimentos
  if (ticket && ticket.valor !== null && ticket.benchmark !== null && ticket.valor < ticket.benchmark && atendimentosMes > 0) {
    const ganho = ticket.benchmark - ticket.valor;
    const impacto = ganho * atendimentosMes;
    if (impacto > 0) {
      out.push({
        key: ticket.key,
        label: ticket.label,
        atual: ticket.valor,
        benchmark: ticket.benchmark,
        unidade: "R$",
        gapPct: (ticket.benchmark - ticket.valor) / ticket.benchmark,
        impactoRS: impacto,
        descricao: `+${fmtBRL(ganho, { compact: true })} × ~${Math.round(atendimentosMes)} atend./mês`,
      });
    }
  }

  // Ocupação de Cadeiras (higher) — proporcional ao faturamento
  if (ocup && ocup.valor !== null && ocup.benchmark !== null && ocup.valor < ocup.benchmark && faturamento > 0) {
    const ratio = ocup.benchmark / ocup.valor;
    const impacto = faturamento * (ratio - 1);
    if (impacto > 0) {
      out.push({
        key: ocup.key,
        label: ocup.label,
        atual: ocup.valor,
        benchmark: ocup.benchmark,
        unidade: "%",
        gapPct: (ocup.benchmark - ocup.valor) / ocup.benchmark,
        impactoRS: impacto,
        descricao: `+${(ocup.benchmark - ocup.valor).toFixed(0)} p.p. de ocupação na agenda`,
      });
    }
  }

  // Ordena por impacto financeiro DESC e pega top 3
  return out.sort((a, b) => b.impactoRS - a.impactoRS).slice(0, 3);
}

export default function RoiCard({ kpis, faturamentoBase }: Props) {
  const hasFaturamento = !!(faturamentoBase && faturamentoBase > 0);
  const impacts = hasFaturamento ? calcImpacts(kpis, faturamentoBase as number) : [];
  const totalImpacto = impacts.reduce((s, i) => s + i.impactoRS, 0);
  const faturamentoPotencial = hasFaturamento ? (faturamentoBase as number) + totalImpacto : 0;
  const anual = totalImpacto * 12;
  const showEmptyState = !hasFaturamento || impacts.length === 0;

  const fmtVal = (v: number, u: string) => {
    if (u === "R$") return fmtBRL(v, { compact: true });
    if (u === "%") return `${v.toFixed(0)}%`;
    return String(v);
  };

  return (
    <section className="rounded-xl bg-verde-raiz p-6 sm:p-8 shadow-editorial">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-linho/10 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-dourado">
            Potencial de Crescimento Identificado
          </span>
          <h3 className="mt-1 font-display text-2xl text-linho sm:text-3xl">
            Análise de Gap — KPIs vs. Benchmarks de Mercado
          </h3>
        </div>
        <div className="rounded-lg border border-dourado/30 bg-dourado/10 px-4 py-3 md:text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dourado/80">
            Potencial Adicional Estimado
          </div>
          {showEmptyState ? (
            <div className="mt-1 font-display text-2xl leading-none text-linho/40 sm:text-3xl">
              —
            </div>
          ) : (
            <>
              <div className="mt-1 font-display text-2xl leading-none text-dourado sm:text-3xl">
                {fmtBRL(totalImpacto, { compact: true })}
                <span className="ml-1 text-xs font-normal text-linho/60">/mês</span>
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-linho/55">
                ≈ {fmtBRL(anual, { compact: true })} / ano
              </div>
            </>
          )}
        </div>
      </div>

      {showEmptyState ? (
        <div className="mt-6 rounded-lg border border-dashed border-linho/20 bg-linho/5 p-6 text-center">
          <p className="text-sm text-linho/75">
            {!hasFaturamento
              ? "Insira o faturamento atual para visualizar o potencial estimado."
              : "Cadastre os KPIs de Conversão, Ticket Médio e Ocupação para visualizar o potencial estimado."}
          </p>
          <p className="mt-2 text-[11px] text-linho/45">
            O cálculo cruza os dados atuais do cliente com os benchmarks de mercado para projetar o impacto financeiro.
          </p>
        </div>
      ) : (
        <>
          {/* Frase central */}
          <p className="mt-5 text-base leading-relaxed text-linho/85 sm:text-lg">
            Ao atingir os benchmarks nos {impacts.length} principais gaps, o faturamento potencial
            salta de{" "}
            <span className="font-display font-semibold text-linho">{fmtBRL(faturamentoBase)}</span>{" "}
            para{" "}
            <span className="font-display font-semibold text-dourado">{fmtBRL(faturamentoPotencial)}</span>
            <span className="text-linho/60">/mês</span>.
          </p>

          {/* Lista dos gaps */}
          <div className="mt-5 space-y-2.5">
            {impacts.map((g, i) => (
              <div
                key={g.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-linho/10 bg-linho/5 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-dourado/20 text-[11px] font-bold text-dourado">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-linho">{g.label}</div>
                    <div className="mt-0.5 text-[11px] text-linho/60">
                      Atual <span className="text-linho/85">{fmtVal(g.atual, g.unidade)}</span>
                      <span className="mx-1.5 text-linho/30">→</span>
                      Benchmark <span className="text-linho/85">{fmtVal(g.benchmark, g.unidade)}</span>
                      <span className="ml-2 text-linho/45">· {g.descricao}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wider text-linho/45">Impacto</div>
                  <div className="font-display text-lg text-dourado">
                    +{fmtBRL(g.impactoRS, { compact: true })}
                    <span className="ml-1 text-[10px] font-normal text-linho/55">/mês</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Rodapé */}
      <p className="mt-5 border-t border-linho/10 pt-4 text-[11px] leading-relaxed text-linho/45">
        Projeção baseada na correção dos gaps identificados vs. benchmarks de mercado.
        Resultado real depende da velocidade de implementação.
      </p>
    </section>
  );
}
