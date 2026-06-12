import { useMemo } from "react";
import { PILARES, PLANOS, FRENTES, fmtMoney, getBarColor, classifFor, type PlanoKey } from "../data";
import { ANCORAGENS, calcMensalidade, type ModuloDb, type OrcamentoForm } from "../types";

const DURACAO_MESES: Record<PlanoKey, number> = { base: 4, crescimento: 5, expansao: 6 };

interface Props {
  form: OrcamentoForm;
  modulosDb: ModuloDb[];
}

export function OrcamentoPreview({ form, modulosDb }: Props) {
  const data = useMemo(() => {
    const nomeCliente = form.nomeCliente || "Cliente";
    const nomeClinica = form.nomeClinica || "";
    const nome = nomeClinica || nomeCliente;
    const espec = form.especialidade;
    const cidade = form.cidade || "—";
    const fat = parseFloat(form.faturamento) || 0;
    const meta = parseFloat(form.meta) || 0;
    const score = parseFloat(form.score) || 0;
    const scoreMax = parseFloat(form.scoreMax) || 96;
    const scorePct = scoreMax > 0 ? (score / scoreMax) * 100 : 0;
    const classif = classifFor(scorePct);
    const plano = PLANOS[form.plano];

    const pilares = PILARES.map((p) => {
      const raw = form.pilarScores[p.id];
      const v = raw === undefined || raw === "" ? NaN : parseFloat(raw);
      // p07 (Crescimento & Expansão): se ausente/inválido, força 0% para manter barra visível
      const pct = isNaN(v)
        ? (p.id === "p07" ? 0 : null)
        : Math.min(100, Math.max(0, v));
      return { ...p, pct };
    });

    const selectedMods = modulosDb.filter((m) => form.modulos[m.codigo]);

    // Mensalidade: valor de referência, desconto comercial e programa de indicação.
    const mensalidade = calcMensalidade(form);

    // Frentes: agrupa os módulos selecionados por pilar e usa a linguagem do
    // deck (nome da frente + resultado), sem expor códigos de módulo ao cliente.
    const frentesSel = (() => {
      const byPilar = new Map<number, ModuloDb[]>();
      for (const m of selectedMods) {
        if (!byPilar.has(m.pilar)) byPilar.set(m.pilar, []);
        byPilar.get(m.pilar)!.push(m);
      }
      return [...byPilar.entries()]
        .map(([pilar, mods]) => {
          const pid = `p${String(pilar).padStart(2, "0")}`;
          const f = FRENTES[pid] ?? { nome: mods[0].pilar_nome, resultado: "", entrega: mods.map((m) => m.nome).join(" · ") };
          const fase = Math.min(...mods.map((m) => m.fase));
          return { pid, pilar, fase, nome: f.nome, resultado: f.resultado, entrega: f.entrega, mods };
        })
        .sort((a, b) => a.fase - b.fase || a.pilar - b.pilar);
    })();

    const duracao = parseInt(form.cicloInicialMeses, 10) || DURACAO_MESES[form.plano] || 5;

    const dataFmt = form.data
      ? new Date(form.data + "T12:00").toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "—";

    const validadeDate = form.data
      ? (() => {
          const d = new Date(form.data + "T12:00");
          d.setDate(d.getDate() + 15);
          return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
        })()
      : "—";

    const pilarSorted = [...pilares]
      .map((p) => ({ ...p, pctFallback: p.pct ?? 50 }))
      .sort((a, b) => a.pctFallback - b.pctFallback);

    // Cronograma realista por fases (não amontoa módulos num mês só). As frentes
    // são distribuídas pelas duas metades do ciclo, espelhando o deck.
    const timelineFromModules = (() => {
      if (frentesSel.length === 0) return null;
      const mid = Math.max(1, Math.ceil(duracao / 2));
      let g1 = frentesSel.filter((f) => f.fase === 1);
      let g2 = frentesSel.filter((f) => f.fase >= 2);
      // Se todas as frentes caíram numa fase só, equilibra dividindo por ordem
      // nas duas metades do ciclo, para o cronograma não concentrar tudo no início.
      if (g2.length === 0 && g1.length > 2) {
        const half = Math.ceil(g1.length / 2);
        g2 = g1.slice(half);
        g1 = g1.slice(0, half);
      } else if (g1.length === 0 && g2.length > 2) {
        const half = Math.ceil(g2.length / 2);
        g1 = g2.slice(0, half);
        g2 = g2.slice(half);
      }
      const f1 = g1;
      const f2 = g2;
      const rows: { n: string; period: string; title: string; desc: string }[] = [];
      rows.push({
        n: "1",
        period: "Semanas 1–2",
        title: "Diagnóstico & Kickoff",
        desc: "Onboarding, definição de metas e indicadores e cronograma detalhado de execução.",
      });
      if (f1.length > 0) {
        rows.push({
          n: String(rows.length + 1),
          period: `Meses 1–${mid}`,
          title: "Fase 1 · Estruturação",
          desc: f1.map((f) => f.nome).join(" · "),
        });
      }
      if (f2.length > 0) {
        rows.push({
          n: String(rows.length + 1),
          period: `Meses ${mid + 1}–${duracao}`,
          title: "Fase 2 · Aceleração",
          desc: f2.map((f) => f.nome).join(" · "),
        });
      }
      rows.push({
        n: String(rows.length + 1),
        period: "Resultado",
        title: "Faturamento em trajetória",
        desc: meta
          ? `Meta de ${fmtMoney(meta)} com processos documentados e menos dependência do dono.`
          : "Crescimento com processos documentados e menos dependência do dono.",
      });
      return rows;
    })();

    // Fallback genérico (quando nenhum módulo está selecionado)
    const timelineFallback = [
      { n: "1", period: "Semanas 1–2", title: "Diagnóstico Profundo & Kickoff", desc: "Onboarding completo, mapeamento detalhado de processos, definição de metas, indicadores e cronograma de execução." },
      { n: "2", period: "Meses 1–2", title: `Estruturação: ${pilarSorted[0].name.split("&")[0].trim()}`, desc: "Implementação dos processos prioritários, criação de scripts e templates, primeiro treinamento de equipe." },
      { n: "3", period: "Mês 2–3", title: `Ativação: ${(pilarSorted[1] || pilarSorted[0]).name.split("&")[0].trim()}`, desc: "Lançamento de estratégias de captação e conversão. Acompanhamento semanal de métricas e ajustes." },
      { n: "4", period: "Mês 3+", title: "Aceleração & Consolidação", desc: "Otimização dos resultados, ajuste de estratégias e escalonamento do que está funcionando." },
      { n: "5", period: "Resultado Final", title: "Faturamento em Trajetória", desc: "Meta: " + (meta ? fmtMoney(meta) : "faturamento crescente") + " com processos documentados e negócio com menos dependência do dono." },
    ];

    const timeline = timelineFromModules ?? timelineFallback;

    const roiAbs = fat && meta
      ? `potencial de +${fmtMoney(meta - fat)}/mês no faturamento`
      : "no faturamento em até 6 meses";

    const ancoragemFrase = form.ancoragemIA
      ? form.ancoragemIA
      : form.ancoragem !== null && form.ancoragem !== undefined
        ? ANCORAGENS[form.ancoragem] ?? null
        : null;

    return {
      nome, nomeCliente, nomeClinica, espec, cidade, fat, meta, score, scoreMax, scorePct,
      classif, plano, pilares, selectedMods, frentesSel, dataFmt, timeline, roiAbs,
      mensalidade, duracao, validadeDate, ancoragemFrase, formaPagamento: form.formaPagamento,
    };
  }, [form, modulosDb]);

  return (
    <div className="orc-doc-wrap flex-1 px-4 md:px-8 py-6 md:py-10 overflow-y-auto flex justify-center bg-[#E8E4E0]">
      <div
        className="orc-doc bg-white shadow-[0_8px_40px_rgba(0,0,0,0.15)] rounded-[4px] overflow-hidden relative"
        style={{ width: 794, minHeight: 1123 }}
      >
        {/* Cabeçalho secundário (visível apenas na impressão, a partir da pág. 2) */}
        <div className="orc-running-header" aria-hidden="true">
          <span className="orc-running-brand">RAIZ · Consultoria Estratégica</span>
          <span className="orc-running-client">{data.nomeClinica || data.nomeCliente}</span>
        </div>
        {/* CAPA */}
        <div className="pg-cover relative overflow-hidden px-[52px] pt-14 pb-12" style={{ background: "#1C3D2E", minHeight: 420 }}>
          <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full" style={{ border: "70px solid rgba(201,168,76,0.1)" }} />
          <div className="absolute -top-[60px] -left-[60px] w-[240px] h-[240px] rounded-full" style={{ border: "50px solid rgba(255,255,255,0.04)" }} />
          <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/40 mb-10">
            Raiz Consultoria Estratégica · Confidencial
          </div>
          <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-dourado mb-2.5">
            Proposta Comercial
          </div>
          <h1 className="font-display text-[44px] font-semibold text-white leading-[1.1] mb-2">
            Planejamento<br />Estratégico &amp; Orçamento
          </h1>
          <div className="text-[18px] text-white/70 italic font-display mb-1">
            {data.nomeClinica || data.nomeCliente}{data.espec ? ` · ${data.espec}` : ""}
          </div>
          {data.nomeClinica && data.nomeCliente && (
            <div className="text-[13px] text-white/50 mb-8">{data.nomeCliente}</div>
          )}
          {!(data.nomeClinica && data.nomeCliente) && <div className="mb-8" />}
          <div className="w-[60px] h-[2px] bg-dourado my-7" />
          <div className="flex gap-6 flex-wrap relative z-10">
            <CoverMeta label="Localização" value={data.cidade} />
            <CoverMeta label="Data da proposta" value={data.dataFmt} />
            <CoverMeta label="Faturamento atual" value={data.fat ? fmtMoney(data.fat) : "—"} />
            <CoverMeta label="Meta" value={data.meta ? fmtMoney(data.meta) : "—"} />
          </div>
        </div>

        {/* DIAGNÓSTICO */}
        <Section label="01 · Resultado do Diagnóstico" title={`Diagnóstico 360° · ${data.nome}`}>
          {data.fat > 0 && (
            <div className="grid grid-cols-4 gap-2.5 mb-5">
              {[
                ["Faturamento atual", fmtMoney(data.fat)],
                ["Meta", data.meta ? fmtMoney(data.meta) : "—"],
                ["Potencial / mês", data.meta > data.fat ? "+" + fmtMoney(data.meta - data.fat) : "—"],
                ["Maturidade", data.scoreMax > 0 ? Math.round(data.scorePct) + "%" : "—"],
              ].map(([label, val], i) => (
                <div key={i} className="bg-white border border-[#e8e4e0] rounded-[8px] px-3 py-2.5 text-center">
                  <div className="font-display text-[19px] font-semibold text-verde-raiz leading-tight">{val}</div>
                  <div className="text-[8.5px] uppercase tracking-[0.08em] text-[#8A8276] mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-[auto_1fr] gap-5 items-center bg-[#f8f7f5] rounded-[10px] p-5 mb-5">
            <div className="text-center">
              <div className="font-display text-[48px] font-semibold text-verde-raiz leading-none">
                {data.score || "—"}
              </div>
              <div className="text-[11px] text-[#718096] mt-0.5">de {data.scoreMax} pts</div>
              <div className="text-[11px] font-bold text-dourado mt-1.5">
                {data.scoreMax > 0 ? Math.round(data.scorePct) + "%" : ",%"}
              </div>
            </div>
            <div>
              <div className="text-[13px] font-bold text-verde-raiz mb-1">{data.classif.label}</div>
              <div className="text-[12px] text-[#718096] leading-[1.55]">{data.classif.desc}</div>
            </div>
          </div>

          <div className="mb-4">
            {data.pilares.map((p) => {
              const color = p.pct !== null ? getBarColor(p.pct) : "#E2E8F0";
              return (
                <div key={p.id} className="mb-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-[12px] font-semibold text-quase-preto">{p.name}</div>
                    <div className="text-[11px] font-bold" style={{ color }}>
                      {p.pct !== null ? `${p.pct}%` : "—"}
                    </div>
                  </div>
                  <div className="h-2.5 bg-[#E2E8F0] rounded-[3px] overflow-hidden">
                    <div
                      className="h-full rounded-[3px] transition-all duration-500"
                      style={{ width: `${p.pct || 0}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-dourado mb-1.5 mt-5">
            Análise Estratégica
          </div>
          <div
            className="bg-[#f4f7f5] border-l-[3px] border-verde-raiz rounded-r-lg px-5 py-4 text-[12.5px] leading-[1.8] text-quase-preto"
            dangerouslySetInnerHTML={{
              __html: (form.analise || 'Preencha o campo "Gargalos identificados" para inserir a análise.').replace(/\n/g, "<br>"),
            }}
          />
        </Section>

        {/* PLANO */}
        <Section label="02 · Plano Recomendado" title="Proposta de Trabalho">
          <div className="mb-5">
            <div className="plan-header bg-verde-raiz rounded-t-[10px] px-6 py-5">
              <div className="inline-block bg-dourado rounded text-white text-[9px] font-bold tracking-[0.1em] px-2.5 py-[3px] mb-2">
                {data.plano.badge}
              </div>
              <div className="font-display text-[30px] font-semibold text-white">{data.plano.name}</div>
              <div className="text-[12.5px] text-white/75 mt-1.5 leading-[1.65]">{data.plano.desc}</div>
            </div>
            <div className="border-[1.5px] border-t-0 border-[#e8e4e0] rounded-b-[10px] px-6 py-5">
              <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-dourado mb-2.5">
                Frentes desta proposta
              </div>
              {data.frentesSel.length > 0 ? (
                <div className="mb-3.5">
                  {data.frentesSel.map((f) => (
                    <div
                      key={f.pid}
                      className="mb-3 pl-3.5 border-l-[2.5px]"
                      style={{ borderColor: "#A0622A" }}
                    >
                      <div className="flex items-baseline gap-2">
                        <div className="text-[13.5px] font-bold text-verde-raiz">{f.nome}</div>
                        <div className="text-[8.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "#A0622A" }}>
                          Fase {f.fase}
                        </div>
                      </div>
                      {f.resultado && (
                        <div className="text-[11.5px] italic leading-snug" style={{ color: "#A0622A" }}>
                          {f.resultado}
                        </div>
                      )}
                      {f.entrega && (
                        <div className="text-[11px] text-[#718096] mt-0.5 leading-snug">
                          <span className="font-semibold">Inclui:</span> {f.entrega}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[12px] text-[#718096] mb-3.5">Selecione os módulos na barra lateral</div>
              )}
              <div className="mt-1 pt-3 border-t border-[#EFE9DD] text-[10px] leading-snug text-[#8A8276] italic">
                A Raiz desenha a estratégia, os scripts e os processos, treina sua equipe e orquestra os parceiros que você contrata, cobrando o resultado. A execução do dia a dia fica com a sua equipe ou com um parceiro especializado, que ajudamos a escolher e conduzimos como ponto focal.
              </div>
            </div>
          </div>
        </Section>

        {/* INVESTIMENTO */}
        <Section label="03 · Investimento" title="Investimento & Condições">
          <div className="border-[1.5px] border-[#DDD8D0] rounded-[10px] overflow-hidden mb-5">
            <div className="px-6 py-5 bg-white">
              <div className="font-display text-[34px] font-semibold text-verde-raiz leading-none">
                {fmtMoney(data.mensalidade.mensalidadeComIndicacao)}/mês
              </div>
              <div className="text-[11px] text-[#718096] mt-1.5">
                {data.frentesSel.length} frente{data.frentesSel.length === 1 ? "" : "s"} · ciclo de {data.duracao} meses · acompanhamento semanal
                {data.mensalidade.valorReferencia > data.mensalidade.mensalidadeComIndicacao && (
                  <span className="text-dourado">
                    {" "}· de <span className="line-through">{fmtMoney(data.mensalidade.valorReferencia)}</span>
                  </span>
                )}
              </div>

              {/* Descontos, duração e condição de pagamento */}
              <div className="mt-4 pt-3 border-t border-[#EFE9DD] grid grid-cols-2 gap-y-2 text-[12px]">
                {data.mensalidade.descontoComercial > 0 && (
                  <>
                    <div><span className="text-[#718096]">Desconto de relacionamento:</span></div>
                    <div className="text-right font-semibold text-quase-preto">- {fmtMoney(data.mensalidade.descontoComercial)}</div>
                  </>
                )}
                {data.mensalidade.descontoIndicacao > 0 && (
                  <>
                    <div><span className="text-[#718096]">Desconto de indicação ({data.mensalidade.qtdIndicados} ativo{data.mensalidade.qtdIndicados === 1 ? "" : "s"}):</span></div>
                    <div className="text-right font-semibold text-quase-preto">- {fmtMoney(data.mensalidade.descontoIndicacao)}</div>
                  </>
                )}
                <div><span className="text-[#718096]">Duração:</span></div>
                <div className="text-right font-semibold text-quase-preto">Ciclo inicial de {data.duracao} meses</div>
                <div className="col-span-2 text-[11px] text-[#718096] leading-[1.55]">
                  Com continuidade mensal conforme a evolução do projeto.
                </div>
                <div><span className="text-[#718096]">Condição de pagamento:</span></div>
                <div className="text-right font-semibold text-verde-raiz">
                  {data.formaPagamento === "unica"
                    ? `${fmtMoney(data.mensalidade.mensalidadeComIndicacao)}/mês`
                    : `${fmtMoney(data.mensalidade.mensalidadeComIndicacao)}/mês ou 2x de ${fmtMoney(data.mensalidade.mensalidadeComIndicacao / 2)}`}
                </div>
                <div className="col-span-2 text-[11px] text-[#718096] leading-[1.55]">
                  {data.formaPagamento === "unica"
                    ? "Pagamento integral, em parcela única no mês."
                    : "Pagamento integral no mês, ou dividido em 2 parcelas iguais: a 1ª parte até o dia 10 e a 2ª parte até o dia 20 de cada mês."}
                </div>
                <div><span className="text-[#718096]">Formas de pagamento:</span></div>
                <div className="text-right text-quase-preto">PIX ou Transferência</div>
                <div><span className="text-[#718096]">Validade da proposta:</span></div>
                <div className="text-right font-semibold text-quase-preto">{data.validadeDate}</div>
              </div>

              {data.mensalidade.descontoIndicacao === 0 && data.mensalidade.mensalidadeLiquida > 0 && (
                <div className="mt-3 pt-3 border-t border-[#EFE9DD] text-[11.5px] leading-[1.55]" style={{ color: "#A0622A" }}>
                  <span className="font-semibold">Programa de indicação:</span> a cada cliente que você indica e fecha, são R$ 400 a menos na sua mensalidade, enquanto ele seguir ativo.
                </div>
              )}

              {data.ancoragemFrase && (
                <div
                  className="mt-3 pt-3 border-t border-[#EFE9DD] text-[12px] italic leading-[1.55]"
                  style={{ color: "#C9A96E" }}
                >
                  "{data.ancoragemFrase}"
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* RETORNO */}
        {data.fat > 0 && data.meta > 0 && data.meta > data.fat && (
          <Section label="04 · O Retorno" title="De onde você está para onde quer chegar">
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                ["Hoje", fmtMoney(data.fat), "#718096"],
                ["Meta", fmtMoney(data.meta), "#1C3D2E"],
                ["Destravado", "+" + fmtMoney(data.meta - data.fat) + "/mês", "#A0622A"],
              ].map(([label, val, color], i) => (
                <div key={i} className="border-[1.5px] border-[#DDD8D0] rounded-[10px] px-4 py-4 text-center">
                  <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-dourado mb-1.5">{label}</div>
                  <div className="font-display text-[24px] font-semibold leading-none" style={{ color }}>{val}</div>
                </div>
              ))}
            </div>
            <div className="bg-[#f4f7f5] border-l-[3px] border-verde-raiz rounded-r-lg px-5 py-4 text-[13px] leading-[1.7] text-quase-preto">
              A pergunta certa não é quanto custa a consultoria. É <strong style={{ color: "#1C3D2E" }}>quanto você deixa na mesa a cada mês sem estrutura.</strong>
            </div>
          </Section>
        )}

        {/* CRONOGRAMA */}
        <Section label="05 · Cronograma de Execução" title="Fases do Trabalho">
          <div className="relative pl-7">
            <div className="absolute left-2.5 top-1.5 bottom-1.5 w-[2px]" style={{ background: "linear-gradient(to bottom, #1C3D2E, #E8DDD0)" }} />
            {data.timeline.map((t) => (
              <div key={t.n} className="relative mb-4">
                <div className="absolute -left-7 w-5 h-5 bg-verde-raiz rounded-full flex items-center justify-center text-[9px] font-bold text-white font-display top-0.5">
                  {t.n}
                </div>
                <div className="text-[10px] font-bold tracking-[0.08em] uppercase text-dourado mb-0.5">
                  {t.period}
                </div>
                <div className="text-[13px] font-bold text-quase-preto mb-1">{t.title}</div>
                <div className="text-[12px] text-[#718096] leading-[1.6]">{t.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* PRÓXIMOS PASSOS */}
        <Section label="06 · Próximos Passos" title="Como iniciamos o trabalho">
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              ["Assinatura do Contrato", "Contrato de prestação de serviços enviado por e-mail para assinatura digital."],
              ["Pagamento Inicial", "Confirmação do primeiro pagamento via PIX ou transferência. Pagamento mensal integral ou em 2 parcelas no mês."],
              ["Onboarding Estratégico", "Sessão de onboarding em até 7 dias: metas, indicadores e primeiras frentes definidas."],
              ["Dashboard Ativado", "Dashboard exclusivo do cliente configurado com KPIs iniciais do diagnóstico."],
            ].map(([t, d], i) => (
              <div key={i} className="border-[1.5px] border-[#DDD8D0] rounded-lg px-4 py-3.5 flex gap-3 items-start">
                <div className="w-[26px] h-[26px] min-w-[26px] bg-verde-raiz rounded-full flex items-center justify-center text-[11px] font-bold text-white font-display">
                  {i + 1}
                </div>
                <div>
                  <strong className="block text-[12.5px] font-bold text-quase-preto mb-0.5">{t}</strong>
                  <span className="text-[11px] text-[#718096]">{d}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-verde-raiz rounded-[10px] px-7 py-6 text-center">
            <div className="font-display text-[24px] font-semibold text-white mb-2">Pronto para começar?</div>
            <div className="text-[13px] text-white/70 mb-4">
              Entre em contato para confirmar sua proposta e dar o próximo passo.
            </div>
            <div className="flex gap-4 justify-center flex-wrap">
              <div className="text-[12px] text-white/80">
                📱 WhatsApp: <strong className="text-dourado">{form.whatsapp || "—"}</strong>
              </div>
              <div className="text-[12px] text-white/80">
                ✉️ E-mail: <strong className="text-dourado">{form.email || "—"}</strong>
              </div>
            </div>
          </div>
        </Section>

        {/* RODAPÉ */}
        <div className="bg-[#f4f3f1] border-t border-[#DDD8D0] px-[52px] py-3 flex justify-between items-center">
          <div className="text-[11px] font-bold tracking-[0.06em] text-[#718096]">
            RAIZ CONSULTORIA ESTRATÉGICA
          </div>
          <div className="text-[10px] text-[#aaa] tracking-[0.04em]">
            DOCUMENTO CONFIDENCIAL · USO EXCLUSIVO DO CLIENTE
          </div>
        </div>
      </div>
    </div>
  );
}

function CoverMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-[12px] text-white/60">
      <strong className="text-white/90 block text-[14px] mb-0.5">{value}</strong>
      {label}
    </div>
  );
}

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="orc-section px-[52px] py-12 border-t border-[#f0f0f0] first-of-type:border-t-0">
      <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-dourado mb-1.5">{label}</div>
      <h2 className="orc-section-title font-display text-[26px] font-semibold text-verde-raiz mb-4 leading-[1.15]">{title}</h2>
      <div className="w-full h-px bg-gradient-to-r from-verde-raiz to-transparent mb-5" />
      {children}
    </div>
  );
}
