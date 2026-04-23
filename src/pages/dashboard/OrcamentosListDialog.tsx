import { useEffect, useState } from "react";
import { Download, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteOrcamento,
  downloadOrcamento,
  listOrcamentosByCliente,
  type OrcamentoSalvo,
} from "@/features/orcamentos/storage";

interface Props {
  clienteId: string | null;
  clienteNome: string;
  onClose: () => void;
}

export function OrcamentosListDialog({ clienteId, clienteNome, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<OrcamentoSalvo[]>([]);
  const [confirmDel, setConfirmDel] = useState<OrcamentoSalvo | null>(null);

  const load = async () => {
    if (!clienteId) return;
    setLoading(true);
    try {
      setItems(await listOrcamentosByCliente(clienteId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar orçamentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clienteId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const handleDownload = async (o: OrcamentoSalvo) => {
    try {
      await downloadOrcamento(o);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao baixar PDF");
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteOrcamento(confirmDel);
      toast.success("Orçamento removido");
      setConfirmDel(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover");
    }
  };

  return (
    <>
      <Dialog open={!!clienteId} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Orçamentos salvos</DialogTitle>
            <DialogDescription>{clienteNome}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 bg-linho/30 py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-quase-preto/30" />
              <p className="mt-2 font-body text-sm text-quase-preto/60">
                Nenhum orçamento salvo para este cliente.
              </p>
              <p className="mt-1 font-body text-xs text-quase-preto/50">
                Gere um orçamento na ferramenta e clique em "Salvar na Gestão de Clientes".
              </p>
            </div>
          ) : (
            <div className="max-h-[60vh] divide-y divide-border/60 overflow-y-auto">
              {items.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-sm font-medium text-quase-preto">
                        {o.plano_nome || o.plano}
                      </span>
                      {o.valor && (
                        <span className="rounded bg-caramelo/10 px-1.5 py-0.5 font-body text-[11px] text-caramelo">
                          {o.valor}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-body text-xs text-quase-preto/55">
                      {new Date(o.created_at).toLocaleString("pt-BR")}
                      {o.score != null && o.score_max != null && (
                        <> · Score: {o.score}/{o.score_max}</>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleDownload(o)}>
                      <Download className="mr-1 h-3.5 w-3.5" /> Baixar
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDel(o)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo <strong>{confirmDel?.file_name}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
