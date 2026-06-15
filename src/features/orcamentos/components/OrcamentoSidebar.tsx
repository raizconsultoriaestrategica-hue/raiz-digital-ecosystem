import { useMemo, useState, useEffect } from "react";
import { Printer, RotateCcw, Save, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PILARES, PLANOS } from "../data";
import { ANCORAGENS, calcValorModulos, calcMensalidade, type Frente, type ModuloDb, type OrcamentoForm } from "../types";
import type { ClienteOpt } from "../hooks/useOrcamento";
import { saveOrcamento } from "../storage";
import { gerarAnaliseIA } from "../aiAnalysis";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  form: OrcamentoForm;
  setField: <K extends keyof OrcamentoForm>(k: K, v: OrcamentoForm[K]) => void;
  setPilarScore: (id: string, v: string) => void;
  toggleModulo: (codigo: string) => void;
  reset: () => void;
  clientes: ClienteOpt[];
  clienteId: string;
  selectCliente: (id: string) => void;
  loadingClientes: boolean;
  loadingDiag: boolean;
  modulosDb: ModuloDb[];
  loadingModulos: boolean;
  onPrint: () => void;
}

const inputCls =
  "w-full bg-white/[0.08] border border-white/15 rounded-md px-3 py-2 text-[13px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-dourado/60";

const labelCls =
  "block text-[10px] font-bold text-white/50 uppercase tracking-[0.1em] mb-1.5";

const sectionCls =
  "text-[11px] font-bold text-dourado/80 uppercase tracking-[0.1em] mb-2.5";

function fmtBRL(n: number) {
  return "R$ " + n.toLocaleString("pt-BR");
}

