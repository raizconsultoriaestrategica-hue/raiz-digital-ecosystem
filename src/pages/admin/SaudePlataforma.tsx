import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSaudePlataforma } from "@/hooks/useSaudePlataforma";
import { useEvolucaoNegocio } from "@/hooks/useEvolucaoNegocio";

const fmtBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

const fmtInt = (n: number | null | undefined) =>
  n === null || n === undefined ? "0" : String(Number(n));

const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${Number(n).toFixed(1)}%`;

const formatMesRef = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  const [y, m] = dateStr.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

const formatMesLabel = (label: string) => {
  const [y, m] = label.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .replace(/^./, (c) => c.toUpperCase());
};

export default function SaudePlataforma() {
  const { data: snapshot, isLoading: loadingSnap, error: errSnap } = useSaudePlataforma();
  const { data: evolucao = [], isLoading: loadingEvol, error: errEvol } = useEvolucaoNegocio();

  const chartReceita = useMemo(
    () =>
      evolucao.map((e) => ({
        mes: formatMesLabel(e.mes_label),
        Receita: Number(e.receita_mensal || 0),
      })),
    [evolucao],
  );

  const chartAtividade = useMemo(
    () =>
      evolucao.map((e) => ({
        mes: formatMesLabel(e.mes_label),
        "Diag 360": Number(e.diag_360_criados || 0),
        "Diag Financeiro": Number(e.diag_fin_criados || 0),
        "Novos clientes": Number(e.novos_clientes || 0),
      })),
    [evolucao],
  );

  if (errSnap || errEvol) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar dados:{" "}
            {(errSnap as Error)?.message || (errEvol as Error)?.message || "desconhecido"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const cardsClientes = [
    {
      title: "Total de clientes",
      value: fmtInt(snapshot?.total_clientes),
      tone: "text-quase-preto",
    },
    {
      title: "Clientes ativos",
      value: fmtInt(snapshot?.clientes_ativos),
      tone: "text-verde-raiz",
    },
    {
      title: "Encerrados",
      value: fmtInt(snapshot?.clientes_encerrados),
      tone: "text-quase-preto",
    },
    {
      title: "Novos no mês",
      value: fmtInt(snapshot?.novos_clientes_no_mes),
      tone: "text-dourado",
    },
    {
      title: "Ativos sem contrato",
      value: fmtInt(snapshot?.clientes_ativos_sem_contrato),
      tone:
        (snapshot?.clientes_ativos_sem_contrato ?? 0) > 0
          ? "text-red-600"
          : "text-quase-preto",
    },
  ];

  const cardsFinanceiro = [
    {
      title: "MRR total",
      value: fmtBRL(Number(snapshot?.mrr_total || 0)),
      tone: "text-dourado",
    },
    {
      title: "Ticket médio",
      value: fmtBRL(Number(snapshot?.ticket_medio_contratos || 0)),
      tone: "text-quase-preto",
    },
    {
      title: "Contratos ativos",
      value: fmtInt(snapshot?.contratos_ativos),
      tone: "text-verde-raiz",
    },
    {
      title: "Em renovação",
      value: fmtInt(snapshot?.contratos_renovacao_pendente),
      tone:
        (snapshot?.contratos_renovacao_pendente ?? 0) > 0
          ? "text-dourado"
          : "text-quase-preto",
    },
    {
      title: "Receita recebida no mês",
      value: fmtBRL(Number(snapshot?.receita_recebida_no_mes || 0)),
      tone: "text-verde-raiz",
    },
  ];

  const cardsOperacao = [
    {
      title: "Pagamentos atrasados",
      value: fmtInt(snapshot?.pagamentos_atrasados),
      tone:
        (snapshot?.pagamentos_atrasados ?? 0) > 0
          ? "text-red-600"
          : "text-quase-preto",
    },
    {
      title: "Pagamentos pendentes",
      value: fmtInt(snapshot?.pagamentos_pendentes),
      tone: "text-quase-preto",
    },
    {
      title: "Diag 360 no mês",
      value: fmtInt(snapshot?.diag_360_no_mes),
      tone: "text-quase-preto",
    },
    {
      title: "Diag Financeiro no mês",
      value: fmtInt(snapshot?.diag_fin_no_mes),
      tone: "text-quase-preto",
    },
    {
      title: "Taxa de retenção",
      value: fmtPct(snapshot?.taxa_retencao_pct),
      tone:
        Number(snapshot?.taxa_retencao_pct ?? 0) >= 80
          ? "text-verde-raiz"
          : Number(snapshot?.taxa_retencao_pct ?? 0) >= 60
            ? "text-dourado"
            : "text-red-600",
    },
  ];

  const alertasAtivos = [
    (snapshot?.clientes_ativos_sem_contrato ?? 0) > 0
      ? `${snapshot?.clientes_ativos_sem_contrato} cliente(s) em projeto ativo sem contrato vinculado.`
      : null,
    (snapshot?.pagamentos_atrasados ?? 0) > 0
      ? `${snapshot?.pagamentos_atrasados} pagamento(s) em atraso.`
      : null,
    (snapshot?.contratos_renovacao_pendente ?? 0) > 0
      ? `${snapshot?.contratos_renovacao_pendente} contrato(s) com renovação pendente.`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl text-verde-raiz">Saúde da plataforma</h1>
        <p className="font-body text-sm text-quase-preto/60">
          Snapshot do mês de {formatMesRef(snapshot?.mes_referencia)}.{" "}
          <Badge variant="outline" className="ml-1">somente admin</Badge>
        </p>
      </header>

      {alertasAtivos.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-0.5">
              {alertasAtivos.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl text-verde-raiz">Clientes</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cardsClientes.map((c) => (
            <Card key={c.title}>
              <CardHeader className="pb-2">
                <CardTitle className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`font-display text-2xl ${c.tone}`}>
                  {loadingSnap ? "…" : c.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-verde-raiz">Financeiro</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cardsFinanceiro.map((c) => (
            <Card key={c.title}>
              <CardHeader className="pb-2">
                <CardTitle className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`font-display text-2xl ${c.tone}`}>
                  {loadingSnap ? "…" : c.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-verde-raiz">Operação</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cardsOperacao.map((c) => (
            <Card key={c.title}>
              <CardHeader className="pb-2">
                <CardTitle className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`font-display text-2xl ${c.tone}`}>
                  {loadingSnap ? "…" : c.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl text-verde-raiz">
            Receita recebida. Últimos 12 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            {loadingEvol ? (
              <div className="flex h-full items-center justify-center text-quase-preto/60">
                Carregando…
              </div>
            ) : (
              <ResponsiveContainer>
                <LineChart data={chartReceita}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e1dc" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(v) => fmtBRL(Number(v))} width={90} />
                  <Tooltip formatter={(v: number) => fmtBRL(Number(v))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Receita"
                    stroke="#1C3D2E"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#1C3D2E" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl text-verde-raiz">
            Atividade mensal. Diagnósticos e novos clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            {loadingEvol ? (
              <div className="flex h-full items-center justify-center text-quase-preto/60">
                Carregando…
              </div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={chartAtividade}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e1dc" />
                  <XAxis dataKey="mes" />
                  <YAxis allowDecimals={false} width={40} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Diag 360" fill="#1C3D2E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Diag Financeiro" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Novos clientes" fill="#6B7280" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
