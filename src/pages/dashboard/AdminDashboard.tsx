import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

type Cliente = {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  plano: string | null;
  created_at: string | null;
};

type Row = {
  cliente_id: string | null;
  campo: string;
  valor: string | null;
  benchmark: string | null;
};

type LinhaPainel = {
  cliente: Cliente;
  score: number | null;
  scoreMax: number | null;
  classificacao: string | null;
  temDiagnostico: boolean;
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [linhas, setLinhas] = useState<LinhaPainel[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);

      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nome_cliente, nome_clinica, cidade, plano, created_at")
        .order("created_at", { ascending: false });

      if (!active) return;
      const lista = (clientes ?? []) as Cliente[];

      if (lista.length === 0) {
        setLinhas([]);
        setLoading(false);
        return;
      }

      const ids = lista.map((c) => c.id);
      const { data: diag } = await supabase
        .from("dashboard_data")
        .select("cliente_id, campo, valor, benchmark")
        .in("cliente_id", ids)
        .in("campo", ["SCORE_TOTAL", "CLASSIFICACAO"]);

      if (!active) return;
      const porCliente = new Map<string, { score?: Row; classif?: Row }>();
      ((diag ?? []) as Row[]).forEach((r) => {
        if (!r.cliente_id) return;
        const slot = porCliente.get(r.cliente_id) ?? {};
        if (r.campo === "SCORE_TOTAL") slot.score = r;
        if (r.campo === "CLASSIFICACAO") slot.classif = r;
        porCliente.set(r.cliente_id, slot);
      });

      const result: LinhaPainel[] = lista.map((c) => {
        const slot = porCliente.get(c.id);
        const scoreVal = slot?.score?.valor ? Number(slot.score.valor) : null;
        const scoreMax = slot?.score?.benchmark ? Number(slot.score.benchmark) : null;
        return {
          cliente: c,
          score: scoreVal,
          scoreMax,
          classificacao: slot?.classif?.valor ?? null,
          temDiagnostico: !!slot?.score,
        };
      });

      setLinhas(result);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const total = linhas.length;
  const comDiag = linhas.filter((l) => l.temDiagnostico).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Visão administrativa</span>
          <h1 className="mt-2 font-display text-4xl text-verde-raiz md:text-5xl">
            Gestão de clientes
          </h1>
          <p className="mt-2 font-body text-sm text-quase-preto/70">
            Acompanhe todos os clientes cadastrados e o status do Diagnóstico 360°.
          </p>
        </div>
        <Button asChild className="bg-verde-raiz hover:bg-verde-raiz/90">
          <Link to="/ferramentas/diagnostico">Novo diagnóstico</Link>
        </Button>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && total === 0 && (
        <Card className="border-dashed border-border/60 bg-linho/40 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="font-display text-2xl text-verde-raiz">
              Nenhum cliente cadastrado
            </div>
            <p className="max-w-md font-body text-sm text-quase-preto/70">
              Crie o primeiro cliente direto pelo Diagnóstico 360°.
            </p>
            <Button asChild className="mt-2 bg-verde-raiz hover:bg-verde-raiz/90">
              <Link to="/ferramentas/diagnostico">Abrir Diagnóstico 360°</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && total > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/60 shadow-soft">
              <CardContent className="py-5">
                <div className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  Clientes
                </div>
                <div className="mt-1 font-display text-3xl text-verde-raiz">{total}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-soft">
              <CardContent className="py-5">
                <div className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  Com diagnóstico
                </div>
                <div className="mt-1 font-display text-3xl text-caramelo">{comDiag}</div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-soft">
              <CardContent className="py-5">
                <div className="font-body text-xs uppercase tracking-wide text-quase-preto/60">
                  Pendentes
                </div>
                <div className="mt-1 font-display text-3xl text-quase-preto">
                  {total - comDiag}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/60 shadow-soft">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Clínica</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((l) => (
                    <TableRow key={l.cliente.id}>
                      <TableCell className="font-medium">{l.cliente.nome_cliente}</TableCell>
                      <TableCell>{l.cliente.nome_clinica ?? "—"}</TableCell>
                      <TableCell>{l.cliente.cidade ?? "—"}</TableCell>
                      <TableCell>
                        {l.score != null ? (
                          <span className="font-display text-caramelo">
                            {l.score}
                            <span className="ml-1 font-body text-xs text-quase-preto/60">
                              / {l.scoreMax ?? "—"}
                            </span>
                          </span>
                        ) : (
                          <span className="text-quase-preto/40">—</span>
                        )}
                      </TableCell>
                      <TableCell>{l.classificacao ?? "—"}</TableCell>
                      <TableCell>
                        {l.temDiagnostico ? (
                          <Badge className="bg-verde-raiz/10 text-verde-raiz hover:bg-verde-raiz/15">
                            Concluído
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-border/60 text-quase-preto/60">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-verde-raiz/30 text-verde-raiz hover:bg-verde-raiz/5"
                        >
                          <Link to="/ferramentas/diagnostico">
                            {l.temDiagnostico ? "Ver / editar" : "Diagnosticar"}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
