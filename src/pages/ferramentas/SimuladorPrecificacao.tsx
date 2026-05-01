import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertTriangle, Plus, Save, Trash2, Calculator, Sparkles, Loader2,
  HelpCircle, FileDown, Send, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { ClienteSelector } from "@/features/diagnostico/components/ClienteSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  calcular,
  emptyForm,
  fmtBRL,
  fmtPct,
  novoCusto,
  novoProcedimento,
  MULTIPLICADORES,
  POSICIONAMENTO_LABEL,
  type PrecificacaoForm,
  type Posicionamento,
} from "@/features/precificacao/logic";
import { generatePrecificacaoPDF, type PoliticaDescontos } from "@/features/precificacao/pdf";

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center text-quase-preto/40 hover:text-dourado focus:outline-none"
          aria-label="Ajuda"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function Field({
  label, children, hint, tip,
}: { label: string; children: React.ReactNode; hint?: string; tip?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Label className="text-xs font-semibold text-quase-preto">{label}</Label>
        {tip && <InfoTip text={tip} />}
      </div>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function NumInput({
  value, onChange, step = "any", placeholder,
}: {
  value: number; onChange: (n: number) => void; step?: string; placeholder?: string;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step={step}
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      placeholder={placeholder ?? "0"}
      className="h-10"
    />
  );
}

const TIPS = {
  posicionamento:
    "Define o multiplicador aplicado ao preço mínimo viável. Popular (×0.85) compete por volume, Premium (×1.25) atrai pacientes de maior ticket. Escolha com base no seu público-alvo e região.",
  horas_dia:
    "Total de horas em que você ou sua equipe estão em atendimento clínico. Usado para calcular o custo por hora clínica.",
  dias_mes:
    "Média de dias úteis de atendimento por mês. Padrão: 22 dias.",
  total_fixos:
    "Soma de todos os custos que existem independente do volume de atendimentos. Quanto menor esse número em relação ao faturamento, maior sua margem.",
  custo_hora:
    "Total de custos fixos dividido pelas horas clínicas disponíveis no mês. É a base para calcular o custo real de cada procedimento.",
  duracao:
    "Tempo total do profissional dedicado a este procedimento, incluindo preparo e finalização. Quanto mais horas, maior o custo real.",
  materiais:
    "Custo de insumos e materiais consumidos por procedimento (anestesia, resinas, descartáveis, etc.).",
  laboratorio:
    "Custo de serviços terceirizados por procedimento (próteses, moldagens, laboratório de análise, etc.).",
  sessoes:
    "Número de sessões necessárias para concluir o procedimento completo. O custo é multiplicado pelo número de sessões.",
  margem:
    "Percentual de lucro que você quer ter após cobrir todos os custos. Ex: 40% significa que R$40 de cada R$100 cobrado é lucro líquido.",
  frequencia:
    "Quantas vezes por mês você realiza este procedimento. Usado para calcular o faturamento mensal estimado.",
  preco_praticado:
    "Opcional. Informe o preço que você cobra hoje para comparar com o preço mínimo viável calculado. Se estiver abaixo, aparece alerta de prejuízo.",
  custo_total:
    "Custo real completo do procedimento: (horas × custo/hora + materiais + laboratório) × sessões.",
  preco_minimo:
    "Menor preço que você pode cobrar sem ter prejuízo, considerando sua margem alvo. Nunca cobre abaixo desse valor.",
  preco_estrategico:
    "Preço mínimo viável ajustado pelo multiplicador do seu posicionamento de mercado. Este é o preço ideal para seu perfil.",
  faturamento_proc:
    "Preço estratégico × frequência mensal. Estimativa de receita mensal gerada por este procedimento.",
  margem_global:
    "Média ponderada da margem de todos os procedimentos, considerando o faturamento de cada um.",
  capacidade:
    "Percentual das suas horas clínicas disponíveis ocupadas pelos procedimentos cadastrados.",
};

type ChatMsg = { role: "user" | "assistant"; content: string };

export default function SimuladorPrecificacao() {
  const { user } = useAuth();
  const [form, setForm] = useState<PrecificacaoForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [analiseIA, setAnaliseIA] = useState<{ analise: string; insights: string[] } | null>(null);

  // Política descontos via IA
  const [politicaLoading, setPoliticaLoading] = useState(false);
  const [politica, setPolitica] = useState<PoliticaDescontos | null>(null);
  const [politicaChat, setPoliticaChat] = useState<ChatMsg[]>([]);
  const [politicaInput, setPoliticaInput] = useState("");

  useEffect(() => {
    const prev = document.title;
    document.title = "Simulador de Precificação · Raiz Consultoria";
    return () => { document.title = prev; };
  }, []);

  const calc = useMemo(() => calcular(form), [form]);

  const setCusto = (id: string, patch: Partial<{ nome: string; valor: number }>) =>
    setForm((f) => ({
      ...f,
      custos_fixos: f.custos_fixos.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  const removeCusto = (id: string) =>
    setForm((f) => ({ ...f, custos_fixos: f.custos_fixos.filter((c) => c.id !== id) }));
  const addCusto = () => setForm((f) => ({ ...f, custos_fixos: [...f.custos_fixos, novoCusto()] }));

  const setProc = (id: string, patch: Partial<PrecificacaoForm["procedimentos"][number]>) =>
    setForm((f) => ({
      ...f,
      procedimentos: f.procedimentos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  const removeProc = (id: string) =>
    setForm((f) => ({ ...f, procedimentos: f.procedimentos.filter((p) => p.id !== id) }));
  const addProc = () => setForm((f) => ({ ...f, procedimentos: [...f.procedimentos, novoProcedimento()] }));

  const buildCenarioContext = () => {
    const procs = form.procedimentos
      .map((p) => {
        const r = calc.por_procedimento[p.id];
        if (!r) return null;
        return `- ${p.nome || "Procedimento"}: mínimo ${fmtBRL(r.preco_minimo)}, estratégico ${fmtBRL(r.preco_estrategico)}, margem alvo ${p.margem_alvo_pct}%, faturamento/mês ${fmtBRL(r.faturamento_mes)}${p.preco_praticado ? `, praticado ${fmtBRL(p.preco_praticado)}` : ""}`;
      })
      .filter(Boolean)
      .join("\n");
    return `Segmento: ${form.segmento || "—"}
Posicionamento: ${POSICIONAMENTO_LABEL[form.posicionamento]}
Custo/hora clínica: ${fmtBRL(calc.custo_hora_clinica)}
Faturamento total estimado: ${fmtBRL(calc.faturamento_total)}
Margem global: ${fmtPct(calc.margem_global_pct)}

Procedimentos:
${procs}`;
  };

  const handleAnalisarIA = async () => {
    setAnalisando(true);
    setAnaliseIA(null);
    try {
      const prompt = `Analise a precificação estratégica deste consultório e responda APENAS em JSON válido (sem markdown) com dois campos:

1. "analise": texto de 3-4 parágrafos avaliando se os preços estão adequados ao segmento e posicionamento, comparando com benchmarks do mercado brasileiro (odontologia: implante R$3.500-6.000, alinhador R$8.000-18.000, clareamento R$800-1.500; medicina estética: botox R$800-1.800, preenchimento R$1.200-3.000, bioestimulador R$2.500-5.000). Identificar margens insuficientes ou preços abaixo do potencial. Tom direto e consultivo.

2. "insights": array com 3-5 insights acionáveis para melhorar precificação, aumentar margem ou reposicionar procedimentos.

${buildCenarioContext()}`;

      const { data, error } = await supabase.functions.invoke("consultor-ia", {
        body: {
          systemPrompt:
            "Você é um consultor estratégico sênior da Raiz Consultoria, especializado em precificação para clínicas odontológicas e médicas. Responda SEMPRE em JSON válido sem usar blocos de código markdown.",
          messages: [{ role: "user", content: prompt }],
        },
      });
      if (error) throw error;
      const text =
        (data as any)?.content?.[0]?.text ??
        (data as any)?.choices?.[0]?.message?.content ?? "";
      const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setAnaliseIA({
        analise: parsed.analise || "",
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      });
    } catch (e: any) {
      console.error("[analisar IA] erro:", e);
      toast.error("Erro ao analisar com IA: " + (e?.message || "tente novamente"));
    } finally {
      setAnalisando(false);
    }
  };

  const POLITICA_SYSTEM =
    `Você é um consultor estratégico sênior da Raiz Consultoria especializado em precificação e política comercial para clínicas odontológicas e médicas.
Sua tarefa é gerar uma política de descontos e parcelamento personalizada com base nos dados do consultório.

REGRAS:
- Se faltar alguma informação crítica para uma política precisa, faça até 2 perguntas objetivas ANTES de gerar a política. Nesse caso responda em JSON: {"perguntas": ["...", "..."]}
- Quando tiver informação suficiente, responda em JSON com a estrutura final:
{
  "resumo": "1-2 frases de resumo da estratégia",
  "limites_desconto": [{"tipo": "Implantes", "limite_pct": 8, "observacao": "..."}, ...],
  "parcelamento": ["regra 1", "regra 2"],
  "desconto_estrategico": ["situação X é estratégica porque...", "situação Y é prejuízo porque..."],
  "pacotes_combos": ["sugestão 1", "sugestão 2"]
}
- NUNCA use markdown ou \`\`\`. Responda SEMPRE JSON válido puro.
- Considere as margens reais e o posicionamento ao definir limites.`;

  const callPoliticaIA = async (messages: ChatMsg[]) => {
    const { data, error } = await supabase.functions.invoke("consultor-ia", {
      body: { systemPrompt: POLITICA_SYSTEM, messages },
    });
    if (error) throw error;
    const text =
      (data as any)?.content?.[0]?.text ??
      (data as any)?.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    return { raw: text, parsed: JSON.parse(cleaned) as PoliticaDescontos };
  };

  const handleGerarPolitica = async () => {
    setPoliticaLoading(true);
    setPolitica(null);
    try {
      const initialMsg: ChatMsg = {
        role: "user",
        content: `Gere uma política de descontos e parcelamento personalizada para este cenário:

${buildCenarioContext()}

Inclua: limite máximo de desconto por tipo de procedimento, política de parcelamento (quantas vezes, com/sem juros, valor mínimo), quando desconto é estratégico vs prejuízo, e sugestões de pacotes/combos que aumentam ticket sem desconto direto. Se faltar informação, faça até 2 perguntas.`,
      };
      const newMsgs = [initialMsg];
      const { raw, parsed } = await callPoliticaIA(newMsgs);
      if (parsed.perguntas && parsed.perguntas.length > 0) {
        setPoliticaChat([...newMsgs, { role: "assistant", content: raw }]);
      } else {
        setPolitica(parsed);
        setPoliticaChat([]);
      }
    } catch (e: any) {
      console.error("[politica IA] erro:", e);
      toast.error("Erro ao gerar política: " + (e?.message || "tente novamente"));
    } finally {
      setPoliticaLoading(false);
    }
  };

  const handleResponderPolitica = async () => {
    const text = politicaInput.trim();
    if (!text || politicaLoading) return;
    setPoliticaInput("");
    const newMsgs: ChatMsg[] = [...politicaChat, { role: "user", content: text }];
    setPoliticaChat(newMsgs);
    setPoliticaLoading(true);
    try {
      const { raw, parsed } = await callPoliticaIA(newMsgs);
      if (parsed.perguntas && parsed.perguntas.length > 0) {
        setPoliticaChat([...newMsgs, { role: "assistant", content: raw }]);
      } else {
        setPolitica(parsed);
        setPoliticaChat([]);
      }
    } catch (e: any) {
      console.error("[politica IA] erro:", e);
      toast.error("Erro ao processar resposta: " + (e?.message || "tente novamente"));
    } finally {
      setPoliticaLoading(false);
    }
  };

  // Tenta extrair perguntas do último JSON do assistente
  const ultimasPerguntas = useMemo(() => {
    const last = [...politicaChat].reverse().find((m) => m.role === "assistant");
    if (!last) return [];
    try {
      const cleaned = last.content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const p = JSON.parse(cleaned);
      return Array.isArray(p.perguntas) ? p.perguntas : [];
    } catch {
      return [];
    }
  }, [politicaChat]);

  const handleSalvar = async () => {
    if (!form.cliente_id) {
      toast.error("Selecione um cliente para salvar a simulação.");
      return;
    }
    if (form.procedimentos.length === 0) {
      toast.error("Adicione pelo menos um procedimento.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("simulacoes_precificacao").insert({
      cliente_id: form.cliente_id,
      nome_clinica: form.nome_clinica || null,
      segmento: form.segmento || null,
      posicionamento: form.posicionamento,
      multiplicador: MULTIPLICADORES[form.posicionamento],
      horas_dia: form.horas_dia,
      dias_mes: form.dias_mes,
      custos_fixos: form.custos_fixos as any,
      procedimentos: form.procedimentos as any,
      resultados_globais: {
        custo_hora_clinica: calc.custo_hora_clinica,
        total_custos_fixos: calc.total_custos_fixos,
        faturamento_total: calc.faturamento_total,
        lucro_total: calc.lucro_total,
        margem_global_pct: calc.margem_global_pct,
        capacidade_utilizada_pct: calc.capacidade_utilizada_pct,
      } as any,
      politica_descontos: (politica || {}) as any,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Simulação salva com sucesso.");
  };

  const handleBaixarPDF = () => {
    try {
      const doc = generatePrecificacaoPDF(form, politica, analiseIA, form.nome_clinica);
      const nome = (form.nome_clinica || "simulacao").replace(/\s+/g, "_").toLowerCase();
      doc.save(`precificacao_${nome}.pdf`);
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + (e?.message || "tente novamente"));
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 font-body">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl text-verde-raiz">Simulador de Precificação Estratégica</h1>
          <p className="mt-1 text-sm text-quase-preto/70">
            Módulo 4.2. Calcule preços mínimos viáveis e estratégicos baseados em custos reais e posicionamento.
          </p>
        </div>

        {/* CONFIG */}
        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl text-verde-raiz">Configuração inicial</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ClienteSelector
                value={form.cliente_id}
                onChange={(id, c) => {
                  const esp = (c?.especialidade || "").toLowerCase();
                  let segmento: PrecificacaoForm["segmento"] = form.segmento;
                  if (esp.includes("odonto") || esp.includes("dentist")) segmento = "Odontologia";
                  else if (esp.includes("derma")) segmento = "Dermatologia";
                  else if (esp.includes("estét") || esp.includes("estet") || esp.includes("medic")) segmento = "Medicina Estética";
                  setForm((f) => ({
                    ...f,
                    cliente_id: id,
                    nome_clinica: c?.nome_clinica || f.nome_clinica,
                    segmento: segmento || f.segmento,
                  }));
                }}
              />
            </div>
            <Field label="Nome da clínica/profissional">
              <Input
                value={form.nome_clinica}
                onChange={(e) => setForm((f) => ({ ...f, nome_clinica: e.target.value }))}
                placeholder="Ex: Clínica Raiz"
              />
            </Field>
            <Field label="Segmento">
              <Select
                value={form.segmento || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, segmento: v as PrecificacaoForm["segmento"] }))}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Odontologia">Odontologia</SelectItem>
                  <SelectItem value="Medicina Estética">Medicina Estética</SelectItem>
                  <SelectItem value="Dermatologia">Dermatologia</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Posicionamento de mercado" tip={TIPS.posicionamento}>
              <Select
                value={form.posicionamento}
                onValueChange={(v) => setForm((f) => ({ ...f, posicionamento: v as Posicionamento }))}
              >
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(POSICIONAMENTO_LABEL) as Posicionamento[]).map((k) => (
                    <SelectItem key={k} value={k}>{POSICIONAMENTO_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Horas trabalhadas/dia" tip={TIPS.horas_dia}>
              <NumInput value={form.horas_dia} onChange={(n) => setForm((f) => ({ ...f, horas_dia: n }))} />
            </Field>
            <Field label="Dias trabalhados/mês" tip={TIPS.dias_mes}>
              <NumInput value={form.dias_mes} onChange={(n) => setForm((f) => ({ ...f, dias_mes: n }))} />
            </Field>
          </div>
        </Card>

        {/* CUSTOS FIXOS */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-verde-raiz">Custos fixos mensais</h2>
            <Button variant="outline" size="sm" onClick={addCusto}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar custo
            </Button>
          </div>
          <div className="space-y-2">
            {form.custos_fixos.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Input
                  value={c.nome}
                  onChange={(e) => setCusto(c.id, { nome: e.target.value })}
                  placeholder="Nome do custo"
                  className="flex-1"
                />
                <div className="w-[140px] shrink-0">
                  <NumInput value={c.valor} onChange={(n) => setCusto(c.id, { valor: n })} placeholder="R$ 0" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeCusto(c.id)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-md border border-dourado/40 bg-dourado/10 px-4 py-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-quase-preto">
              Total de custos fixos <InfoTip text={TIPS.total_fixos} />
            </span>
            <span className="font-display text-xl text-verde-raiz">{fmtBRL(calc.total_custos_fixos)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-md bg-off-white px-4 py-2">
            <span className="flex items-center gap-1.5 text-xs text-quase-preto/70">
              Custo por hora clínica <InfoTip text={TIPS.custo_hora} />
            </span>
            <span className="text-sm font-semibold text-verde-raiz">{fmtBRL(calc.custo_hora_clinica)}/h</span>
          </div>
        </Card>

        {/* PROCEDIMENTOS */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-verde-raiz">Procedimentos</h2>
            <Button variant="outline" size="sm" onClick={addProc}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar procedimento
            </Button>
          </div>
          {form.procedimentos.length === 0 && (
            <div className="rounded-md border border-dashed border-quase-preto/20 px-4 py-8 text-center text-sm text-quase-preto/60">
              Nenhum procedimento adicionado. Clique em "Adicionar procedimento".
            </div>
          )}
          <div className="space-y-4">
            {form.procedimentos.map((p, idx) => {
              const r = calc.por_procedimento[p.id];
              return (
                <div key={p.id} className="rounded-lg border border-quase-preto/10 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-dourado text-dourado">#{idx + 1}</Badge>
                      <Input
                        value={p.nome}
                        onChange={(e) => setProc(p.id, { nome: e.target.value })}
                        placeholder="Nome do procedimento"
                        className="h-9 w-72"
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeProc(p.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
                    <Field label="Duração (h)" tip={TIPS.duracao}>
                      <NumInput value={p.duracao_horas} onChange={(n) => setProc(p.id, { duracao_horas: n })} />
                    </Field>
                    <Field label="Materiais (R$)" tip={TIPS.materiais}>
                      <NumInput value={p.materiais} onChange={(n) => setProc(p.id, { materiais: n })} />
                    </Field>
                    <Field label="Laboratório (R$)" tip={TIPS.laboratorio}>
                      <NumInput value={p.laboratorio} onChange={(n) => setProc(p.id, { laboratorio: n })} />
                    </Field>
                    <Field label="Sessões" tip={TIPS.sessoes}>
                      <NumInput value={p.sessoes} onChange={(n) => setProc(p.id, { sessoes: n })} />
                    </Field>
                    <Field label="Margem alvo (%)" tip={TIPS.margem}>
                      <NumInput value={p.margem_alvo_pct} onChange={(n) => setProc(p.id, { margem_alvo_pct: n })} />
                    </Field>
                    <Field label="Frequência/mês" tip={TIPS.frequencia}>
                      <NumInput value={p.frequencia_mes} onChange={(n) => setProc(p.id, { frequencia_mes: n })} />
                    </Field>
                    <Field label="Preço praticado (R$)" hint="opcional" tip={TIPS.preco_praticado}>
                      <NumInput value={p.preco_praticado} onChange={(n) => setProc(p.id, { preco_praticado: n })} />
                    </Field>
                  </div>
                  {r && (
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <ResultBox label="Custo total" value={fmtBRL(r.custo_total)} tip={TIPS.custo_total} />
                      <ResultBox label="Preço mínimo viável" value={fmtBRL(r.preco_minimo)} tip={TIPS.preco_minimo} />
                      <ResultBox label="Preço estratégico" value={fmtBRL(r.preco_estrategico)} tip={TIPS.preco_estrategico} highlight />
                      <ResultBox label="Faturamento/mês" value={fmtBRL(r.faturamento_mes)} tip={TIPS.faturamento_proc} />
                    </div>
                  )}
                  {r?.alerta_abaixo_minimo && (
                    <div className="mt-3 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      Preço praticado ({fmtBRL(p.preco_praticado)}) está abaixo do mínimo viável ({fmtBRL(r.preco_minimo)}).
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* RESULTADOS GLOBAIS */}
        <Card className="bg-verde-raiz p-6 text-linho">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-dourado" />
              <h2 className="font-display text-xl text-dourado">Painel de resultados</h2>
            </div>
            {form.procedimentos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleAnalisarIA}
                  disabled={analisando}
                  size="sm"
                  className="bg-dourado text-verde-raiz hover:bg-dourado/90"
                >
                  {analisando ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando…</>) :
                    (<><Sparkles className="mr-2 h-4 w-4" /> Analisar precificação com IA</>)}
                </Button>
                <Button
                  onClick={handleGerarPolitica}
                  disabled={politicaLoading}
                  size="sm"
                  variant="outline"
                  className="border-dourado text-dourado hover:bg-dourado/10 hover:text-dourado"
                >
                  {politicaLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando…</>) :
                    (<><Tag className="mr-2 h-4 w-4" /> Gerar política de descontos com IA</>)}
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <GlobalKpi label="Faturamento total" value={fmtBRL(calc.faturamento_total)} />
            <GlobalKpi label="Lucro estimado" value={fmtBRL(calc.lucro_total)} />
            <GlobalKpi label="Margem global" value={fmtPct(calc.margem_global_pct)} tip={TIPS.margem_global} />
            <GlobalKpi label="Custo/hora clínica" value={fmtBRL(calc.custo_hora_clinica)} />
            <GlobalKpi
              label="Capacidade utilizada"
              value={fmtPct(calc.capacidade_utilizada_pct)}
              hint={`${calc.horas_utilizadas.toFixed(1)}h de ${calc.capacidade_total_horas.toFixed(0)}h`}
              tip={TIPS.capacidade}
            />
          </div>

          {analiseIA && (
            <div className="mt-6 space-y-4 border-t border-dourado/30 pt-6">
              <div className="rounded-lg border border-dourado/40 bg-dourado/10 p-5">
                <div className="mb-2 flex items-center gap-2 text-dourado">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Análise estratégica</span>
                </div>
                <div className="space-y-2 text-sm leading-relaxed text-linho/90 whitespace-pre-line">
                  {analiseIA.analise}
                </div>
              </div>
              {analiseIA.insights.length > 0 && (
                <div>
                  <h3 className="mb-3 font-display text-lg text-dourado">Insights acionáveis</h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {analiseIA.insights.map((ins, i) => (
                      <div key={i} className="rounded-lg border border-dourado/40 bg-dourado/10 p-4 text-sm text-linho">
                        <div className="mb-1 font-display text-base text-dourado">#{i + 1}</div>
                        {ins}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* CHAT DE PERGUNTAS DA IA (se houver) */}
        {politicaChat.length > 0 && ultimasPerguntas.length > 0 && (
          <Card className="border-dourado/40 bg-dourado/5 p-6">
            <div className="mb-3 flex items-center gap-2 text-verde-raiz">
              <Sparkles className="h-4 w-4 text-dourado" />
              <h3 className="font-display text-lg">A IA precisa de mais informações</h3>
            </div>
            <ul className="mb-4 space-y-2 text-sm text-quase-preto/80">
              {ultimasPerguntas.map((q: string, i: number) => (
                <li key={i}>• {q}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={politicaInput}
                onChange={(e) => setPoliticaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleResponderPolitica();
                  }
                }}
                placeholder="Responda às perguntas acima…"
                disabled={politicaLoading}
              />
              <Button
                onClick={handleResponderPolitica}
                disabled={politicaLoading || !politicaInput.trim()}
                className="bg-verde-raiz text-linho hover:bg-verde-raiz/90"
              >
                {politicaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </Card>
        )}

        {/* POLÍTICA GERADA */}
        {politica && (politica.resumo || politica.limites_desconto?.length || politica.parcelamento?.length || politica.desconto_estrategico?.length || politica.pacotes_combos?.length) && (
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-dourado" />
              <h2 className="font-display text-xl text-verde-raiz">Política de descontos personalizada</h2>
            </div>
            {politica.resumo && (
              <p className="mb-4 rounded-md border border-dourado/30 bg-dourado/10 p-3 text-sm text-quase-preto/90">
                {politica.resumo}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {!!politica.limites_desconto?.length && (
                <PolicyCard title="Limites de desconto">
                  <ul className="space-y-2 text-sm text-quase-preto/80">
                    {politica.limites_desconto.map((ld, i) => (
                      <li key={i}>
                        <strong className="text-verde-raiz">{ld.tipo}:</strong> até {ld.limite_pct}%
                        {ld.observacao && <div className="text-xs text-quase-preto/60">{ld.observacao}</div>}
                      </li>
                    ))}
                  </ul>
                </PolicyCard>
              )}
              {!!politica.parcelamento?.length && (
                <PolicyCard title="Parcelamento recomendado">
                  <ul className="list-disc space-y-1.5 pl-4 text-sm text-quase-preto/80">
                    {politica.parcelamento.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </PolicyCard>
              )}
              {!!politica.desconto_estrategico?.length && (
                <PolicyCard title="Desconto estratégico vs prejuízo">
                  <ul className="list-disc space-y-1.5 pl-4 text-sm text-quase-preto/80">
                    {politica.desconto_estrategico.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </PolicyCard>
              )}
              {!!politica.pacotes_combos?.length && (
                <PolicyCard title="Pacotes e combos sugeridos">
                  <ul className="list-disc space-y-1.5 pl-4 text-sm text-quase-preto/80">
                    {politica.pacotes_combos.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </PolicyCard>
              )}
            </div>
          </Card>
        )}

        {/* AÇÕES FINAIS */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleBaixarPDF}
            className="border-verde-raiz/40 text-verde-raiz hover:bg-verde-raiz/5"
          >
            <FileDown className="mr-2 h-4 w-4" /> Baixar PDF
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={saving}
            className="bg-verde-raiz text-linho hover:bg-verde-raiz/90"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Salvando…" : "Salvar simulação"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ResultBox({
  label, value, highlight, tip,
}: { label: string; value: string; highlight?: boolean; tip?: string }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${highlight ? "border-dourado bg-dourado/10" : "border-quase-preto/10 bg-off-white"}`}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-quase-preto/60">
        {label} {tip && <InfoTip text={tip} />}
      </div>
      <div className={`mt-0.5 font-display text-lg ${highlight ? "text-verde-raiz" : "text-quase-preto"}`}>
        {value}
      </div>
    </div>
  );
}

function GlobalKpi({ label, value, hint, tip }: { label: string; value: string; hint?: string; tip?: string }) {
  return (
    <div className="rounded-lg border border-dourado/30 bg-verde-raiz/40 p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-linho/70">
        {label}
        {tip && (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button type="button" className="text-linho/50 hover:text-dourado" aria-label="Ajuda">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{tip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="mt-1 font-display text-2xl text-dourado">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-linho/60">{hint}</div>}
    </div>
  );
}

function PolicyCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dourado/30 bg-dourado/5 p-4">
      <h4 className="mb-2 font-display text-base text-verde-raiz">{title}</h4>
      {children}
    </div>
  );
}
