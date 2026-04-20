import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Download, Trash2, ArrowLeft, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_PIN } from "../data";
import { generatePDF } from "../pdf";
import {
  deleteDiagnosticoFromSupabase,
  loadDiagnosticosFromSupabase,
  updateDiagnosticoNotasInSupabase,
  type StoredDiagnostico,
} from "../persistence";
import { getStatus } from "../logic";
import { cn } from "@/lib/utils";

interface AdminScreenProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_PILL: Record<string, string> = {
  critico: "bg-destructive/10 text-destructive",
  atencao: "bg-caramelo/10 text-caramelo",
  regular: "bg-dourado/15 text-dourado",
  bom: "bg-verde-menta text-verde-musgo",
  otimo: "bg-teal-50 text-teal-700",
};

export function AdminScreen({ open, onClose }: AdminScreenProps) {
  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<StoredDiagnostico[]>([]);
  const [loading, setLoading] = useState(false);

  // Estado do dialog "Editar notas"
  const [editing, setEditing] = useState<StoredDiagnostico | null>(null);
  const [editNotas, setEditNotas] = useState("");
  const [editAnalise, setEditAnalise] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await loadDiagnosticosFromSupabase();
      setItems(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao carregar diagnósticos";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && authorized) refresh();
  }, [open, authorized]);

  useEffect(() => {
    if (!open) { setAuthorized(false); setPin(""); setError(false); }
  }, [open]);

  const filtered = useMemo(
    () => items.map((d, i) => ({ d, i })).filter(({ d }) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        d.client.name.toLowerCase().includes(q) ||
        (d.clienteNomeClinica || "").toLowerCase().includes(q)
      );
    }),
    [items, search],
  );

  const checkPin = () => {
    if (pin === ADMIN_PIN) { setAuthorized(true); setError(false); }
    else { setError(true); setPin(""); }
  };

  const handleDelete = async (d: StoredDiagnostico) => {
    if (!d.cliente_id) return;
    if (!window.confirm(`Excluir diagnóstico de ${d.client.name}?`)) return;
    try {
      await deleteDiagnosticoFromSupabase(d.cliente_id);
      toast.success("Diagnóstico removido");
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao remover";
      toast.error(msg);
    }
  };

  const openEdit = (d: StoredDiagnostico) => {
    setEditing(d);
    setEditNotas(d.notas || "");
    setEditAnalise(d.analise || "");
  };

  const handleSaveEdit = async () => {
    if (!editing?.cliente_id) return;
    setSavingEdit(true);
    try {
      await updateDiagnosticoNotasInSupabase(editing.cliente_id, editNotas, editAnalise);
      toast.success("Notas atualizadas com sucesso");
      setEditing(null);
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao salvar";
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  if (!open) return null;

  if (!authorized) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Painel admin</DialogTitle>
            <DialogDescription>Informe o PIN do consultor para acessar.</DialogDescription>
          </DialogHeader>
          <Input
            type="password" placeholder="PIN" value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && checkPin()}
            className="text-center text-base tracking-[0.3em]"
            autoFocus
          />
          {error && <p className="text-center text-xs text-destructive">PIN incorreto. Tente novamente.</p>}
          <Button onClick={checkPin} className="bg-verde-raiz text-linho hover:bg-verde-musgo">Entrar</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <header className="bg-verde-raiz px-6 py-5 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-linho">Painel do consultor</h2>
            <p className="text-xs text-linho/50">Diagnósticos sincronizados com o Supabase</p>
          </div>
          <Button variant="outline" onClick={onClose} className="border-linho/20 bg-transparent text-linho hover:bg-linho/10 hover:text-linho">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6 md:px-8">
        <Input
          placeholder="Buscar por nome do cliente ou clínica…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 max-w-sm"
        />

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card py-16">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-verde-musgo" />
            <span className="text-sm text-quase-preto/60">Carregando diagnósticos…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <div className="mb-3 text-4xl opacity-40">📋</div>
            <p className="text-sm text-quase-preto/60">
              {search ? `Nenhum cliente encontrado para "${search}".` : "Nenhum diagnóstico salvo no Supabase ainda."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full">
              <thead className="bg-muted">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-quase-preto/60">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Pontuação</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ d, i }) => {
                  const pct = Math.round((d.totalPct || 0) * 100);
                  const st = getStatus(d.totalPct || 0);
                  const dt = d.timestamp ? new Date(d.timestamp).toLocaleDateString("pt-BR") : "—";
                  return (
                    <tr key={d.cliente_id || i} className="border-t border-border text-sm">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-quase-preto">
                          {d.clienteNomeClinica || d.client.name}
                        </div>
                        <div className="text-xs text-quase-preto/50">
                          {d.clienteNomeClinica ? `${d.client.name} · ` : ""}
                          {d.client.cidade || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-quase-preto/70">{dt}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-quase-preto">
                          {d.totalScore || 0}
                          <span className="text-xs font-normal text-quase-preto/50"> /{d.totalMax || 0}</span>
                        </div>
                        <div className="text-[11px] text-quase-preto/50">{pct}%</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_PILL[st.cls])}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-quase-preto/70">{d.plano?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          size="sm" variant="outline" onClick={() => openEdit(d)}
                          className="mr-1 border-verde-musgo/30 text-verde-musgo hover:bg-verde-menta hover:text-verde-raiz"
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" /> Editar notas
                        </Button>
                        <Button size="sm" onClick={() => generatePDF(d, d.notas)} className="bg-verde-raiz text-linho hover:bg-verde-musgo">
                          <Download className="mr-1 h-3.5 w-3.5" /> PDF
                        </Button>
                        <Button
                          size="sm" variant="ghost" onClick={() => handleDelete(d)}
                          className="ml-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Dialog: Editar notas + análise */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Editar notas — {editing?.clienteNomeClinica || editing?.client.name}
            </DialogTitle>
            <DialogDescription>
              Atualize o texto de análise estratégica e as notas da reunião. Os dados são salvos no Supabase
              e refletem na próxima exportação de PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-quase-preto/60">
                Texto de análise estratégica
              </label>
              <p className="mb-2 text-xs text-quase-preto/50">
                Substitui o texto auto-gerado da aba "Visão Geral". Deixe em branco para usar o automático.
              </p>
              <Textarea
                rows={5}
                value={editAnalise}
                onChange={(e) => setEditAnalise(e.target.value)}
                placeholder="Ex.: Identificamos que os principais gargalos estão em…"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-quase-preto/60">
                Notas da reunião
              </label>
              <p className="mb-2 text-xs text-quase-preto/50">
                Aparecem ao final do PDF do diagnóstico.
              </p>
              <Textarea
                rows={6}
                value={editNotas}
                onChange={(e) => setEditNotas(e.target.value)}
                placeholder="Tópicos da conversa, próximos passos, compromissos…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="bg-verde-raiz text-linho hover:bg-verde-musgo"
            >
              {savingEdit ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</>
              ) : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
