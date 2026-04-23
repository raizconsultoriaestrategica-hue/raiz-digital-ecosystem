import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Download, Save, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getClassif, getPlano, getScore, getSortedByPct, getStatus, getTotals,
} from "../logic";
import type { ClientData, Ramo, ScoresMap, SelOpts } from "../types";
import { RadarPilares } from "../components/RadarPilares";
import { PlanoCard } from "../components/PlanoCard";
import { generatePDF } from "../pdf";
import { saveDiagnosticoToSupabase, updateDiagnosticoNotasInSupabase } from "../persistence";
import { supabase } from "@/integrations/supabase/client";

interface ResultScreenProps {
  client: ClientData;
  selOpts: SelOpts;
  scores: ScoresMap;
  ramo: Ramo;
  clienteId: string | null;
  notas: string;
  analise: string;
  onNotasChange: (v: string) => void;
  onAnaliseChange: (v: string) => void;
  onRestart: () => void;
}

const STATUS_BAR: Record<string, string> = {
  critico: "bg-destructive",
  atencao: "bg-caramelo",
  regular: "bg-dourado",
  bom: "bg-verde-musgo",
  otimo: "bg-teal-700",
};
const STATUS_PILL: Record<string, string> = {
  critico: "bg-destructive/10 text-destructive",
  atencao: "bg-caramelo/10 text-caramelo",
  regular: "bg-dourado/15 text-dourado",
  bom: "bg-verde-menta text-verde-musgo",
  otimo: "bg-teal-50 text-teal-700",
};

