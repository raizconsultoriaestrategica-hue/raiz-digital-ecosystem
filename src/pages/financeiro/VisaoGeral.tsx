import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSaudeFinanceiraClientes, type SaudeFinanceiraCliente } from "@/hooks/useSaudeFinanceiraCliente";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtPct = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `${Number(n).toFixed(1)}%`;

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

interface Pagamento {
  valor: number;
  vencimento: string;
  status: string;
  data_pagamento: string | null;
  cliente_nome: string;
}
interface Conta {
  valor: number;
  vencimento: string;
  status: string;
  data_pagamento: string | null;
}

export default function VisaoGeral() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: saudeClientes = [], isLoading: loadingSaude } = useSaudeFinanceiraClientes();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, c] = await Promise.all([
        (supabase as any).from("pagamentos_raiz").select("valor,vencimento,status,data_pagamento,cliente_nome"),
        (supabase as any).from("contas_pagar_raiz").select("valor,vencimento,status,data_pagamento"),
      ]);
      setPagamentos(p.data ?? []);
      setContas(c.data ?? []);
      setLoading(false);
    })();
  }, []);

  const now = new Date();
  const currentKey = monthKey(now);

  const receitaMes = useMemo(
    () =>
      pagamentos
        .filter((x) => x.status === "pago" && x.data_pagamento && monthKey(new Date(x.data_pagamento)) === currentKey)
        .reduce((s, x) => s + Number(x.valor || 0), 0),
    [pagamentos, currentKey],
  );

  const custosMes = useMemo(
    () =>
      contas
        .filter((x) => x.status === "pago" && x.data_pagamento && monthKey(new Date(x.data_pagamento)) === currentKey)
        .reduce((s, x) => s + Number(x.valor || 0), 0),
    [contas, currentKey],
  );

  const margem = receitaMes - custosMes;

  const inadimplentes = useMemo(
    () => new Set(pagamentos.filter((x) => x.status === "atrasado").map((x) => x.cliente_nome)).size,
    [pagamentos],
  );

  const mrrCarteira = useMemo(
    () => saudeClientes.reduce((s, c) => s + Number(c.mrr_atual || 0), 0),
    [saudeClientes],
  );

  const ticketMedioCarteira = useMemo(() => {
    const com = saudeClientes.filter((c) => c.ticket_medio_3m !== null);
    if (!com.length) return 0;
    return com.reduce((s, c) => s + Number(c.ticket_medio_3m || 0), 0) / com.length;
  }, [saudeClientes]);

  const faturamentoMedioCarteira = useMemo(() => {
    const com = saudeClientes.filter((c) => c.faturamento_medio_3m !== null);
    if (!com.length) return 0;
    return com.reduce((s, c) => s + Number(c.faturamento_medio_3m || 0), 0) / com.length;
  }, [saudeClientes]);

  const margemMediaCarteira = useMemo(() => {
    const com = saudeClientes.filter((c) => c.margem_liquida_3m !== null);
    if (!com.length) return 0;
    return com.reduce((s, c) => s + Number(c.margem_liquida_3m || 0), 0) / com.length;
  }, [saudeClientes]);

  const clientesAtivos = useMemo(
    () => saudeClientes.filter((c) => c.contrato_status === "ativo").length,
    [saudeClientes],
  );

  const clientesComKpis = useMemo(
    () => saudeClientes.filter((c) => c.tem_kpis_mensais).length,
    [saudeClientes],
  );

  const divergencias = useMemo(
    () => saudeClientes.filter((c) => c.mrr_diverge_cadastro && c.tem_contrato),
    [saudeClientes],
  );

  const chartData = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(monthKey(d));
    }
    return months.map((k) => {
      const r = pagamentos
        .filter((x) => x.status === "pago" && x.data_pagamento && monthKey(new Date(x.data_pagamento)) === k)
        .reduce((s, x) => s + Number(x.valor || 0), 0);
      const c = contas
        .filter((x) => x.status === "pago" && x.data_pagamento && monthKey(new Date(x.data_pagamento)) === k)
        .reduce((s, x) => s + Number(x.valor || 0), 0);
      return { mes: monthLabel(k), Receita: r, Custos: c };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagamentos, contas]);

  const cardsRaiz = [
    { title: "Receita do mês", value: fmtBRL(receitaMes), tone: "text-verde-raiz" },
    { title: "Custos do mês", value: fmtBRL(custosMes), tone: "text-quase-preto" },
    { title: "Margem líquida", value: fmtBRL(margem), tone: margem >= 0 ? "text-verde-raiz" : "text-red-600" },
    { title: "Clientes inadimplentes", value: String(inadimplentes), tone: inadimplentes > 0 ? "text-red-600" : "text-quase-preto" },
    { title: "MRR projetado", value: fmtBRL(mrrCarteira), tone: "text-dourado", loading: loadingSaude },
  ];

  const cardsCarteira = [
    { title: "Clientes ativos", value: String(clientesAtivos), tone: "text-verde-raiz" },
    { title: "Faturamento médio (3m)", value: fmtBRL(faturamentoMedioCarteira), tone: "text-quase-preto" },
    { title: "Ticket médio carteira (3m)", value: fmtBRL(ticketMedioCarteira), tone: "text-quase-preto" },
    { title: "Margem média carteira (3m)", value: fmtPct(margemMediaCarteira), tone: margemMediaCarteira >= 0 ? "text-verde-raiz" : "text-red-600" },
    { title: "Clientes com KPIs preenchidos", value: `${clientesComKpis}/${saudeClientes.length}`, tone: "text-quase-preto" },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-display text-xl text-verde-raiz">Financeiro da Raiz</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cardsRaiz.map((c) => (
            <Card key={c.title}>
              <CardHeader className="pb-2">
                <CardTitle className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`font-display text-2xl ${c.tone}`}>
                  {(loading || c.loading) ? "…" : c.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-verde-raiz">Saúde da carteira</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cardsCarteira.map((c) => (
            <Card key={c.title}>
              <CardHeader className="pb-2">
                <CardTitle className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`font-display text-2xl ${c.tone}`}>
                  {loadingSaude ? "…" : c.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {divergencias.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            {divergencias.length === 1
              ? `1 cliente com MRR no contrato divergente do cadastro: ${divergencias[0].nome_cliente}.`
              : `${divergencias.length} clientes com MRR no contrato divergente do cadastro: ${divergencias.map((d) => d.nome_cliente).join(", ")}.`}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl text-verde-raiz">Receita vs Custos. Últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e1dc" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => fmtBRL(Number(v))} width={90} />
                <Tooltip formatter={(v: number) => fmtBRL(Number(v))} />
                <Legend />
                <Bar dataKey="Receita" fill="#1C3D2E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Custos" fill="#C9A84C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl text-verde-raiz">Saúde financeira por cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSaude ? (
            <div className="text-sm text-quase-preto/60">Carregando…</div>
          ) : saudeClientes.length === 0 ? (
            <div className="text-sm text-quase-preto/60">Nenhum cliente cadastrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="text-right">Faturamento médio 3m</TableHead>
                  <TableHead className="text-right">Ticket médio 3m</TableHead>
                  <TableHead className="text-right">Margem 3m</TableHead>
                  <TableHead className="text-right">Custos cadastrados</TableHead>
                  <TableHead>Alertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saudeClientes.map((c: SaudeFinanceiraCliente) => (
                  <TableRow key={c.cliente_id}>
                    <TableCell>
                      <div className="font-medium">{c.nome_cliente}</div>
                      {c.nome_clinica && (
                        <div className="text-xs text-quase-preto/60">{c.nome_clinica}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{fmtBRL(Number(c.mrr_atual || 0))}</TableCell>
                    <TableCell className="text-right">
                      {c.faturamento_medio_3m === null ? "—" : fmtBRL(Number(c.faturamento_medio_3m))}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.ticket_medio_3m === null ? "—" : fmtBRL(Number(c.ticket_medio_3m))}
                    </TableCell>
                    <TableCell className="text-right">{fmtPct(c.margem_liquida_3m)}</TableCell>
                    <TableCell className="text-right">{fmtBRL(Number(c.custo_total || 0))}</TableCell>
                    <TableCell className="space-x-1">
                      {!c.tem_contrato && <Badge variant="outline">sem contrato</Badge>}
                      {c.mrr_diverge_cadastro && c.tem_contrato && (
                        <Badge variant="destructive">MRR ≠ cadastro</Badge>
                      )}
                      {c.pagamentos_atrasados > 0 && (
                        <Badge variant="destructive">{c.pagamentos_atrasados} atrasado(s)</Badge>
                      )}
                      {!c.tem_kpis_mensais && <Badge variant="outline">sem KPIs</Badge>}
                      {c.meses_preenchidos_3m > 0 && c.meses_preenchidos_3m < 3 && (
                        <Badge variant="outline">{c.meses_preenchidos_3m}/3 meses</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
