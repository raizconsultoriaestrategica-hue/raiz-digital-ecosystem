import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGargalos, type Gargalo } from "@/hooks/useGargalos";

interface Props {
  clienteId: string;
  nomeCliente: string;
  especialidade?: string | null;
  ramo?: string | null;
}

const SEVERIDADE_STYLE: Record<
  string,
  { wrapper: string; iconColor: string; label: string }
> = {
  critico: {
    wrapper: "border-red-200/70 bg-red-50/50",
    iconColor: "text-red-600",
    label: "Crítico",
  },
  atencao: {
    wrapper: "border-amber-200/70 bg-amber-50/50",
    iconColor: "text-amber-600",
    label: "Atenção",
  },
  ok: {
    wrapper: "border-emerald-200/70 bg-emerald-50/40",
    iconColor: "text-emerald-600",
    label: "Saudável",
  },
};

const KPI_LABEL: Record<string, string> = {
  taxa_conversao: "Taxa de Conversão",
  taxa_inadimplencia: "Inadimplência",
  taxa_no_show: "No-Show",
  ocupacao_cadeiras: "Ocupação de Cadeiras",
  margem_liquida: "Margem Líquida",
  ticket_medio: "Ticket Médio",
};

function fmtMesLabel(iso: string): string {
  const [y, m] = iso.split("-");
  if (!y || !m) return iso;
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function fmtValor(g: Gargalo): string {
  if (g.unidade === "%") return `${Number(g.valor_atual).toFixed(1)}%`;
  if (g.unidade === "BRL") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(g.valor_atual));
  }
  return `${g.valor_atual} ${g.unidade}`;
}

function fmtFaixa(g: Gargalo): string {
  if (g.unidade === "%") return `${g.benchmark_min}% a ${g.benchmark_max}%`;
  if (g.unidade === "BRL") {
    const f = (v: number) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v);
    return `${f(Number(g.benchmark_min))} a ${f(Number(g.benchmark_max))}`;
  }
  return `${g.benchmark_min} a ${g.benchmark_max}`;
}

const SYSTEM_PROMPT = `Voce e o consultor estrategico senior da Raiz Consultoria, falando direto com o dentista dono da clinica. Seu objetivo aqui e analisar os gargalos do mes e propor um plano de acao curto e pratico.

Regras de comunicacao:
- Portugues brasileiro, tom direto, sem cliches motivacionais
- Sem travessao (-). Use ponto, virgula ou dois-pontos
- Estruture com headers e bullets quando ajudar
- Use APENAS os numeros do contexto BENCHMARKS. Nao invente valores nem porcentagens
- Foque no que pode ser feito nas proximas 4 semanas
- Para KPIs criticos, recomende UMA acao especifica com responsavel sugerido (consultor da Raiz ou cliente)

Formato esperado:
## Leitura geral do mes
(1-2 paragrafos: o que os numeros mostram, o que ja esta bem, onde dueim mais)

## Plano de acao (proximas 4 semanas)
(lista priorizada: para cada KPI critico ou em atencao, qual acao, quem executa, o que medir)

## Resumo executivo
(2-3 linhas: principal foco do mes)`;

