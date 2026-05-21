import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  FolderOpen,
  Plus,
  AlertTriangle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  loadDiagnosticosFromSupabase,
  deleteDiagnosticoFromSupabase,
  type StoredDiagnostico,
} from "@/features/diagnostico/persistence";
import { generatePDF } from "@/features/diagnostico/pdf";
import { OrcamentosListDialog } from "./OrcamentosListDialog";
import { useSaudeFinanceiraClientes } from "@/hooks/useSaudeFinanceiraCliente";
import {
  validarCadastroClienteNovo,
  temErros,
  type ErrosCadastro,
} from "@/lib/validacoes-cadastro";

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
  email_cliente: string | null;
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

// Badges com cores semânticas. Uso classes Tailwind diretas para tons de paleta solicitada
const STATUS_BADGE: Record<StatusCarteira, string> = {
  lead: "bg-muted text-muted-foreground hover:bg-muted",
  diagnostico_feito: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  proposta_enviada: "bg-yellow-100 text-yellow-900 hover:bg-yellow-100",
  projeto_ativo: "bg-verde-raiz/15 text-verde-raiz hover:bg-verde-raiz/20",
  encerrado: "bg-destructive/15 text-destructive hover:bg-destructive/20",
};

const PLANO_OPCOES = [
  { value: "Raiz Essencial", label: "Raiz Essencial" },
  { value: "Raiz de Crescimento", label: "Raiz de Crescimento" },
  { value: "Raiz de Expansão", label: "Raiz de Expansão" },
] as const;

const FORMA_PAGAMENTO_OPCOES = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
] as const;

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

// Estado do formulário de novo cliente (todos os campos M1)
type NovoClienteForm = {
  nome_cliente: string;
  nome_clinica: string;
  cidade: string;
  especialidade: string;
  plano: string;
  status: StatusCarteira;
  meta_faturamento: string;
  consultor: string;
  telefone: string;
  email_cliente: string;
  cpf_cnpj: string;
  endereco: string;
  data_nascimento: string;
  instagram: string;
  observacoes_relacionamento: string;
  dia_vencimento: string;
  forma_pagamento: string;
  especialidade_clinica: string;
};

