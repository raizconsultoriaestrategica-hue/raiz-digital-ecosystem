import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

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
interface Contrato {
  valor_mensal: number;
  status: string;
}

export default function VisaoGeral() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, c, ct] = await Promise.all([
        (supabase as any).from("pagamentos_raiz").select("valor,vencimento,status,data_pagamento,cliente_nome"),
        (supabase as any).from("contas_pagar_raiz").select("valor,vencimento,status,data_pagamento"),
        (supabase as any).from("contratos_raiz").select("valor_mensal,status"),
      ]);
      setPagamentos(p.data ?? []);
      setContas(c.data ?? []);
      setContratos(ct.data ?? []);
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

  const projecao = useMemo(
    () => contratos.filter((c) => c.status === "ativo").reduce((s, c) => s + Number(c.valor_mensal || 0), 0),
    [contratos],
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

  const cards = [
    { title: "Receita do mês", value: fmtBRL(receitaMes), tone: "text-verde-raiz" },
    { title: "Custos do mês", value: fmtBRL(custosMes), tone: "text-quase-preto" },
    { title: "Margem líquida", value: fmtBRL(margem), tone: margem >= 0 ? "text-verde-raiz" : "text-red-600" },
    { title: "Clientes inadimplentes", value: String(inadimplentes), tone: inadimplentes > 0 ? "text-red-600" : "text-quase-preto" },
    { title: "Projeção próximo mês", value: fmtBRL(projecao), tone: "text-dourado" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="pb-2">
              <CardTitle className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                {c.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`font-display text-2xl ${c.tone}`}>{loading ? "…" : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
}
