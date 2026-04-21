import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  MoreHorizontal,
  Eye,
  FileText,
  Calculator,
  Trash2,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  loadDiagnosticosFromSupabase,
  deleteDiagnosticoFromSupabase,
  type StoredDiagnostico,
} from "@/features/diagnostico/persistence";
import { generatePDF } from "@/features/diagnostico/pdf";

type StatusCarteira =
  | "lead"
  | "diagnostico_feito"
  | "proposta_enviada"
  | "projeto_ativo"
  | "encerrado";

type Cliente = {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  plano: string | null;
  created_at: string | null;
  status: StatusCarteira | null;
  orcamento_inicial: number | null;
  data_diagnostico: string | null;
  data_inicio_projeto: string | null;
  duracao_meses: number | null;
  valor_mensalidade: number | null;
};

type LinhaPainel = {
  cliente: Cliente;
  diag: StoredDiagnostico | null;
};

const STATUS_LABEL: Record<StatusCarteira, string> = {
  lead: "Lead",
  diagnostico_feito: "Diagnóstico feito",
  proposta_enviada: "Proposta enviada",
  projeto_ativo: "Projeto ativo",
  encerrado: "Encerrado",
};

// Badges com cores semânticas — uso classes Tailwind diretas para tons de paleta solicitada
const STATUS_BADGE: Record<StatusCarteira, string> = {
  lead: "bg-muted text-muted-foreground hover:bg-muted",
  diagnostico_feito: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  proposta_enviada: "bg-yellow-100 text-yellow-900 hover:bg-yellow-100",
  projeto_ativo: "bg-verde-raiz/15 text-verde-raiz hover:bg-verde-raiz/20",
  encerrado: "bg-destructive/15 text-destructive hover:bg-destructive/20",
};

const formatBRL = (v: number | null | undefined) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(v);