export function OrcamentoSidebar(p: Props) {
  const [saving, setSaving] = useState(false);
  const [generatingIA, setGeneratingIA] = useState(false);
  const [iaSucesso, setIaSucesso] = useState(false);

  // Códigos selecionados
  const selecionados = useMemo(
    () => Object.entries(p.form.modulos).filter(([, v]) => v).map(([k]) => k),
    [p.form.modulos]
  );

  const valorCalculado = useMemo(
    () => calcValorModulos(selecionados, p.modulosDb),
    [selecionados, p.modulosDb]
  );

  // Sugere o "Valor de referência" a partir do valor calculado dos módulos,
  // até o consultor editá-lo manualmente (rastreado por flag).
  const [valorRefEdited, setValorRefEdited] = useState(false);
  useEffect(() => {
    if (!valorRefEdited) {
      p.setField("valorReferencia", String(valorCalculado));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorCalculado, valorRefEdited]);

  const mensalidade = useMemo(() => calcMensalidade(p.form), [p.form]);

  // Frentes: a fonte de verdade da venda. Os módulos por trás de cada frente
  // ficam "nos bastidores" (modo avançado), não há mais seleção manual de módulos.
  const frentes = p.form.frentes || [];
  const setFrentes = (fs: Frente[]) => p.setField("frentes", fs);
  const addFrente = () => setFrentes([...frentes, { nome: "", resultado: "", entrega: "", fase: 1, modulos: [] }]);
  const removeFrente = (i: number) => setFrentes(frentes.filter((_, idx) => idx !== i));
  const patchFrente = (i: number, patch: Partial<Frente>) =>
    setFrentes(frentes.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const toggleModFrente = (i: number, cod: string) =>
    patchFrente(i, {
      modulos: frentes[i].modulos.includes(cod)
        ? frentes[i].modulos.filter((c) => c !== cod)
        : [...frentes[i].modulos, cod],
    });

  // Os módulos contratados são derivados das frentes (união). Mantém
  // form.modulos em sincronia para alimentar o save (Dashboard do cliente) e o
  // cálculo de valor, sem o consultor precisar marcar módulo na mão.
  useEffect(() => {
    const obj: Record<string, boolean> = {};
    for (const f of frentes) for (const c of f.modulos) obj[c] = true;
    const cur = p.form.modulos || {};
    const curOn = Object.keys(cur).filter((k) => cur[k]);
    const same = curOn.length === Object.keys(obj).length && curOn.every((k) => obj[k]);
    if (!same) p.setField("modulos", obj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frentes]);

  // Auto-preenche WhatsApp e Email do consultor logado
  const [consultorUserId, setConsultorUserId] = useState<string | null>(null);
  const [whatsappEdited, setWhatsappEdited] = useState(false);
  const [emailEdited, setEmailEdited] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setConsultorUserId(user.id);

      const { data: profile } = await supabase
        .from("consultor_profiles")
        .select("whatsapp_consultor, email_consultor")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;

      const emailToUse = profile?.email_consultor?.trim() || user.email || "";
      const wppToUse = profile?.whatsapp_consultor?.trim() || "";

      if (!emailEdited && !p.form.email && emailToUse) p.setField("email", emailToUse);
      if (!whatsappEdited && !p.form.whatsapp && wppToUse) p.setField("whatsapp", wppToUse);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste WhatsApp/email do consultor (debounced)
  useEffect(() => {
    if (!consultorUserId) return;
    if (!whatsappEdited && !emailEdited) return;
    const t = setTimeout(() => {
      supabase
        .from("consultor_profiles")
        .upsert(
          {
            user_id: consultorUserId,
            whatsapp_consultor: p.form.whatsapp || null,
            email_consultor: p.form.email || null,
          },
          { onConflict: "user_id" }
        )
        .then(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [p.form.whatsapp, p.form.email, consultorUserId, whatsappEdited, emailEdited]);

  const handleSave = async () => {
    if (!p.clienteId) {
      toast.error("Selecione um cliente vinculado para salvar.");
      return;
    }
    setSaving(true);
    try {
      // Mapear códigos selecionados → { id, fase } usando modulosDb
      const modulosParaSalvar = selecionados
        .map((codigo) => {
          const m = p.modulosDb.find((x) => x.codigo === codigo);
          return m ? { id: m.id, fase: m.fase } : null;
        })
        .filter((x): x is { id: string; fase: number } => x !== null);

      const result = await saveOrcamento(p.form, p.clienteId, modulosParaSalvar);
      if (result.pdfFailed) {
        toast.success("Dados salvos com sucesso. PDF não pôde ser gerado.");
      } else {
        toast.success("Orçamento salvo e projeto ativado na Gestão de Clientes");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao salvar orçamento";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const podeGerarIA =
    !!p.clienteId &&
    Object.values(p.form.pilarScores).some((v) => v !== undefined && v !== "");

  const handleGerarIA = async () => {
    if (!podeGerarIA) {
      toast.error("Selecione um cliente e preencha ao menos um score de pilar.");
      return;
    }
    setGeneratingIA(true);
    setIaSucesso(false);
    try {
      const result = await gerarAnaliseIA(p.form, p.modulosDb);
      p.setField("analise", result.analise);
      p.setField("ancoragemIA", result.ancoragem);
      p.setField("ancoragem", null);
      p.setField("justificativasIA", result.justificativas);
      // A IA monta as frentes e escolhe os módulos. Reflete nos dois.
      if (result.frentes.length > 0) {
        p.setField("frentes", result.frentes);
        const modulosObj: Record<string, boolean> = {};
        for (const f of result.frentes) for (const cod of f.modulos) modulosObj[cod] = true;
        p.setField("modulos", modulosObj);
      }
      setIaSucesso(true);
      toast.success(result.frentes.length > 0 ? "Análise e frentes geradas com IA" : "Análise gerada com IA");
      setTimeout(() => setIaSucesso(false), 6000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao gerar análise";
      toast.error(msg);
    } finally {
      setGeneratingIA(false);
    }
  };

  return (
    <aside
      data-orc-no-print
      className="orc-no-print w-full md:w-[340px] md:min-w-[340px] bg-verde-raiz px-6 py-7 overflow-y-auto md:max-h-screen md:sticky md:top-0"
    >
      <div className="font-display text-[22px] font-semibold text-white mb-1">
        Gerador de Proposta
      </div>
      <div className="text-[11px] text-white/50 uppercase tracking-[0.06em] mb-6">
        Raiz Consultoria Estratégica
      </div>

      {/* Cliente vinculado */}
      <div className={sectionCls}>Cliente vinculado</div>
      <div className="mb-5">
        <label className={labelCls}>Selecionar cliente cadastrado</label>
        <select
          value={p.clienteId}
          onChange={(e) => p.selectCliente(e.target.value)}
          className={inputCls + " cursor-pointer appearance-none"}
        >
          <option value="" className="bg-verde-raiz text-white">
            {p.loadingClientes ? "Carregando…" : ", manual ,"}
          </option>
          {p.clientes.map((c) => (
            <option key={c.id} value={c.id} className="bg-verde-raiz text-white">
              {c.nome_cliente}
              {c.nome_clinica ? ` · ${c.nome_clinica}` : ""}
            </option>
          ))}
        </select>
        {p.loadingDiag && (
          <div className="mt-2 text-[11px] text-dourado/80">Buscando diagnóstico…</div>
        )}
      </div>

      <hr className="border-white/10 my-5" />
      <div className={sectionCls}>Dados do Cliente</div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div>
          <label className={labelCls}>Nome do cliente</label>
          <input
            className={inputCls}
            placeholder="Ex: Dra. Anna Krause"
            value={p.form.nomeCliente}
            onChange={(e) => p.setField("nomeCliente", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Nome da clínica</label>
          <input
            className={inputCls}
            placeholder="Ex: Clínica Krause Odontologia"
            value={p.form.nomeClinica}
            onChange={(e) => p.setField("nomeClinica", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div>
          <label className={labelCls}>Especialidade</label>
          <input
            className={inputCls}
            placeholder="Ex: Facetas"
            value={p.form.especialidade}
            onChange={(e) => p.setField("especialidade", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Cidade - UF</label>
          <input
            className={inputCls}
            placeholder="Ex: Sinop-MT"
            value={p.form.cidade}
            onChange={(e) => p.setField("cidade", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div>
          <label className={labelCls}>Faturamento atual (R$)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="28000"
            value={p.form.faturamento}
            onChange={(e) => p.setField("faturamento", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Meta de faturamento (R$)</label>
          <input
            type="number"
            className={inputCls}
            placeholder="100000"
            value={p.form.meta}
            onChange={(e) => p.setField("meta", e.target.value)}
          />
        </div>
      </div>
      <div className="mb-4">
        <label className={labelCls}>Dor principal relatada</label>
        <input
          className={inputCls}
          placeholder="Ex: Faturamento estagnado há 8 meses"
          value={p.form.dor}
          onChange={(e) => p.setField("dor", e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label className={labelCls}>Data da proposta</label>
        <input
          type="date"
          className={inputCls}
          value={p.form.data}
          onChange={(e) => p.setField("data", e.target.value)}
        />
      </div>

      <hr className="border-white/10 my-5" />
      <div className={sectionCls}>Resultado do Diagnóstico</div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div>
          <label className={labelCls}>Pontuação obtida</label>
          <input
            type="number"
            min={0}
            max={105}
            className={inputCls}
            placeholder="Ex: 54"
            value={p.form.score}
            onChange={(e) => p.setField("score", e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Pontuação máxima</label>
          <input
            type="number"
            min={0}
            max={105}
            className={inputCls}
            placeholder="Ex: 96"
            value={p.form.scoreMax}
            onChange={(e) => p.setField("scoreMax", e.target.value)}
          />
        </div>
      </div>

      <div className={sectionCls + " mt-1"}>Scores por Pilar (0–100%)</div>
      <div className="mb-2">
        {PILARES.map((pi) => (
          <div key={pi.id} className="flex items-center gap-2 mb-2">
            <label className="text-[11px] text-white/60 flex-1 truncate">
              {pi.id} · {pi.name.split("&")[0].trim()}
            </label>
            <input
              type="number"
              min={0}
              max={100}
              placeholder="0"
              value={p.form.pilarScores[pi.id] ?? (pi.id === "p07" ? "0" : "")}
              onChange={(e) => p.setPilarScore(pi.id, e.target.value)}
              className="w-[52px] bg-white/[0.08] border border-white/15 rounded px-2 py-1 text-[12px] text-white text-center outline-none focus:border-dourado/60"
            />
          </div>
        ))}
      </div>

      {/* Resumo da reunião (TL.DV): a IA lê junto ao diagnóstico */}
      <div className="mt-4">
        <label className={labelCls}>Resumo da reunião (TL.DV)</label>
        <textarea
          rows={4}
          className={inputCls + " resize-y"}
          placeholder="Cole aqui o resumo da reunião gerado pelo TL.DV. A IA usa para personalizar a análise e as frentes."
          value={p.form.resumoReuniao}
          onChange={(e) => p.setField("resumoReuniao", e.target.value)}
        />
      </div>

      {/* Botão IA. Gera análise, frentes, ancoragem e justificativas */}
      <div className="mt-2 mb-1">
        <button
          type="button"
          onClick={handleGerarIA}
          disabled={!podeGerarIA || generatingIA}
          className="w-full bg-gradient-to-r from-dourado to-[#b8932f] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[12px] rounded-lg py-2.5 flex items-center justify-center gap-2 transition-opacity"
          title={!podeGerarIA ? "Selecione um cliente e preencha ao menos um score de pilar" : "Gerar análise, frentes, ancoragem e justificativas com IA"}
        >
          {generatingIA ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando proposta…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Gerar proposta com IA
            </>
          )}
        </button>
        {iaSucesso && !generatingIA && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#7ED957]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Análise gerada com IA
          </div>
        )}
      </div>

      <hr className="border-white/10 my-5" />
      <div className={sectionCls}>Plano Recomendado</div>
      <div className="mb-4">
        <label className={labelCls}>Plano</label>
        <select
          value={p.form.plano}
          onChange={(e) => p.setField("plano", e.target.value as any)}
          className={inputCls + " cursor-pointer appearance-none"}
        >
          {Object.values(PLANOS).map((pl) => (
            <option key={pl.key} value={pl.key} className="bg-verde-raiz text-white">
              {pl.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className={labelCls}>Gargalos identificados (texto livre)</label>
        <textarea
          rows={4}
          className={inputCls + " resize-y"}
          placeholder="Ex: Os gargalos críticos estão em Atendimento (conversão de 40%) e Financeiro (margem de 14%)…"
          value={p.form.analise}
          onChange={(e) => p.setField("analise", e.target.value)}
        />
      </div>

      {/* Frentes: tela de revisão do que a IA montou. Os módulos ficam atrás de cada frente. */}
      <div className={sectionCls}>Frentes da Proposta</div>
      <div className="text-[10px] text-white/40 mb-2 leading-relaxed">
        É o que o cliente vê na proposta. A IA gera as frentes a partir do diagnóstico; aqui você revisa, edita o texto ou cria do zero. Os módulos por trás (que alimentam o Dashboard) ficam no avançado de cada frente.
      </div>
      <div className="mb-3">
        <button type="button" onClick={addFrente} className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-[11px] rounded-md py-1.5">
          + Adicionar frente manualmente
        </button>
      </div>
      <div className="space-y-2.5 mb-4">
        {frentes.map((f, i) => (
          <div key={i} className="rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-2.5">
            <div className="flex items-center gap-2 mb-2">
              <input
                className={inputCls + " flex-1"}
                placeholder="Nome da frente"
                value={f.nome}
                onChange={(e) => patchFrente(i, { nome: e.target.value })}
              />
              <select
                className="bg-white/[0.08] border border-white/15 rounded px-1.5 py-2 text-[12px] text-white outline-none focus:border-dourado/60"
                value={f.fase}
                onChange={(e) => patchFrente(i, { fase: Number(e.target.value) })}
              >
                <option value={1} className="bg-verde-raiz text-white">F1</option>
                <option value={2} className="bg-verde-raiz text-white">F2</option>
                <option value={3} className="bg-verde-raiz text-white">F3</option>
              </select>
              <button type="button" onClick={() => removeFrente(i)} className="text-white/40 hover:text-red-400 text-[16px] leading-none px-1" title="Remover frente">
                ×
              </button>
            </div>
            <input
              className={inputCls + " mb-2"}
              placeholder="Resultado (o que muda)"
              value={f.resultado}
              onChange={(e) => patchFrente(i, { resultado: e.target.value })}
            />
            <input
              className={inputCls + " mb-2"}
              placeholder="Inclui (entregável)"
              value={f.entrega}
              onChange={(e) => patchFrente(i, { entrega: e.target.value })}
            />
            {p.modulosDb.length > 0 && (
              <details className="mt-1.5">
                <summary className="text-[10px] text-white/35 cursor-pointer select-none hover:text-white/55">
                  ⚙ Módulos desta frente ({f.modulos.length}) · avançado
                </summary>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.modulosDb.map((m) => {
                    const on = f.modulos.includes(m.codigo);
                    const just = p.form.justificativasIA?.[m.codigo];
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleModFrente(i, m.codigo)}
                        title={just ? `${m.codigo} · ${m.nome} — ${just}` : `${m.codigo} · ${m.nome}`}
                        className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${on ? "bg-dourado/20 border-dourado text-white" : "bg-white/[0.04] border-white/15 text-white/40 hover:border-white/30"}`}
                      >
                        {m.codigo}
                      </button>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Precificação: referência, desconto e pagamento */}
      <div className="rounded-lg border border-dourado/30 bg-dourado/5 px-3 py-3 mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.1em]">
            Valor sugerido (base)
          </span>
          <span className="font-display text-[16px] font-semibold text-dourado tabular-nums">
            {fmtBRL(valorCalculado)}
          </span>
        </div>

        <label className={labelCls}>Valor de referência (R$/mês)</label>
        <input
          type="number"
          className={inputCls}
          placeholder={String(valorCalculado || 0)}
          value={p.form.valorReferencia}
          onChange={(e) => {
            setValorRefEdited(true);
            p.setField("valorReferencia", e.target.value);
          }}
        />

        <label className={labelCls + " mt-3"}>Desconto comercial (R$)</label>
        <input
          type="number"
          className={inputCls}
          placeholder="0"
          value={p.form.descontoComercial}
          onChange={(e) => p.setField("descontoComercial", e.target.value)}
        />

        <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-white/10">
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.1em]">
            Mensalidade líquida
          </span>
          <span className="font-display text-[18px] font-semibold text-white tabular-nums">
            {fmtBRL(mensalidade.mensalidadeLiquida)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <div>
            <label className={labelCls}>Pagamento</label>
            <select
              className={inputCls + " cursor-pointer appearance-none"}
              value={p.form.formaPagamento}
              onChange={(e) => p.setField("formaPagamento", e.target.value)}
            >
              <option value="2x" className="bg-verde-raiz text-white">2x (dia 10 e 20)</option>
              <option value="unica" className="bg-verde-raiz text-white">Parcela única</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Ciclo inicial</label>
            <select
              className={inputCls + " cursor-pointer appearance-none"}
              value={p.form.cicloInicialMeses}
              onChange={(e) => p.setField("cicloInicialMeses", e.target.value)}
            >
              <option value="" className="bg-verde-raiz text-white">Padrão do plano</option>
              <option value="3" className="bg-verde-raiz text-white">3 meses</option>
              <option value="4" className="bg-verde-raiz text-white">4 meses</option>
              <option value="5" className="bg-verde-raiz text-white">5 meses</option>
              <option value="6" className="bg-verde-raiz text-white">6 meses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Programa de indicação: explicado automaticamente na proposta (sem campo). */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 mb-4 text-[10.5px] text-white/45 leading-relaxed">
        <span className="font-bold text-white/60">Programa de indicação:</span> aparece explicado na proposta (R$ 400 a menos por indicado ativo, cumulativo). Não há campo aqui: o desconto entra na cobrança quando o cliente indicar.
      </div>

      <hr className="border-white/10 my-5" />
      <div className={sectionCls}>Ancoragem de Valor</div>
      <div className="text-[10px] text-white/40 mb-2.5 leading-relaxed">
        Selecione uma frase para aparecer abaixo do investimento no PDF
      </div>
      <div className="space-y-1.5 mb-2">
        {/* Ancoragem gerada pela IA. Aparece como primeira opção quando disponível */}
        {p.form.ancoragemIA && (
          <button
            type="button"
            onClick={() => p.setField("ancoragem", null)}
            className={`w-full text-left px-3 py-2.5 rounded-md border-2 text-[11px] leading-relaxed italic transition-colors relative ${
              p.form.ancoragem === null
                ? "border-dourado bg-dourado/15 text-white"
                : "border-dourado/50 bg-dourado/5 text-white/80 hover:border-dourado"
            }`}
          >
            <span className="not-italic inline-block bg-dourado text-quase-preto text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded mb-1.5">
              ✨ Gerada pela IA
            </span>
            <div>"{p.form.ancoragemIA}"</div>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            // "Nenhuma". Descarta também a ancoragem da IA
            p.setField("ancoragem", null);
            if (p.form.ancoragemIA) p.setField("ancoragemIA", "");
          }}
          className={`w-full text-left px-3 py-2 rounded-md border text-[11px] transition-colors ${
            p.form.ancoragem === null && !p.form.ancoragemIA
              ? "border-dourado bg-dourado/10 text-white"
              : "border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30"
          }`}
        >
          Nenhuma
        </button>
        {ANCORAGENS.map((frase, idx) => {
          const selected = p.form.ancoragem === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                p.setField("ancoragem", idx);
                // Selecionar uma frase genérica desativa a ancoragem da IA
                if (p.form.ancoragemIA) p.setField("ancoragemIA", "");
              }}
              className={`w-full text-left px-3 py-2 rounded-md border text-[11px] leading-relaxed italic transition-colors ${
                selected
                  ? "border-dourado bg-dourado/10 text-white"
                  : "border-white/15 bg-white/[0.04] text-white/60 hover:border-white/30"
              }`}
            >
              "{frase}"
            </button>
          );
        })}
      </div>

      <hr className="border-white/10 my-5" />
      <div className={sectionCls}>Contato / Rodapé</div>
      <div className="mb-4">
        <label className={labelCls}>WhatsApp do consultor</label>
        <input
          className={inputCls}
          placeholder="+55 66 9 9999-0000"
          value={p.form.whatsapp}
          onChange={(e) => {
            setWhatsappEdited(true);
            p.setField("whatsapp", e.target.value);
          }}
        />
      </div>
      <div className="mb-4">
        <label className={labelCls}>E-mail</label>
        <input
          className={inputCls}
          placeholder="raizconsultoriaestrategica@gmail.com"
          value={p.form.email}
          onChange={(e) => {
            setEmailEdited(true);
            p.setField("email", e.target.value);
          }}
        />
      </div>

      <button
        onClick={p.onPrint}
        className="w-full bg-dourado hover:opacity-90 text-white font-bold text-[13px] rounded-lg py-3 mt-5 flex items-center justify-center gap-2 transition-opacity"
      >
        <Printer className="w-4 h-4" />
        Baixar PDF
      </button>
      <button
        onClick={handleSave}
        disabled={saving || !p.clienteId}
        className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed border border-white/20 text-white font-bold text-[13px] rounded-lg py-2.5 mt-2 flex items-center justify-center gap-2 transition-colors"
        title={!p.clienteId ? "Selecione um cliente vinculado para salvar" : "Salvar PDF na Gestão de Clientes"}
      >
        <Save className="w-4 h-4" />
        {saving ? "Salvando…" : "Salvar na Gestão de Clientes"}
      </button>
      <button
        onClick={p.reset}
        className="w-full bg-transparent border border-white/10 hover:border-white/30 text-white/40 hover:text-white/60 text-[12px] rounded-lg py-2 mt-2 flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Limpar formulário
      </button>
    </aside>
  );
}
