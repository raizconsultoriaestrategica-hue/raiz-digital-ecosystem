import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, Circle } from "lucide-react";

interface ModuloContratado {
  id: string;
  mes_execucao: number;
  status: "pendente" | "em_andamento" | "concluido";
  data_inicio: string | null;
  data_conclusao: string | null;
  modulos: {
    codigo: string;
    nome: string;
    pilar: number;
    pilar_nome: string;
    fase: number;
  };
}

interface Props {
  clienteId: string;
  dataInicioProj: string | null;
}

const FASE_LABEL: Record<number, string> = {
  1: "Base",
  2: "Consolidação",
  3: "Escala",
};

const FASE_COLOR: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800 border-emerald-200",
  2: "bg-amber-100 text-amber-800 border-amber-200",
  3: "bg-purple-100 text-purple-800 border-purple-200",
};

const STATUS_ICON: Record<ModuloContratado["status"], JSX.Element> = {
  pendente: <Circle className="h-4 w-4 text-quase-preto/40" />,
  em_andamento: <Clock className="h-4 w-4 text-dourado" />,
  concluido: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
};

const STATUS_LABEL: Record<ModuloContratado["status"], string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const STATUS_BADGE: Record<ModuloContratado["status"], string> = {
  pendente: "bg-linho text-quase-preto/60 border-border",
  em_andamento: "bg-dourado/15 text-[#8B6F1E] border-dourado/30",
  concluido: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function getMesLabel(mes: number, dataInicio: string | null): string {
  if (!dataInicio) return `Mês ${mes}`;
  const [ano, month, dia] = dataInicio.split('-').map(Number);
  const d = new Date(ano, month - 1 + (mes - 1), 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function CronogramaModulos({ clienteId, dataInicioProj }: Props) {
  const [modulos, setModulos] = useState<ModuloContratado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchModulos() {
      setLoading(true);
      const { data, error } = await supabase
        .from("cliente_modulos")
        .select(`
          id,
          mes_execucao,
          status,
          data_inicio,
          data_conclusao,
          modulos (
            codigo,
            nome,
            pilar,
            pilar_nome,
            fase
          )
        `)
        .eq("cliente_id", clienteId)
        .order("mes_execucao", { ascending: true });

      if (!active) return;
      if (!error && data) setModulos(data as unknown as ModuloContratado[]);
      setLoading(false);
    }
    fetchModulos();
    return () => {
      active = false;
    };
  }, [clienteId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (modulos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-quase-preto/60">
        Nenhum módulo contratado cadastrado ainda.
      </div>
    );
  }

  const porMes = modulos.reduce<Record<number, ModuloContratado[]>>((acc, m) => {
    const mes = m.mes_execucao;
    if (!acc[mes]) acc[mes] = [];
    acc[mes].push(m);
    return acc;
  }, {});

  const meses = Object.keys(porMes).map(Number).sort((a, b) => a - b);

  const total = modulos.length;
  const concluidos = modulos.filter((m) => m.status === "concluido").length;
  const progressoPct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-xl text-verde-raiz">
            Cronograma de Módulos
          </h3>
          <p className="mt-1 text-xs text-quase-preto/60">
            {concluidos} de {total} módulos concluídos
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl text-verde-raiz">{progressoPct}%</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-quase-preto/55">
            concluído
          </div>
        </div>
      </header>

      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-linho">
        <div
          className="h-full rounded-full bg-verde-raiz transition-all duration-700"
          style={{ width: `${progressoPct}%` }}
        />
      </div>

      <div className="space-y-6">
        {meses.map((mes) => {
          const modulosMes = porMes[mes];
          const label = getMesLabel(mes, dataInicioProj);

          const porFase = modulosMes.reduce<Record<number, ModuloContratado[]>>(
            (acc, m) => {
              const f = m.modulos.fase;
              if (!acc[f]) acc[f] = [];
              acc[f].push(m);
              return acc;
            },
            {},
          );

          return (
            <div key={mes} className="rounded-lg border border-border/70 bg-off-white/40 p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-md bg-verde-raiz px-2.5 py-1 font-display text-sm text-dourado">
                  M{mes}
                </span>
                <span className="text-sm font-medium capitalize text-quase-preto">
                  {label}
                </span>
              </div>

              <div className="space-y-4">
                {Object.entries(porFase)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([fase, itens]) => (
                    <div key={fase}>
                      <Badge
                        variant="outline"
                        className={`mb-2 text-[10px] font-semibold uppercase tracking-wide ${FASE_COLOR[Number(fase)]}`}
                      >
                        Fase {fase}. {FASE_LABEL[Number(fase)]}
                      </Badge>
                      <ul className="space-y-2">
                        {itens.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-3 rounded-md border border-border/60 bg-card p-3"
                          >
                            <div className="mt-0.5">{STATUS_ICON[item.status]}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="mr-2 rounded bg-linho px-1.5 py-0.5 font-mono text-[11px] text-quase-preto/70">
                                    {item.modulos.codigo}
                                  </span>
                                  <span className="text-sm font-medium text-quase-preto">
                                    {item.modulos.nome}
                                  </span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${STATUS_BADGE[item.status]}`}
                                >
                                  {STATUS_LABEL[item.status]}
                                </Badge>
                              </div>
                              <div className="mt-1 text-[11px] text-quase-preto/55">
                                {item.modulos.pilar_nome}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
