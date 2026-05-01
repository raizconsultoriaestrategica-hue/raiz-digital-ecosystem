import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Save, Trash2, Calculator } from "lucide-react";
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

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-quase-preto">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  step = "any",
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: string;
  placeholder?: string;
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

export default function SimuladorPrecificacao() {
  const { user } = useAuth();
  const [form, setForm] = useState<PrecificacaoForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = "Simulador de Precificação · Raiz Consultoria";
    return () => {
      document.title = prev;
    };
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
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Simulação salva com sucesso.");
  };

  return (
    <div className="space-y-6 font-body">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-verde-raiz">Simulador de Precificação Estratégica</h1>
          <p className="mt-1 text-sm text-quase-preto/70">
            Módulo 4.2 — Calcule preços mínimos viáveis e estratégicos baseados em custos reais e posicionamento.
          </p>
        </div>
        <Button
          onClick={handleSalvar}
          disabled={saving}
          className="bg-verde-raiz text-linho hover:bg-verde-raiz/90"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando…" : "Salvar simulação"}
        </Button>
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
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Odontologia">Odontologia</SelectItem>
                <SelectItem value="Medicina Estética">Medicina Estética</SelectItem>
                <SelectItem value="Dermatologia">Dermatologia</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Posicionamento de mercado">
            <Select
              value={form.posicionamento}
              onValueChange={(v) => setForm((f) => ({ ...f, posicionamento: v as Posicionamento }))}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(POSICIONAMENTO_LABEL) as Posicionamento[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {POSICIONAMENTO_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Horas trabalhadas/dia">
            <NumInput value={form.horas_dia} onChange={(n) => setForm((f) => ({ ...f, horas_dia: n }))} />
          </Field>
          <Field label="Dias trabalhados/mês">
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
              <NumInput value={c.valor} onChange={(n) => setCusto(c.id, { valor: n })} placeholder="R$ 0" />
              <Button variant="ghost" size="icon" onClick={() => removeCusto(c.id)}>
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-md border border-dourado/40 bg-dourado/10 px-4 py-3">
          <span className="text-sm font-semibold text-quase-preto">Total de custos fixos</span>
          <span className="font-display text-xl text-verde-raiz">{fmtBRL(calc.total_custos_fixos)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-md bg-off-white px-4 py-2">
          <span className="text-xs text-quase-preto/70">Custo por hora clínica</span>
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
                    <Badge variant="outline" className="border-dourado text-dourado">
                      #{idx + 1}
                    </Badge>
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
                  <Field label="Duração (h)">
                    <NumInput value={p.duracao_horas} onChange={(n) => setProc(p.id, { duracao_horas: n })} />
                  </Field>
                  <Field label="Materiais (R$)">
                    <NumInput value={p.materiais} onChange={(n) => setProc(p.id, { materiais: n })} />
                  </Field>
                  <Field label="Laboratório (R$)">
                    <NumInput value={p.laboratorio} onChange={(n) => setProc(p.id, { laboratorio: n })} />
                  </Field>
                  <Field label="Sessões">
                    <NumInput value={p.sessoes} onChange={(n) => setProc(p.id, { sessoes: n })} />
                  </Field>
                  <Field label="Margem alvo (%)">
                    <NumInput value={p.margem_alvo_pct} onChange={(n) => setProc(p.id, { margem_alvo_pct: n })} />
                  </Field>
                  <Field label="Frequência/mês">
                    <NumInput value={p.frequencia_mes} onChange={(n) => setProc(p.id, { frequencia_mes: n })} />
                  </Field>
                  <Field label="Preço praticado (R$)" hint="opcional">
                    <NumInput value={p.preco_praticado} onChange={(n) => setProc(p.id, { preco_praticado: n })} />
                  </Field>
                </div>

                {r && (
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <ResultBox label="Custo total" value={fmtBRL(r.custo_total)} />
                    <ResultBox label="Preço mínimo viável" value={fmtBRL(r.preco_minimo)} />
                    <ResultBox label="Preço estratégico" value={fmtBRL(r.preco_estrategico)} highlight />
                    <ResultBox label="Faturamento/mês" value={fmtBRL(r.faturamento_mes)} />
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
        <div className="mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-dourado" />
          <h2 className="font-display text-xl text-dourado">Painel de resultados</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <GlobalKpi label="Faturamento total" value={fmtBRL(calc.faturamento_total)} />
          <GlobalKpi label="Lucro estimado" value={fmtBRL(calc.lucro_total)} />
          <GlobalKpi label="Margem global" value={fmtPct(calc.margem_global_pct)} />
          <GlobalKpi label="Custo/hora clínica" value={fmtBRL(calc.custo_hora_clinica)} />
          <GlobalKpi
            label="Capacidade utilizada"
            value={fmtPct(calc.capacidade_utilizada_pct)}
            hint={`${calc.horas_utilizadas.toFixed(1)}h de ${calc.capacidade_total_horas.toFixed(0)}h`}
          />
        </div>
      </Card>

      {/* POLÍTICA DE DESCONTOS */}
      <Card className="border-dourado/40 bg-dourado/5 p-6">
        <h2 className="mb-3 font-display text-xl text-verde-raiz">Política de descontos e parcelamento</h2>
        <ul className="space-y-2 text-sm text-quase-preto/80">
          <li>• Parcelamento sem juros até <strong>3x</strong> para procedimentos acima de <strong>R$ 500</strong>.</li>
          <li>• Acima de 3x, repassar a taxa da maquininha ao paciente.</li>
          <li>• Desconto máximo recomendado: <strong>10%</strong>, sem comprometer a margem mínima viável.</li>
        </ul>
      </Card>
    </div>
  );
}

function ResultBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-md border px-3 py-2 ${
        highlight ? "border-dourado bg-dourado/10" : "border-quase-preto/10 bg-off-white"
      }`}
    >
      <div className="text-[11px] uppercase tracking-wide text-quase-preto/60">{label}</div>
      <div className={`mt-0.5 font-display text-lg ${highlight ? "text-verde-raiz" : "text-quase-preto"}`}>
        {value}
      </div>
    </div>
  );
}

function GlobalKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dourado/30 bg-verde-raiz/40 p-4">
      <div className="text-xs uppercase tracking-wide text-linho/70">{label}</div>
      <div className="mt-1 font-display text-2xl text-dourado">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-linho/60">{hint}</div>}
    </div>
  );
}
