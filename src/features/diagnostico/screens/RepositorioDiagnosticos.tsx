import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Eye, Trash2, Search, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadDiagnosticosFromSupabase,
  deleteDiagnosticoFromSupabase,
  type StoredDiagnostico,
} from "../persistence";
import { generatePDF } from "../pdf";

export function RepositorioDiagnosticos() {
  const [items, setItems] = useState<StoredDiagnostico[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await loadDiagnosticosFromSupabase();
      setItems(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao carregar";
      toast.error(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((d) =>
      [d.client?.name, d.client?.cidade, d.classif?.label, d.plano?.name]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(term)),
    );
  }, [items, q]);

  const handleDelete = async (cid: string, name: string) => {
    if (!confirm(`Excluir o diagnóstico de ${name}? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteDiagnosticoFromSupabase(cid);
      toast.success("Diagnóstico excluído.");
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao excluir";
      toast.error(msg);
    }
  };

  const handlePDF = (d: StoredDiagnostico) => {
    try {
      generatePDF(d, d.notas || "");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao gerar PDF";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-5 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-dourado">
              Área do Consultor
            </div>
            <h1 className="mt-1 font-display text-3xl font-semibold text-quase-preto">
              Repositório de Diagnósticos
            </h1>
            <p className="mt-1 text-sm text-quase-preto/60">
              Histórico de todos os diagnósticos salvos no Supabase.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button asChild className="bg-verde-raiz text-linho hover:bg-verde-musgo">
              <Link to="/ferramentas/diagnostico">+ Novo diagnóstico</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-quase-preto/40" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente, cidade, classificação ou plano…"
            className="pl-9"
          />
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-quase-preto/60">
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <div className="text-sm font-semibold text-quase-preto">Nenhum diagnóstico encontrado</div>
              <p className="mt-1 text-xs text-quase-preto/55">
                {q ? "Tente outro termo de busca." : "Salve um diagnóstico para vê-lo aqui."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((d) => (
                <DiagCard
                  key={d.cliente_id}
                  d={d}
                  onPDF={() => handlePDF(d)}
                  onDelete={() => handleDelete(d.cliente_id!, d.client.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DiagCard({
  d, onPDF, onDelete,
}: { d: StoredDiagnostico; onPDF: () => void; onDelete: () => void }) {
  const dt = d.timestamp ? new Date(d.timestamp) : null;
  const dateLabel = dt ? dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const ramoLabel = d.ramo === "medico" ? "Médico" : "Dentista";
  const pct = Math.round((d.totalPct ?? 0) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-verde-musgo">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-verde-menta text-base font-bold text-verde-raiz">
          {pct}%
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold text-quase-preto">{d.client?.name || "—"}</div>
            <Badge variant="outline" className="border-dourado/40 bg-dourado/10 text-dourado">
              {ramoLabel}
            </Badge>
          </div>
          <div className="mt-0.5 truncate text-xs text-quase-preto/55">
            {d.client?.cidade || "—"} · {dateLabel}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-verde-menta px-2 py-0.5 text-[10px] font-semibold text-verde-raiz">
              {d.classif?.label}
            </span>
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              "bg-muted text-quase-preto/70",
            )}>
              {d.plano?.name}
            </span>
            {d.analise && (
              <span className="rounded-full bg-dourado/15 px-2 py-0.5 text-[10px] font-semibold text-dourado">
                IA
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-1.5">
          <Button asChild size="sm" variant="outline" className="h-8 px-2.5">
            <Link to={`/consultor/clientes/${d.cliente_id}`} title="Ver cliente">
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={onPDF} title="Exportar PDF">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 border-destructive/30 text-destructive hover:bg-destructive/5"
            onClick={onDelete}
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
