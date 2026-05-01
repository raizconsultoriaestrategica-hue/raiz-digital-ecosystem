import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, ArrowRight, Circle, Download, Loader2 } from "lucide-react";

const PILARES: Record<string, string> = {
  marketing_digital: "Marketing Digital",
  captacao_trafego: "Captação & Tráfego",
  atendimento_conversao: "Atendimento & Conversão",
  financeiro_precificacao: "Financeiro & Precificação",
  gestao_operacional: "Gestão Operacional",
  relacionamento_retencao: "Relacionamento & Retenção",
  expansao: "Expansão",
};

const INDICADORES: Record<string, string> = {
  margem_liquida: "Margem Líquida",
  no_show: "No-Show",
  inadimplencia: "Inadimplência",
  ponto_equilibrio: "Ponto de Equilíbrio",
  ocupacao_agenda: "Ocupação da Agenda",
  custo_material: "Custo de Material",
  pro_labore: "Pró-Labore",
  cpl: "CPL",
  taxa_conversao: "Taxa de Conversão",
  taxa_retencao: "Taxa de Retenção",
  nps: "NPS",
  cac: "CAC",
};

const BRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

function scoreColor(score: number) {
  if (score >= 70) return "#1f7a3a";
  if (score >= 40) return "#d4a017";
  return "#c0392b";
}

