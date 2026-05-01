import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Calculator, Download, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ClienteSelector } from "@/features/diagnostico/components/ClienteSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  calcular, emptyForm, fmtBRL, fmtPct,
  type DiagFinForm, type CalcResult,
} from "@/features/diagnostico-financeiro/logic";
import { generateDiagFinPDF } from "@/features/diagnostico-financeiro/pdf";

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
  const [step, setStep] = useState<StepId>("dados");
  const [form, setForm] = useState<DiagFinForm>(emptyForm());
  const [clienteNome, setClienteNome] = useState<string>("");
  const [calc, setCalc] = useState<CalcResult | null>(null);
  const [saving, setSaving] = useState(false);

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  const update = <K extends keyof DiagFinForm>(k: K, patch: Partial<DiagFinForm[K]>) =>
    setForm((f) => ({ ...f, [k]: { ...(f[k] as object), ...patch } as any }));

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

      doc.save(fileName);
      toast.success("Diagnóstico salvo e PDF gerado.");
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
                    setForm((f) => ({
                      ...f,
                      cliente_id: id,
                      dados: {
                        ...f.dados,
                        nome_profissional: c?.nome_clinica || c?.nome_cliente || f.dados.nome_profissional,
                        cidade: c?.cidade || f.dados.cidade,
                      },
                    }));
                    setClienteNome(c?.nome_cliente || "");
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
              <h2 className="font-serif text-xl text-verde-raiz">Receitas & faturamento</h2>
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
            <Card className="mt-6 p-6 md:p-8">
              <h2 className="font-serif text-xl text-verde-raiz">Custos & despesas</h2>

              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-dourado">Custos Fixos</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <Field label="Aluguel / condomínio">
                  <MoneyInput value={form.custos_fixos.aluguel} onChange={(n) => update("custos_fixos", { aluguel: n })} />
                </Field>
                <Field label="Folha de pagamento / salários">
                  <MoneyInput value={form.custos_fixos.folha} onChange={(n) => update("custos_fixos", { folha: n })} />
                </Field>
                <Field label="Pró-labore do titular">
                  <MoneyInput value={form.custos_fixos.pro_labore} onChange={(n) => update("custos_fixos", { pro_labore: n })} />
                </Field>
                <Field label="Contabilidade">
                  <MoneyInput value={form.custos_fixos.contabilidade} onChange={(n) => update("custos_fixos", { contabilidade: n })} />
                </Field>
                <Field label="Energia / água / telefone">
                  <MoneyInput value={form.custos_fixos.utilities} onChange={(n) => update("custos_fixos", { utilities: n })} />
                </Field>
                <Field label="Sistemas / softwares / internet">
                  <MoneyInput value={form.custos_fixos.software} onChange={(n) => update("custos_fixos", { software: n })} />
                </Field>
                <Field label="Outros fixos">
                  <MoneyInput value={form.custos_fixos.outros_fixos} onChange={(n) => update("custos_fixos", { outros_fixos: n })} />
                </Field>
              </div>

              <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-dourado">Custos Variáveis</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <Field label="Materiais / insumos">
                  <MoneyInput value={form.custos_variaveis.materiais} onChange={(n) => update("custos_variaveis", { materiais: n })} />
                </Field>
                <Field label="Laboratório / terceirizados">
                  <MoneyInput value={form.custos_variaveis.laboratorio} onChange={(n) => update("custos_variaveis", { laboratorio: n })} />
                </Field>
                <Field label="Comissões">
                  <MoneyInput value={form.custos_variaveis.comissoes} onChange={(n) => update("custos_variaveis", { comissoes: n })} />
                </Field>
                <Field label="Impostos / tributos">
                  <MoneyInput value={form.custos_variaveis.impostos} onChange={(n) => update("custos_variaveis", { impostos: n })} />
                </Field>
                <Field label="Taxas de cartão / maquininha">
                  <MoneyInput value={form.custos_variaveis.taxas_cartao} onChange={(n) => update("custos_variaveis", { taxas_cartao: n })} />
                </Field>
                <Field label="Outros variáveis">
                  <MoneyInput value={form.custos_variaveis.outros_variaveis} onChange={(n) => update("custos_variaveis", { outros_variaveis: n })} />
                </Field>
              </div>

              <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-dourado">Financiamentos</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <Field label="Parcelas de equipamentos / financiamentos">
                  <MoneyInput value={form.financiamentos.parcelas_equipamentos} onChange={(n) => update("financiamentos", { parcelas_equipamentos: n })} />
                </Field>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" onClick={() => setStep("receitas")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={handleCalcular} className="bg-dourado text-verde-raiz hover:bg-dourado/90">
                  <Calculator className="mr-2 h-4 w-4" /> Calcular Diagnóstico
                </Button>
              </div>
            </Card>
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
