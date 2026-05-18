import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Trash2, Save, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useReunioes,
  useCreateReuniao,
  useUpdateReuniao,
  useDeleteReuniao,
  type Reuniao,
  type ReuniaoInsert,
} from "@/hooks/useReunioes";

const STATUS_OPCOES: { value: Reuniao["status"]; label: string; color: string }[] = [
  { value: "agendada", label: "Agendada", color: "bg-blue-100 text-blue-700" },
  { value: "realizada", label: "Realizada", color: "bg-verde-raiz/10 text-verde-raiz" },
  { value: "cancelada", label: "Cancelada", color: "bg-quase-preto/10 text-quase-preto/60" },
];

function emptyForm(): Omit<ReuniaoInsert, "cliente_id"> {
  const hoje = new Date();
  return {
    data: hoje.toISOString().slice(0, 10),
    hora_inicio: null,
    duracao_minutos: 60,
    titulo: "",
    link_meet: "",
    ata: "",
    proximos_passos: "",
    url_gravacao: "",
    status: "agendada",
  };
}

function fmtData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtHora(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

export default function ReunioesTab({ clienteId }: { clienteId: string }) {
  const { data: reunioes = [], isLoading, error } = useReunioes(clienteId);
  const createMut = useCreateReuniao(clienteId);
  const updateMut = useUpdateReuniao(clienteId);
  const deleteMut = useDeleteReuniao(clienteId);

  const [novoForm, setNovoForm] = useState<Omit<ReuniaoInsert, "cliente_id"> | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<ReuniaoInsert, "cliente_id"> | null>(null);

  const handleSalvarNova = async () => {
    if (!novoForm) return;
    if (!novoForm.data) {
      toast.error("Data é obrigatória");
      return;
    }
    try {
      await createMut.mutateAsync({
        ...novoForm,
        titulo: novoForm.titulo?.trim() || null,
        link_meet: novoForm.link_meet?.trim() || null,
        ata: novoForm.ata?.trim() || null,
        proximos_passos: novoForm.proximos_passos?.trim() || null,
        url_gravacao: novoForm.url_gravacao?.trim() || null,
        hora_inicio: novoForm.hora_inicio || null,
      });
      toast.success("Reunião cadastrada");
      setNovoForm(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    }
  };

  const handleSalvarEdicao = async () => {
    if (!editId || !editForm) return;
    try {
      await updateMut.mutateAsync({
        id: editId,
        patch: {
          ...editForm,
          titulo: editForm.titulo?.trim() || null,
          link_meet: editForm.link_meet?.trim() || null,
          ata: editForm.ata?.trim() || null,
          proximos_passos: editForm.proximos_passos?.trim() || null,
          url_gravacao: editForm.url_gravacao?.trim() || null,
          hora_inicio: editForm.hora_inicio || null,
        },
      });
      toast.success("Reunião atualizada");
      setEditId(null);
      setEditForm(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta reunião? Essa ação não pode ser desfeita.")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Reunião excluída");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
  };

  const startEdit = (r: Reuniao) => {
    setEditId(r.id);
    setEditForm({
      data: r.data,
      hora_inicio: r.hora_inicio,
      duracao_minutos: r.duracao_minutos,
      titulo: r.titulo ?? "",
      link_meet: r.link_meet ?? "",
      ata: r.ata ?? "",
      proximos_passos: r.proximos_passos ?? "",
      url_gravacao: r.url_gravacao ?? "",
      status: r.status,
    });
    setNovoForm(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-red-600">
          Erro ao carregar reuniões: {error instanceof Error ? error.message : "desconhecido"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-quase-preto/60">
          {reunioes.length} {reunioes.length === 1 ? "reunião cadastrada" : "reuniões cadastradas"}
        </div>
        {!novoForm && (
          <Button
            size="sm"
            onClick={() => {
              setNovoForm(emptyForm());
              setEditId(null);
              setEditForm(null);
            }}
            className="bg-verde-raiz hover:bg-verde-raiz/90"
          >
            <Plus className="mr-1 h-4 w-4" /> Nova reunião
          </Button>
        )}
      </div>

      {novoForm && (
        <ReuniaoForm
          form={novoForm}
          setForm={setNovoForm as (f: Omit<ReuniaoInsert, "cliente_id">) => void}
          onSave={handleSalvarNova}
          onCancel={() => setNovoForm(null)}
          saving={createMut.isPending}
          title="Nova reunião"
        />
      )}

      {reunioes.length === 0 && !novoForm && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-quase-preto/60">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Nenhuma reunião cadastrada ainda.
          </CardContent>
        </Card>
      )}

      {reunioes.map((r) => {
        const statusInfo = STATUS_OPCOES.find((s) => s.value === r.status);
        const isEditing = editId === r.id;
        return isEditing && editForm ? (
          <ReuniaoForm
            key={r.id}
            form={editForm}
            setForm={setEditForm as (f: Omit<ReuniaoInsert, "cliente_id">) => void}
            onSave={handleSalvarEdicao}
            onCancel={() => {
              setEditId(null);
              setEditForm(null);
            }}
            saving={updateMut.isPending}
            title="Editar reunião"
          />
        ) : (
          <Card key={r.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg text-verde-raiz">
                      {r.titulo || "Reunião"}
                    </span>
                    {statusInfo && (
                      <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-quase-preto/60">
                    {fmtData(r.data)}
                    {r.hora_inicio && ` · ${fmtHora(r.hora_inicio)}`}
                    {r.duracao_minutos && ` · ${r.duracao_minutos} min`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(r.id)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {r.link_meet && (
                <a
                  href={r.link_meet}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm text-verde-musgo underline-offset-2 hover:underline"
                >
                  {r.link_meet}
                </a>
              )}
              {r.ata && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-verde-musgo">
                    Ata
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-quase-preto/80">{r.ata}</p>
                </div>
              )}
              {r.proximos_passos && (
                <div className="rounded-lg border-l-4 border-dourado bg-dourado/5 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-verde-raiz">
                    Próximos passos
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-quase-preto/85">
                    {r.proximos_passos}
                  </p>
                </div>
              )}
              {r.url_gravacao && (
                <div className="text-xs text-quase-preto/70">
                  Gravação:{" "}
                  <a
                    href={r.url_gravacao}
                    target="_blank"
                    rel="noreferrer"
                    className="text-verde-musgo underline-offset-2 hover:underline"
                  >
                    abrir vídeo
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ReuniaoForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  title,
}: {
  form: Omit<ReuniaoInsert, "cliente_id">;
  setForm: (f: Omit<ReuniaoInsert, "cliente_id">) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
}) {
  const update = <K extends keyof Omit<ReuniaoInsert, "cliente_id">>(
    k: K,
    v: Omit<ReuniaoInsert, "cliente_id">[K],
  ) => setForm({ ...form, [k]: v });

  return (
    <Card className="border-verde-raiz/30">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-base text-verde-raiz">{title}</h4>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={form.data}
              onChange={(e) => update("data", e.target.value)}
            />
          </div>
          <div>
            <Label>Hora de início</Label>
            <Input
              type="time"
              value={form.hora_inicio ?? ""}
              onChange={(e) => update("hora_inicio", e.target.value || null)}
            />
          </div>
          <div>
            <Label>Duração (min)</Label>
            <Input
              type="number"
              min={1}
              value={form.duracao_minutos ?? ""}
              onChange={(e) =>
                update("duracao_minutos", e.target.value ? Number(e.target.value) : null)
              }
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={form.status ?? "agendada"}
              onValueChange={(v) => update("status", v as Reuniao["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPCOES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Título</Label>
            <Input
              placeholder="Ex: Kick-off do projeto"
              value={form.titulo ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Link da reunião (Zoom, Meet, etc.)</Label>
            <Input
              type="url"
              placeholder="https://meet.google.com/..."
              value={form.link_meet ?? ""}
              onChange={(e) => update("link_meet", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Link da gravação</Label>
            <Input
              type="url"
              placeholder="https://..."
              value={form.url_gravacao ?? ""}
              onChange={(e) => update("url_gravacao", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Ata</Label>
            <Textarea
              rows={4}
              placeholder="O que foi discutido, decisões tomadas..."
              value={form.ata ?? ""}
              onChange={(e) => update("ata", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Próximos passos</Label>
            <Textarea
              rows={3}
              placeholder="Lista de ações e responsáveis"
              value={form.proximos_passos ?? ""}
              onChange={(e) => update("proximos_passos", e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-verde-raiz hover:bg-verde-raiz/90"
          >
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