type EditState = {
  cliente: Cliente;
  status: StatusCarteira;
  data_diagnostico: string;
  data_inicio_projeto: string;
  duracao_meses: string;
  orcamento_inicial: string;
  valor_mensalidade: string;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [linhas, setLinhas] = useState<LinhaPainel[]>([]);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null);
  const [confirmDeleteCliente, setConfirmDeleteCliente] = useState<{ id: string; nome: string } | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: clientes }, diagnosticos] = await Promise.all([
        supabase
          .from("clientes")
          .select(
            "id, nome_cliente, nome_clinica, cidade, plano, created_at, status, orcamento_inicial, data_diagnostico, data_inicio_projeto, duracao_meses, valor_mensalidade",
          )
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

  // ====== KPIs de carteira ======
  const ativos = linhas.filter((l) => l.cliente.status === "projeto_ativo");
  const comDiagStatus = linhas.filter(
    (l) =>
      l.cliente.status === "diagnostico_feito" ||
      l.cliente.status === "proposta_enviada" ||
      l.cliente.status === "projeto_ativo" ||
      !!l.diag,
  );
  const mrr = ativos.reduce((sum, l) => sum + (Number(l.cliente.valor_mensalidade) || 0), 0);
  const totalAtivos = ativos.length;
  const taxaConversao =
    comDiagStatus.length > 0 ? Math.round((totalAtivos / comDiagStatus.length) * 100) : 0;
  const ticketMedio =
    totalAtivos > 0
      ? ativos.reduce((s, l) => s + (Number(l.cliente.orcamento_inicial) || 0), 0) / totalAtivos
      : 0;

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

  const openEdit = (c: Cliente) => {
    // Auto-preenche data_diagnostico com a data do diagnóstico salvo, se ainda não definida
    let dataDiag = c.data_diagnostico ?? "";
    if (!dataDiag) {
      const diag = linhas.find((l) => l.cliente.id === c.id)?.diag;
      if (diag?.timestamp) {
        dataDiag = new Date(diag.timestamp).toISOString().slice(0, 10);
      }
    }
    setEditState({
      cliente: c,
      status: (c.status as StatusCarteira) || "lead",
      data_diagnostico: dataDiag,
      data_inicio_projeto: c.data_inicio_projeto ?? "",
      duracao_meses: c.duracao_meses != null ? String(c.duracao_meses) : "",
      orcamento_inicial: c.orcamento_inicial != null ? String(c.orcamento_inicial) : "",
      valor_mensalidade: c.valor_mensalidade != null ? String(c.valor_mensalidade) : "",
    });
  };

  const saveEdit = async () => {
    if (!editState) return;
    setSavingEdit(true);
    try {
      const num = (s: string) => {
        const n = Number(String(s).replace(",", "."));
        return Number.isFinite(n) && s !== "" ? n : null;
      };
      const { error } = await supabase
        .from("clientes")
        .update({
          status: editState.status,
          orcamento_inicial: num(editState.orcamento_inicial),
          data_diagnostico: editState.data_diagnostico || null,
          data_inicio_projeto:
            editState.status === "projeto_ativo"
              ? editState.data_inicio_projeto || null
              : editState.data_inicio_projeto || null,
          duracao_meses:
            editState.duracao_meses === "" ? null : parseInt(editState.duracao_meses, 10),
          valor_mensalidade: num(editState.valor_mensalidade),
        })
        .eq("id", editState.cliente.id);
      if (error) throw error;
      toast.success("Projeto atualizado");
      setEditState(null);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao atualizar";
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Visão administrativa</span>
          <h1 className="mt-2 font-display text-4xl text-verde-raiz md:text-5xl">
            Gestão de Clientes
          </h1>
          <p className="mt-2 font-body text-sm text-quase-preto/70">
            Carteira completa: funil, MRR, projetos ativos e ticket médio.
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
          {/* ===== KPIs de Carteira ===== */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border/60 shadow-soft">
              <CardContent className="py-5">
                <div className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  MRR
                </div>
                <div className="mt-1 font-display text-3xl text-caramelo">{formatBRL(mrr)}</div>
                <div className="mt-1 font-body text-[11px] text-quase-preto/50">
                  Receita mensal recorrente
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-soft">
              <CardContent className="py-5">
                <div className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  Projetos ativos
                </div>
                <div className="mt-1 font-display text-3xl text-verde-raiz">{totalAtivos}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-soft">
              <CardContent className="py-5">
                <div className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  Taxa de conversão
                </div>
                <div className="mt-1 font-display text-3xl text-verde-raiz">{taxaConversao}%</div>
                <div className="mt-1 font-body text-[11px] text-quase-preto/50">
                  Ativos / com diagnóstico
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-soft">
              <CardContent className="py-5">
                <div className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  Ticket médio
                </div>
                <div className="mt-1 font-display text-3xl text-caramelo">
                  {formatBRL(ticketMedio)}
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
              {filtradas.length} de {linhas.length}
            </span>
          </div>

          {linhas.length === 0 ? (
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
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Clínica</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Orç. inicial</TableHead>
                      <TableHead>Mensalidade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtradas.map((l) => {
                      const d = l.diag;
                      const status = (l.cliente.status as StatusCarteira) || "lead";
                      return (
                        <TableRow key={l.cliente.id}>
                          <TableCell className="font-medium">{l.cliente.nome_cliente}</TableCell>
                          <TableCell>{l.cliente.nome_clinica ?? "—"}</TableCell>
                          <TableCell>{l.cliente.cidade ?? "—"}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</Badge>
                          </TableCell>
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
                          <TableCell>{formatBRL(l.cliente.orcamento_inicial)}</TableCell>
                          <TableCell>{formatBRL(l.cliente.valor_mensalidade)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => openEdit(l.cliente)}>
                                  <Briefcase className="mr-2 h-4 w-4" />
                                  Editar projeto
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
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

      {/* ===== Modal: Editar projeto ===== */}
      <Dialog open={!!editState} onOpenChange={(o) => !o && setEditState(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar projeto</DialogTitle>
            <DialogDescription>
              {editState?.cliente.nome_clinica || editState?.cliente.nome_cliente}
            </DialogDescription>
          </DialogHeader>

          {editState && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editState.status}
                  onValueChange={(v) =>
                    setEditState({ ...editState, status: v as StatusCarteira })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as StatusCarteira[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Orçamento inicial (R$)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={editState.orcamento_inicial}
                    onChange={(e) =>
                      setEditState({ ...editState, orcamento_inicial: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor mensalidade (R$)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={editState.valor_mensalidade}
                    onChange={(e) =>
                      setEditState({ ...editState, valor_mensalidade: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data início</Label>
                  <Input
                    type="date"
                    value={editState.data_inicio_projeto}
                    onChange={(e) =>
                      setEditState({ ...editState, data_inicio_projeto: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duração (meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editState.duracao_meses}
                    onChange={(e) =>
                      setEditState({ ...editState, duracao_meses: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditState(null)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button
              onClick={saveEdit}
              disabled={savingEdit}
              className="bg-verde-raiz hover:bg-verde-raiz/90"
            >
              {savingEdit ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
