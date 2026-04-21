import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SelectOpts } from "../components/SelectOpts";
import { ClienteSelector } from "../components/ClienteSelector";
import { saveClienteConfigToSupabase, fatLabelToNumber } from "../persistence";
import {
  OPT_CADEIRAS, OPT_FAT, OPT_FUNC, OPT_PACIENTES, OPT_TEMPO, OPT_TICKET, OPT_TIPO,
} from "../data";
import type { ClientData, SelOpts } from "../types";

interface DadosScreenProps {
  client: ClientData;
  selOpts: SelOpts;
  clienteId: string | null;
  onClientField: (key: keyof ClientData, value: string) => void;
  onSel: (group: string, value: string) => void;
  onClienteIdChange: (id: string | null, c?: { nome_cliente: string; cidade: string | null }) => void;
  onBack: () => void;
  onNext: () => void;
}

export function DadosScreen({
  client, selOpts, clienteId, onClientField, onSel, onClienteIdChange, onBack, onNext,
}: DadosScreenProps) {
  const canProceed = client.name.trim().length > 0;
  const handleNext = async () => {
    if (clienteId) {
      try {
        await saveClienteConfigToSupabase(clienteId, {
          fat: fatLabelToNumber(selOpts.fat),
          meta: client.meta,
          dor: client.dor,
          especialidade: client.proc,
        });
      } catch (e: any) {
        toast.error("Não foi possível salvar dados do cliente: " + (e?.message ?? e));
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
          <ClienteSelector
            value={clienteId}
            onChange={(id, c) => {
              onClienteIdChange(id, c);
              if (c) {
                if (!client.name) onClientField("name", c.nome_cliente);
                if (!client.cidade && c.cidade) onClientField("cidade", c.cidade);
              }
            }}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nome do cliente *</Label>
              <Input value={client.name} onChange={(e) => onClientField("name", e.target.value)} placeholder="Dr. João Silva" />
            </div>
            <div>
              <Label>Cidade / UF</Label>
              <Input value={client.cidade} onChange={(e) => onClientField("cidade", e.target.value)} placeholder="São Paulo / SP" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Especialidade / procedimento principal</Label>
              <Input value={client.proc} onChange={(e) => onClientField("proc", e.target.value)} placeholder="Ex.: Implantes" />
            </div>
            <div>
              <Label>Data da reunião</Label>
              <Input type="date" value={client.data} onChange={(e) => onClientField("data", e.target.value)} />
            </div>
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
          <SelectGroup label="Tipo de operação" group="tipo" value={selOpts.tipo} options={OPT_TIPO} onChange={onSel} />
          <SelectGroup label="Equipe" group="func" value={selOpts.func} options={OPT_FUNC} onChange={onSel} />
          <SelectGroup label="Ticket médio" group="ticket" value={selOpts.ticket} options={OPT_TICKET} onChange={onSel} />
          <SelectGroup label="Cadeiras / consultórios" group="cadeiras" value={selOpts.cadeiras} options={OPT_CADEIRAS} onChange={onSel} cols={4} />
          <SelectGroup label="Tempo de operação" group="tempo" value={selOpts.tempo} options={OPT_TEMPO} onChange={onSel} />
          <SelectGroup label="Pacientes ativos / mês" group="pacientes" value={selOpts.pacientes} options={OPT_PACIENTES} onChange={onSel} />
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
