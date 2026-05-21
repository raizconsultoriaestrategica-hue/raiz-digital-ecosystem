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

export function AtualizacaoMensalCard({ clienteId }: Props) {
  const { kpi, isLoading, error, salvar, salvando, mes_label } =
    useKpiMesCorrente(clienteId);

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    faturamento_bruto: 0,
    ticket_medio: 0,
    pacientes_novos: 0,
    margem_liquida: 0,
    observacoes: "",
  });

  // Hidrata form com KPI existente sempre que entra em modo edicao
  useEffect(() => {
    if (!editando) return;
    setForm({
      faturamento_bruto: Number(kpi?.faturamento_bruto ?? 0),
      ticket_medio: Number(kpi?.ticket_medio ?? 0),
      pacientes_novos: Number(kpi?.pacientes_novos ?? 0),
      margem_liquida: Number(kpi?.margem_liquida ?? 0),
      observacoes: kpi?.observacoes ?? "",
    });
  }, [editando, kpi]);

  const handleSalvar = async () => {
    try {
      await salvar(form);
      toast.success("Indicadores salvos.");
      setEditando(false);
    } catch (e: any) {
      const msg = e?.message || "Erro ao salvar.";
      if (typeof msg === "string" && msg.toLowerCase().includes("row-level security")) {
        toast.error(
          "Você só pode atualizar os próprios indicadores. Avisa o consultor se houver problema.",
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
          Não foi possível carregar seus indicadores: {error.message}
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
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="faturamento_bruto" className="text-xs font-semibold text-quase-preto">
                Faturamento bruto (R$)
              </Label>
              <NumInput
                id="faturamento_bruto"
                value={form.faturamento_bruto}
                onChange={(n) => setForm((f) => ({ ...f, faturamento_bruto: n }))}
                min={0}
              />
            </div>
            <div>
              <Label htmlFor="ticket_medio" className="text-xs font-semibold text-quase-preto">
                Ticket médio (R$)
              </Label>
              <NumInput
                id="ticket_medio"
                value={form.ticket_medio}
                onChange={(n) => setForm((f) => ({ ...f, ticket_medio: n }))}
                min={0}
              />
            </div>
            <div>
              <Label htmlFor="pacientes_novos" className="text-xs font-semibold text-quase-preto">
                Pacientes novos no mês
              </Label>
              <NumInput
                id="pacientes_novos"
                value={form.pacientes_novos}
                onChange={(n) => setForm((f) => ({ ...f, pacientes_novos: n }))}
                step="1"
                min={0}
              />
            </div>
            <div>
              <Label htmlFor="margem_liquida" className="text-xs font-semibold text-quase-preto">
                Margem líquida (%)
              </Label>
              <NumInput
                id="margem_liquida"
                value={form.margem_liquida}
                onChange={(n) => setForm((f) => ({ ...f, margem_liquida: n }))}
                min={-100}
                max={100}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes" className="text-xs font-semibold text-quase-preto">
              Observações (opcional)
            </Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              placeholder="Comentários sobre o mês, contexto, eventos pontuais."
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
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCell label="Faturamento bruto" valor={fmtBRL(kpi.faturamento_bruto)} />
            <KpiCell label="Ticket médio" valor={fmtBRL(kpi.ticket_medio)} />
            <KpiCell label="Pacientes novos" valor={fmtInt(kpi.pacientes_novos)} />
            <KpiCell label="Margem líquida" valor={fmtPct(kpi.margem_liquida)} />
          </div>
          {kpi.observacoes && (
            <p className="mt-4 rounded-md bg-card/60 p-3 text-sm text-quase-preto/80">
              <span className="font-semibold text-verde-raiz">Observações: </span>
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
              Registre faturamento, ticket médio, pacientes novos e margem do mês. Esses dados alimentam sua análise e o resumo mensal.
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
