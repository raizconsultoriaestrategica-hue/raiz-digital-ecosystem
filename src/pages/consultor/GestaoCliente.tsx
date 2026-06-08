import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ReunioesTab from "@/components/consultor/ReunioesTab";
import ArquivosTab from "@/components/consultor/ArquivosTab";
import ModulosTab from "@/components/consultor/ModulosTab";
import {
  validarCadastroClienteEdicao,
  temErros,
  RAMOS_VALIDOS,
  RAMO_LABEL as RAMO_LABEL_LIB,
  type ErrosCadastro,
  type Ramo,
} from "@/lib/validacoes-cadastro";

// ============================================================
// Tipos
// ============================================================
interface Cliente {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  especialidade: string | null;
  ramo: string | null;
  plano: string | null;
  status: string | null;
  meta_faturamento: number | null;
  faturamento_atual: number | null;
  origem: string | null;
  consultor: string | null;
  pilares_foco: string | null;
  // M1
  telefone: string | null;
  email_cliente: string | null;
  cpf_cnpj: string | null;
  endereco: string | null;
  data_nascimento: string | null;
  instagram: string | null;
  observacoes_relacionamento: string | null;
  dia_vencimento: number | null;
  forma_pagamento: string | null;
  especialidade_clinica: string | null;
}

interface DashboardRow {
  tipo: string;
  campo: string;
  valor: string | null;
  benchmark: string | null;
  mes: string | null;
}

interface AnaliseMensal {
  mes: string;
  texto: string;
  created_at?: string | null;
}

// ============================================================
// Catálogo de KPIs editáveis (mesmas chaves do diagnóstico)
// ============================================================
const KPI_FIELDS = [
  { key: "faturamento_bruto", label: "Faturamento Bruto", unidade: "R$", benchmark: "" },
  { key: "margem_liquida", label: "Margem Líquida", unidade: "%", benchmark: "20" },
  { key: "taxa_conversao", label: "Taxa de Conversão", unidade: "%", benchmark: "55" },
  { key: "ticket_medio_rs", label: "Ticket Médio", unidade: "R$", benchmark: "2000" },
  { key: "taxa_no_show", label: "Taxa de No-Show", unidade: "%", benchmark: "10" },
  { key: "ocupacao_cadeiras", label: "Ocupação de Cadeiras", unidade: "%", benchmark: "75" },
] as const;

const STATUS_OPCOES = [
  { value: "lead", label: "Lead" },
  { value: "diagnostico_feito", label: "Diagnóstico feito" },
  { value: "proposta_enviada", label: "Proposta enviada" },
  { value: "projeto_ativo", label: "Cliente ativo" },
  { value: "encerrado", label: "Inativo" },
];

const PLANO_OPCOES = [
  { value: "Raiz de Base", label: "Raiz de Base" },
  { value: "Raiz de Crescimento", label: "Raiz de Crescimento" },
  { value: "Raiz de Expansão", label: "Raiz de Expansão" },
] as const;

const FORMA_PAGAMENTO_OPCOES = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
] as const;

const ORIGEM_OPCOES = [
  { value: "site", label: "Site" },
  { value: "landing_diagnostico", label: "Landing do diagnóstico" },
  { value: "indicacao", label: "Indicação" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "outro", label: "Outro" },
] as const;

// Gera lista de meses (MM/YYYY). 12 últimos + 6 futuros
function gerarMeses(): string[] {
  const out: string[] = [];
  const hoje = new Date();
  for (let i = 11; i >= -6; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    out.push(`${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`);
  }
  return out.reverse(); // mais recente primeiro
}

