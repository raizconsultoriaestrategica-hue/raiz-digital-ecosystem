import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, ArrowRight, Save, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useModulosCliente,
  useUpdateModuloCliente,
  type ClienteModuloComMeta,
} from "@/hooks/useModulosCliente";

const STATUS_OPCOES = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
];

function statusIconAndColor(status: string) {
  if (status === "concluido") return { Icon: CheckCircle2, color: "text-emerald-600" };
  if (status === "em_andamento") return { Icon: ArrowRight, color: "text-blue-600" };
  return { Icon: Circle, color: "text-quase-preto/40" };
}

interface FormState {
  status: string;
  data_inicio: string;
  data_conclusao: string;
  observacoes: string;
}

function moduloParaForm(m: ClienteModuloComMeta): FormState {
  return {
    status: m.status,
    data_inicio: m.data_inicio ?? "",
    data_conclusao: m.data_conclusao ?? "",
    observacoes: m.observacoes ?? "",
  };
}

export default function ModulosTab({ clienteId }: { clienteId: string }) {
  const { data: modulos = [], isLoading, error } = useModulosCliente(clienteId);
  const updateMut = useUpdateModuloCliente(clienteId);

  const [forms, setForms] = useState<Record<string, FormState>>({});

  useEffect(() => {
    if (modulos.length > 0) {
      setForms((prev) => {
        const next = { ...prev };
        for (const m of modulos) {
          if (!next[m.id]) next[m.id] = moduloParaForm(m);
        }
        return next;
      });
    }
  }, [modulos]);

  const total = modulos.length;
  const concluidos = modulos.filter((m) => m.status === "concluido").length;
  const pct = total ? Math.round((concluidos / total) * 100) : 0;

  const handleChange = (id: string, patch: Partial<FormState>) => {
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSalvar = async (id: string) => {
    const f = forms[id];
    if (!f) return;
    const patch: Parameters<typeof updateMut.mutateAsync>[0]["patch"] = {
      status: f.status,
      data_inicio: f.data_inicio || null,
      data_conclusao: f.data_conclusao || null,
      observacoes: f.observacoes.trim() || null,
    };
    try {
      await updateMut.mutateAsync({ id, patch });
      toast.success("Módulo atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    }
  };

  const handleMarcarConcluido = async (id: string) => {
    const hoje = new Date().toISOString().slice(0, 10);
    handleChange(id, { status: "concluido", data_conclusao: hoje });
    try {
      await updateMut.mutateAsync({
        id,
        patch: { status: "concluido", data_conclusao: hoje },
      });
      toast.success("Módulo concluído");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao concluir");
    }
  };

  const handleIniciar = async (id: string) => {
    const hoje = new Date().toISOString().slice(0, 10);
    handleChange(id, { status: "em_andamento", data_inicio: hoje });
    try {
      await updateMut.mutateAsync({
        id,
        patch: { status: "em_andamento", data_inicio: hoje },
      });
      toast.success("Módulo iniciado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-red-600">
          Erro ao carregar módulos: {error instanceof Error ? error.message : "desconhecido"}
        </CardContent>
      </Card>
    );
  }

  if (modulos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-quase-preto/60">
          <ListChecks className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Nenhum módulo contratado ainda. Os módulos aparecem aqui após o fechamento do orçamento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                Progresso geral
              </div>
              <p className="mt-0.5 text-xs text-quase-preto/55">
                {concluidos} de {total} módulos concluídos
              </p>
            </div>
            <span className="font-display text-2xl text-verde-raiz">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
        </CardContent>
      </Card>

      {modulos.map((m) => {
        const f = forms[m.id] ?? moduloParaForm(m);
        const { Icon, color } = statusIconAndColor(f.status);
        return (
          <Card key={m.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-display text-base text-verde-raiz">
                      {m.modulos?.nome || "Módulo"}
                    </h4>
                    {m.modulos?.pilar_nome && (
                      <span className="text-[11px] uppercase tracking-wider text-quase-preto/55">
                        {m.modulos.pilar_nome}
                      </span>
                    )}
                  </div>
                  {m.modulos?.descricao && (
                    <p className="mt-1 text-xs text-quase-preto/65">{m.modulos.descricao}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={f.status}
                    onValueChange={(v) => handleChange(m.id, { status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPCOES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Início</Label>
                  <Input
                    type="date"
                    value={f.data_inicio}
                    onChange={(e) => handleChange(m.id, { data_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Conclusão</Label>
                  <Input
                    type="date"
                    value={f.data_conclusao}
                    onChange={(e) => handleChange(m.id, { data_conclusao: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  rows={2}
                  placeholder="Notas internas sobre a execução deste módulo"
                  value={f.observacoes}
                  onChange={(e) => handleChange(m.id, { observacoes: e.target.value })}
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {f.status === "pendente" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleIniciar(m.id)}
                    disabled={updateMut.isPending}
                  >
                    <ArrowRight className="mr-1 h-4 w-4" /> Iniciar
                  </Button>
                )}
                {f.status === "em_andamento" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarcarConcluido(m.id)}
                    disabled={updateMut.isPending}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Marcar concluído
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => handleSalvar(m.id)}
                  disabled={updateMut.isPending}
                  className="bg-verde-raiz hover:bg-verde-raiz/90"
                >
                  <Save className="mr-1 h-4 w-4" /> Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
