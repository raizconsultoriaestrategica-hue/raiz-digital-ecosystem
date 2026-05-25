import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Pencil, Save, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { useKpiMesCorrente } from "@/hooks/useKpiMesCorrente";

interface Props {
  clienteId: string | null | undefined;
}

const fmtBRL = (n: number | null | undefined) => {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
};

const fmtInt = (n: number | null | undefined) => {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
  return String(Math.round(Number(n)));
};

const fmtPct = (n: number | null | undefined) => {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toFixed(1)}%`;
};

const fmtData = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const emptyForm = () => ({
  faturamento_bruto: 0,
  ticket_medio: 0,
  pacientes_novos: 0,
  margem_liquida: 0,
  taxa_conversao: 0,
  taxa_inadimplencia: 0,
  pct_recebido_vista: 0,
  investimento_marketing: 0,
  taxa_no_show: 0,
  ocupacao_cadeiras: 0,
  faturamento_convenios: 0,
  observacoes: "",
});

function NumInput({
  id,
  value,
  onChange,
  step,
  min,
  max,
  placeholder,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      step={step ?? "0.01"}
      min={min}
      max={max}
      placeholder={placeholder ?? "0"}
      className="h-10"
    />
  );
}

function FieldGroup({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-quase-preto/50">
        {title}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function FormField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-semibold text-quase-preto">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function AtualizacaoMensalCard({ clienteId }: Props) {
  const { kpi, isLoading, error, salvar, salvando, mes_label } =
    useKpiMesCorrente(clienteId);

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const setF = <K extends keyof ReturnType<typeof emptyForm>>(
    key: K,
    value: ReturnType<typeof emptyForm>[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  // Hidrata form com KPI existente sempre que entra em modo edicao
  useEffect(() => {
    if (!editando) return;
    setForm({
      faturamento_bruto: Number(kpi?.faturamento_bruto ?? 0),
      ticket_medio: Number(kpi?.ticket_medio ?? 0),
      pacientes_novos: Number(kpi?.pacientes_novos ?? 0),
      margem_liquida: Number(kpi?.margem_liquida ?? 0),
      taxa_conversao: Number(kpi?.taxa_conversao ?? 0),
      taxa_inadimplencia: Number(kpi?.taxa_inadimplencia ?? 0),
      pct_recebido_vista: Number(kpi?.pct_recebido_vista ?? 0),
      investimento_marketing: Number(kpi?.investimento_marketing ?? 0),
      taxa_no_show: Number(kpi?.taxa_no_show ?? 0),
      ocupacao_cadeiras: Number(kpi?.ocupacao_cadeiras ?? 0),
      faturamento_convenios: Number(kpi?.faturamento_convenios ?? 0),
      observacoes: kpi?.observacoes ?? "",
    });
  }, [editando, kpi]);

  const handleSalvar = async () => {
    try {
      await salvar(form);
      toast.success("Indicadores salvos.");
      setEditando(false);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "Erro ao salvar.";
      if (typeof msg === "string" && msg.toLowerCase().includes("row-level security")) {
        toast.error(
          "Voce so pode atualizar os proprios indicadores. Avisa o consultor se houver problema.",
        );
      } else {
        toast.error(msg);
      }
    }
  };

  if (!clienteId) return null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-quase-preto/60">Carregando…</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Nao foi possivel carregar seus indicadores: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Modo edicao (formulario inline)
  if (editando) {
    return (
      <Card className="border-dourado/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="font-display text-lg text-verde-raiz">
              Indicadores de {mes_label}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditando(false)}
              disabled={salvando}
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <FieldGroup title="Resultados">
            <FormField id="faturamento_bruto" label="Faturamento bruto (R$)">
              <NumInput
                id="faturamento_bruto"
                value={form.faturamento_bruto}
                onChange={(n) => setF("faturamento_bruto", n)}
                min={0}
              />
            </FormField>
            <FormField id="ticket_medio" label="Ticket medio (R$)">
              <NumInput
                id="ticket_medio"
                value={form.ticket_medio}
                onChange={(n) => setF("ticket_medio", n)}
                min={0}
              />
            </FormField>
            <FormField id="pacientes_novos" label="Pacientes novos no mes">
              <NumInput
                id="pacientes_novos"
                value={form.pacientes_novos}
                onChange={(n) => setF("pacientes_novos", n)}
                step="1"
                min={0}
              />
            </FormField>
            <FormField id="margem_liquida" label="Margem liquida (%)">
              <NumInput
                id="margem_liquida"
                value={form.margem_liquida}
                onChange={(n) => setF("margem_liquida", n)}
                min={-100}
                max={100}
              />
            </FormField>
          </FieldGroup>

          <div className="border-t border-border/40" />

          <FieldGroup title="Operacional">
            <FormField id="taxa_conversao" label="Taxa de conversao (%)">
              <NumInput
                id="taxa_conversao"
                value={form.taxa_conversao}
                onChange={(n) => setF("taxa_conversao", n)}
                min={0}
                max={100}
                placeholder="Consultas que viraram pacientes"
              />
            </FormField>
            <FormField id="taxa_no_show" label="Taxa de no-show (%)">
              <NumInput
                id="taxa_no_show"
                value={form.taxa_no_show}
                onChange={(n) => setF("taxa_no_show", n)}
                min={0}
                max={100}
              />
            </FormField>
            <FormField id="ocupacao_cadeiras" label="Ocupacao das cadeiras (%)">
              <NumInput
                id="ocupacao_cadeiras"
                value={form.ocupacao_cadeiras}
                onChange={(n) => setF("ocupacao_cadeiras", n)}
                min={0}
                max={100}
              />
            </FormField>
            <FormField id="taxa_inadimplencia" label="Taxa de inadimplencia (%)">
              <NumInput
                id="taxa_inadimplencia"
                value={form.taxa_inadimplencia}
                onChange={(n) => setF("taxa_inadimplencia", n)}
                min={0}
                max={100}
              />
            </FormField>
            <FormField id="pct_recebido_vista" label="Recebido a vista (%)">
              <NumInput
                id="pct_recebido_vista"
                value={form.pct_recebido_vista}
                onChange={(n) => setF("pct_recebido_vista", n)}
                min={0}
                max={100}
              />
            </FormField>
            <FormField id="investimento_marketing" label="Investimento em marketing (R$)">
              <NumInput
                id="investimento_marketing"
                value={form.investimento_marketing}
                onChange={(n) => setF("investimento_marketing", n)}
                min={0}
              />
            </FormField>
            <FormField id="faturamento_convenios" label="Faturamento convenios (R$)">
              <NumInput
                id="faturamento_convenios"
                value={form.faturamento_convenios}
                onChange={(n) => setF("faturamento_convenios", n)}
                min={0}
              />
            </FormField>
          </FieldGroup>

          <div className="border-t border-border/40" />

          <div>
            <Label htmlFor="observacoes" className="text-xs font-semibold text-quase-preto">
              Observacoes (opcional)
            </Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => setF("observacoes", e.target.value)}
              placeholder="Comentarios sobre o mes, contexto, eventos pontuais."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              onClick={handleSalvar}
              disabled={salvando}
              className="bg-verde-raiz text-linho hover:bg-verde-raiz/90"
            >
              <Save className="h-4 w-4" />
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Modo visualizacao: ja preenchido
  if (kpi) {
    const operacionais = [
      { label: "Conversao", valor: fmtPct(kpi.taxa_conversao), raw: kpi.taxa_conversao },
      { label: "No-show", valor: fmtPct(kpi.taxa_no_show), raw: kpi.taxa_no_show },
      { label: "Ocupacao", valor: fmtPct(kpi.ocupacao_cadeiras), raw: kpi.ocupacao_cadeiras },
      { label: "Inadimplencia", valor: fmtPct(kpi.taxa_inadimplencia), raw: kpi.taxa_inadimplencia },
      { label: "Recebido a vista", valor: fmtPct(kpi.pct_recebido_vista), raw: kpi.pct_recebido_vista },
      { label: "Marketing", valor: fmtBRL(kpi.investimento_marketing), raw: kpi.investimento_marketing },
      { label: "Convenios", valor: fmtBRL(kpi.faturamento_convenios), raw: kpi.faturamento_convenios },
    ].filter((o) => o.raw !== null && o.raw !== undefined && Number(o.raw) !== 0);

    return (
      <Card className="border-verde-raiz/30 bg-verde-menta/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="font-display text-lg text-verde-raiz">
                Indicadores de {mes_label}
              </CardTitle>
              <p className="mt-1 text-xs text-quase-preto/60">
                Atualizado em {fmtData(kpi.updated_at ?? kpi.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-verde-raiz/40 text-verde-raiz">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Preenchido
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCell label="Faturamento bruto" valor={fmtBRL(kpi.faturamento_bruto)} />
            <KpiCell label="Ticket medio" valor={fmtBRL(kpi.ticket_medio)} />
            <KpiCell label="Pacientes novos" valor={fmtInt(kpi.pacientes_novos)} />
            <KpiCell label="Margem liquida" valor={fmtPct(kpi.margem_liquida)} />
          </div>

          {operacionais.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {operacionais.map((o) => (
                <KpiCellSmall key={o.label} label={o.label} valor={o.valor} />
              ))}
            </div>
          )}

          {kpi.observacoes && (
            <p className="rounded-md bg-card/60 p-3 text-sm text-quase-preto/80">
              <span className="font-semibold text-verde-raiz">Observacoes: </span>
              {kpi.observacoes}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Modo visualizacao: ainda nao preenchido
  return (
    <Card className="border-dourado/40 bg-dourado/5">
      <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-dourado/15 p-2">
            <TrendingUp className="h-5 w-5 text-dourado" />
          </div>
          <div>
            <h3 className="font-display text-lg text-verde-raiz">
              Atualize seus indicadores de {mes_label}
            </h3>
            <p className="mt-1 max-w-md text-sm text-quase-preto/70">
              Registre faturamento, ticket medio, pacientes novos e margem do mes. Esses dados alimentam sua analise e o resumo mensal.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setEditando(true)}
          className="bg-verde-raiz text-linho hover:bg-verde-raiz/90"
        >
          Preencher agora
        </Button>
      </CardContent>
    </Card>
  );
}

function KpiCell({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-card/70 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-quase-preto/60">
        {label}
      </div>
      <div className="mt-1 font-display text-xl text-verde-raiz">{valor}</div>
    </div>
  );
}

function KpiCellSmall({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-card/50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-quase-preto/50">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-quase-preto/80">{valor}</div>
    </div>
  );
}
