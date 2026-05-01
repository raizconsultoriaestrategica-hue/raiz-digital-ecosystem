import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Activity, FileText, Wallet, Calculator, ListChecks,
  CalendarDays, FolderOpen, Download, FileSpreadsheet, FileType2,
  CheckCircle2, ArrowRight, Circle,
} from "lucide-react";

// ---------- helpers ----------
const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isFinite(n) ? n : 0);

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

const parseBRL = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const scoreColor = (pct: number) =>
  pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-red-600";
const scoreRing = (pct: number) =>
  pct >= 70 ? "stroke-emerald-500" : pct >= 40 ? "stroke-amber-500" : "stroke-red-500";

import {
  semMargemLiquida, semNoShow, semInadimplencia, semPontoEquilibrio,
  semOcupacaoAgenda, semCustoMaterial, semProLabore, semCPL,
  semTaxaConversao, semTaxaRetencao, semNPS, semCAC,
  type Semaforo,
} from "@/features/diagnostico-financeiro/semaforos";

type SemStatus = Semaforo | "neutral";

const semaforo = (status: SemStatus) =>
  status === "verde"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "amarelo"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === "vermelho"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-muted text-muted-foreground border-border";

// Aplica semáforo apenas se houver valor; do contrário "neutral".
const sem = <T extends number[]>(fn: (...args: T) => Semaforo, ...args: T): SemStatus => {
  const principal = args[0];
  if (!isFinite(principal as number) || principal === 0) return "neutral";
  return fn(...args);
};

const PILARES_LABELS: Record<string, string> = {
  marketing_digital: "Marketing Digital",
  captacao_trafego: "Captação & Tráfego",
  atendimento_conversao: "Atendimento & Conversão",
  financeiro_precificacao: "Financeiro & Precificação",
  gestao_operacional: "Gestão Operacional",
  relacionamento_retencao: "Relacionamento & Retenção",
  expansao: "Expansão",
};
const PILARES_KEYS = Object.keys(PILARES_LABELS);

// ---------- empty state ----------
function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <Icon className="h-10 w-10 text-verde-raiz/40" />
      <h3 className="mt-4 font-display text-xl text-verde-raiz">{title}</h3>
      {hint && <p className="mt-2 max-w-md text-sm text-quase-preto/60">{hint}</p>}
    </div>
  );
}

