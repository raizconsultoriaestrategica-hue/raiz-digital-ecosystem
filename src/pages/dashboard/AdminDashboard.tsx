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
  validarCadastroLead,
  validarAtivacaoCliente,
  temErros,
  RAMOS_VALIDOS,
  RAMO_LABEL as RAMO_LABEL_LIB,
  type ErrosCadastro,
  type ErrosAtivacao,
  type Ramo,
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

// Estado do formulario de novo LEAD (cadastro inicial, antes de virar cliente).
// Campos mínimos para fazer Diagnóstico 360. Sem dados comerciais (plano, valor,
// vencimento, forma pgto, etc). Esses entram só na ativação (lead → projeto_ativo).
type NovoLeadForm = {
  nome_cliente: string;
  nome_clinica: string;
  cidade: string;
  telefone: string;
  email_cliente: string;
  ramo: Ramo;
  especialidade_clinica: string;
  instagram: string;
  observacoes_relacionamento: string;
};

const NOVO_LEAD_INITIAL: NovoLeadForm = {
  nome_cliente: "",
  nome_clinica: "",
  cidade: "",
  telefone: "",
  email_cliente: "",
  ramo: "odontologia",
  especialidade_clinica: "",
  instagram: "",
  observacoes_relacionamento: "",
};

// Estado do formulario de ATIVAÇÃO (lead → projeto_ativo). Dados comerciais.
type AtivacaoForm = {
  plano: string;
  valor_mensalidade: string;
  dia_vencimento: string;
  forma_pagamento: string;
  data_inicio_projeto: string;
  duracao_meses: string;
  meta_faturamento: string;
  cpf_cnpj: string;
  endereco: string;
};

