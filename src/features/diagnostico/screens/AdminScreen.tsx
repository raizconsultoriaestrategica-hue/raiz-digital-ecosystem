import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Download, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_PIN } from "../data";
import { generatePDF } from "../pdf";
import { deleteStoredDiagnostico, loadStoredDiagnosticos, type StoredDiagnostico } from "../persistence";
import { getStatus } from "../logic";
import { cn } from "@/lib/utils";

interface AdminScreenProps {
  open: boolean;
  onClose: () => void;
}

export function AdminScreen({ open, onClose }: AdminScreenProps) {
  const [authorized, setAuthorized] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<StoredDiagnostico[]>([]);

  useEffect(() => {
    if (open && authorized) setItems(loadStoredDiagnosticos());
  }, [open, authorized]);

  useEffect(() => {
    if (!open) { setAuthorized(false); setPin(""); setError(false); }
  }, [open]);

  const filtered = useMemo(
    () => items.map((d, i) => ({ d, i })).filter(({ d }) =>
      !search.trim() || d.client.name.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  const checkPin = () => {
    if (pin === ADMIN_PIN) { setAuthorized(true); setError(false); }
    else { setError(true); setPin(""); }
  };

  const handleDelete = (idx: number, name: string) => {
    if (!window.confirm(`Excluir diagnóstico de ${name}?`)) return;
    deleteStoredDiagnostico(idx);
    setItems(loadStoredDiagnosticos());
    toast.success("Diagnóstico removido");
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
            <p className="text-xs text-linho/50">Diagnósticos salvos localmente neste dispositivo</p>
          </div>
          <Button variant="outline" onClick={onClose} className="border-linho/20 bg-transparent text-linho hover:bg-linho/10 hover:text-linho">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6 md:px-8">
        <Input
          placeholder="Buscar por nome do cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 max-w-sm"
        />

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <div className="mb-3 text-4xl opacity-40">📋</div>
            <p className="text-sm text-quase-preto/60">
              {search ? `Nenhum cliente encontrado para "${search}".` : "Nenhum diagnóstico salvo ainda."}
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
                  const STATUS_PILL: Record<string, string> = {
                    critico: "bg-destructive/10 text-destructive",
                    atencao: "bg-caramelo/10 text-caramelo",
                    regular: "bg-dourado/15 text-dourado",
                    bom: "bg-verde-menta text-verde-musgo",
                    otimo: "bg-teal-50 text-teal-700",
                  };
                  return (
                    <tr key={i} className="border-t border-border text-sm">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-quase-preto">{d.client.name}</div>
                        <div className="text-xs text-quase-preto/50">
                          {d.client.cidade || "—"} · {d.client.fat || "—"}
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
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => generatePDF(d, d.notas)} className="bg-verde-raiz text-linho hover:bg-verde-musgo">
                          <Download className="mr-1 h-3.5 w-3.5" /> PDF
                        </Button>
                        <Button
                          size="sm" variant="ghost" onClick={() => handleDelete(i, d.client.name)}
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
    </div>
  );
}
