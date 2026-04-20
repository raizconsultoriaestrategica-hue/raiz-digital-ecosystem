import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type KpiRow = {
  campo: string;
  valor: string | null;
  benchmark: string | null;
  mes: string | null;
};

const KPI_LABELS = ["Faturamento", "NPS", "Ocupação"] as const;

export default function Dashboard() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clienteNome, setClienteNome] = useState<string | null>(null);
  const [kpis, setKpis] = useState<Record<string, KpiRow | undefined>>({});

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) return;
      setLoading(true);

      // Busca o(s) cliente(s) vinculados ao usuário (admin pode não ter)
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nome_clinica, nome_cliente")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      const cliente = clientes?.[0];
      if (!active) return;

      if (!cliente) {
        setClienteNome(null);
        setKpis({});
        setLoading(false);
        return;
      }

      setClienteNome(cliente.nome_clinica || cliente.nome_cliente);

      const { data: rows } = await supabase
        .from("dashboard_data")
        .select("campo, valor, benchmark, mes, created_at")
        .eq("cliente_id", cliente.id)
        .eq("tipo", "KPI")
        .order("created_at", { ascending: false });

      if (!active) return;

      // Mantém o registro mais recente por campo
      const map: Record<string, KpiRow> = {};
      (rows ?? []).forEach((r) => {
        if (!map[r.campo]) {
          map[r.campo] = {
            campo: r.campo,
            valor: r.valor,
            benchmark: r.benchmark,
            mes: r.mes,
          };
        }
      });
      setKpis(map);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [user]);

  const hasAnyKpi = KPI_LABELS.some((k) => kpis[k]?.valor);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <span className="eyebrow">Área do cliente</span>
        <h1 className="mt-2 font-display text-4xl text-verde-raiz md:text-5xl">
          {clienteNome ? `Painel · ${clienteNome}` : "Seu painel Raiz"}
        </h1>
        <p className="mt-2 font-body text-sm text-quase-preto/70">
          {role === "admin"
            ? "Visão administrativa — KPIs do cliente vinculado ao seu usuário."
            : "KPIs, pilares e insights da sua clínica em tempo real."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {KPI_LABELS.map((label) => {
          const kpi = kpis[label];
          return (
            <Card key={label} className="border-border/60 shadow-soft">
              <CardHeader>
                <CardTitle className="font-display text-xl text-verde-raiz">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="mt-2 h-3 w-32" />
                  </>
                ) : kpi?.valor ? (
                  <>
                    <div className="font-display text-4xl text-caramelo">
                      {kpi.valor}
                    </div>
                    <div className="mt-1 font-body text-xs text-quase-preto/60">
                      {kpi.benchmark
                        ? `Benchmark: ${kpi.benchmark}`
                        : kpi.mes
                          ? `Referente a ${kpi.mes}`
                          : "Atualizado"}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-display text-4xl text-quase-preto/30">
                      —
                    </div>
                    <div className="mt-1 font-body text-xs text-quase-preto/60">
                      Sem dados
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loading && !clienteNome && (
        <Card className="border-dashed border-border/60 bg-linho/40 shadow-none">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="font-display text-2xl text-verde-raiz">
              Seu painel está sendo preparado
            </div>
            <p className="max-w-md font-body text-sm text-quase-preto/70">
              Ainda não há uma clínica vinculada ao seu usuário. Assim que sua
              consultora finalizar o onboarding, seus KPIs aparecerão por aqui.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && clienteNome && !hasAnyKpi && (
        <Card className="border-dashed border-border/60 bg-linho/40 shadow-none">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="font-display text-2xl text-verde-raiz">
              Coletando seus primeiros indicadores
            </div>
            <p className="max-w-md font-body text-sm text-quase-preto/70">
              Os KPIs de Faturamento, NPS e Ocupação aparecerão aqui assim que o
              primeiro ciclo de dados for registrado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