export function ResultScreen({
  client, selOpts, scores, ramo, clienteId, notas, analise,
  onNotasChange, onAnaliseChange, onRestart,
}: ResultScreenProps) {
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const computed = useMemo(() => {
    const totals = getTotals(scores, selOpts, ramo);
    const classif = getClassif(totals.totalPct);
    const plano = getPlano(totals.totalPct, ramo);
    const sorted = getSortedByPct(scores, selOpts, ramo);
    return { ...totals, classif, plano, sorted };
  }, [scores, selOpts, ramo]);

  const { totalScore, totalMax, totalPct, classif, plano, sorted } = computed;
  const dor = client.dor || "não informada";
  const meta = client.meta || "não informada";
  const criticos = sorted.filter((p) => getScore(scores, p.id, ramo).pct < 0.35);
  const atencao = sorted.filter((p) => {
    const pct = getScore(scores, p.id, ramo).pct;
    return pct >= 0.35 && pct < 0.55;
  });

  const buildSnapshot = () => ({
    client, selOpts, scores,
    totalScore, totalMax, totalPct, classif, plano,
    sortedIds: sorted.map((p) => p.id),
    notas,
    analise,
    ramo,
    timestamp: Date.now(),
    cliente_id: clienteId,
  });

  const handleAnalisar = async () => {
    setAnalyzing(true);
    try {
      const pilares = sorted.map((p) => {
        const s = getScore(scores, p.id, ramo);
        return { name: p.name, pct: s.pct, total: s.total, max: s.max };
      });
      const { data, error } = await supabase.functions.invoke("diagnostico-analise", {
        body: {
          clientName: client.name,
          ramo,
          classifLabel: classif.label,
          planoName: plano.name,
          totalPct,
          dor: client.dor,
          meta: client.meta,
          objetivo: client.objetivo,
          pilares,
        },
      });
      if (error) throw error;
      const a = (data as { analise?: string; error?: string })?.analise;
      if (!a) throw new Error((data as { error?: string })?.error || "Sem análise");
      onAnaliseChange(a);
      if (clienteId) {
        try { await updateDiagnosticoNotasInSupabase(clienteId, notas, a); } catch { /* noop */ }
      }
      toast.success("Análise gerada com IA.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao gerar análise";
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!clienteId) {
      toast.error("Vincule um cliente antes de salvar no Supabase.");
      return;
    }
    setSaving(true);
    try {
      const snap = buildSnapshot();
      await saveDiagnosticoToSupabase(clienteId, snap);
      toast.success("Diagnóstico salvo no Supabase e disponível no painel admin.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao salvar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePDF = () => {
    const snap = buildSnapshot();
    generatePDF(snap, notas);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="bg-verde-raiz px-6 py-7 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="relative h-28 w-28 flex-shrink-0">
            <svg viewBox="0 0 110 110" className="-rotate-90">
              <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(245,237,212,0.15)" strokeWidth="8" />
              <circle
                cx="55" cy="55" r="46" fill="none" stroke="#C9A84C" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - totalPct)}
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-display text-3xl font-semibold text-linho">{totalScore}</span>
              <span className="text-[10px] text-linho/50">de {totalMax}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-wider text-linho/50">Diagnóstico · {client.name}</div>
            <div className="mt-1 inline-block rounded-full border border-dourado/30 bg-dourado/15 px-4 py-1 text-sm font-semibold text-dourado">
              {classif.label}
            </div>
            <div className="mt-1.5 text-sm text-linho/60">{classif.desc}</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-7 md:px-8">
        <Tabs defaultValue="visao">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="visao">Visão Geral</TabsTrigger>
            <TabsTrigger value="pilares">Pilares</TabsTrigger>
            <TabsTrigger value="plano">Plano</TabsTrigger>
            <TabsTrigger value="notas">Notas / PDF</TabsTrigger>
          </TabsList>

          <TabsContent value="visao" className="mt-6 space-y-5">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-verde-musgo" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-verde-musgo">
                  Análise estratégica
                </span>
              </div>
              <div className="space-y-2.5 text-sm leading-relaxed text-quase-preto">
                {criticos.length > 0 ? (
                  <>
                    <p>
                      Com base no diagnóstico de <strong>{client.name}</strong>, identificamos{" "}
                      <strong>{criticos.length} pilar(es) crítico(s)</strong> que explicam diretamente a dor relatada:{" "}
                      <em>"{dor}"</em>.
                    </p>
                    <p>
                      Os gargalos mais urgentes estão em{" "}
                      <strong>
                        {criticos.slice(0, 2).map((p) => p.name.split("&")[0].trim()).join(" e ")}
                      </strong>
                      . Sem estruturar essas áreas primeiro, qualquer investimento em marketing vai escorrer pelo ralo.
                    </p>
                  </>
                ) : (
                  <p>
                    A clínica de <strong>{client.name}</strong> já tem uma base funcionando. O diagnóstico mostra
                    maturidade acima da média nos pilares fundamentais.
                  </p>
                )}
                {atencao.length > 0 && (
                  <p>
                    Em segundo nível,{" "}
                    <strong>
                      {atencao.slice(0, 2).map((p) => p.name.split("&")[0].trim()).join(" e ")}
                    </strong>{" "}
                    precisam de atenção — não são emergências, mas estão limitando o crescimento.
                  </p>
                )}
                <p>
                  Para alcançar a meta de <strong>{meta}</strong>, o caminho mais direto passa por estruturar processos
                  de atendimento e conversão <em>antes</em> de escalar o investimento em captação.
                </p>
              </div>
            </div>

            <div>
              <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-quase-preto/60">Prioridades</div>
              <div className="space-y-2.5">
                {sorted.slice(0, 4).map((p, i) => {
                  const pct = getScore(scores, p.id).pct;
                  const borders = ["border-l-destructive", "border-l-caramelo", "border-l-dourado", "border-l-dourado"];
                  const insights = [
                    "Maior oportunidade imediata de impacto no faturamento. Ação urgente.",
                    "Gargalo que bloqueia a escala do negócio. Resolver em seguida.",
                    "Área importante para solidificar e sustentar o crescimento.",
                    "Atenção estratégica para manter o avanço conquistado.",
                  ];
                  return (
                    <div
                      key={p.id}
                      className={cn("rounded-lg border border-border bg-card p-3.5 border-l-4", borders[i])}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-quase-preto/50">
                        PRIORIDADE {i + 1}
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-quase-preto">{p.name}</div>
                      <div className="mt-1 text-xs leading-relaxed text-quase-preto/60">
                        {insights[i]} ({Math.round(pct * 100)}% de maturidade)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pilares" className="mt-6 space-y-5">
            <div className="grid gap-2.5 md:grid-cols-2">
              {sorted.map((p) => {
                const { total, max, pct } = getScore(scores, p.id);
                const st = getStatus(pct);
                return (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-quase-preto">
                        {p.num} · {p.name.split("&")[0].trim()}
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_PILL[st.cls])}>
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", STATUS_BAR[st.cls])}
                        style={{ width: `${Math.round(pct * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-quase-preto/50">
                      {total} / {max} pts · {Math.round(pct * 100)}%
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-quase-preto/60">
                Mapa de maturidade
              </div>
              <RadarPilares
                pilares={sorted}
                pcts={sorted.map((p) => getScore(scores, p.id).pct)}
                clientName={client.name}
              />
            </div>
          </TabsContent>

          <TabsContent value="plano" className="mt-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <PlanoCard plano={plano} />
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-quase-preto/60">
                  Cronograma de execução
                </div>
                <div className="space-y-3.5">
                  {[
                    { n: "1", p: "Semanas 1–2", t: "Diagnóstico Profundo & Kickoff" },
                    { n: "2", p: "Meses 1–2", t: `Estruturação: ${sorted[0]?.name.split("&")[0].trim() ?? ""}` },
                    { n: "3", p: "Mês 2–3", t: `Ativação: ${sorted[1]?.name.split("&")[0].trim() ?? ""}` },
                    { n: "4", p: "Mês 3+", t: "Aceleração & Consolidação" },
                    { n: "5", p: "Resultado Final", t: "Crescimento Sustentável" },
                  ].map((f) => (
                    <div key={f.n} className="flex gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-verde-musgo bg-verde-menta text-xs font-bold text-verde-raiz">
                        {f.n}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-dourado">{f.p}</div>
                        <div className="text-sm font-semibold text-quase-preto">{f.t}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notas" className="mt-6 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <Label className="text-sm font-semibold text-quase-preto">Notas da reunião</Label>
              <p className="mt-0.5 text-xs text-quase-preto/50">
                Aparece no PDF ao final do relatório. Edite à vontade antes de exportar.
              </p>
              <Textarea
                value={notas}
                onChange={(e) => onNotasChange(e.target.value)}
                rows={6}
                className="mt-3"
                placeholder="Tópicos da conversa, próximos passos, compromissos…"
              />
            </div>
            <div className="grid gap-2.5 md:grid-cols-3">
              <Button onClick={handlePDF} className="bg-verde-raiz text-linho hover:bg-verde-musgo">
                <Download className="mr-2 h-4 w-4" /> Exportar PDF
              </Button>
              <Button onClick={handleSave} disabled={saving || !clienteId} className="bg-dourado text-verde-raiz hover:bg-dourado/90">
                <Save className="mr-2 h-4 w-4" /> {saving ? "Salvando…" : "Salvar no Supabase"}
              </Button>
              <Button variant="outline" onClick={onRestart}>
                <RotateCcw className="mr-2 h-4 w-4" /> Novo diagnóstico
              </Button>
            </div>
            {!clienteId && (
              <p className="text-center text-xs text-quase-preto/55">
                Vincule um cliente na etapa "Dados" para habilitar o salvamento no Supabase.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("font-semibold", className)}>{children}</div>;
}
