import { useMemo, useState, useEffect } from "react";
import { Printer, RotateCcw, Save, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PILARES, PLANOS } from "../data";
import { ANCORAGENS, calcValorModulos, FASE_VALOR, type ModuloDb, type OrcamentoForm } from "../types";
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

  // Agrupar módulos por pilar_nome (vindos do DB, ordenados por pilar/ordem)
  const grouped = useMemo(() => {
    const g: Record<string, ModuloDb[]> = {};
    p.modulosDb.forEach((m) => {
      if (!g[m.pilar_nome]) g[m.pilar_nome] = [];
      g[m.pilar_nome].push(m);
    });
    return g;
  }, [p.modulosDb]);

  // Códigos selecionados
  const selecionados = useMemo(
    () => Object.entries(p.form.modulos).filter(([, v]) => v).map(([k]) => k),
    [p.form.modulos]
  );

  const valorCalculado = useMemo(
    () => calcValorModulos(selecionados, p.modulosDb),
    [selecionados, p.modulosDb]
  );

  // Mantém "Valor Final Acordado" sincronizado com o "Valor Calculado"
  // até que o consultor o edite manualmente (rastreado por flag).
  const [valorFinalEdited, setValorFinalEdited] = useState(false);
  useEffect(() => {
    if (!valorFinalEdited) {
      p.setField("valorFinal", String(valorCalculado));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorCalculado, valorFinalEdited]);

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
      const result = await gerarAnaliseIA(p.form, p.modulosDb, selecionados);
      p.setField("analise", result.analise);
      p.setField("ancoragemIA", result.ancoragem);
      p.setField("ancoragem", null);
      p.setField("justificativasIA", result.justificativas);
      setIaSucesso(true);
      toast.success("Análise gerada com IA");
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

      {/* Botão IA. Gerar análise, ancoragem e justificativas */}
      <div className="mt-2 mb-1">
        <button
          type="button"
          onClick={handleGerarIA}
          disabled={!podeGerarIA || generatingIA}
          className="w-full bg-gradient-to-r from-dourado to-[#b8932f] hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[12px] rounded-lg py-2.5 flex items-center justify-center gap-2 transition-opacity"
          title={!podeGerarIA ? "Selecione um cliente e preencha ao menos um score de pilar" : "Gerar análise, ancoragem e justificativas com IA"}
        >
          {generatingIA ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando análise…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Gerar análise com IA
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

      <div className={sectionCls}>Módulos Contratados</div>
      <div className="text-[10px] text-white/40 mb-2 leading-relaxed">
        Pré-marcados automaticamente: pilares com score &lt; 50%.<br />
        Fase 1: {fmtBRL(FASE_VALOR[1])} · Fase 2: {fmtBRL(FASE_VALOR[2])} · Fase 3: {fmtBRL(FASE_VALOR[3])}
      </div>
      <div className="max-h-[260px] overflow-y-auto pr-1 mb-3">
        {p.loadingModulos && (
          <div className="text-[12px] text-white/40 py-2">Carregando módulos…</div>
        )}
        {Object.entries(grouped).map(([pilarName, mods]) => (
          <div key={pilarName}>
            <div className="text-[10px] font-bold text-white/35 uppercase tracking-[0.08em] mt-2 mb-1">
              {pilarName}
            </div>
            {mods.map((m) => {
              const just = p.form.justificativasIA?.[m.codigo];
              const isOn = !!p.form.modulos[m.codigo];
              return (
                <div key={m.id}>
                  <label
                    className="flex items-center gap-2 py-1.5 cursor-pointer text-[12px] text-white/75"
                    title={just || undefined}
                  >
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => p.toggleModulo(m.codigo)}
                      className="w-[15px] h-[15px] accent-dourado"
                    />
                    <span className="flex-1">
                      {m.codigo} · {m.nome}
                    </span>
                    <span className="text-[10px] text-white/35 tabular-nums">
                      F{m.fase}
                    </span>
                  </label>
                  {isOn && just && (
                    <div className="ml-[23px] -mt-1 mb-1.5 text-[10.5px] italic text-dourado/75 leading-snug">
                      💡 {just}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Valor calculado + valor final editável */}
      <div className="rounded-lg border border-dourado/30 bg-dourado/5 px-3 py-3 mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.1em]">
            Valor calculado
          </span>
          <span className="font-display text-[18px] font-semibold text-dourado tabular-nums">
            {fmtBRL(valorCalculado)}
          </span>
        </div>
        <div className="text-[10px] text-white/40 mb-3">
          {selecionados.length} módulo{selecionados.length === 1 ? "" : "s"} selecionado
          {selecionados.length === 1 ? "" : "s"}
        </div>
        <label className={labelCls}>Valor final acordado (R$)</label>
        <input
          type="number"
          className={inputCls}
          placeholder={String(valorCalculado || 0)}
          value={p.form.valorFinal}
          onChange={(e) => {
            setValorFinalEdited(true);
            p.setField("valorFinal", e.target.value);
          }}
        />
        <div className="mt-1 text-[10px] text-white/40">
          Editável. Aplique desconto ou condição especial.
        </div>
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
        Imprimir / Gerar PDF
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