const NOVO_CLIENTE_INITIAL: NovoClienteForm = {
  nome_cliente: "",
  nome_clinica: "",
  cidade: "",
  especialidade: "",
  plano: "",
  status: "lead",
  meta_faturamento: "",
  consultor: "",
  telefone: "",
  email_cliente: "",
  cpf_cnpj: "",
  endereco: "",
  data_nascimento: "",
  instagram: "",
  observacoes_relacionamento: "",
  dia_vencimento: "",
  forma_pagamento: "",
  especialidade_clinica: "",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [linhas, setLinhas] = useState<LinhaPainel[]>([]);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string } | null>(null);
  const [confirmDeleteCliente, setConfirmDeleteCliente] = useState<{ id: string; nome: string } | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [orcamentosOpen, setOrcamentosOpen] = useState<{ id: string; nome: string } | null>(null);

  // Modal Novo Cliente
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [novoClienteForm, setNovoClienteForm] = useState<NovoClienteForm>(NOVO_CLIENTE_INITIAL);
  const [savingNovoCliente, setSavingNovoCliente] = useState(false);
  const [novoClienteErros, setNovoClienteErros] = useState<ErrosCadastro>({});

  // Especialidades (tabela de referência, estável — staleTime infinito)
  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("especialidades")
        .select("id, ramo, nome, ordem")
        .eq("ativo", true)
        .order("ramo")
        .order("ordem");
      if (error) throw error;
      return data as { id: string; ramo: string; nome: string; ordem: number }[];
    },
    staleTime: Infinity,
  });

  const RAMO_LABEL: Record<string, string> = {
    odontologia: "Odontologia",
    medicina: "Medicina",
    estetica: "Estética",
    outros: "Outros",
  };

  const especialidadesPorRamo = useMemo(() => {
    const map: Record<string, typeof especialidades> = {};
    for (const e of especialidades) {
      if (!map[e.ramo]) map[e.ramo] = [];
      map[e.ramo].push(e);
    }
    return map;
  }, [especialidades]);

  // Abre modal automaticamente quando URL contém ?novo=1
  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      setNovoClienteOpen(true);
      setNovoClienteForm(NOVO_CLIENTE_INITIAL); setNovoClienteErros({});
      // Remove o param da URL sem adicionar ao histórico
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: clientes }, diagnosticos] = await Promise.all([
        supabase
          .from("clientes")
          .select(
            "id, nome_cliente, nome_clinica, cidade, plano, created_at, status, orcamento_inicial, data_diagnostico, data_inicio_projeto, duracao_meses, valor_mensalidade, email_cliente",
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
  const { data: saudeClientes = [] } = useSaudeFinanceiraClientes();
  const saudeMap = useMemo(
    () => new Map(saudeClientes.map((s) => [s.cliente_id, s])),
    [saudeClientes],
  );

  const ativos = linhas.filter((l) => l.cliente.status === "projeto_ativo");
  const comDiagStatus = linhas.filter(
    (l) =>
      l.cliente.status === "diagnostico_feito" ||
      l.cliente.status === "proposta_enviada" ||
      l.cliente.status === "projeto_ativo" ||
      !!l.diag,
  );
  // MRR canonico: contratos_raiz via v_saude_financeira_cliente.
  // Ativos sem contrato cadastrado entram com 0 e aparecem em `ativosSemContrato`.
  const mrr = ativos.reduce((sum, l) => {
    const s = saudeMap.get(l.cliente.id);
    return sum + Number(s?.mrr_atual ?? 0);
  }, 0);
  const ativosSemContrato = ativos.filter((l) => {
    const s = saudeMap.get(l.cliente.id);
    return !s?.tem_contrato;
  }).length;
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
      // Buscar user_id vinculado antes de apagar
      const { data: cli } = await supabase
        .from("clientes")
        .select("user_id")
        .eq("id", confirmDeleteCliente.id)
        .maybeSingle();
      const userId = cli?.user_id ?? null;

      // 1) Tentar apagar do auth.users via edge function. Se falhar, avisa e segue
      let authOk = true;
      if (userId) {
        const { data: authRes, error: authErr } = await supabase.functions.invoke(
          "delete-user",
          { body: { user_id: userId } },
        );
        const errMsg = authErr?.message ?? (authRes as { error?: string } | null)?.error;
        if (errMsg) {
          authOk = false;
          toast.warning("Falha ao apagar usuário do Auth: " + errMsg);
        }
      }

      // 2) Apagar dados e registro do cliente
      await supabase.from("dashboard_data").delete().eq("cliente_id", confirmDeleteCliente.id);
      const { error } = await supabase.from("clientes").delete().eq("id", confirmDeleteCliente.id);
      if (error) throw error;

      if (authOk) {
        toast.success("Cliente removido completamente");
      } else {
        toast.success("Cliente removido (Auth pendente)");
      }

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

  const handleCriarCliente = async () => {
    if (!novoClienteForm.nome_cliente.trim()) {
      toast.error("Nome do responsável é obrigatório.");
      return;
    }
    const erros = validarCadastroClienteNovo({
      email_cliente: novoClienteForm.email_cliente,
      telefone: novoClienteForm.telefone,
      dia_vencimento: novoClienteForm.dia_vencimento,
    });
    setNovoClienteErros(erros);
    if (temErros(erros)) {
      toast.error("Corrija os campos destacados antes de salvar.");
      return;
    }
    setSavingNovoCliente(true);
    try {
      const toNum = (s: string) => {
        const n = Number(s.replace(",", "."));
        return s.trim() !== "" && Number.isFinite(n) ? n : null;
      };
      const { data, error } = await supabase
        .from("clientes")
        .insert({
          nome_cliente: novoClienteForm.nome_cliente.trim(),
          nome_clinica: novoClienteForm.nome_clinica.trim() || null,
          cidade: novoClienteForm.cidade.trim() || null,
          especialidade: novoClienteForm.especialidade.trim() || null,
          plano: novoClienteForm.plano || null,
          status: novoClienteForm.status,
          meta_faturamento: toNum(novoClienteForm.meta_faturamento),
          consultor: novoClienteForm.consultor.trim() || null,
          telefone: novoClienteForm.telefone.trim() || null,
          email_cliente: novoClienteForm.email_cliente.trim() || null,
          cpf_cnpj: novoClienteForm.cpf_cnpj.trim() || null,
          endereco: novoClienteForm.endereco.trim() || null,
          data_nascimento: novoClienteForm.data_nascimento || null,
          instagram: novoClienteForm.instagram.trim() || null,
          observacoes_relacionamento: novoClienteForm.observacoes_relacionamento.trim() || null,
          dia_vencimento: toNum(novoClienteForm.dia_vencimento),
          forma_pagamento: novoClienteForm.forma_pagamento || null,
          especialidade_clinica: novoClienteForm.especialidade_clinica.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Cliente criado com sucesso.");
      setNovoClienteOpen(false);
      setNovoClienteForm(NOVO_CLIENTE_INITIAL); setNovoClienteErros({});
      navigate(`/consultor/clientes/${data.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao criar cliente";
      toast.error(msg);
    } finally {
      setSavingNovoCliente(false);
    }
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
        <Button
          onClick={() => { setNovoClienteOpen(true); setNovoClienteForm(NOVO_CLIENTE_INITIAL); setNovoClienteErros({}); }}
          className="bg-verde-raiz hover:bg-verde-raiz/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
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
                  Soma de contratos ativos
                </div>
                {ativosSemContrato > 0 && (
                  <div className="mt-1 font-body text-[11px] text-destructive">
                    {ativosSemContrato} ativo(s) sem contrato cadastrado
                  </div>
                )}
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
                  Acesse <strong>Ferramentas</strong> no menu lateral para iniciar pelo Diagnóstico 360°.
                </p>
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
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/consultor/clientes/${l.cliente.id}`}
                                className="text-verde-raiz hover:text-dourado hover:underline"
                              >
                                {l.cliente.nome_cliente}
                              </Link>
                              {!l.cliente.email_cliente && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        className="cursor-help bg-amber-100 text-amber-900 hover:bg-amber-100"
                                      >
                                        <AlertTriangle className="mr-1 h-3 w-3" />
                                        Sem email
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Automações Resend (lembrete de reunião, cobrança e resumo mensal) não disparam sem email cadastrado.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
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
                              <span className="text-quase-preto/40">,</span>
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
                                <DropdownMenuItem
                                  onClick={() => navigate(`/consultor/clientes/${l.cliente.id}`)}
                                >
                                  <Briefcase className="mr-2 h-4 w-4" />
                                  Gerir cliente
                                </DropdownMenuItem>
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
                                <DropdownMenuItem
                                  onClick={() =>
                                    setOrcamentosOpen({
                                      id: l.cliente.id,
                                      nome: l.cliente.nome_clinica || l.cliente.nome_cliente,
                                    })
                                  }
                                >
                                  <FolderOpen className="mr-2 h-4 w-4" />
                                  Orçamentos salvos
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

      {/* ===== Modal: Novo Cliente ===== */}
      <Dialog
        open={novoClienteOpen}
        onOpenChange={(o) => {
          if (!o) { setNovoClienteOpen(false); setNovoClienteForm(NOVO_CLIENTE_INITIAL); setNovoClienteErros({}); }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente. Apenas o nome do responsável é obrigatório.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-5 py-2">
              {/* Seção: Identificação */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Identificação
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome do responsável <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="ex.: Dra. Ana Lima"
                      value={novoClienteForm.nome_cliente}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, nome_cliente: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome da clínica</Label>
                    <Input
                      placeholder="ex.: Clínica OdontoVida"
                      value={novoClienteForm.nome_clinica}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, nome_clinica: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cidade</Label>
                    <Input
                      placeholder="ex.: São Paulo"
                      value={novoClienteForm.cidade}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, cidade: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Especialidade (campo legado)</Label>
                    <Input
                      placeholder="ex.: Ortodontia"
                      value={novoClienteForm.especialidade}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, especialidade: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CPF / CNPJ</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={novoClienteForm.cpf_cnpj}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, cpf_cnpj: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data de nascimento</Label>
                    <Input
                      type="date"
                      value={novoClienteForm.data_nascimento}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, data_nascimento: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Seção: Contato */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Contato
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>
                      Telefone <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={novoClienteForm.telefone}
                      aria-invalid={!!novoClienteErros.telefone}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNovoClienteForm((f) => ({ ...f, telefone: v }));
                        if (novoClienteErros.telefone) setNovoClienteErros((er) => ({ ...er, telefone: undefined }));
                      }}
                    />
                    {novoClienteErros.telefone && (
                      <p className="text-xs text-destructive">{novoClienteErros.telefone}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      E-mail <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="dra.ana@clinica.com"
                      value={novoClienteForm.email_cliente}
                      aria-invalid={!!novoClienteErros.email_cliente}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNovoClienteForm((f) => ({ ...f, email_cliente: v }));
                        if (novoClienteErros.email_cliente) setNovoClienteErros((er) => ({ ...er, email_cliente: undefined }));
                      }}
                    />
                    {novoClienteErros.email_cliente && (
                      <p className="text-xs text-destructive">{novoClienteErros.email_cliente}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Instagram</Label>
                    <Input
                      placeholder="@usuario"
                      value={novoClienteForm.instagram}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, instagram: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-1">
                    <Label>Endereço</Label>
                    <Input
                      placeholder="Rua, número, bairro"
                      value={novoClienteForm.endereco}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, endereco: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Seção: Contrato */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Contrato
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Plano</Label>
                    <Select
                      value={novoClienteForm.plano}
                      onValueChange={(v) => setNovoClienteForm((f) => ({ ...f, plano: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANO_OPCOES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={novoClienteForm.status}
                      onValueChange={(v) => setNovoClienteForm((f) => ({ ...f, status: v as StatusCarteira }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABEL) as StatusCarteira[]).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Meta de faturamento (R$/mês)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={novoClienteForm.meta_faturamento}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, meta_faturamento: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Consultor responsável</Label>
                    <Input
                      placeholder="Nome do consultor"
                      value={novoClienteForm.consultor}
                      onChange={(e) => setNovoClienteForm((f) => ({ ...f, consultor: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      Dia de vencimento (1 a 31) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      placeholder="10"
                      value={novoClienteForm.dia_vencimento}
                      aria-invalid={!!novoClienteErros.dia_vencimento}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNovoClienteForm((f) => ({ ...f, dia_vencimento: v }));
                        if (novoClienteErros.dia_vencimento) setNovoClienteErros((er) => ({ ...er, dia_vencimento: undefined }));
                      }}
                    />
                    {novoClienteErros.dia_vencimento && (
                      <p className="text-xs text-destructive">{novoClienteErros.dia_vencimento}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Forma de pagamento</Label>
                    <Select
                      value={novoClienteForm.forma_pagamento}
                      onValueChange={(v) => setNovoClienteForm((f) => ({ ...f, forma_pagamento: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMA_PAGAMENTO_OPCOES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Especialidade clínica</Label>
                    <Select
                      value={novoClienteForm.especialidade_clinica}
                      onValueChange={(v) => setNovoClienteForm((f) => ({ ...f, especialidade_clinica: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a especialidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(especialidadesPorRamo).map(([ramo, items]) => (
                          <SelectGroup key={ramo}>
                            <SelectLabel>{RAMO_LABEL[ramo] ?? ramo}</SelectLabel>
                            {items.map((e) => (
                              <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seção: Relacionamento */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Relacionamento
                </p>
                <div className="space-y-1.5">
                  <Label>Observações de relacionamento</Label>
                  <Textarea
                    rows={3}
                    placeholder="Preferências, pontos de atenção, contexto relevante…"
                    value={novoClienteForm.observacoes_relacionamento}
                    onChange={(e) => setNovoClienteForm((f) => ({ ...f, observacoes_relacionamento: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => { setNovoClienteOpen(false); setNovoClienteForm(NOVO_CLIENTE_INITIAL); setNovoClienteErros({}); }}
              disabled={savingNovoCliente}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCriarCliente}
              disabled={savingNovoCliente || !novoClienteForm.nome_cliente.trim()}
              className="bg-verde-raiz hover:bg-verde-raiz/90"
            >
              {savingNovoCliente ? "Criando…" : "Criar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

              <div className="space-y-2">
                <Label>Data do diagnóstico</Label>
                <Input
                  type="date"
                  value={editState.data_diagnostico}
                  onChange={(e) =>
                    setEditState({ ...editState, data_diagnostico: e.target.value })
                  }
                />
              </div>

              {editState.status === "projeto_ativo" && (
                <div className="space-y-2">
                  <Label>
                    Data de início do projeto <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    required
                    value={editState.data_inicio_projeto}
                    onChange={(e) =>
                      setEditState({ ...editState, data_inicio_projeto: e.target.value })
                    }
                  />
                </div>
              )}

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
              configurações) serão removidos permanentemente, incluindo o login do usuário no
              sistema.
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

      <OrcamentosListDialog
        clienteId={orcamentosOpen?.id ?? null}
        clienteNome={orcamentosOpen?.nome ?? ""}
        onClose={() => setOrcamentosOpen(null)}
      />
    </div>
  );
}