const ATIVACAO_INITIAL: AtivacaoForm = {
  plano: "",
  valor_mensalidade: "",
  dia_vencimento: "",
  forma_pagamento: "",
  data_inicio_projeto: "",
  duracao_meses: "12",
  meta_faturamento: "",
  cpf_cnpj: "",
  endereco: "",
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

  // Modal Novo Lead
  const [novoLeadOpen, setNovoLeadOpen] = useState(false);
  const [novoLeadForm, setNovoLeadForm] = useState<NovoLeadForm>(NOVO_LEAD_INITIAL);
  const [savingNovoLead, setSavingNovoLead] = useState(false);
  const [novoLeadErros, setNovoLeadErros] = useState<ErrosCadastro>({});

  // Modal Ativação cliente (lead → projeto_ativo)
  const [ativarCliente, setAtivarCliente] = useState<Cliente | null>(null);
  const [ativacaoForm, setAtivacaoForm] = useState<AtivacaoForm>(ATIVACAO_INITIAL);
  const [savingAtivacao, setSavingAtivacao] = useState(false);
  const [ativacaoErros, setAtivacaoErros] = useState<ErrosAtivacao>({});
  const [credenciaisAtivacao, setCredenciaisAtivacao] = useState<{ email: string; senha: string } | null>(null);

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
      setNovoLeadOpen(true);
      setNovoLeadForm(NOVO_LEAD_INITIAL); setNovoLeadErros({});
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
      const clienteId = confirmDeleteCliente.id;

      // Buscar user_id vinculado antes de apagar
      const { data: cli } = await supabase
        .from("clientes")
        .select("user_id")
        .eq("id", clienteId)
        .maybeSingle();
      const userId = cli?.user_id ?? null;

      // 1) Limpar arquivos do storage antes do DELETE no banco.
      // CASCADE no Postgres remove arquivos_cliente.row, mas storage.objects
      // fica orfao se nao limpar aqui. Best-effort: nao bloqueia o fluxo se falhar.
      const STORAGE_BUCKETS = ["arquivos-cliente", "orcamentos", "diagnosticos-financeiros"];
      for (const bucket of STORAGE_BUCKETS) {
        try {
          const { data: objs } = await supabase.storage.from(bucket).list(clienteId);
          if (objs && objs.length > 0) {
            const paths = objs.map((o) => `${clienteId}/${o.name}`);
            await supabase.storage.from(bucket).remove(paths);
          }
        } catch (storageErr) {
          console.warn(`[delete cliente] storage cleanup ${bucket} falhou:`, storageErr);
        }
      }

      // 2) Tentar apagar do auth.users via edge function. Se falhar, avisa e segue
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

      // 3) Apagar dados e registro do cliente (CASCADE limpa tabelas dependentes)
      await supabase.from("dashboard_data").delete().eq("cliente_id", clienteId);
      const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
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

  const handleCriarLead = async () => {
    if (!novoLeadForm.nome_cliente.trim()) {
      toast.error("Nome do responsável é obrigatório.");
      return;
    }
    const erros = validarCadastroLead({
      email_cliente: novoLeadForm.email_cliente,
      telefone: novoLeadForm.telefone,
      ramo: novoLeadForm.ramo,
    });
    setNovoLeadErros(erros);
    if (temErros(erros)) {
      toast.error("Corrija os campos destacados antes de salvar.");
      return;
    }
    setSavingNovoLead(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .insert({
          nome_cliente: novoLeadForm.nome_cliente.trim(),
          nome_clinica: novoLeadForm.nome_clinica.trim() || null,
          cidade: novoLeadForm.cidade.trim() || null,
          ramo: novoLeadForm.ramo,
          status: "lead",
          telefone: novoLeadForm.telefone.trim() || null,
          email_cliente: novoLeadForm.email_cliente.trim() || null,
          instagram: novoLeadForm.instagram.trim() || null,
          observacoes_relacionamento: novoLeadForm.observacoes_relacionamento.trim() || null,
          especialidade_clinica: novoLeadForm.especialidade_clinica.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Lead cadastrado. Próximo passo: fazer Diagnóstico 360 com ele.");
      setNovoLeadOpen(false);
      setNovoLeadForm(NOVO_LEAD_INITIAL); setNovoLeadErros({});
      load();
      // Já leva o consultor pra ferramenta de Diagnóstico com o lead pré-selecionado
      navigate(`/ferramentas/diagnostico?cliente=${data.id}`);
    } catch (e) {
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      const partes = [
        err?.message ?? "Falha ao cadastrar lead",
        err?.code ? `(${err.code})` : null,
        err?.details ?? null,
        err?.hint ?? null,
      ].filter(Boolean);
      toast.error(partes.join(" · "));
      console.error("[Novo Lead] Erro do Supabase:", err);
    } finally {
      setSavingNovoLead(false);
    }
  };

  const openAtivacao = (c: Cliente) => {
    setCredenciaisAtivacao(null);
    setAtivacaoErros({});
    setAtivacaoForm({
      ...ATIVACAO_INITIAL,
      data_inicio_projeto: new Date().toISOString().slice(0, 10),
    });
    setAtivarCliente(c);
  };

  const handleAtivarCliente = async () => {
    if (!ativarCliente) return;
    const erros = validarAtivacaoCliente({
      plano: ativacaoForm.plano,
      valor_mensalidade: ativacaoForm.valor_mensalidade,
      dia_vencimento: ativacaoForm.dia_vencimento,
      forma_pagamento: ativacaoForm.forma_pagamento,
      data_inicio_projeto: ativacaoForm.data_inicio_projeto,
      duracao_meses: ativacaoForm.duracao_meses,
    });
    setAtivacaoErros(erros);
    if (temErros(erros)) {
      toast.error("Corrija os campos destacados antes de ativar.");
      return;
    }
    setSavingAtivacao(true);
    try {
      const numOrNull = (s: string) => {
        if (!s.trim()) return null;
        const n = Number(s.replace(",", "."));
        return Number.isFinite(n) ? n : null;
      };
      const { data, error } = await supabase.functions.invoke("activate-cliente", {
        body: {
          cliente_id: ativarCliente.id,
          plano: ativacaoForm.plano,
          valor_mensalidade: Number(ativacaoForm.valor_mensalidade.replace(",", ".")),
          dia_vencimento: Number(ativacaoForm.dia_vencimento),
          forma_pagamento: ativacaoForm.forma_pagamento,
          data_inicio_projeto: ativacaoForm.data_inicio_projeto,
          duracao_meses: Number(ativacaoForm.duracao_meses),
          meta_faturamento: numOrNull(ativacaoForm.meta_faturamento),
          cpf_cnpj: ativacaoForm.cpf_cnpj.trim() || null,
          endereco: ativacaoForm.endereco.trim() || null,
        },
      });
      const errMsg = error?.message ?? (data as { error?: string } | null)?.error;
      if (errMsg) throw new Error(errMsg);

      const res = data as { ok: boolean; email: string; senha_provisoria: string | null; auth_criado: boolean };
      if (res.auth_criado && res.senha_provisoria) {
        setCredenciaisAtivacao({ email: res.email, senha: res.senha_provisoria });
        toast.success("Cliente ativado. Acesso criado, compartilhe as credenciais.");
      } else {
        toast.success("Cliente ativado. Acesso já existia previamente.");
        setAtivarCliente(null);
      }
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao ativar cliente";
      toast.error(msg);
      console.error("[Ativar Cliente] erro:", e);
    } finally {
      setSavingAtivacao(false);
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
          onClick={() => { setNovoLeadOpen(true); setNovoLeadForm(NOVO_LEAD_INITIAL); setNovoLeadErros({}); }}
          className="bg-verde-raiz hover:bg-verde-raiz/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
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
                                {l.cliente.status !== "projeto_ativo" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => openAtivacao(l.cliente)}
                                      className="text-verde-raiz focus:text-verde-raiz"
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Ativar como cliente
                                    </DropdownMenuItem>
                                  </>
                                )}
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

      {/* ===== Modal: Novo Lead (cadastro mínimo) ===== */}
      <Dialog
        open={novoLeadOpen}
        onOpenChange={(o) => {
          if (!o) { setNovoLeadOpen(false); setNovoLeadForm(NOVO_LEAD_INITIAL); setNovoLeadErros({}); }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-xl flex-col">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
            <DialogDescription>
              Cadastre o lead para iniciar o Diagnóstico 360. Dados comerciais (plano, valor, vencimento) só são exigidos na ativação como cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-5 py-2">
              {/* Identificação */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Identificação
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome do responsável <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="ex.: Dra. Ana Lima"
                      value={novoLeadForm.nome_cliente}
                      onChange={(e) => setNovoLeadForm((f) => ({ ...f, nome_cliente: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome da clínica</Label>
                    <Input
                      placeholder="ex.: Clínica OdontoVida"
                      value={novoLeadForm.nome_clinica}
                      onChange={(e) => setNovoLeadForm((f) => ({ ...f, nome_clinica: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Cidade</Label>
                    <Input
                      placeholder="ex.: São Paulo - SP"
                      value={novoLeadForm.cidade}
                      onChange={(e) => setNovoLeadForm((f) => ({ ...f, cidade: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Contato
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Telefone <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={novoLeadForm.telefone}
                      aria-invalid={!!novoLeadErros.telefone}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNovoLeadForm((f) => ({ ...f, telefone: v }));
                        if (novoLeadErros.telefone) setNovoLeadErros((er) => ({ ...er, telefone: undefined }));
                      }}
                    />
                    {novoLeadErros.telefone && (
                      <p className="text-xs text-destructive">{novoLeadErros.telefone}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail <span className="text-destructive">*</span></Label>
                    <Input
                      type="email"
                      placeholder="dra.ana@clinica.com"
                      value={novoLeadForm.email_cliente}
                      aria-invalid={!!novoLeadErros.email_cliente}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNovoLeadForm((f) => ({ ...f, email_cliente: v }));
                        if (novoLeadErros.email_cliente) setNovoLeadErros((er) => ({ ...er, email_cliente: undefined }));
                      }}
                    />
                    {novoLeadErros.email_cliente && (
                      <p className="text-xs text-destructive">{novoLeadErros.email_cliente}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Instagram</Label>
                    <Input
                      placeholder="@usuario"
                      value={novoLeadForm.instagram}
                      onChange={(e) => setNovoLeadForm((f) => ({ ...f, instagram: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Categoria clínica */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Categoria clínica
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Ramo <span className="text-destructive">*</span></Label>
                    <Select
                      value={novoLeadForm.ramo}
                      onValueChange={(v) => {
                        const novoRamo = v as Ramo;
                        setNovoLeadForm((f) => ({
                          ...f,
                          ramo: novoRamo,
                          especialidade_clinica:
                            f.especialidade_clinica &&
                            especialidades.find((e) => e.nome === f.especialidade_clinica)?.ramo === novoRamo
                              ? f.especialidade_clinica
                              : "",
                        }));
                        if (novoLeadErros.ramo) setNovoLeadErros((er) => ({ ...er, ramo: undefined }));
                      }}
                    >
                      <SelectTrigger aria-invalid={!!novoLeadErros.ramo}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RAMOS_VALIDOS.map((r) => (
                          <SelectItem key={r} value={r}>{RAMO_LABEL_LIB[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {novoLeadErros.ramo && (
                      <p className="text-xs text-destructive">{novoLeadErros.ramo}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Especialidade clínica</Label>
                    <Select
                      value={novoLeadForm.especialidade_clinica}
                      onValueChange={(v) => setNovoLeadForm((f) => ({ ...f, especialidade_clinica: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a especialidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {(especialidadesPorRamo[novoLeadForm.ramo] ?? []).map((e) => (
                          <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Relacionamento */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Relacionamento
                </p>
                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea
                    rows={3}
                    placeholder="Origem do lead, dores conhecidas, pontos de atenção, contexto relevante…"
                    value={novoLeadForm.observacoes_relacionamento}
                    onChange={(e) => setNovoLeadForm((f) => ({ ...f, observacoes_relacionamento: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => { setNovoLeadOpen(false); setNovoLeadForm(NOVO_LEAD_INITIAL); setNovoLeadErros({}); }}
              disabled={savingNovoLead}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCriarLead}
              disabled={savingNovoLead || !novoLeadForm.nome_cliente.trim()}
              className="bg-verde-raiz hover:bg-verde-raiz/90"
            >
              {savingNovoLead ? "Cadastrando…" : "Cadastrar lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Modal: Ativar como cliente (lead → projeto_ativo) ===== */}
      <Dialog
        open={!!ativarCliente}
        onOpenChange={(o) => {
          if (!o) {
            setAtivarCliente(null);
            setAtivacaoForm(ATIVACAO_INITIAL);
            setAtivacaoErros({});
            setCredenciaisAtivacao(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-xl flex-col">
          <DialogHeader>
            <DialogTitle>Ativar como cliente</DialogTitle>
            <DialogDescription>
              {ativarCliente?.nome_clinica || ativarCliente?.nome_cliente}. Define os dados comerciais
              e cria o acesso do cliente à plataforma.
            </DialogDescription>
          </DialogHeader>

          {credenciaisAtivacao ? (
            <div className="space-y-4 py-2">
              <div className="rounded-md border border-verde-raiz/30 bg-verde-raiz/5 p-4">
                <p className="text-sm font-semibold text-verde-raiz">Cliente ativado com sucesso.</p>
                <p className="mt-2 text-xs text-quase-preto/70">Compartilhe estas credenciais com o cliente. No primeiro login, ele será forçado a trocar a senha.</p>
                <div className="mt-3 space-y-1 font-mono text-sm">
                  <div><span className="text-quase-preto/60">Email:</span> {credenciaisAtivacao.email}</div>
                  <div><span className="text-quase-preto/60">Senha:</span> {credenciaisAtivacao.senha}</div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setAtivarCliente(null);
                    setCredenciaisAtivacao(null);
                  }}
                  className="bg-verde-raiz hover:bg-verde-raiz/90"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="space-y-5 py-2">
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                      Dados comerciais
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Plano <span className="text-destructive">*</span></Label>
                        <Select
                          value={ativacaoForm.plano}
                          onValueChange={(v) => {
                            setAtivacaoForm((f) => ({ ...f, plano: v }));
                            if (ativacaoErros.plano) setAtivacaoErros((er) => ({ ...er, plano: undefined }));
                          }}
                        >
                          <SelectTrigger aria-invalid={!!ativacaoErros.plano}>
                            <SelectValue placeholder="Selecione o plano" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLANO_OPCOES.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {ativacaoErros.plano && <p className="text-xs text-destructive">{ativacaoErros.plano}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Valor mensalidade (R$) <span className="text-destructive">*</span></Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="3500"
                          value={ativacaoForm.valor_mensalidade}
                          aria-invalid={!!ativacaoErros.valor_mensalidade}
                          onChange={(e) => {
                            setAtivacaoForm((f) => ({ ...f, valor_mensalidade: e.target.value }));
                            if (ativacaoErros.valor_mensalidade) setAtivacaoErros((er) => ({ ...er, valor_mensalidade: undefined }));
                          }}
                        />
                        {ativacaoErros.valor_mensalidade && <p className="text-xs text-destructive">{ativacaoErros.valor_mensalidade}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Forma de pagamento <span className="text-destructive">*</span></Label>
                        <Select
                          value={ativacaoForm.forma_pagamento}
                          onValueChange={(v) => {
                            setAtivacaoForm((f) => ({ ...f, forma_pagamento: v }));
                            if (ativacaoErros.forma_pagamento) setAtivacaoErros((er) => ({ ...er, forma_pagamento: undefined }));
                          }}
                        >
                          <SelectTrigger aria-invalid={!!ativacaoErros.forma_pagamento}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {FORMA_PAGAMENTO_OPCOES.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {ativacaoErros.forma_pagamento && <p className="text-xs text-destructive">{ativacaoErros.forma_pagamento}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Dia vencimento (1 a 31) <span className="text-destructive">*</span></Label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          placeholder="10"
                          value={ativacaoForm.dia_vencimento}
                          aria-invalid={!!ativacaoErros.dia_vencimento}
                          onChange={(e) => {
                            setAtivacaoForm((f) => ({ ...f, dia_vencimento: e.target.value }));
                            if (ativacaoErros.dia_vencimento) setAtivacaoErros((er) => ({ ...er, dia_vencimento: undefined }));
                          }}
                        />
                        {ativacaoErros.dia_vencimento && <p className="text-xs text-destructive">{ativacaoErros.dia_vencimento}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Data início do projeto <span className="text-destructive">*</span></Label>
                        <Input
                          type="date"
                          value={ativacaoForm.data_inicio_projeto}
                          aria-invalid={!!ativacaoErros.data_inicio_projeto}
                          onChange={(e) => {
                            setAtivacaoForm((f) => ({ ...f, data_inicio_projeto: e.target.value }));
                            if (ativacaoErros.data_inicio_projeto) setAtivacaoErros((er) => ({ ...er, data_inicio_projeto: undefined }));
                          }}
                        />
                        {ativacaoErros.data_inicio_projeto && <p className="text-xs text-destructive">{ativacaoErros.data_inicio_projeto}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Duração (meses) <span className="text-destructive">*</span></Label>
                        <Input
                          type="number"
                          min={1}
                          value={ativacaoForm.duracao_meses}
                          aria-invalid={!!ativacaoErros.duracao_meses}
                          onChange={(e) => {
                            setAtivacaoForm((f) => ({ ...f, duracao_meses: e.target.value }));
                            if (ativacaoErros.duracao_meses) setAtivacaoErros((er) => ({ ...er, duracao_meses: undefined }));
                          }}
                        />
                        {ativacaoErros.duracao_meses && <p className="text-xs text-destructive">{ativacaoErros.duracao_meses}</p>}
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Meta de faturamento (R$/mês)</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="100000"
                          value={ativacaoForm.meta_faturamento}
                          onChange={(e) => setAtivacaoForm((f) => ({ ...f, meta_faturamento: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                      Dados fiscais (opcional)
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>CPF / CNPJ</Label>
                        <Input
                          placeholder="000.000.000-00"
                          value={ativacaoForm.cpf_cnpj}
                          onChange={(e) => setAtivacaoForm((f) => ({ ...f, cpf_cnpj: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Endereço</Label>
                        <Input
                          placeholder="Rua, número, bairro"
                          value={ativacaoForm.endereco}
                          onChange={(e) => setAtivacaoForm((f) => ({ ...f, endereco: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setAtivarCliente(null)}
                  disabled={savingAtivacao}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAtivarCliente}
                  disabled={savingAtivacao}
                  className="bg-verde-raiz hover:bg-verde-raiz/90"
                >
                  {savingAtivacao ? "Ativando…" : "Ativar cliente"}
                </Button>
              </DialogFooter>
            </>
          )}
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
