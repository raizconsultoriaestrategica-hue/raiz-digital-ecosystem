import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, FileText, Calculator, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  loadDiagnosticosFromSupabase,
  deleteDiagnosticoFromSupabase,
  type StoredDiagnostico,
} from "@/features/diagnostico/persistence";
import { generatePDF } from "@/features/diagnostico/pdf";

type Cliente = {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  plano: string | null;
  created_at: string | null;
};

type LinhaPainel = {
  cliente: Cliente;
  diag: StoredDiagnostico | null;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [linhas, setLinhas] = useState<LinhaPainel[]>([]);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null);
  const [confirmDeleteCliente, setConfirmDeleteCliente] = useState<{ id: string; nome: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: clientes }, diagnosticos] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome_cliente, nome_clinica, cidade, plano, created_at")
          .order("created_at", { ascending: false }),
        loadDiagnosticosFromSupabase(),
      ]);

      const lista = (clientes ?? []) as Cliente[];
      const diagMap = new Map(diagnosticos.map((d) => [d.cliente_id, d] as const));

      setLinhas(
        lista.map((c) => ({
          cliente: c,
          diag: diagMap.get(c.id) ?? null,
        })),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao carregar painel";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtradas = useMemo(() => {
    if (!search.trim()) return linhas;
    const q = search.toLowerCase();
    return linhas.filter(
      (l) =>
        l.cliente.nome_cliente.toLowerCase().includes(q) ||
        (l.cliente.nome_clinica || "").toLowerCase().includes(q) ||
        (l.cliente.cidade || "").toLowerCase().includes(q),
    );
  }, [linhas, search]);

  const total = linhas.length;
  const comDiag = linhas.filter((l) => l.diag).length;

  const handleVerResultado = (l: LinhaPainel) => {
    if (!l.diag) return;
    try {
      generatePDF(l.diag, l.diag.notas);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao gerar PDF";
      toast.error(msg);
    }
  };

  const handleDeletarDiagnostico = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDiagnosticoFromSupabase(confirmDelete.id);
      toast.success("Diagnóstico removido");
      setConfirmDelete(null);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao remover";
      toast.error(msg);
    }
  };

  const handleDeletarCliente = async () => {
    if (!confirmDeleteCliente) return;
    try {
      // Apaga dados do dashboard primeiro (sem FK cascade)
      await supabase.from("dashboard_data").delete().eq("cliente_id", confirmDeleteCliente.id);
      const { error } = await supabase.from("clientes").delete().eq("id", confirmDeleteCliente.id);
      if (error) throw error;
      toast.success("Cliente removido");
      setConfirmDeleteCliente(null);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao remover cliente";
      toast.error(msg);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Visão administrativa</span>
          <h1 className="mt-2 font-display text-4xl text-verde-raiz md:text-5xl">
            Gestão de clientes
          </h1>
          <p className="mt-2 font-body text-sm text-quase-preto/70">
            Hub central da consultoria. Cadastre clientes, conduza diagnósticos e gere orçamentos.
          </p>
        </div>
        <Button asChild className="bg-verde-raiz hover:bg-verde-raiz/90">
          <Link to="/ferramentas/diagnostico">+ Novo diagnóstico</Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/60 shadow-soft">
              <CardContent className="py-5">
                <div className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  Total de clientes
                </div>
                <div className="mt-1 font-display text-3xl text-verde-raiz">{total}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-soft">
              <CardContent className="py-5">
                <div className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  Com diagnóstico
                </div>
                <div className="mt-1 font-display text-3xl text-caramelo">{comDiag}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-soft">
              <CardContent className="py-5">
                <div className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  Pendentes
                </div>
                <div className="mt-1 font-display text-3xl text-quase-preto">
                  {total - comDiag}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Input
              placeholder="Buscar por cliente, clínica ou cidade…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <span className="text-xs text-quase-preto/50">
              {filtradas.length} de {total}
            </span>
          </div>

          {total === 0 ? (
            <Card className="border-dashed border-border/60 bg-linho/40 shadow-none">
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="font-display text-2xl text-verde-raiz">
                  Nenhum cliente cadastrado
                </div>
                <p className="max-w-md font-body text-sm text-quase-preto/70">
                  Crie o primeiro cliente direto pelo Diagnóstico 360°.
                </p>
                <Button asChild className="mt-2 bg-verde-raiz hover:bg-verde-raiz/90">
                  <Link to="/ferramentas/diagnostico">Abrir Diagnóstico 360°</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 shadow-soft">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Clínica</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((l) => {
                      const d = l.diag;
                      return (
                        <TableRow key={l.cliente.id}>
                          <TableCell className="font-medium">{l.cliente.nome_cliente}</TableCell>
                          <TableCell>{l.cliente.nome_clinica ?? "—"}</TableCell>
                          <TableCell>{l.cliente.cidade ?? "—"}</TableCell>
                          <TableCell>
                            {d ? (
                              <span className="font-display text-caramelo">
                                {d.totalScore}
                                <span className="ml-1 font-body text-xs text-quase-preto/60">
                                  / {d.totalMax}
                                </span>
                              </span>
                            ) : (
                              <span className="text-quase-preto/40">—</span>
                            )}
                          </TableCell>
                          <TableCell>{d?.classif?.label ?? "—"}</TableCell>
                          <TableCell>
                            {d ? (
                              <Badge className="bg-verde-raiz/10 text-verde-raiz hover:bg-verde-raiz/15">
                                Concluído
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-border/60 text-quase-preto/60">
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem
                                  disabled={!d}
                                  onClick={() => handleVerResultado(l)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver resultado (PDF)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/ferramentas/diagnostico?cliente=${l.cliente.id}`)
                                  }
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  {d ? "Refazer diagnóstico" : "Iniciar diagnóstico"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/ferramentas/orcamentos?cliente=${l.cliente.id}`)
                                  }
                                >
                                  <Calculator className="mr-2 h-4 w-4" />
                                  Gerar orçamento
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {d && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      setConfirmDelete({
                                        id: l.cliente.id,
                                        nome: l.cliente.nome_clinica || l.cliente.nome_cliente,
                                      })
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Apagar diagnóstico
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    setConfirmDeleteCliente({
                                      id: l.cliente.id,
                                      nome: l.cliente.nome_clinica || l.cliente.nome_cliente,
                                    })
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Apagar cliente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar diagnóstico?</AlertDialogTitle>
            <AlertDialogDescription>
              O diagnóstico de <strong>{confirmDelete?.nome}</strong> será removido permanentemente.
              O cliente continua cadastrado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletarDiagnostico}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDeleteCliente}
        onOpenChange={(o) => !o && setConfirmDeleteCliente(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDeleteCliente?.nome}</strong> e todos os dados associados (diagnóstico,
              configurações) serão removidos permanentemente. O usuário em auth.users precisa ser
              removido manualmente, se desejado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletarCliente}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
