import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TopBar from "./components/TopBar";
import HeroCard from "./components/HeroCard";
import FaturamentoRow from "./components/FaturamentoRow";
import KpiGrid from "./components/KpiGrid";
import RoiCard from "./components/RoiCard";
import ChartsRow from "./components/ChartsRow";
import ModulesGrid from "./components/ModulesGrid";
import InsightsCard from "./components/InsightsCard";
import PresentationMode from "./components/PresentationMode";
import BrandLogo from "@/components/brand/BrandLogo";
import CronogramaModulos from "@/components/CronogramaModulos";
import {
  avgModuloPct, groupRows, parseConfig, parseInsight, parseKpis,
  parseModulos, parsePilares,
} from "./logic";
import type { DashboardRow } from "./types";

interface Cliente {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  especialidade: string | null;
  ramo: string | null;
  orcamento_inicial: number | null;
  meta_faturamento: number | null;
  data_inicio_projeto: string | null;
  mes_referencia: string | null;
  pilares_foco: string | null;
  modulos_ativos: string | null;
  status: string | null;
}

export default function ClienteDashboard() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [presentation, setPresentation] = useState(false);
  const [tempoRespostaScore, setTempoRespostaScore] = useState<number | null>(null);

  // Carga
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      const { data: clientes } = await supabase
        .from("clientes")
        .select(
          "id, nome_cliente, nome_clinica, cidade, especialidade, ramo, orcamento_inicial, meta_faturamento, data_inicio_projeto, mes_referencia, pilares_foco, modulos_ativos, status",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      const c = clientes?.[0] as Cliente | undefined;
      if (!active) return;
      if (!c) { setCliente(null); setRows([]); setLoading(false); return; }
      setCliente(c);

      const [{ data: dashData }, { data: diagData }] = await Promise.all([
        supabase
          .from("dashboard_data")
          .select("tipo, campo, valor, benchmark, mes, updated_at")
          .eq("cliente_id", c.id),
        supabase
          .from("diagnostics")
          .select("scores")
          .eq("client_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      if (!active) return;
      setRows((dashData as DashboardRow[]) ?? []);

      // Extrai score da 1ª pergunta do Pilar 03 (tempo de resposta a leads)
      const scores = (diagData?.[0]?.scores ?? null) as Record<string, unknown> | null;
      const p03 = scores?.p03;
      if (Array.isArray(p03) && typeof p03[0] === "number") {
        setTempoRespostaScore(p03[0] as number);
      } else {
        setTempoRespostaScore(null);
      }

      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [user]);

  // Atalho P para apresentação
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key.toLowerCase() === "p") setPresentation((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Parse
  const grouped = useMemo(() => groupRows(rows), [rows]);
  const cfgFromRows = useMemo(() => parseConfig(grouped.CONFIG || []), [grouped]);
  const cfg = useMemo(() => ({
    // Mescla CONFIG (dashboard_data) com dados da tabela clientes
    cliente_nome: cfgFromRows.cliente_nome || cliente?.nome_cliente,
    nome_clinica: cfgFromRows.nome_clinica || cliente?.nome_clinica || undefined,
    especialidade: cfgFromRows.especialidade || cliente?.especialidade || undefined,
    cidade: cfgFromRows.cidade || cliente?.cidade || undefined,
    faturamento_inicial: cfgFromRows.faturamento_inicial ?? (cliente?.orcamento_inicial ?? undefined),
    meta_faturamento: cfgFromRows.meta_faturamento ?? (cliente?.meta_faturamento ?? undefined),
    inicio_consultoria: cfgFromRows.inicio_consultoria || cliente?.data_inicio_projeto || undefined,
    mes_referencia: cfgFromRows.mes_referencia || cliente?.mes_referencia || undefined,
    ramo: cfgFromRows.ramo || cliente?.ramo || undefined,
    pilares_foco: cfgFromRows.pilares_foco || cliente?.pilares_foco || undefined,
    modulos_ativos: cfgFromRows.modulos_ativos || cliente?.modulos_ativos || undefined,
  }), [cfgFromRows, cliente]);

  const pilaresAll = useMemo(() => parsePilares(grouped.PILAR || []), [grouped]);
  const pilares = useMemo(() => {
    const raw = (cfg.pilares_foco || "").trim();
    if (!raw) return pilaresAll;
    const norm = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const foco = raw.split(/[,;|]/).map(norm).filter(Boolean);
    if (foco.length === 0) return pilaresAll;
    const filtered = pilaresAll.filter((p) =>
      foco.some((f) => norm(p.label).includes(f) || norm(p.key) === f || p.num === f),
    );
    return filtered.length > 0 ? filtered : pilaresAll;
  }, [pilaresAll, cfg.pilares_foco]);
  const kpisBase = useMemo(() => parseKpis(grouped.KPI || []), [grouped]);
  const kpis = useMemo(() => {
    const TEXTO: Record<number, string> = {
      0: "> 24h ou não responde",
      1: "Mesmo dia com atraso",
      2: "Até 2 horas",
      3: "Até 30 min (protocolo)",
    };
    const hasScore = tempoRespostaScore !== null && tempoRespostaScore !== undefined;
    const score = hasScore ? Math.max(0, Math.min(3, Math.round(tempoRespostaScore as number))) : null;

    const status: "ok" | "warn" | "crit" | "neutral" =
      score === null ? "neutral" : score === 3 ? "ok" : score === 2 ? "warn" : "crit";
    const statusLabel =
      score === null
        ? "Sem dado"
        : status === "ok"
          ? "✓ No benchmark"
          : status === "warn"
            ? "↗ Próximo"
            : "⚠ Abaixo";

    const tempoKpi = {
      key: "tempo_resposta_lead",
      label: "Tempo de Resposta Lead",
      valor: score,
      benchmark: 3,
      unidade: "" as const,
      higher: true,
      status,
      statusLabel,
      pct: score === null ? 0 : Math.round((score / 3) * 100),
      valorTexto: score === null ? "Não informado" : TEXTO[score],
      benchmarkTexto: `Meta: ${TEXTO[3]}`,
    };

    // Insere logo após taxa_conversao se existir, senão no início
    const idx = kpisBase.findIndex((k) => k.key === "taxa_conversao");
    const out = [...kpisBase];
    out.splice(idx >= 0 ? idx + 1 : 0, 0, tempoKpi);
    return out;
  }, [kpisBase, tempoRespostaScore]);
  const modulos = useMemo(() => parseModulos(grouped.MODULO || []), [grouped]);
  const insight = useMemo(() => parseInsight(grouped.INSIGHT || []), [grouped]);
  const avg = useMemo(() => avgModuloPct(modulos), [modulos]);

  const userName = cliente?.nome_cliente || user?.email || "Você";

  // ---------- LOADING ----------
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-verde-raiz">
        <BrandLogo onDark className="h-10" />
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-dourado/20 border-t-dourado" />
        <p className="text-sm text-linho/70">Carregando dashboard...</p>
      </div>
    );
  }

  // ---------- EMPTY ----------
  const isEmpty = !cliente || (rows.length === 0);
  if (isEmpty) {
    return (
      <div className="min-h-screen bg-off-white">
        <TopBar
          userName={userName}
          onTogglePresentation={() => setPresentation(true)}
          onSignOut={signOut}
        />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-verde-musgo">
            Em preparação
          </span>
          <h1 className="mt-3 font-display text-3xl text-verde-raiz sm:text-4xl">
            Seu dashboard está sendo preparado
          </h1>
          <p className="mt-3 text-quase-preto/70">
            O consultor irá ativar em breve. Assim que os primeiros KPIs forem
            registrados, você verá tudo aqui.
          </p>
          <div className="mt-6">
            <Button asChild variant="outline" className="border-verde-raiz/30 text-verde-raiz hover:bg-verde-raiz/5">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ---------- DASHBOARD ----------
  return (
    <div className="min-h-screen bg-off-white">
      <TopBar
        userName={userName}
        onTogglePresentation={() => setPresentation(true)}
        onSignOut={signOut}
      />

      <main className="mx-auto max-w-[1320px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <HeroCard cfg={cfg} avgPct={avg} />
        <FaturamentoRow cfg={cfg} />

        {kpis.length > 0 ? (
          <KpiGrid kpis={kpis} />
        ) : (
          <EmptyBlock title="Sem KPIs ainda" hint="O consultor está coletando os primeiros indicadores." />
        )}

        <RoiCard kpis={kpis} faturamentoBase={cfg.faturamento_inicial} />

        <ChartsRow pilares={pilares} kpis={kpis} />

        <ModulesGrid modulos={modulos} />

        {cliente?.status === "projeto_ativo" && (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-soft">
            <CronogramaModulos
              clienteId={cliente.id}
              dataInicioProj={cliente.data_inicio_projeto ?? null}
            />
          </div>
        )}

        <InsightsCard texto={insight} cfg={cfg} />

        <footer className="border-t border-border/60 pt-4 text-center text-[11px] uppercase tracking-[0.2em] text-quase-preto/45">
          Dashboard de Acompanhamento — Raiz Consultoria Estratégica · Atualizado pelo consultor
        </footer>
      </main>

      <PresentationMode
        open={presentation}
        onClose={() => setPresentation(false)}
        cfg={cfg}
        kpis={kpis}
        pilares={pilares}
      />
    </div>
  );
}

function EmptyBlock({ title, hint }: { title: string; hint?: string }) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
      <div className="font-display text-xl text-verde-raiz">{title}</div>
      {hint && <p className="mt-1 text-sm text-quase-preto/60">{hint}</p>}
      <div className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </section>
  );
}
