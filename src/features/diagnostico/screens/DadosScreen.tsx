import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SelectOpts } from "../components/SelectOpts";
import { ClienteSelector } from "../components/ClienteSelector";
import { supabase } from "@/integrations/supabase/client";
import { saveClienteConfigToSupabase, fatLabelToNumber, parseMoneyToNumber } from "../persistence";
import {
  OPT_CADEIRAS, OPT_CONVENIO, OPT_FAT, OPT_FUNC, OPT_PACIENTES, OPT_TEMPO, OPT_TICKET,
  OPT_TIPO_DENT, OPT_TIPO_MED, ESPECIALIDADES_DENT, ESPECIALIDADES_MED, KPI_INIT_FIELDS,
} from "../data";
import type { ClientData, KpisIniciaisData, Ramo, ScoresMap, SelOpts } from "../types";
import type { PreviousDiagPayload } from "../hooks/useDiagnostico";

interface DadosScreenProps {
  client: ClientData;
  selOpts: SelOpts;
  ramo: Ramo;
  kpisIniciais: KpisIniciaisData;
  clienteId: string | null;
  onClientField: (key: keyof ClientData, value: string) => void;
  onSel: (group: string, value: string) => void;
  onRamoChange: (ramo: Ramo) => void;
  onKpiChange: (key: keyof KpisIniciaisData, value: string) => void;
  onClienteIdChange: (id: string | null, c?: { nome_cliente: string; cidade: string | null }) => void;
  onLoadPrevious?: (payload: PreviousDiagPayload) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DadosScreen({
  client, selOpts, ramo, kpisIniciais, clienteId,
  onClientField, onSel, onRamoChange, onKpiChange, onClienteIdChange, onLoadPrevious, onBack, onNext,
}: DadosScreenProps) {
  const canProceed = client.name.trim().length > 0;
  const isMed = ramo === "medico";
  const tipoOptions = isMed ? OPT_TIPO_MED : OPT_TIPO_DENT;
  const especialidades = isMed ? ESPECIALIDADES_MED : ESPECIALIDADES_DENT;

  const handleNext = async () => {
    if (clienteId) {
      try {
        await saveClienteConfigToSupabase(clienteId, {
          fat: fatLabelToNumber(selOpts.fat),
          meta: parseMoneyToNumber(client.meta),
          dor: client.dor,
          especialidade: client.especialidade || client.proc,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error("Não foi possível salvar dados do cliente: " + msg);
      }
    }
    onNext();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background pb-32">
      <div className="mx-auto max-w-2xl px-5 pt-8 md:px-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-dourado">Etapa 1 de 3</div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-quase-preto">Dados do cliente</h1>
        <p className="mt-1 text-sm text-quase-preto/60">Para personalizar o diagnóstico e o plano recomendado.</p>

        <div className="mt-6 space-y-5">
          {/* Ramo de atuação */}
          <div>
            <Label className="mb-2 block">Ramo de atuação *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["dentista", "medico"] as Ramo[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onRamoChange(r)}
                  className={cn(
                    "rounded-lg border-[1.5px] border-border bg-card px-3 py-3 text-sm font-medium text-quase-preto/70 transition-all hover:border-verde-musgo hover:text-verde-raiz",
                    ramo === r && "border-verde-musgo bg-verde-menta font-semibold text-verde-raiz",
                  )}
                >
                  {r === "dentista" ? "🦷 Odontologia" : "🩺 Saúde / Medicina"}
                </button>
              ))}
            </div>
          </div>

          <ClienteSelector
            value={clienteId}
            onChange={async (id, c) => {
              onClienteIdChange(id, c);
              if (c) {
                if (!client.name) onClientField("name", c.nome_cliente);
                if (!client.cidade && c.cidade) onClientField("cidade", c.cidade);
              }
              // Pre-carga do ultimo diagnostico do cliente
              if (id && onLoadPrevious) {
                try {
                  const { data: prev } = await supabase
                    .from("diagnostics")
                    .select("*")
                    .eq("client_id", id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  if (prev) {
                    const cd = (prev.client_data ?? {}) as Record<string, unknown>;
                    const prevClient = (cd.client as ClientData) ?? undefined;
                    const prevSelOpts = (cd.selOpts as SelOpts) ?? {};
                    onLoadPrevious({
                      clienteId: id,
                      ramo: (prev.ramo as Ramo) || "dentista",
                      client: prevClient ?? client,
                      selOpts: prevSelOpts,
                      scores: (prev.scores ?? {}) as ScoresMap,
                      notas: "",
                      analise: "",
                      kpisIniciais: {},
                    });
                    toast.success("Diagnostico anterior carregado. Revise os dados antes de prosseguir.");
                  }
                } catch {
                  // Silencioso: pre-carga e best-effort
                }
              }
            }}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nome do cliente *</Label>
              <Input value={client.name} onChange={(e) => onClientField("name", e.target.value)} placeholder={isMed ? "Dr. João Silva" : "Dr. João Silva"} />
            </div>
            <div>
              <Label>Cidade / UF</Label>
              <Input value={client.cidade} onChange={(e) => onClientField("cidade", e.target.value)} placeholder="São Paulo / SP" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Especialidade principal</Label>
              <Select
                value={client.especialidade || ""}
                onValueChange={(v) => {
                  onClientField("especialidade", v);
                  if (!client.proc) onClientField("proc", v);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {especialidades.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Procedimento ou foco</Label>
              <Input value={client.proc} onChange={(e) => onClientField("proc", e.target.value)} placeholder={isMed ? "Ex.: Consulta + procedimentos" : "Ex.: Implantes"} />
            </div>
          </div>

          <div>
            <Label>Data da reunião</Label>
            <Input type="date" value={client.data} onChange={(e) => onClientField("data", e.target.value)} />
          </div>

          <div>
            <Label>Objetivo principal</Label>
            <Input value={client.objetivo} onChange={(e) => onClientField("objetivo", e.target.value)} placeholder="Ex.: Triplicar faturamento sem trabalhar mais" />
          </div>
          <div>
            <Label>Dor / desafio mais urgente</Label>
            <Textarea value={client.dor} onChange={(e) => onClientField("dor", e.target.value)} placeholder="O que mais incomoda hoje?" rows={2} />
          </div>
          <div>
            <Label>Meta de faturamento (próximos 12 meses)</Label>
            <Input value={client.meta} onChange={(e) => onClientField("meta", e.target.value)} placeholder="R$ 100k/mês" />
          </div>

          <SelectGroup label="Faturamento atual" group="fat" value={selOpts.fat} options={OPT_FAT} onChange={onSel} />
          <SelectGroup label="Tipo de operação" group="tipo" value={selOpts.tipo} options={tipoOptions} onChange={onSel} />
          <SelectGroup label="Equipe" group="func" value={selOpts.func} options={OPT_FUNC} onChange={onSel} />
          <SelectGroup label="Ticket médio" group="ticket" value={selOpts.ticket} options={OPT_TICKET} onChange={onSel} />
          {!isMed && (
            <SelectGroup label="Cadeiras / consultórios" group="cadeiras" value={selOpts.cadeiras} options={OPT_CADEIRAS} onChange={onSel} cols={4} />
          )}
          <SelectGroup label="Tempo de operação" group="tempo" value={selOpts.tempo} options={OPT_TEMPO} onChange={onSel} />
          <SelectGroup label="Pacientes ativos / mês" group="pacientes" value={selOpts.pacientes} options={OPT_PACIENTES} onChange={onSel} />
          {isMed && (
            <SelectGroup label="% de receita por convênio" group="convenio" value={selOpts.convenio} options={OPT_CONVENIO} onChange={onSel} />
          )}

          {/* KPIs Iniciais */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-dourado">KPIs iniciais (opcional)</div>
            <h3 className="mt-1 font-display text-lg font-semibold text-quase-preto">Indicadores-base</h3>
            <p className="mt-1 text-xs text-quase-preto/60">
              Os valores informados aqui alimentarão o Dashboard do cliente como ponto de partida.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {KPI_INIT_FIELDS.map((f) => {
                const label = isMed && f.labelMedico ? f.labelMedico : f.label;
                const benchmark = isMed ? f.benchmarkMed : f.benchmarkDent;
                return (
                  <div key={f.key}>
                    <Label className="text-xs">{label}</Label>
                    <Input
                      value={kpisIniciais[f.key] || ""}
                      onChange={(e) => onKpiChange(f.key, e.target.value)}
                      placeholder={
                        f.type === "money"
                          ? "Ex.: 50000"
                          : benchmark
                            ? `Ex.: ${benchmark}`
                            : "Ex.: 60"
                      }
                      inputMode="decimal"
                    />
                    {benchmark && (
                      <p className="mt-1 text-[10px] text-quase-preto/50">
                        Benchmark Raiz: {benchmark}{f.type === "percent" ? "%" : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card px-6 py-3.5 md:left-[var(--sidebar-width,0)]">
        <div className="mx-auto flex max-w-2xl gap-2.5">
          <Button variant="outline" onClick={onBack}>Voltar</Button>
          <Button onClick={handleNext} disabled={!canProceed} className="flex-1 bg-verde-raiz text-linho hover:bg-verde-musgo">
            Iniciar Diagnóstico →
          </Button>
        </div>
      </div>
    </div>
  );
}

function SelectGroup({
  label, group, value, options, onChange, cols = 2,
}: {
  label: string;
  group: string;
  value?: string;
  options: string[];
  onChange: (g: string, v: string) => void;
  cols?: 2 | 3 | 4;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <SelectOpts group={group} value={value} options={options} onChange={(v) => onChange(group, v)} cols={cols} />
    </div>
  );
}