export function AnaliseIACard({
  clienteId,
  nomeCliente,
  especialidade,
  ramo,
}: Props) {
  const [meses, setMeses] = useState<string[]>([]);
  const [mes, setMes] = useState<string>("");
  const [gerando, setGerando] = useState(false);
  const [resposta, setResposta] = useState<string>("");
  const [erro, setErro] = useState<string>("");

  // Carrega meses disponíveis (kpis_mensais do cliente)
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("kpis_mensais")
        .select("mes_referencia")
        .eq("cliente_id", clienteId)
        .order("mes_referencia", { ascending: false });
      if (!active) return;
      if (error || !data) {
        setMeses([]);
        return;
      }
      const lista = data.map((r) => r.mes_referencia as string);
      setMeses(lista);
      if (lista.length && !mes) setMes(lista[0]);
    })();
    return () => {
      active = false;
    };
  }, [clienteId]);

  const { data: gargalos, isLoading: carregandoGargalos } = useGargalos(
    clienteId,
    mes || null,
  );

  const grupos = useMemo(() => {
    const lista = gargalos ?? [];
    return {
      criticos: lista.filter((g) => g.severidade === "critico"),
      atencao: lista.filter((g) => g.severidade === "atencao"),
      ok: lista.filter((g) => g.severidade === "ok"),
    };
  }, [gargalos]);

  const podeGerar = !!mes && !carregandoGargalos && !gerando;

  const handleGerar = async () => {
    setErro("");
    setResposta("");
    setGerando(true);
    try {
      const especContexto =
        especialidade && especialidade.trim().length
          ? especialidade
          : ramo || "odontologia";
      const userPrompt = `Cliente: ${nomeCliente} (${especContexto}). Mes de referencia: ${fmtMesLabel(mes)}. Gere a analise de gargalos seguindo o formato pedido no system.`;

      const { data, error } = await supabase.functions.invoke("consultor-ia", {
        body: {
          systemPrompt: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
          cliente_id: clienteId,
          mes,
        },
      });
      if (error) throw new Error(error.message || "Falha ao chamar consultor-ia");
      if (data?.error) throw new Error(data.error);

      const text: string =
        data?.content?.[0]?.text ??
        data?.content
          ?.map?.((c: any) => c?.text)
          .filter(Boolean)
          .join("\n") ??
        "";
      if (!text) throw new Error("Resposta vazia da IA.");
      setResposta(text);
    } catch (e: any) {
      setErro(e?.message || "Erro ao gerar análise.");
    } finally {
      setGerando(false);
    }
  };

  if (meses.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
            <Sparkles className="h-4 w-4" />
            Análise IA dos gargalos
          </div>
          <p className="text-sm text-quase-preto/65">
            Os indicadores mensais ainda não foram preenchidos. Assim que o
            primeiro mês de KPIs estiver no sistema, a análise de gargalos fica
            disponível aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-verde-musgo">
          <Sparkles className="h-4 w-4" />
          Análise IA dos gargalos
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="text-xs text-quase-preto/65">
              Mês de referência
            </label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Escolha o mês" />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m} value={m}>
                    {fmtMesLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGerar}
            disabled={!podeGerar}
            className="bg-verde-raiz text-linho hover:bg-verde-raiz/90"
          >
            {gerando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar análise
              </>
            )}
          </Button>
        </div>

        {carregandoGargalos ? (
          <p className="text-xs text-quase-preto/55">Carregando KPIs do mês...</p>
        ) : (
          (gargalos?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-quase-preto/65">
                Indicadores do mês vs benchmark
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {grupos.criticos.map((g) => (
                  <GargaloLinha key={g.kpi} g={g} severidade="critico" />
                ))}
                {grupos.atencao.map((g) => (
                  <GargaloLinha key={g.kpi} g={g} severidade="atencao" />
                ))}
                {grupos.ok.map((g) => (
                  <GargaloLinha key={g.kpi} g={g} severidade="ok" />
                ))}
              </div>
            </div>
          )
        )}

        {resposta && (
          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="prose prose-sm max-w-none text-quase-preto/85 prose-headings:font-display prose-headings:text-verde-raiz prose-strong:text-verde-raiz">
              <ReactMarkdown>{resposta}</ReactMarkdown>
            </div>
          </div>
        )}

        {erro && (
          <p className="text-sm text-red-600">
            <AlertTriangle className="mr-1 inline-block h-4 w-4" />
            {erro}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function GargaloLinha({
  g,
  severidade,
}: {
  g: Gargalo;
  severidade: "critico" | "atencao" | "ok";
}) {
  const style = SEVERIDADE_STYLE[severidade];
  const Icon =
    severidade === "critico"
      ? AlertTriangle
      : severidade === "atencao"
        ? TrendingUp
        : CheckCircle2;
  return (
    <div className={`rounded-lg border p-3 ${style.wrapper}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-quase-preto/90">
          {KPI_LABEL[g.kpi] ?? g.kpi}
        </span>
        <span
          className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${style.iconColor}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {style.label}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 text-xs text-quase-preto/65">
        <span className="font-display text-lg text-quase-preto/85">
          {fmtValor(g)}
        </span>
        <span>Faixa saudável: {fmtFaixa(g)}</span>
      </div>
    </div>
  );
}