// ---------- circle score ----------
function ScoreCircle({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="relative h-32 w-32">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} className="fill-none stroke-muted" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r}
          className={`fill-none ${scoreRing(pct)} transition-all duration-700`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-3xl ${scoreColor(pct)}`}>{Math.round(pct)}</span>
        <span className="text-[10px] uppercase tracking-wider text-quase-preto/60">de 100</span>
      </div>
    </div>
  );
}

// ---------- types ----------
interface Cliente {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  especialidade: string | null;
  cidade: string | null;
  ramo: string | null;
}

export default function PastaDoCliente() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [diagnostico, setDiagnostico] = useState<any | null>(null);
  const [orcamento, setOrcamento] = useState<any | null>(null);
  const [diagFin, setDiagFin] = useState<any | null>(null);
  const [simulacao, setSimulacao] = useState<any | null>(null);
  const [modulosCliente, setModulosCliente] = useState<any[]>([]);
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [arquivos, setArquivos] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) return;
      setLoading(true);

      const { data: cli } = await supabase
        .from("clientes")
        .select("id, nome_cliente, nome_clinica, especialidade, cidade, ramo")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (!cli) { setCliente(null); setLoading(false); return; }
      setCliente(cli as Cliente);

      const cid = (cli as Cliente).id;

      const [
        { data: diagData },
        { data: orcData },
        { data: dfData },
        { data: simData },
        { data: cmData },
      ] = await Promise.all([
        supabase.from("diagnostics").select("*").eq("client_id", cid).order("created_at", { ascending: false }).limit(1),
        supabase.from("orcamentos").select("*").eq("cliente_id", cid).order("created_at", { ascending: false }).limit(1),
        supabase.from("diagnosticos_financeiros").select("*").eq("cliente_id", cid).order("created_at", { ascending: false }).limit(1),
        supabase.from("simulacoes_precificacao").select("*").eq("cliente_id", cid).order("created_at", { ascending: false }).limit(1),
        supabase.from("cliente_modulos").select("*, modulos(nome, ordem, pilar_nome, descricao)").eq("cliente_id", cid),
      ]);

      // Tabelas opcionais — try/catch defensivo
      let reunioesData: any[] = [];
      let arquivosData: any[] = [];
      try {
        const r = await (supabase as any)
          .from("reunioes")
          .select("*")
          .eq("cliente_id", cid)
          .order("data", { ascending: false });
        if (!r.error && Array.isArray(r.data)) reunioesData = r.data;
      } catch { /* tabela inexistente */ }
      try {
        const a = await (supabase as any)
          .from("arquivos_cliente")
          .select("*")
          .eq("cliente_id", cid)
          .order("created_at", { ascending: false });
        if (!a.error && Array.isArray(a.data)) arquivosData = a.data;
      } catch { /* tabela inexistente */ }

      if (!active) return;
      setDiagnostico(diagData?.[0] ?? null);
      setOrcamento(orcData?.[0] ?? null);
      setDiagFin(dfData?.[0] ?? null);
      setSimulacao(simData?.[0] ?? null);
      setModulosCliente((cmData as any[]) ?? []);
      setReunioes(reunioesData);
      setArquivos(arquivosData);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [user]);

  // ---------- Aba 1: Diagnóstico 360 ----------
  const diagPilares = useMemo(() => {
    if (!diagnostico) return [];
    const scores = diagnostico.scores || {};
    return PILARES_KEYS.map((key, i) => {
      // tenta várias chaves possíveis
      const possible = [key, `p0${i + 1}`, `p${i + 1}`];
      let raw: any = null;
      for (const k of possible) if (scores[k] !== undefined) { raw = scores[k]; break; }
      let pct = 0;
      if (Array.isArray(raw)) {
        const arr = raw.filter((n: any) => typeof n === "number") as number[];
        if (arr.length) pct = Math.round((arr.reduce((s, n) => s + n, 0) / (arr.length * 3)) * 100);
      } else if (typeof raw === "number") {
        pct = raw <= 3 ? Math.round((raw / 3) * 100) : Math.round(raw);
      } else if (raw && typeof raw === "object" && typeof raw.pct === "number") {
        pct = Math.round(raw.pct);
      }
      const recomendacao =
        pct >= 70 ? "Pilar consolidado — manter ritmo." :
        pct >= 40 ? "Espaço para evolução — priorizar este pilar." :
        "Atenção crítica — ação imediata recomendada.";
      return { key, label: PILARES_LABELS[key], pct, recomendacao };
    });
  }, [diagnostico]);

  const diagPctGeral = Math.round(Number(diagnostico?.total_pct ?? 0));

  // ---------- Aba 3: Diagnóstico Financeiro ----------
  const indicadoresFin = useMemo(() => {
    if (!diagFin) return [];
    const ind = diagFin.indicadores || {};
    const margem = Number(ind.margem_liquida ?? ind.margem ?? 0);
    const noShow = Number(diagFin.no_show ?? ind.no_show ?? 0);
    const inad = Number(diagFin.taxa_inadimplencia ?? ind.inadimplencia ?? 0);
    const pe = Number(ind.ponto_equilibrio ?? 0);
    const diaPe = Number(ind.dia_ponto_equilibrio ?? ind.diaPontoEquilibrio ?? 0);
    const ocup = Number(diagFin.ocupacao_agenda ?? ind.ocupacao_agenda ?? 0);
    const custoMat = Number(ind.custo_material ?? 0);
    const proLab = Number(ind.pro_labore ?? 0);
    const cpl = Number(ind.cpl ?? 0);
    const conv = Number(diagFin.taxa_conversao ?? ind.taxa_conversao ?? 0);
    const ret = Number(ind.taxa_retencao ?? 0);
    const nps = Number(ind.nps ?? 0);
    const cac = Number(ind.cac ?? 0);
    const ticket = Number(diagFin.ticket_medio ?? ind.ticket_medio ?? 0);

    return [
      { label: "Margem Líquida", valor: `${margem.toFixed(1)}%`, status: sem(semMargemLiquida, margem) },
      { label: "No-Show", valor: `${noShow.toFixed(1)}%`, status: sem(semNoShow, noShow) },
      { label: "Inadimplência", valor: `${inad.toFixed(1)}%`, status: sem(semInadimplencia, inad) },
      { label: "Ponto de Equilíbrio", valor: diaPe ? `Dia ${Math.round(diaPe)}` : pe ? fmtBRL(pe) : "—", status: sem(semPontoEquilibrio, diaPe) },
      { label: "Ocupação da Agenda", valor: `${ocup.toFixed(1)}%`, status: sem(semOcupacaoAgenda, ocup) },
      { label: "Custo de Material", valor: `${custoMat.toFixed(1)}%`, status: sem(semCustoMaterial, custoMat) },
      { label: "Pró-Labore", valor: `${proLab.toFixed(1)}%`, status: sem(semProLabore, proLab) },
      { label: "CPL", valor: cpl ? fmtBRL(cpl) : "—", status: sem(semCPL, cpl) },
      { label: "Taxa de Conversão", valor: `${conv.toFixed(1)}%`, status: sem(semTaxaConversao, conv) },
      { label: "Taxa de Retenção", valor: `${ret.toFixed(1)}%`, status: sem(semTaxaRetencao, ret) },
      { label: "NPS", valor: nps ? nps.toFixed(0) : "—", status: sem(semNPS, nps) },
      { label: "CAC", valor: cac ? fmtBRL(cac) : "—", status: cac && ticket ? semCAC(cac, ticket) : "neutral" as SemStatus },
    ];
  }, [diagFin]);

  // ---------- Aba 4: Honorários ----------
  const procedimentos = useMemo(() => {
    const raw = (simulacao?.procedimentos as any[]) || [];
    return raw.map((p) => {
      const preco = Number(p?.preco_praticado ?? p?.preco_estrategico ?? 0);
      const freq = Number(p?.frequencia_mes ?? 0);
      return { nome: p?.nome || "—", preco, freq, faturamento: preco * freq };
    });
  }, [simulacao]);
  const totalFaturamento = procedimentos.reduce((s, p) => s + p.faturamento, 0);

  // ---------- Aba 5: Módulos ----------
  const modulosOrdenados = useMemo(() => {
    return [...modulosCliente].sort((a, b) => {
      const oa = Number(a.modulos?.ordem ?? a.mes_execucao ?? 0);
      const ob = Number(b.modulos?.ordem ?? b.mes_execucao ?? 0);
      return oa - ob;
    });
  }, [modulosCliente]);
  const totalMod = modulosOrdenados.length;
  const concluidos = modulosOrdenados.filter((m) => m.status === "concluido").length;
  const pctMod = totalMod ? Math.round((concluidos / totalMod) * 100) : 0;

  // ---------- Aba 7: Arquivos ----------
  const fileIcon = (tipo?: string, nome?: string) => {
    const t = (tipo || nome || "").toLowerCase();
    if (t.includes("xls") || t.includes("sheet") || t.includes("csv")) return FileSpreadsheet;
    if (t.includes("doc")) return FileType2;
    return FileText;
  };

  // ---------- LOADING / EMPTY cliente ----------
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-verde-raiz/20 border-t-verde-raiz" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="font-display text-2xl text-verde-raiz">Pasta indisponível</h1>
        <p className="mt-2 text-quase-preto/70">Não localizamos seu cadastro de cliente. Fale com seu consultor.</p>
        <Button asChild variant="outline" className="mt-6 border-verde-raiz/30 text-verde-raiz">
          <Link to="/dashboard">← Voltar ao Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-gradient-to-br from-verde-raiz to-[#1a2e1a] p-6 text-linho shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-dourado">
            Pasta do Cliente
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl">
            {cliente.nome_clinica || cliente.nome_cliente}
          </h1>
          <p className="mt-1 text-sm text-linho/70">
            {[cliente.nome_cliente, cliente.especialidade || cliente.ramo, cliente.cidade]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Button asChild variant="outline" className="border-dourado/40 bg-transparent text-dourado hover:bg-dourado/10 hover:text-dourado">
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard</Link>
        </Button>
      </header>

      <Tabs defaultValue="diag360">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-card p-1">
          <TabsTrigger value="diag360"><Activity className="mr-1 h-4 w-4" />Diagnóstico 360°</TabsTrigger>
          <TabsTrigger value="plano"><FileText className="mr-1 h-4 w-4" />Meu Plano</TabsTrigger>
          <TabsTrigger value="diagfin"><Wallet className="mr-1 h-4 w-4" />Financeiro</TabsTrigger>
          <TabsTrigger value="honorarios"><Calculator className="mr-1 h-4 w-4" />Honorários</TabsTrigger>
          <TabsTrigger value="modulos"><ListChecks className="mr-1 h-4 w-4" />Módulos</TabsTrigger>
          <TabsTrigger value="reunioes"><CalendarDays className="mr-1 h-4 w-4" />Reuniões</TabsTrigger>
          <TabsTrigger value="arquivos"><FolderOpen className="mr-1 h-4 w-4" />Arquivos</TabsTrigger>
        </TabsList>

        {/* ABA 1 — Diagnóstico 360 */}
        <TabsContent value="diag360" className="mt-6">
          {!diagnostico ? (
            <EmptyState icon={Activity} title="Diagnóstico ainda não realizado" hint="Em breve seu consultor publicará a avaliação completa por aqui." />
          ) : (
            <div className="space-y-6">
              <Card>
                <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row">
                  <ScoreCircle pct={diagPctGeral} />
                  <div>
                    <h2 className="font-display text-xl text-verde-raiz">Score Geral</h2>
                    <p className="mt-1 text-sm text-quase-preto/70">
                      Classificação: <span className="font-medium">{diagnostico.classif_label || "—"}</span>
                    </p>
                    <p className="text-sm text-quase-preto/70">
                      Plano sugerido: <span className="font-medium">{diagnostico.plano_name || "—"}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {diagPilares.map((p) => (
                  <Card key={p.key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-verde-raiz">{p.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className={`font-display text-2xl ${scoreColor(p.pct)}`}>{p.pct}%</span>
                      </div>
                      <Progress value={p.pct} className="h-2" />
                      <p className="text-xs text-quase-preto/65">{p.recomendacao}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ABA 2 — Meu Plano */}
        <TabsContent value="plano" className="mt-6">
          {!orcamento ? (
            <EmptyState icon={FileText} title="Plano em preparação" hint="Assim que o orçamento for emitido, ele aparecerá aqui." />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-verde-raiz">{orcamento.plano_nome || orcamento.plano || "Plano contratado"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Stat label="Investimento total" value={fmtBRL(Number(orcamento.valor_final_numerico ?? 0) || parseBRL(orcamento.valor))} />
                  <Stat label="Status" value={"Ativo"} />
                  <Stat label="Plano" value={orcamento.plano_nome || orcamento.plano || "—"} />
                </div>
                {orcamento.dor_principal && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-verde-musgo">Foco principal</div>
                    <p className="mt-1 text-sm text-quase-preto/80">{orcamento.dor_principal}</p>
                  </div>
                )}
                {orcamento.storage_path && (
                  <PdfDownload bucket="orcamentos" path={orcamento.storage_path} fileName={orcamento.file_name || "orcamento.pdf"} />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ABA 3 — Diagnóstico Financeiro */}
        <TabsContent value="diagfin" className="mt-6">
          {!diagFin ? (
            <EmptyState icon={Wallet} title="Diagnóstico financeiro pendente" hint="Os indicadores serão publicados após a coleta de dados." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {indicadoresFin.map((i) => (
                <div key={i.label} className={`rounded-xl border p-4 ${semaforo(i.status)}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider opacity-75">{i.label}</div>
                  <div className="mt-2 font-display text-2xl">{i.valor}</div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ABA 4 — Honorários */}
        <TabsContent value="honorarios" className="mt-6">
          {procedimentos.length === 0 ? (
            <EmptyState icon={Calculator} title="Tabela de honorários em construção" hint="Em breve seus preços estratégicos serão publicados." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-quase-preto/70">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Procedimento</th>
                        <th className="px-4 py-3 text-right font-medium">Preço estratégico</th>
                        <th className="px-4 py-3 text-right font-medium">Frequência/mês</th>
                        <th className="px-4 py-3 text-right font-medium">Faturamento/mês</th>
                      </tr>
                    </thead>
                    <tbody>
                      {procedimentos.map((p, idx) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="px-4 py-3 text-quase-preto/85">{p.nome}</td>
                          <td className="px-4 py-3 text-right">{fmtBRL(p.preco)}</td>
                          <td className="px-4 py-3 text-right">{p.freq || "—"}</td>
                          <td className="px-4 py-3 text-right font-medium text-verde-raiz">{fmtBRL(p.faturamento)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-verde-raiz/5">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-verde-raiz">Faturamento potencial total</td>
                        <td className="px-4 py-3 text-right font-display text-lg text-verde-raiz">{fmtBRL(totalFaturamento)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ABA 5 — Módulos */}
        <TabsContent value="modulos" className="mt-6">
          {modulosOrdenados.length === 0 ? (
            <EmptyState icon={ListChecks} title="Módulos serão definidos em breve" hint="Sua jornada será publicada após o kickoff." />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-quase-preto/70">Progresso geral</span>
                    <span className="font-display text-2xl text-verde-raiz">{pctMod}%</span>
                  </div>
                  <Progress value={pctMod} className="h-2.5" />
                  <p className="text-xs text-quase-preto/60">{concluidos} de {totalMod} módulos concluídos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="divide-y divide-border p-0">
                  {modulosOrdenados.map((m) => {
                    const status = m.status as string;
                    const Icon = status === "concluido" ? CheckCircle2 : status === "em_andamento" ? ArrowRight : Circle;
                    const color =
                      status === "concluido" ? "text-emerald-600" :
                      status === "em_andamento" ? "text-blue-600" : "text-quase-preto/40";
                    const label =
                      status === "concluido" ? "Concluído" :
                      status === "em_andamento" ? "Em andamento" : "Pendente";
                    return (
                      <div key={m.id} className="flex items-center gap-4 px-4 py-3">
                        <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-medium text-verde-raiz">{m.modulos?.nome || "Módulo"}</div>
                          {m.modulos?.pilar_nome && (
                            <div className="truncate text-xs text-quase-preto/55">{m.modulos.pilar_nome}</div>
                          )}
                        </div>
                        <span className={`shrink-0 text-xs ${color}`}>{label}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ABA 6 — Reuniões */}
        <TabsContent value="reunioes" className="mt-6">
          {reunioes.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Reuniões & Atas" hint="Em breve suas atas e próximos passos aparecerão aqui." />
          ) : (
            <div className="space-y-4">
              {reunioes.map((r) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <CardTitle className="font-display text-lg text-verde-raiz">{r.titulo || "Reunião"}</CardTitle>
                      <span className="text-xs text-quase-preto/60">{fmtDate(r.data)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {r.ata && (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-verde-musgo">Ata</div>
                        <p className="mt-1 whitespace-pre-line text-sm text-quase-preto/80">{r.ata}</p>
                      </div>
                    )}
                    {r.proximos_passos && (
                      <div className="rounded-lg border-l-4 border-dourado bg-dourado/5 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-verde-raiz">Próximos passos</div>
                        <p className="mt-1 whitespace-pre-line text-sm text-quase-preto/85">{r.proximos_passos}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ABA 7 — Arquivos */}
        <TabsContent value="arquivos" className="mt-6">
          {arquivos.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Arquivos & Entregas" hint="Seus documentos e entregas aparecerão aqui assim que forem disponibilizados." />
          ) : (
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {arquivos.map((a) => {
                  const Icon = fileIcon(a.tipo, a.nome);
                  return (
                    <div key={a.id} className="flex items-center gap-4 px-4 py-3">
                      <Icon className="h-5 w-5 shrink-0 text-verde-raiz" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-medium text-quase-preto/85">{a.nome || "Arquivo"}</div>
                        <div className="text-xs text-quase-preto/55">{fmtDate(a.created_at)}</div>
                      </div>
                      {a.url && (
                        <Button asChild size="sm" variant="outline" className="border-verde-raiz/30 text-verde-raiz hover:bg-verde-raiz/5">
                          <a href={a.url} target="_blank" rel="noreferrer"><Download className="h-4 w-4" />Baixar</a>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-verde-musgo">{label}</div>
      <div className="mt-1 font-display text-xl text-verde-raiz">{value}</div>
    </div>
  );
}

function PdfDownload({ bucket, path, fileName }: { bucket: string; path: string; fileName: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    supabase.storage.from(bucket).createSignedUrl(path, 60 * 10).then(({ data }) => {
      if (active) setUrl(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [bucket, path]);
  if (!url) return null;
  return (
    <Button asChild className="bg-verde-raiz text-linho hover:bg-verde-raiz/90">
      <a href={url} download={fileName} target="_blank" rel="noreferrer">
        <Download className="h-4 w-4" /> Baixar PDF do plano
      </a>
    </Button>
  );
}