function semaforoColor(s: string) {
  const v = (s || "").toLowerCase();
  if (v === "verde") return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (v === "amarelo") return "bg-amber-100 text-amber-800 border-amber-300";
  if (v === "vermelho") return "bg-red-100 text-red-800 border-red-300";
  return "bg-gray-100 text-gray-700 border-gray-300";
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white py-10 text-center">
      <p className="text-gray-500" style={{ fontFamily: "Lato, sans-serif" }}>
        {msg}
      </p>
    </div>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold text-[#1a2e1a]" style={{ fontFamily: "Cormorant Garamond, serif" }}>
        {children}
      </h2>
      {sub && (
        <p className="mt-1 text-sm text-gray-500" style={{ fontFamily: "Lato, sans-serif" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

interface Cliente {
  id: string;
  nome_cliente: string;
  especialidade: string | null;
  ramo: string | null;
}

export default function ClientPortal() {
  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [diagnostico, setDiagnostico] = useState<any>(null);
  const [orcamento, setOrcamento] = useState<any>(null);
  const [diagFin, setDiagFin] = useState<any>(null);
  const [precificacao, setPrecificacao] = useState<any>(null);
  const [modulos, setModulos] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: cli } = await supabase
          .from("clientes")
          .select("id, nome_cliente, especialidade, ramo")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!cli) {
          setLoading(false);
          return;
        }
        setCliente(cli as Cliente);

        const [{ data: diag }, { data: orc }, { data: dfin }, { data: prec }, { data: mods }] = await Promise.all([
          supabase
            .from("diagnostics")
            .select("*")
            .eq("client_id", cli.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("orcamentos")
            .select("*")
            .eq("cliente_id", cli.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("diagnosticos_financeiros")
            .select("*")
            .eq("cliente_id", cli.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("simulacoes_precificacao")
            .select("*")
            .eq("cliente_id", cli.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("cliente_modulos")
            .select("status, mes_execucao, modulo_id, modulos:modulo_id(nome, ordem)")
            .eq("cliente_id", cli.id),
        ]);

        setDiagnostico(diag);
        setOrcamento(orc);
        setDiagFin(dfin);
        setPrecificacao(prec);
        setModulos(
          (mods || []).slice().sort((a: any, b: any) => {
            const oa = a?.modulos?.ordem ?? a?.mes_execucao ?? 0;
            const ob = b?.modulos?.ordem ?? b?.mes_execucao ?? 0;
            return oa - ob;
          })
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3]">
        <Loader2 className="h-6 w-6 animate-spin text-[#1a2e1a]" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f3] p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-700" style={{ fontFamily: "Lato, sans-serif" }}>
              Não encontramos seu cadastro de cliente. Entre em contato com seu consultor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Diagnóstico 360° ----
  const scoresObj: Record<string, number> = (diagnostico?.scores as Record<string, number>) || {};
  const recomendacoes: Record<string, string> = (diagnostico?.recomendacoes as Record<string, string>) || {};
  const pilarKeys = Object.keys(PILARES);
  const pilarValues = pilarKeys.map((k) => Number(scoresObj[k] ?? 0));
  const scoreMedio =
    pilarValues.length && pilarValues.some((v) => v > 0)
      ? Math.round(pilarValues.reduce((a, b) => a + b, 0) / pilarValues.length)
      : 0;

  // ---- Orçamento ----
  // Parse "valor" (text, ex.: "R$ 2.500,00") com fallback para valor_final_numerico
  const parseBRL = (v: any): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return v;
    const s = String(v).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };
  const valorTotal =
    Number(orcamento?.valor_final_numerico ?? 0) || parseBRL(orcamento?.valor);
  // Módulos contratados: vem do storage do orçamento; aqui mostramos o plano contratado.
  const orcModulos: string[] = orcamento?.plano_nome
    ? [orcamento.plano_nome]
    : orcamento?.plano
    ? [orcamento.plano]
    : [];
  const pdfUrl = orcamento?.storage_path || null;
  const orcStatus = orcamento ? "ativo" : "";

  // ---- Diagnóstico Financeiro ----
  const indicadores: Record<string, any> = (diagFin?.indicadores as Record<string, any>) || {};
  const semaforos: Record<string, string> = (diagFin?.semaforos as Record<string, string>) || {};

  // ---- Precificação ----
  const procedimentos: any[] = Array.isArray(precificacao?.procedimentos) ? precificacao.procedimentos : [];
  const totalFat = procedimentos.reduce((s, p) => s + Number(p?.faturamento_mes || 0), 0);

  // ---- Módulos ----
  const totalMods = modulos.length;
  const concluidos = modulos.filter((m) => m.status === "concluido").length;
  const pctMods = totalMods ? Math.round((concluidos / totalMods) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f5f5f3]" style={{ fontFamily: "Lato, sans-serif" }}>
      {/* CABEÇALHO */}
      <header className="bg-[#1a2e1a] text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h1
            className="text-4xl font-light tracking-tight md:text-5xl"
            style={{ fontFamily: "Cormorant Garamond, serif" }}
          >
            {cliente.nome_cliente}
          </h1>
          {(cliente.especialidade || cliente.ramo) && (
            <p className="mt-2 text-white/70">{cliente.especialidade || cliente.ramo}</p>
          )}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80">
            <span>Diagnóstico</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span>Planejamento</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span>Execução</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="text-[#C9A84C]">Resultado</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-16 px-6 py-12">
        {/* SEÇÃO 1 — Diagnóstico 360° */}
        <section>
          <SectionTitle sub="Avaliação dos 7 pilares estratégicos">Diagnóstico 360°</SectionTitle>
          {!diagnostico ? (
            <EmptyState msg="Aguardando diagnóstico inicial do consultor." />
          ) : (
            <div className="grid gap-6 md:grid-cols-[260px_1fr]">
              <Card className="flex items-center justify-center bg-white">
                <CardContent className="flex flex-col items-center p-8">
                  <div
                    className="flex h-40 w-40 items-center justify-center rounded-full text-white shadow-lg"
                    style={{ backgroundColor: scoreColor(scoreMedio) }}
                  >
                    <span className="text-5xl font-semibold" style={{ fontFamily: "Cormorant Garamond, serif" }}>
                      {scoreMedio}
                    </span>
                  </div>
                  <p className="mt-4 text-sm uppercase tracking-wider text-gray-500">Score Geral</p>
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2">
                {pilarKeys.map((k) => {
                  const v = Number(scoresObj[k] ?? 0);
                  return (
                    <Card key={k} className="bg-white">
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-[#1a2e1a]">{PILARES[k]}</span>
                          <span className="text-sm font-semibold" style={{ color: scoreColor(v) }}>
                            {v}
                          </span>
                        </div>
                        <Progress value={v} className="h-2" />
                        {recomendacoes[k] && (
                          <p className="mt-2 text-xs text-gray-600">{recomendacoes[k]}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* SEÇÃO 2 — Proposta & Orçamento */}
        <section>
          <SectionTitle sub="Plano de consultoria contratado">Proposta & Orçamento</SectionTitle>
          {!orcamento ? (
            <EmptyState msg="Aguardando proposta comercial do consultor." />
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal text-gray-500">Investimento Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className="text-3xl font-semibold text-[#1a2e1a]"
                      style={{ fontFamily: "Cormorant Garamond, serif" }}
                    >
                      {BRL(valorTotal)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal text-gray-500">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className="bg-[#1a2e1a] text-white capitalize hover:bg-[#1a2e1a]">{orcStatus}</Badge>
                  </CardContent>
                </Card>
                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-normal text-gray-500">Módulos Contratados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className="text-3xl font-semibold text-[#1a2e1a]"
                      style={{ fontFamily: "Cormorant Garamond, serif" }}
                    >
                      {orcModulos.length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {orcModulos.length > 0 && (
                <Card className="bg-white">
                  <CardContent className="p-6">
                    <p className="mb-3 text-sm font-medium text-gray-500">Módulos</p>
                    <div className="flex flex-wrap gap-2">
                      {orcModulos.map((m, i) => (
                        <Badge
                          key={i}
                          className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                        >
                          {typeof m === "string" ? m : (m as any)?.nome || JSON.stringify(m)}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {cronograma && (
                <Card className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-base text-[#1a2e1a]">Cronograma</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line text-sm text-gray-700">{cronograma}</p>
                  </CardContent>
                </Card>
              )}

              {pdfUrl && (
                <Button asChild className="bg-[#1a2e1a] hover:bg-[#1a2e1a]/90">
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Proposta em PDF
                  </a>
                </Button>
              )}
            </div>
          )}
        </section>

        {/* SEÇÃO 3 — Diagnóstico Financeiro */}
        <section>
          <SectionTitle sub="Indicadores e semáforos de saúde financeira">Diagnóstico Financeiro</SectionTitle>
          {!diagFin || Object.keys(indicadores).length === 0 ? (
            <EmptyState msg="Aguardando diagnóstico financeiro." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Object.keys(INDICADORES).map((k) => {
                const raw = indicadores[k];
                if (raw === undefined || raw === null || raw === "") return null;
                const sem = semaforos[k];
                return (
                  <Card key={k} className="bg-white">
                    <CardContent className="p-5">
                      <p className="text-xs uppercase tracking-wider text-gray-500">{INDICADORES[k]}</p>
                      <p
                        className="mt-2 text-2xl font-semibold text-[#1a2e1a]"
                        style={{ fontFamily: "Cormorant Garamond, serif" }}
                      >
                        {typeof raw === "number" ? raw.toLocaleString("pt-BR") : String(raw)}
                      </p>
                      {sem && (
                        <span
                          className={`mt-3 inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${semaforoColor(
                            sem
                          )}`}
                        >
                          {sem}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* SEÇÃO 4 — Tabela de Honorários */}
        <section>
          <SectionTitle sub="Precificação estratégica dos seus procedimentos">Tabela de Honorários</SectionTitle>
          {procedimentos.length === 0 ? (
            <EmptyState msg="Aguardando simulação de precificação." />
          ) : (
            <Card className="bg-white">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedimento</TableHead>
                      <TableHead className="text-right">Preço Estratégico</TableHead>
                      <TableHead className="text-right">Faturamento / Mês</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {procedimentos.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-[#1a2e1a]">{p?.nome || "—"}</TableCell>
                        <TableCell className="text-right">{BRL(Number(p?.preco_estrategico || 0))}</TableCell>
                        <TableCell className="text-right">{BRL(Number(p?.faturamento_mes || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold text-[#1a2e1a]">
                        Faturamento potencial total
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[#1a2e1a]">{BRL(totalFat)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          )}
        </section>

        {/* SEÇÃO 5 — Progresso dos Módulos */}
        <section>
          <SectionTitle sub="Acompanhamento da execução do seu plano">Progresso dos Módulos</SectionTitle>
          {modulos.length === 0 ? (
            <EmptyState msg="Aguardando início da execução dos módulos." />
          ) : (
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {concluidos} de {totalMods} módulos concluídos
                    </span>
                    <span className="text-sm font-semibold text-[#1a2e1a]">{pctMods}%</span>
                  </div>
                  <Progress value={pctMods} className="h-2" />
                </div>

                <ul className="divide-y divide-gray-100">
                  {modulos.map((m, i) => {
                    const status = m.status as string;
                    const nome = m?.modulos?.nome || `Módulo ${i + 1}`;
                    let icon = <Circle className="h-5 w-5 text-gray-400" />;
                    let label = "Pendente";
                    let labelClass = "text-gray-500";
                    if (status === "concluido") {
                      icon = <Check className="h-5 w-5 text-emerald-600" />;
                      label = "Concluído";
                      labelClass = "text-emerald-700";
                    } else if (status === "em_andamento") {
                      icon = <ArrowRight className="h-5 w-5 text-blue-600" />;
                      label = "Em andamento";
                      labelClass = "text-blue-700";
                    }
                    return (
                      <li key={i} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          {icon}
                          <span className="text-sm text-[#1a2e1a]">{nome}</span>
                        </div>
                        <span className={`text-xs font-medium ${labelClass}`}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
        Raiz Consultoria Estratégica · Portal do Cliente
      </footer>
    </div>
  );
}
