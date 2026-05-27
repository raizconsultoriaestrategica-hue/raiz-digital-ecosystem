import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Calculator, Download, Save, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ClienteSelector } from "@/features/diagnostico/components/ClienteSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  calcular, emptyForm, fmtBRL, fmtPct, FIX_LABELS,
  type DiagFinForm, type CalcResult, type CustosFixos,
} from "@/features/diagnostico-financeiro/logic";
import { generateDiagFinPDF } from "@/features/diagnostico-financeiro/pdf";
import CustosClinicaSection from "@/components/consultor/CustosClinicaSection";
import { useUltimosKpisMensais } from "@/hooks/useUltimosKpisMensais";
import { mesCorrenteSP } from "@/hooks/useKpiMesCorrente";

const STEPS = [
  { id: "dados", label: "1. Consultório" },
  { id: "receitas", label: "2. Receitas" },
  { id: "custos", label: "3. Custos" },
  { id: "resultado", label: "Resultado" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const SEM_BG: Record<string, string> = {
  verde: "bg-emerald-100 text-emerald-800 border-emerald-300",
  amarelo: "bg-amber-100 text-amber-800 border-amber-300",
  vermelho: "bg-red-100 text-red-800 border-red-300",
};
const SEM_DOT: Record<string, string> = {
  verde: "bg-emerald-500",
  amarelo: "bg-amber-500",
  vermelho: "bg-red-500",
};

function MoneyInput({ value, onChange, placeholder }: { value: number; onChange: (n: number) => void; placeholder?: string }) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      placeholder={placeholder ?? "0"}
      className="h-10"
    />
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-quase-preto">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function DiagnosticoFinanceiro() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<StepId>("dados");
  const [form, setForm] = useState<DiagFinForm>(emptyForm());
  const [clienteNome, setClienteNome] = useState<string>("");
  const [calc, setCalc] = useState<CalcResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [kpisHidratados, setKpisHidratados] = useState<string | null>(null);
  const [cadastroHidratado, setCadastroHidratado] = useState<string | null>(null);

  // Auto-fill de dados estruturais do consultorio a partir do cadastro do cliente.
  // Esses 5 campos (num_profissionais, dias_trabalhados, horas_clinicas_dia,
  // atendimentos_dia, regime_tributario) sao agora canonicos em clientes (PR 4)
  // e podem ser editados no proprio Diag Fin, com sync de volta ao cadastro no save.
  useEffect(() => {
    if (!form.cliente_id) return;
    if (cadastroHidratado === form.cliente_id) return;
    setCadastroHidratado(form.cliente_id);
    (async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("nome_cliente, cidade, especialidade_clinica, especialidade, num_profissionais, dias_trabalhados, horas_clinicas_dia, atendimentos_dia, regime_tributario")
        .eq("id", form.cliente_id!)
        .maybeSingle();
      if (error || !data) return;
      setForm((f) => ({
        ...f,
        dados: {
          ...f.dados,
          nome_profissional: f.dados.nome_profissional || data.nome_cliente || "",
          especialidade: f.dados.especialidade || data.especialidade_clinica || data.especialidade || f.dados.especialidade,
          cidade: f.dados.cidade || data.cidade || "",
          regime_tributario: data.regime_tributario || f.dados.regime_tributario,
          num_profissionais: data.num_profissionais ?? f.dados.num_profissionais,
          dias_trabalhados: data.dias_trabalhados ?? f.dados.dias_trabalhados,
          horas_clinicas_dia: data.horas_clinicas_dia ?? f.dados.horas_clinicas_dia,
          atendimentos_dia: data.atendimentos_dia ?? f.dados.atendimentos_dia,
        },
      }));
    })();
  }, [form.cliente_id, cadastroHidratado]);

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  const update = <K extends keyof DiagFinForm>(k: K, patch: Partial<DiagFinForm[K]>) =>
    setForm((f) => ({ ...f, [k]: { ...(f[k] as object), ...patch } as any }));

  // Auto-fill de receitas a partir do último kpis_mensais do cliente
  const { data: ultimosKpis } = useUltimosKpisMensais(form.cliente_id);
  useEffect(() => {
    if (!form.cliente_id || !ultimosKpis) return;
    // Só hidrata uma vez por cliente, e só se o consultor ainda não preencheu
    if (kpisHidratados === form.cliente_id) return;
    const algumValor =
      form.receitas.faturamento_bruto > 0 ||
      form.receitas.ticket_medio > 0 ||
      form.receitas.taxa_conversao > 0;
    if (algumValor) {
      setKpisHidratados(form.cliente_id);
      return;
    }
    setForm((f) => ({
      ...f,
      receitas: {
        ...f.receitas,
        faturamento_bruto: Number(ultimosKpis.faturamento_bruto ?? f.receitas.faturamento_bruto),
        faturamento_convenios: Number(ultimosKpis.faturamento_convenios ?? f.receitas.faturamento_convenios),
        ticket_medio: Number(ultimosKpis.ticket_medio ?? f.receitas.ticket_medio),
        pacientes_novos_mes: Number(ultimosKpis.pacientes_novos ?? f.receitas.pacientes_novos_mes),
        taxa_conversao: Number(ultimosKpis.taxa_conversao ?? f.receitas.taxa_conversao),
        taxa_inadimplencia: Number(ultimosKpis.taxa_inadimplencia ?? f.receitas.taxa_inadimplencia),
        pct_vista: Number(ultimosKpis.pct_recebido_vista ?? f.receitas.pct_vista),
        investimento_marketing: Number(ultimosKpis.investimento_marketing ?? f.receitas.investimento_marketing),
        no_show: Number(ultimosKpis.taxa_no_show ?? f.receitas.no_show),
        ocupacao_agenda: Number(ultimosKpis.ocupacao_cadeiras ?? f.receitas.ocupacao_agenda),
      },
    }));
    setKpisHidratados(form.cliente_id);
    toast.success(`Receitas carregadas do mês ${ultimosKpis.mes_referencia}`);
  }, [form.cliente_id, ultimosKpis, kpisHidratados, form.receitas.faturamento_bruto, form.receitas.ticket_medio, form.receitas.taxa_conversao]);

  const handleCalcular = () => {
    const r = calcular(form);
    setCalc(r);
    setStep("resultado");
  };

  const handleSavePDF = async () => {
    if (!calc) return;
    setSaving(true);
    try {
      const doc = generateDiagFinPDF(form, calc, clienteNome);
      const fileName = `diagnostico-financeiro-${(clienteNome || "cliente").toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`;
      const blob = doc.output("blob");

      let storage_path: string | null = null;
      if (form.cliente_id) {
        const path = `${form.cliente_id}/${fileName}`;
        const { error: upErr } = await supabase.storage
          .from("diagnosticos-financeiros")
          .upload(path, blob, { contentType: "application/pdf", upsert: false });
        if (upErr) throw upErr;
        storage_path = path;
      }

      const { error } = await supabase.from("diagnosticos_financeiros").insert({
        cliente_id: form.cliente_id,
        nome_profissional: form.dados.nome_profissional,
        especialidade: form.dados.especialidade,
        cidade: form.dados.cidade,
        regime_tributario: form.dados.regime_tributario,
        num_profissionais: form.dados.num_profissionais,
        dias_trabalhados: form.dados.dias_trabalhados,
        horas_clinicas_dia: form.dados.horas_clinicas_dia,
        atendimentos_dia: form.dados.atendimentos_dia,
        faturamento_bruto: form.receitas.faturamento_bruto,
        faturamento_convenios: form.receitas.faturamento_convenios,
        ticket_medio: form.receitas.ticket_medio,
        pacientes_novos_mes: form.receitas.pacientes_novos_mes,
        taxa_conversao: form.receitas.taxa_conversao,
        taxa_inadimplencia: form.receitas.taxa_inadimplencia,
        pct_vista: form.receitas.pct_vista,
        investimento_marketing: form.receitas.investimento_marketing,
        no_show: form.receitas.no_show,
        ocupacao_agenda: form.receitas.ocupacao_agenda,
        custos_fixos: form.custos_fixos as any,
        custos_variaveis: form.custos_variaveis as any,
        financiamentos: form.financiamentos as any,
        indicadores: calc.indicadores as any,
        alertas: calc.alertas as any,
        storage_path,
        file_name: fileName,
        created_by: user?.id ?? null,
      });
      if (error) throw error;

      // Sync de custos (fixos + variaveis + extras) com custos_clinica.
      // Diag Fin armazena custos como JSON snapshot, mas o Simulador de
      // Precificacao le de custos_clinica (tabela canonica). Sem essa
      // sincronizacao, o consultor digita os mesmos custos 2x.
      // Padrao soft-delete + insert para garantir snapshot atual.
      if (form.cliente_id) {
        try {
          await supabase
            .from("custos_clinica")
            .update({ ativo: false })
            .eq("cliente_id", form.cliente_id)
            .in("tipo", ["fixo", "variavel"])
            .eq("ativo", true);

          const slugify = (s: string) =>
            s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
              .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "extra";

          const linhasFixos = (Object.keys(form.custos_fixos) as (keyof CustosFixos)[])
            .filter((k) => (form.custos_fixos[k] || 0) > 0)
            .map((k) => ({
              cliente_id: form.cliente_id!,
              tipo: "fixo",
              categoria: k as string,
              descricao: FIX_LABELS[k],
              valor: Number(form.custos_fixos[k]),
            }));
          const linhasVar = (Object.keys(form.custos_variaveis) as (keyof typeof form.custos_variaveis)[])
            .filter((k) => (form.custos_variaveis[k] || 0) > 0)
            .map((k) => ({
              cliente_id: form.cliente_id!,
              tipo: "variavel",
              categoria: k as string,
              descricao: null as string | null,
              valor: Number(form.custos_variaveis[k]),
            }));
          const linhasExtrasF = form.extras_fixos
            .filter((e) => e.nome.trim() && Number(e.valor) > 0)
            .map((e) => ({
              cliente_id: form.cliente_id!,
              tipo: "fixo",
              categoria: slugify(e.nome),
              descricao: e.nome.trim(),
              valor: Number(e.valor),
            }));
          const linhasExtrasV = form.extras_variaveis
            .filter((e) => e.nome.trim() && Number(e.valor) > 0)
            .map((e) => ({
              cliente_id: form.cliente_id!,
              tipo: "variavel",
              categoria: slugify(e.nome),
              descricao: e.nome.trim(),
              valor: Number(e.valor),
            }));

          const linhas = [...linhasFixos, ...linhasVar, ...linhasExtrasF, ...linhasExtrasV];
          if (linhas.length > 0) {
            const { error: insErr } = await supabase.from("custos_clinica").insert(linhas);
            if (insErr) {
              console.warn("[diag fin] sync de custos_clinica falhou:", insErr);
            }
          }
        } catch (e) {
          console.warn("[diag fin] sync de custos_clinica excecao:", e);
        }
      }

      // Sync com cadastro do cliente: 5 campos estruturais do consultorio.
      // Esses dados sao canonicos em clientes desde PR 4. Aqui o consultor
      // pode editar no Diag Fin e o cadastro reflete sem precisar abrir
      // "Editar projeto" depois.
      if (form.cliente_id) {
        try {
          await supabase
            .from("clientes")
            .update({
              num_profissionais: form.dados.num_profissionais || null,
              dias_trabalhados: form.dados.dias_trabalhados || null,
              horas_clinicas_dia: form.dados.horas_clinicas_dia || null,
              atendimentos_dia: form.dados.atendimentos_dia || null,
              regime_tributario: form.dados.regime_tributario || null,
            })
            .eq("id", form.cliente_id);
        } catch (e) {
          console.warn("[diag fin] sync de dados estruturais com clientes falhou:", e);
        }
      }

      // Sync com kpis_mensais: zeros viram NULL para nao contaminar benchmarks.
      // Upsert por (cliente_id, mes_referencia) garante atualizacao se ja existe
      // (ex: cliente preencheu o card mensal antes do consultor rodar o diag fin).
      if (form.cliente_id) {
        try {
          const { mes_referencia } = mesCorrenteSP();
          const numOrNull = (n: number) => (Number.isFinite(n) && n !== 0 ? n : null);
          const intOrNull = (n: number) => (Number.isFinite(n) && n !== 0 ? Math.round(n) : null);
          const kpiPayload = {
            cliente_id: form.cliente_id,
            mes_referencia,
            faturamento_bruto: numOrNull(form.receitas.faturamento_bruto),
            faturamento_convenios: numOrNull(form.receitas.faturamento_convenios),
            ticket_medio: numOrNull(form.receitas.ticket_medio),
            pacientes_novos: intOrNull(form.receitas.pacientes_novos_mes),
            taxa_conversao: numOrNull(form.receitas.taxa_conversao),
            taxa_inadimplencia: numOrNull(form.receitas.taxa_inadimplencia),
            pct_recebido_vista: numOrNull(form.receitas.pct_vista),
            investimento_marketing: numOrNull(form.receitas.investimento_marketing),
            taxa_no_show: numOrNull(form.receitas.no_show),
            ocupacao_cadeiras: numOrNull(form.receitas.ocupacao_agenda),
            margem_liquida: numOrNull(calc.margemLiquida),
            preenchido_por: user?.id ?? null,
          };
          const { error: kpiErr } = await supabase
            .from("kpis_mensais")
            .upsert(kpiPayload, { onConflict: "cliente_id,mes_referencia" });
          if (kpiErr) {
            console.warn("[diag fin] sync com kpis_mensais falhou:", kpiErr);
            toast.warning("Diagnóstico salvo, mas falhou sync com KPIs do mês: " + kpiErr.message);
          } else {
            // Invalida queries dependentes para refletir nas telas em tempo real
            queryClient.invalidateQueries({ queryKey: ["kpi-mes-corrente", form.cliente_id, mes_referencia] });
            queryClient.invalidateQueries({ queryKey: ["ultimos-kpis-mensais", form.cliente_id] });
            queryClient.invalidateQueries({ queryKey: ["gargalos", form.cliente_id] });
            queryClient.invalidateQueries({ queryKey: ["saude-financeira-cliente", form.cliente_id] });
            queryClient.invalidateQueries({ queryKey: ["saude-financeira-clientes"] });
            queryClient.invalidateQueries({ queryKey: ["saude-plataforma"] });
            queryClient.invalidateQueries({ queryKey: ["evolucao-negocio"] });
          }
        } catch (kpiErr) {
          console.warn("[diag fin] sync com kpis_mensais excecao:", kpiErr);
        }
      }

      doc.save(fileName);
      toast.success("Diagnóstico salvo, PDF gerado e KPIs do mês atualizados.");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadOnly = () => {
    if (!calc) return;
    const doc = generateDiagFinPDF(form, calc, clienteNome);
    doc.save(`diagnostico-financeiro-${Date.now()}.pdf`);
  };

  return (
    <div className="-m-6 md:-m-10 min-h-[calc(100vh-4rem)] bg-off-white">
      {/* Header */}
      <div className="bg-verde-raiz px-6 py-8 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.2em] text-dourado">Módulo 4.1</p>
          <h1 className="mt-2 font-serif text-3xl text-linho md:text-4xl">Diagnóstico Financeiro</h1>
          <p className="mt-2 max-w-2xl text-sm text-linho/80">
            Mapeie a saúde financeira do consultório em 3 passos. Receitas, custos e indicadores estratégicos.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
        <Tabs value={step} onValueChange={(v) => setStep(v as StepId)}>
          <TabsList className="grid w-full grid-cols-4 bg-verde-raiz/5">
            {STEPS.map((s, i) => (
              <TabsTrigger
                key={s.id}
                value={s.id}
                disabled={i > 2 && !calc}
                className="data-[state=active]:bg-verde-raiz data-[state=active]:text-dourado"
              >
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ETAPA 1 */}
          <TabsContent value="dados">
            <Card className="mt-6 p-6 md:p-8">
              <h2 className="font-serif text-xl text-verde-raiz">Dados do consultório</h2>
              <div className="mt-6 space-y-4">
                <ClienteSelector
                  value={form.cliente_id}
                  onChange={(id, c) => {
                    // Mapeia especialidade do cadastro para o enum local
                    let espMapeada = "";
                    const espRaw = (c?.especialidade_clinica || c?.especialidade || "").toLowerCase();
                    if (espRaw.includes("odonto") || espRaw.includes("dentist")) espMapeada = "Odontologia";
                    else if (espRaw.includes("derma")) espMapeada = "Dermatologia";
                    else if (espRaw.includes("estét") || espRaw.includes("estet") || espRaw.includes("harmoniz") || espRaw.includes("medicina"))
                      espMapeada = "Medicina Estética";
                    else if (c?.especialidade_clinica || c?.especialidade) espMapeada = "Outra";

                    setForm((f) => ({
                      ...f,
                      cliente_id: id,
                      dados: {
                        ...f.dados,
                        nome_profissional: c?.nome_clinica || c?.nome_cliente || f.dados.nome_profissional,
                        cidade: c?.cidade || f.dados.cidade,
                        especialidade: espMapeada || f.dados.especialidade,
                      },
                    }));
                    setClienteNome(c?.nome_cliente || "");
                    setKpisHidratados(null); // permite hidratar receitas do novo cliente
                  }}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome do profissional / clínica">
                    <Input
                      value={form.dados.nome_profissional}
                      onChange={(e) => update("dados", { nome_profissional: e.target.value })}
                    />
                  </Field>
                  <Field label="Especialidade">
                    <Select
                      value={form.dados.especialidade}
                      onValueChange={(v) => update("dados", { especialidade: v })}
                    >
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Odontologia">Odontologia</SelectItem>
                        <SelectItem value="Medicina Estética">Medicina Estética</SelectItem>
                        <SelectItem value="Dermatologia">Dermatologia</SelectItem>
                        <SelectItem value="Outra">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Cidade">
                    <Input value={form.dados.cidade} onChange={(e) => update("dados", { cidade: e.target.value })} />
                  </Field>
                  <Field label="Regime tributário">
                    <Select
                      value={form.dados.regime_tributario}
                      onValueChange={(v) => update("dados", { regime_tributario: v })}
                    >
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                        <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="MEI">MEI</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Nº de profissionais">
                    <MoneyInput value={form.dados.num_profissionais} onChange={(n) => update("dados", { num_profissionais: n })} />
                  </Field>
                  <Field label="Dias trabalhados/mês" hint="Padrão: 22">
                    <MoneyInput value={form.dados.dias_trabalhados} onChange={(n) => update("dados", { dias_trabalhados: n })} />
                  </Field>
                  <Field label="Horas clínicas/dia" hint="Padrão: 8">
                    <MoneyInput value={form.dados.horas_clinicas_dia} onChange={(n) => update("dados", { horas_clinicas_dia: n })} />
                  </Field>
                  <Field label="Atendimentos médios/dia">
                    <MoneyInput value={form.dados.atendimentos_dia} onChange={(n) => update("dados", { atendimentos_dia: n })} />
                  </Field>
                </div>
              </div>
              <NavButtons step={step} onPrev={null} onNext={() => setStep("receitas")} />
            </Card>
          </TabsContent>

          {/* ETAPA 2 */}
          <TabsContent value="receitas">
            <Card className="mt-6 p-6 md:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-xl text-verde-raiz">Receitas & faturamento</h2>
                {ultimosKpis && kpisHidratados === form.cliente_id && (
                  <Badge variant="outline" className="border-verde-raiz/30 text-verde-raiz">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Pré-preenchido com KPIs de {ultimosKpis.mes_referencia}
                  </Badge>
                )}
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Faturamento bruto / mês (R$)">
                  <MoneyInput value={form.receitas.faturamento_bruto} onChange={(n) => update("receitas", { faturamento_bruto: n })} />
                </Field>
                <Field label="Faturamento de convênios / mês (R$)">
                  <MoneyInput value={form.receitas.faturamento_convenios} onChange={(n) => update("receitas", { faturamento_convenios: n })} />
                </Field>
                <Field label="Ticket médio por paciente (R$)">
                  <MoneyInput value={form.receitas.ticket_medio} onChange={(n) => update("receitas", { ticket_medio: n })} />
                </Field>
                <Field label="Pacientes novos / mês">
                  <MoneyInput value={form.receitas.pacientes_novos_mes} onChange={(n) => update("receitas", { pacientes_novos_mes: n })} />
                </Field>
                <Field label="Taxa de conversão de orçamentos (%)">
                  <MoneyInput value={form.receitas.taxa_conversao} onChange={(n) => update("receitas", { taxa_conversao: n })} />
                </Field>
                <Field label="Taxa de inadimplência (%)">
                  <MoneyInput value={form.receitas.taxa_inadimplencia} onChange={(n) => update("receitas", { taxa_inadimplencia: n })} />
                </Field>
                <Field label="% da receita recebida à vista">
                  <MoneyInput value={form.receitas.pct_vista} onChange={(n) => update("receitas", { pct_vista: n })} />
                </Field>
                <Field label="Investimento em marketing / mês (R$)">
                  <MoneyInput value={form.receitas.investimento_marketing} onChange={(n) => update("receitas", { investimento_marketing: n })} />
                </Field>
                <Field label="No-show (%)" hint="% de faltas/cancelamentos">
                  <MoneyInput value={form.receitas.no_show} onChange={(n) => update("receitas", { no_show: n })} />
                </Field>
                <Field label="Ocupação da agenda (%)">
                  <MoneyInput value={form.receitas.ocupacao_agenda} onChange={(n) => update("receitas", { ocupacao_agenda: n })} />
                </Field>
              </div>
              <NavButtons step={step} onPrev={() => setStep("dados")} onNext={() => setStep("custos")} />
            </Card>
          </TabsContent>

          {/* ETAPA 3 */}
          <TabsContent value="custos">
            <div className="mt-6 space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-xl text-verde-raiz">Custos & despesas</h2>
                {form.cliente_id && (
                  <p className="text-xs text-quase-preto/55">
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    Custos persistidos no cadastro do cliente
                  </p>
                )}
              </div>

              <CustosClinicaSection
                clienteId={form.cliente_id}
                custosFixos={form.custos_fixos}
                custosVariaveis={form.custos_variaveis}
                financiamentos={form.financiamentos}
                extrasFixos={form.extras_fixos}
                extrasVariaveis={form.extras_variaveis}
                onChange={(patch) => {
                  setForm((f) => ({
                    ...f,
                    custos_fixos: { ...f.custos_fixos, ...(patch.custos_fixos ?? {}) },
                    custos_variaveis: { ...f.custos_variaveis, ...(patch.custos_variaveis ?? {}) },
                    financiamentos: { ...f.financiamentos, ...(patch.financiamentos ?? {}) },
                    extras_fixos: patch.extras_fixos ?? f.extras_fixos,
                    extras_variaveis: patch.extras_variaveis ?? f.extras_variaveis,
                  }));
                }}
              />

              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button variant="outline" onClick={() => setStep("receitas")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                  <Button onClick={handleCalcular} className="bg-dourado text-verde-raiz hover:bg-dourado/90">
                    <Calculator className="mr-2 h-4 w-4" /> Calcular Diagnóstico
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* RESULTADO */}
          <TabsContent value="resultado">
            {calc && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-6">
                {/* KPIs principais */}
                <div className="grid gap-4 md:grid-cols-4">
                  <KpiBox label="Faturamento" value={fmtBRL(calc.faturamento)} />
                  <KpiBox label="Custos totais" value={fmtBRL(calc.custosTotais)} />
                  <KpiBox label="Lucro líquido" value={fmtBRL(calc.lucroLiquido)} accent />
                  <KpiBox label="Margem líquida" value={fmtPct(calc.margemLiquida)} accent />
                </div>

                {/* Indicadores com semáforo */}
                <Card className="p-6">
                  <h3 className="font-serif text-lg text-verde-raiz">Indicadores</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {calc.indicadores.map((i) => (
                      <div key={i.key} className="flex items-center justify-between rounded-md border border-verde-raiz/10 bg-white p-3">
                        <div className="flex items-center gap-3">
                          {i.semaforo && <span className={`h-2.5 w-2.5 rounded-full ${SEM_DOT[i.semaforo]}`} />}
                          <span className="text-sm text-quase-preto">{i.label}</span>
                        </div>
                        <span className="font-semibold text-verde-raiz">
                          {i.unidade === "%"
                            ? fmtPct(i.valor)
                            : i.unidade.startsWith("R$")
                              ? fmtBRL(i.valor) + (i.unidade !== "R$" ? "/" + i.unidade.split("/")[1] : "")
                              : i.valor}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Alertas */}
                {calc.alertas.length > 0 && (
                  <Card className="p-6">
                    <h3 className="flex items-center gap-2 font-serif text-lg text-verde-raiz">
                      <AlertTriangle className="h-5 w-5 text-amber-600" /> Alertas
                    </h3>
                    <div className="mt-4 space-y-3">
                      {calc.alertas.map((a, i) => (
                        <div key={i} className={`rounded-md border-l-4 p-3 ${SEM_BG[a.nivel]}`}>
                          <p className="font-semibold">{a.titulo}</p>
                          <p className="mt-1 text-sm">{a.texto}</p>
                          <p className="mt-2 text-sm font-medium">→ {a.recomendacao}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Composição */}
                <Card className="p-6">
                  <h3 className="font-serif text-lg text-verde-raiz">Composição de custos</h3>
                  <div className="mt-4 space-y-2 text-sm">
                    <Row label="Custos fixos" v={calc.totalFixos} total={calc.custosTotais} />
                    <Row label="Custos variáveis" v={calc.totalVariaveis} total={calc.custosTotais} />
                    <Row label="Financiamentos" v={calc.totalFinanciamentos} total={calc.custosTotais} />
                  </div>

                  <h4 className="mt-6 text-sm font-semibold uppercase tracking-wider text-dourado">Maiores custos</h4>
                  <div className="mt-3 space-y-1.5 text-sm">
                    {calc.rankingCustos.slice(0, 8).map((r, i) => (
                      <div key={i} className="flex justify-between border-b border-dashed border-verde-raiz/10 py-1.5">
                        <span className="text-quase-preto">{i + 1}. {r.nome} <Badge variant="outline" className="ml-2 text-[10px]">{r.tipo}</Badge></span>
                        <span className="font-medium text-verde-raiz">{fmtBRL(r.valor)}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button variant="outline" onClick={() => setStep("custos")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Editar dados
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDownloadOnly}>
                      <Download className="mr-2 h-4 w-4" /> Baixar PDF
                    </Button>
                    <Button onClick={handleSavePDF} disabled={saving} className="bg-verde-raiz text-dourado hover:bg-verde-raiz/90">
                      <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar simulação"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function NavButtons({ step, onPrev, onNext }: { step: StepId; onPrev: (() => void) | null; onNext: () => void }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      {onPrev ? (
        <Button variant="outline" onClick={onPrev}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      ) : <span />}
      <Button onClick={onNext} className="bg-verde-raiz text-dourado hover:bg-verde-raiz/90">
        Próximo <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function KpiBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={`p-4 ${accent ? "bg-verde-raiz text-linho" : "bg-white"}`}>
      <p className={`text-xs uppercase tracking-wider ${accent ? "text-dourado" : "text-muted-foreground"}`}>{label}</p>
      <p className={`mt-1 font-serif text-2xl ${accent ? "text-linho" : "text-verde-raiz"}`}>{value}</p>
    </Card>
  );
}

function Row({ label, v, total }: { label: string; v: number; total: number }) {
  const pct = total > 0 ? (v / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between">
        <span className="text-quase-preto">{label}</span>
        <span className="font-medium text-verde-raiz">{fmtBRL(v)} <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-verde-raiz/10">
        <div className="h-full rounded-full bg-dourado" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