function mesAnteriorOf(mes: string): string {
  const [mm, yyyy] = mes.split("/").map(Number);
  if (!mm || !yyyy) return "";
  const d = new Date(yyyy, mm - 2, 1);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// ============================================================
export default function GestaoCliente() {
  const { id: clienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<Cliente | null>(null);

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
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [analises, setAnalises] = useState<AnaliseMensal[]>([]);
  const meses = useMemo(() => gerarMeses(), []);
  // Mês corrente no formato MM/YYYY, independente da ordem do array de dropdown
  const mesDefault = useMemo(() => {
    const hoje = new Date();
    return `${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  }, []);

  // Aba 1
  const [mesRef, setMesRef] = useState<string>(mesDefault);
  const [kpiValues, setKpiValues] = useState<Record<string, string>>({});
  const [relatorio, setRelatorio] = useState("");
  const [salvandoMensal, setSalvandoMensal] = useState(false);

  // Aba 2
  const [cadastroForm, setCadastroForm] = useState<{
    nome_cliente: string;
    nome_clinica: string;
    cidade: string;
    especialidade: string;
    plano: string;
    status: string;
    meta_faturamento: string;
    faturamento_atual: string;
    origem: string;
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
    ramo: Ramo;
    especialidade_clinica: string;
  }>({
    nome_cliente: "",
    nome_clinica: "",
    cidade: "",
    especialidade: "",
    plano: "",
    status: "lead",
    meta_faturamento: "",
    faturamento_atual: "",
    origem: "",
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
    ramo: "odontologia",
    especialidade_clinica: "",
  });
  const [salvandoCadastro, setSalvandoCadastro] = useState(false);
  const [cadastroErros, setCadastroErros] = useState<ErrosCadastro>({});

  // Aba 3
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  // ----- Carga inicial -----
  const recarregar = async () => {
    if (!clienteId) return;
    setLoading(true);
    try {
      const [{ data: cli, error: errCli }, { data: dash, error: errDash }] = await Promise.all([
        supabase
          .from("clientes")
          .select(
            "id, nome_cliente, nome_clinica, cidade, especialidade, ramo, plano, status, meta_faturamento, faturamento_atual, origem, consultor, pilares_foco, telefone, email_cliente, cpf_cnpj, endereco, data_nascimento, instagram, observacoes_relacionamento, dia_vencimento, forma_pagamento, especialidade_clinica",
          )
          .eq("id", clienteId)
          .maybeSingle(),
        supabase
          .from("dashboard_data")
          .select("tipo, campo, valor, benchmark, mes")
          .eq("cliente_id", clienteId),
      ]);
      if (errCli) throw errCli;
      if (errDash) throw errDash;
      if (!cli) {
        toast.error("Cliente não encontrado");
        navigate("/dashboard");
        return;
      }
      const c = cli as Cliente;
      setCliente(c);
      setCadastroForm({
        nome_cliente: c.nome_cliente ?? "",
        nome_clinica: c.nome_clinica ?? "",
        cidade: c.cidade ?? "",
        especialidade: c.especialidade ?? "",
        plano: c.plano ?? "",
        status: c.status ?? "lead",
        meta_faturamento: c.meta_faturamento != null ? String(c.meta_faturamento) : "",
        faturamento_atual: c.faturamento_atual != null ? String(c.faturamento_atual) : "",
        origem: c.origem ?? "",
        consultor: c.consultor ?? "",
        telefone: c.telefone ?? "",
        email_cliente: c.email_cliente ?? "",
        cpf_cnpj: c.cpf_cnpj ?? "",
        endereco: c.endereco ?? "",
        data_nascimento: c.data_nascimento ?? "",
        instagram: c.instagram ?? "",
        observacoes_relacionamento: c.observacoes_relacionamento ?? "",
        dia_vencimento: c.dia_vencimento != null ? String(c.dia_vencimento) : "",
        forma_pagamento: c.forma_pagamento ?? "",
        ramo: (RAMOS_VALIDOS as readonly string[]).includes(c.ramo ?? "")
          ? (c.ramo as Ramo)
          : "odontologia",
        especialidade_clinica: c.especialidade_clinica ?? "",
      });

      const dRows = (dash ?? []) as DashboardRow[];
      setRows(dRows);

      const analisesRows = dRows
        .filter((r) => r.tipo === "ANALISE_MENSAL" && r.valor)
        .map((r) => ({ mes: r.mes ?? "—", texto: r.valor as string }))
        .sort((a, b) => mesParaIso(b.mes).localeCompare(mesParaIso(a.mes)));
      setAnalises(analisesRows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao carregar cliente";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  // ----- Pré-preenche os KPIs do mês selecionado quando muda -----
  useEffect(() => {
    const next: Record<string, string> = {};
    KPI_FIELDS.forEach((f) => {
      const r = rows.find((x) => x.tipo === "KPI" && x.campo === f.key && x.mes === mesRef);
      next[f.key] = r?.valor ?? "";
    });
    setKpiValues(next);

    const rel = rows.find((x) => x.tipo === "RELATORIO_MENSAL" && x.mes === mesRef);
    setRelatorio(rel?.valor ?? "");
  }, [mesRef, rows]);

  // ----- Helpers para Aba 1 -----
  const mesAnt = useMemo(() => mesAnteriorOf(mesRef), [mesRef]);
  const valorMesAnterior = (key: string): string => {
    const r = rows.find((x) => x.tipo === "KPI" && x.campo === key && x.mes === mesAnt);
    return r?.valor ?? "—";
  };

  const handleSalvarMensal = async () => {
    if (!clienteId || !cliente) return;
    setSalvandoMensal(true);
    try {
      // 1) Apaga KPIs/RELATORIO anteriores deste mês para evitar duplicação
      await supabase
        .from("dashboard_data")
        .delete()
        .eq("cliente_id", clienteId)
        .eq("mes", mesRef)
        .in("tipo", ["KPI", "RELATORIO_MENSAL"]);

      // 2) Insere KPIs do mês + relatório
      type DashRow = {
        cliente_id: string;
        tipo: string;
        mes: string | null;
        campo: string;
        valor: string;
        benchmark: string | null;
      };
      const novasRows: DashRow[] = [];

      KPI_FIELDS.forEach((f) => {
        const v = kpiValues[f.key];
        if (v && String(v).trim() !== "") {
          novasRows.push({
            cliente_id: clienteId,
            tipo: "KPI",
            mes: mesRef,
            campo: f.key,
            valor: String(v).trim(),
            benchmark: f.benchmark || null,
          });
        }
      });

      if (relatorio.trim()) {
        novasRows.push({
          cliente_id: clienteId,
          tipo: "RELATORIO_MENSAL",
          mes: mesRef,
          campo: "relatorio_consultor",
          valor: relatorio.trim(),
          benchmark: null,
        });
      }

      if (novasRows.length > 0) {
        const { error: insErr } = await supabase
          .from("dashboard_data")
          .insert(novasRows);
        if (insErr) throw insErr;
      }

      // 3) Atualiza CONFIG.mes_referencia para refletir no dashboard do cliente
      await supabase
        .from("dashboard_data")
        .delete()
        .eq("cliente_id", clienteId)
        .eq("tipo", "CONFIG")
        .eq("campo", "mes_referencia");
      await supabase
        .from("dashboard_data")
        .insert([{
          cliente_id: clienteId,
          tipo: "CONFIG",
          mes: null,
          campo: "mes_referencia",
          valor: mesRef,
          benchmark: null,
        }]);

      // 4) Chama edge function diagnostico-analise no modo "mensal"
      const kpisAtuais = KPI_FIELDS.map((f) => ({
        label: f.label,
        valor: kpiValues[f.key] || null,
        benchmark: f.benchmark || null,
        unidade: f.unidade,
      }));
      const kpisAnteriores = KPI_FIELDS.map((f) => ({
        label: f.label,
        valor: valorMesAnterior(f.key) === "—" ? null : valorMesAnterior(f.key),
        benchmark: f.benchmark || null,
        unidade: f.unidade,
      }));

      // Resumo do diagnóstico inicial (pilares e foco)
      const pilarRows = rows.filter((x) => x.tipo === "PILAR" && (x.mes ?? "").toLowerCase() === "inicial");
      const diagnosticoResumo = pilarRows.length > 0
        ? `Pilares iniciais: ${pilarRows.map((p) => `${p.campo}=${p.valor}/${p.benchmark}`).join(", ")}.${cliente.pilares_foco ? ` Foco: ${cliente.pilares_foco}.` : ""}`
        : (cliente.pilares_foco ? `Pilares foco: ${cliente.pilares_foco}` : "");

      let analiseTxt = "";
      try {
        const { data: anaRes, error: anaErr } = await supabase.functions.invoke(
          "diagnostico-analise",
          {
            body: {
              mode: "mensal",
              clientName: cliente.nome_cliente,
              ramo: cliente.ramo === "medico" ? "medico" : "dentista",
              mesReferencia: mesRef,
              mesAnterior: mesAnt,
              kpisAtuais,
              kpisAnteriores,
              relatorioConsultor: relatorio,
              diagnosticoResumo,
              metaConsultoria: cliente.meta_faturamento
                ? `R$ ${cliente.meta_faturamento.toLocaleString("pt-BR")} / mês`
                : "não informada",
            },
          },
        );
        if (anaErr) throw anaErr;
        analiseTxt = (anaRes as { analise?: string; error?: string })?.analise || "";
        const errMsg = (anaRes as { error?: string })?.error;
        if (!analiseTxt && errMsg) throw new Error(errMsg);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha ao gerar análise";
        toast.warning("KPIs salvos, mas a análise falhou: " + msg);
      }

      // 5) Salva análise no dashboard_data
      if (analiseTxt) {
        await supabase
          .from("dashboard_data")
          .delete()
          .eq("cliente_id", clienteId)
          .eq("tipo", "ANALISE_MENSAL")
          .eq("mes", mesRef);
        const { error: anaInsErr } = await supabase
          .from("dashboard_data")
          .insert([{
            cliente_id: clienteId,
            tipo: "ANALISE_MENSAL",
            mes: mesRef,
            campo: "analise_mensal",
            valor: analiseTxt,
            benchmark: null,
          }]);
        if (anaInsErr) throw anaInsErr;

        // Também atualiza a INSIGHT/analise_estrategica do mês corrente
        // para que o dashboard do cliente exiba a análise mais recente.
        await supabase
          .from("dashboard_data")
          .delete()
          .eq("cliente_id", clienteId)
          .eq("tipo", "INSIGHT")
          .eq("campo", "analise_estrategica")
          .eq("mes", mesRef);
        await supabase
          .from("dashboard_data")
          .insert([{
            cliente_id: clienteId,
            tipo: "INSIGHT",
            mes: mesRef,
            campo: "analise_estrategica",
            valor: analiseTxt,
            benchmark: null,
          }]);
      }

      toast.success("Mês salvo e análise gerada.");
      await recarregar();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao salvar mês";
      toast.error(msg);
    } finally {
      setSalvandoMensal(false);
    }
  };

  // ----- Aba 2: Salvar cadastro -----
  const handleSalvarCadastro = async () => {
    if (!clienteId) return;
    const erros = validarCadastroClienteEdicao({
      email_cliente: cadastroForm.email_cliente,
      telefone: cadastroForm.telefone,
      dia_vencimento: cadastroForm.dia_vencimento,
      ramo: cadastroForm.ramo,
    });
    setCadastroErros(erros);
    if (temErros(erros)) {
      toast.error("Corrija os campos destacados antes de salvar.");
      return;
    }
    setSalvandoCadastro(true);
    try {
      const toNum = (s: string) => {
        const n = Number(s.replace(",", "."));
        return s.trim() !== "" && Number.isFinite(n) ? n : null;
      };
      const { error } = await supabase
        .from("clientes")
        .update({
          nome_cliente: cadastroForm.nome_cliente.trim() || cliente?.nome_cliente,
          nome_clinica: cadastroForm.nome_clinica.trim() || null,
          cidade: cadastroForm.cidade.trim() || null,
          especialidade: cadastroForm.especialidade.trim() || null,
          ramo: cadastroForm.ramo,
          plano: cadastroForm.plano || null,
          // status NÃO é gravado aqui: transições são ações controladas na carteira
          // (Ativar como cliente / Encerrar / Reabrir).
          meta_faturamento: toNum(cadastroForm.meta_faturamento),
          faturamento_atual: toNum(cadastroForm.faturamento_atual),
          origem: cadastroForm.origem || null,
          consultor: cadastroForm.consultor.trim() || null,
          telefone: cadastroForm.telefone.trim() || null,
          email_cliente: cadastroForm.email_cliente.trim() || null,
          cpf_cnpj: cadastroForm.cpf_cnpj.trim() || null,
          endereco: cadastroForm.endereco.trim() || null,
          data_nascimento: cadastroForm.data_nascimento || null,
          instagram: cadastroForm.instagram.trim() || null,
          observacoes_relacionamento: cadastroForm.observacoes_relacionamento.trim() || null,
          dia_vencimento: toNum(cadastroForm.dia_vencimento),
          forma_pagamento: cadastroForm.forma_pagamento || null,
          especialidade_clinica: cadastroForm.especialidade_clinica.trim() || null,
        })
        .eq("id", clienteId);
      if (error) throw error;
      toast.success("Cadastro atualizado.");
      await recarregar();
    } catch (e) {
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      const partes = [
        err?.message ?? "Falha ao salvar cadastro",
        err?.code ? `(${err.code})` : null,
        err?.details ?? null,
        err?.hint ?? null,
      ].filter(Boolean);
      toast.error(partes.join(" · "));
      console.error("[Salvar Cadastro] Erro do Supabase:", err);
    } finally {
      setSalvandoCadastro(false);
    }
  };

  if (loading || !cliente) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 text-quase-preto/60">
            <Link to="/dashboard"><ArrowLeft className="mr-1 h-4 w-4" /> Gestão de Clientes</Link>
          </Button>
          <h1 className="font-display text-3xl text-verde-raiz md:text-4xl">
            {cliente.nome_cliente}
          </h1>
          <p className="mt-1 text-sm text-quase-preto/60">
            {cliente.nome_clinica ?? "Clínica não informada"}
            {cliente.cidade ? ` · ${cliente.cidade}` : ""}
            {(cliente.especialidade_clinica || cliente.especialidade) ? ` · ${cliente.especialidade_clinica || cliente.especialidade}` : ""}
          </p>
        </div>
        <Badge className="bg-verde-raiz/10 text-verde-raiz">
          {STATUS_OPCOES.find((s) => s.value === (cliente.status ?? "lead"))?.label ?? "Lead"}
        </Badge>
      </div>

      <Tabs defaultValue="mensal" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="mensal">Atualização Mensal</TabsTrigger>
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="reunioes">Reuniões</TabsTrigger>
          <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
          <TabsTrigger value="historico">
            Histórico {analises.length > 0 ? `(${analises.length})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* ============ ABA 1 ============ */}
        <TabsContent value="mensal" className="mt-6 space-y-5">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-quase-preto/60">
                    Mês de referência
                  </Label>
                  <Select value={mesRef} onValueChange={setMesRef}>
                    <SelectTrigger className="mt-1 w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-quase-preto/55">
                  Comparando com mês anterior: <strong>{mesAnt || "—"}</strong>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  KPIs do mês
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {KPI_FIELDS.map((f) => (
                    <div
                      key={f.key}
                      className="rounded-lg border border-border/60 bg-card p-3 shadow-soft"
                    >
                      <Label className="text-xs font-semibold text-quase-preto/70">
                        {f.label}
                        <span className="ml-1 text-quase-preto/40">({f.unidade || "—"})</span>
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="mt-1.5"
                        placeholder="0"
                        value={kpiValues[f.key] ?? ""}
                        onChange={(e) =>
                          setKpiValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                      />
                      <div className="mt-1.5 text-[11px] text-quase-preto/50">
                        Mês anterior: <span className="font-medium text-quase-preto/70">
                          {valorMesAnterior(f.key)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Relatório do consultor
                </Label>
                <Textarea
                  value={relatorio}
                  onChange={(e) => setRelatorio(e.target.value)}
                  rows={6}
                  className="mt-2"
                  placeholder="Descreva o que aconteceu esse mês: o que foi implantado, resultados obtidos, pontos de atenção, próximos passos..."
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSalvarMensal}
                  disabled={salvandoMensal}
                  className="bg-verde-raiz hover:bg-verde-raiz/90"
                >
                  {salvandoMensal ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                      Salvando e gerando análise…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Salvar e Gerar Análise
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ ABA 2 ============ */}
        <TabsContent value="cadastro" className="mt-6">
          <Card>
            <CardContent className="space-y-6 p-5">
              {/* Identificação */}
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Identificação
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nome do responsável</Label>
                    <Input
                      value={cadastroForm.nome_cliente}
                      onChange={(e) => setCadastroForm((f) => ({ ...f, nome_cliente: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Nome da clínica</Label>
                    <Input
                      value={cadastroForm.nome_clinica}
                      onChange={(e) => setCadastroForm((f) => ({ ...f, nome_clinica: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={cadastroForm.cidade}
                      onChange={(e) => setCadastroForm((f) => ({ ...f, cidade: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>CPF / CNPJ</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={cadastroForm.cpf_cnpj}
                      onChange={(e) => setCadastroForm((f) => ({ ...f, cpf_cnpj: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Data de nascimento</Label>
                    <Input
                      type="date"
                      value={cadastroForm.data_nascimento}
                      onChange={(e) => setCadastroForm((f) => ({ ...f, data_nascimento: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Contato
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={cadastroForm.telefone}
                      aria-invalid={!!cadastroErros.telefone}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCadastroForm((f) => ({ ...f, telefone: v }));
                        if (cadastroErros.telefone) setCadastroErros((er) => ({ ...er, telefone: undefined }));
                      }}
                    />
                    {cadastroErros.telefone && (
                      <p className="mt-1 text-xs text-destructive">{cadastroErros.telefone}</p>
                    )}
                  </div>
                  <div>
                    <Label>
                      E-mail <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={cadastroForm.email_cliente}
                      aria-invalid={!!cadastroErros.email_cliente}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCadastroForm((f) => ({ ...f, email_cliente: v }));
                        if (cadastroErros.email_cliente) setCadastroErros((er) => ({ ...er, email_cliente: undefined }));
                      }}
                    />
                    {cadastroErros.email_cliente ? (
                      <p className="mt-1 text-xs text-destructive">{cadastroErros.email_cliente}</p>
                    ) : (
                      <p className="mt-1 text-xs text-quase-preto/50">
                        Obrigatório. Sem email, as automações Resend não disparam.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Instagram</Label>
                    <Input
                      placeholder="@usuario"
                      value={cadastroForm.instagram}
                      onChange={(e) => setCadastroForm((f) => ({ ...f, instagram: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Endereço</Label>
                    <Input
                      value={cadastroForm.endereco}
                      onChange={(e) => setCadastroForm((f) => ({ ...f, endereco: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Contrato */}
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Contrato
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Plano</Label>
                    <Select
                      value={cadastroForm.plano}
                      onValueChange={(v) => setCadastroForm((f) => ({ ...f, plano: v }))}
                    >
                      <SelectTrigger className="mt-0.5">
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANO_OPCOES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <p className="mt-1 text-sm text-quase-preto">
                      {STATUS_OPCOES.find((s) => s.value === cadastroForm.status)?.label ?? "Lead"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Muda pelas ações da carteira (Ativar como cliente, Encerrar, Reabrir).
                    </p>
                  </div>
                  <div>
                    <Label>Faturamento atual (R$/mês)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={cadastroForm.faturamento_atual}
                      onChange={(e) => setCadastroForm((f) => ({ ...f, faturamento_atual: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Meta de faturamento (R$/mês)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={cadastroForm.meta_faturamento}
                      onChange={(e) => setCadastroForm((f) => ({ ...f, meta_faturamento: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Origem do lead</Label>
                    <Select
                      value={cadastroForm.origem}
                      onValueChange={(v) => setCadastroForm((f) => ({ ...f, origem: v }))}
                    >
                      <SelectTrigger className="mt-0.5">
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIGEM_OPCOES.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Consultor responsável</Label>
                    <Input
                      value={cadastroForm.consultor}
                      onChange={(e) => setCadastroForm((f) => ({ ...f, consultor: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Dia de vencimento (1 a 31)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      placeholder="10"
                      value={cadastroForm.dia_vencimento}
                      aria-invalid={!!cadastroErros.dia_vencimento}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCadastroForm((f) => ({ ...f, dia_vencimento: v }));
                        if (cadastroErros.dia_vencimento) setCadastroErros((er) => ({ ...er, dia_vencimento: undefined }));
                      }}
                    />
                    {cadastroErros.dia_vencimento && (
                      <p className="mt-1 text-xs text-destructive">{cadastroErros.dia_vencimento}</p>
                    )}
                  </div>
                  <div>
                    <Label>Forma de pagamento</Label>
                    <Select
                      value={cadastroForm.forma_pagamento}
                      onValueChange={(v) => setCadastroForm((f) => ({ ...f, forma_pagamento: v }))}
                    >
                      <SelectTrigger className="mt-0.5">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMA_PAGAMENTO_OPCOES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>
                      Ramo <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={cadastroForm.ramo}
                      onValueChange={(v) => {
                        const novoRamo = v as Ramo;
                        setCadastroForm((f) => ({
                          ...f,
                          ramo: novoRamo,
                          especialidade_clinica:
                            f.especialidade_clinica &&
                            especialidades.find((e) => e.nome === f.especialidade_clinica)?.ramo === novoRamo
                              ? f.especialidade_clinica
                              : "",
                        }));
                        if (cadastroErros.ramo) setCadastroErros((er) => ({ ...er, ramo: undefined }));
                      }}
                    >
                      <SelectTrigger className="mt-0.5" aria-invalid={!!cadastroErros.ramo}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RAMOS_VALIDOS.map((r) => (
                          <SelectItem key={r} value={r}>{RAMO_LABEL_LIB[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {cadastroErros.ramo && (
                      <p className="mt-1 text-xs text-destructive">{cadastroErros.ramo}</p>
                    )}
                  </div>
                  <div>
                    <Label>Especialidade clínica</Label>
                    <Select
                      value={cadastroForm.especialidade_clinica}
                      onValueChange={(v) => setCadastroForm((f) => ({ ...f, especialidade_clinica: v }))}
                    >
                      <SelectTrigger className="mt-0.5">
                        <SelectValue placeholder="Selecione a especialidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {(especialidadesPorRamo[cadastroForm.ramo] ?? []).map((e) => (
                          <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Relacionamento */}
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
                  Relacionamento
                </h3>
                <div>
                  <Label>Observações de relacionamento</Label>
                  <Textarea
                    rows={4}
                    placeholder="Preferências, pontos de atenção, contexto relevante…"
                    value={cadastroForm.observacoes_relacionamento}
                    onChange={(e) => setCadastroForm((f) => ({ ...f, observacoes_relacionamento: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSalvarCadastro}
                  disabled={salvandoCadastro}
                  className="bg-verde-raiz hover:bg-verde-raiz/90"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {salvandoCadastro ? "Salvando…" : "Salvar alterações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ ABA Módulos ============ */}
        <TabsContent value="modulos" className="mt-6">
          <ModulosTab clienteId={clienteId!} />
        </TabsContent>

        {/* ============ ABA Reuniões ============ */}
        <TabsContent value="reunioes" className="mt-6">
          <ReunioesTab clienteId={clienteId!} />
        </TabsContent>

        {/* ============ ABA Arquivos ============ */}
        <TabsContent value="arquivos" className="mt-6">
          <ArquivosTab clienteId={clienteId!} />
        </TabsContent>

        {/* ============ ABA Histórico ============ */}
        <TabsContent value="historico" className="mt-6 space-y-3">
          {analises.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-quase-preto/60">
                Nenhuma análise mensal salva ainda.
              </CardContent>
            </Card>
          ) : (
            analises.map((a) => {
              const isOpen = !!expandido[a.mes];
              const previa = a.texto.split("\n").filter(Boolean).slice(0, 2).join("\n");
              return (
                <Card key={a.mes}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-dourado">
                          Mês de referência
                        </div>
                        <div className="font-display text-xl text-verde-raiz">{a.mes}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandido((p) => ({ ...p, [a.mes]: !isOpen }))}
                      >
                        {isOpen ? (
                          <><ChevronUp className="mr-1 h-4 w-4" /> Recolher</>
                        ) : (
                          <><ChevronDown className="mr-1 h-4 w-4" /> Ver completo</>
                        )}
                      </Button>
                    </div>
                    <div className="mt-3 prose prose-sm max-w-none text-quase-preto/85">
                      <ReactMarkdown>{isOpen ? a.texto : previa + (a.texto.length > previa.length ? "…" : "")}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// "MM/YYYY" → "YYYY-MM" para ordenação correta
function mesParaIso(mes: string): string {
  const [mm, yyyy] = mes.split("/");
  if (!mm || !yyyy) return "0000-00";
  return `${yyyy}-${mm}`;
}
