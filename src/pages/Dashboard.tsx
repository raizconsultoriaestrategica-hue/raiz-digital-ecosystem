import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PILARES } from "@/features/diagnostico/data";
import AdminDashboard from "./dashboard/AdminDashboard";

type Row = {
  campo: string;
  valor: string | null;
  benchmark: string | null;
  mes: string | null;
};

export default function Dashboard() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clienteNome, setClienteNome] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (role === "admin") {
      setLoading(false);
      return;
    }
    let active = true;
    async function load() {
      if (!user) return;
      setLoading(true);

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
        setRows([]);
        setLoading(false);
        return;
      }

      setClienteNome(cliente.nome_clinica || cliente.nome_cliente);

      const { data } = await supabase
        .from("dashboard_data")
        .select("campo, valor, benchmark, mes")
        .eq("cliente_id", cliente.id)
        .eq("tipo", "PILAR")
        .eq("mes", "Diagnóstico");

      if (!active) return;
      setRows(data ?? []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [user, role]);

  if (role === "admin") return <AdminDashboard />;

  const byCampo = rows.reduce<Record<string, Row>>((acc, r) => {
    acc[r.campo] = r;
    return acc;
  }, {});

  const scoreTotal = byCampo["SCORE_TOTAL"];
  const classif = byCampo["CLASSIFICACAO"];
  const totalNum = Number(scoreTotal?.valor ?? 0);
  const totalMax = Number(scoreTotal?.benchmark ?? 0);
  const totalPct = totalMax > 0 ? Math.round((totalNum / totalMax) * 100) : 0;

  const pilarRows = PILARES.map((p) => {
    const r = byCampo[p.name];
    if (!r) return null;
    const v = Number(r.valor ?? 0);
    const m = Number(r.benchmark ?? p.max);
    const pct = m > 0 ? Math.round((v / m) * 100) : 0;
    return { id: p.id, num: p.num, name: p.name, valor: v, max: m, pct };
  }).filter((x): x is NonNullable<typeof x> => !!x);

  const hasDiag = !!scoreTotal;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <span className="eyebrow">Área do cliente</span>
        <h1 className="mt-2 font-display text-4xl text-verde-raiz md:text-5xl">
          {clienteNome ? `Painel · ${clienteNome}` : "Seu painel Raiz"}
        </h1>
        <p className="mt-2 font-body text-sm text-quase-preto/70">
          Maturidade da sua clínica avaliada pelos 7 pilares do método Raiz.
        </p>
      </div>

      {loading && (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!loading && !clienteNome && (
        <Card className="border-dashed border-border/60 bg-linho/40 shadow-none">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <div className="font-display text-2xl text-verde-raiz">
              Seu painel está sendo preparado
            </div>
            <p className="max-w-md font-body text-sm text-quase-preto/70">
              Ainda não há uma clínica vinculada ao seu usuário. Assim que sua
              consultora finalizar o onboarding, seus indicadores aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && clienteNome && !hasDiag && (
        <Card className="border-dashed border-border/60 bg-linho/40 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="eyebrow">Diagnóstico 360°</span>
            <div className="font-display text-2xl text-verde-raiz">
              Comece pelo Diagnóstico 360°
            </div>
            <p className="max-w-md font-body text-sm text-quase-preto/70">
              Avalie os 7 pilares da clínica e gere automaticamente o painel de
              maturidade, prioridades e plano recomendado.
            </p>
            <Button asChild className="mt-2 bg-verde-raiz hover:bg-verde-raiz/90">
              <Link to="/ferramentas/diagnostico">Iniciar Diagnóstico 360°</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && hasDiag && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/60 shadow-soft">
              <CardHeader>
                <CardTitle className="font-display text-xl text-verde-raiz">
                  Score de Maturidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl text-caramelo">
                    {totalNum}
                  </span>
                  <span className="font-body text-sm text-quase-preto/60">
                    / {totalMax} pts
                  </span>
                </div>
                <Progress value={totalPct} className="mt-4 h-3" />
                <div className="mt-2 font-body text-xs text-quase-preto/60">
                  {totalPct}% do potencial avaliado
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-soft">
              <CardHeader>
                <CardTitle className="font-display text-xl text-verde-raiz">
                  Classificação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl text-verde-raiz">
                  {classif?.valor ?? "—"}
                </div>
                {classif?.benchmark && (
                  <div className="mt-2 font-body text-sm text-quase-preto/70">
                    Plano recomendado:{" "}
                    <span className="font-medium text-caramelo">
                      {classif.benchmark}
                    </span>
                  </div>
                )}
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 border-verde-raiz/30 text-verde-raiz hover:bg-verde-raiz/5"
                >
                  <Link to="/ferramentas/diagnostico">Refazer diagnóstico</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="font-display text-2xl text-verde-raiz">
              Pilares avaliados
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {pilarRows.map((p) => (
                <Card key={p.id} className="border-border/60 shadow-soft">
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-sm text-caramelo">
                          {p.num}
                        </span>
                        <span className="font-body text-sm font-medium text-quase-preto">
                          {p.name}
                        </span>
                      </div>
                      <span className="font-body text-xs text-quase-preto/60">
                        {p.valor}/{p.max}
                      </span>
                    </div>
                    <Progress value={p.pct} className="mt-3 h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
