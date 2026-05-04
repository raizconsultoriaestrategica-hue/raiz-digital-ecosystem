// Lógica pura: parse, agrupamento por tipo, status, ROI

import type {
  ClienteCfg, DashboardRow, KpiItem, ModuloItem, PilarScore,
} from "./types";
import { KPI_BY_KEY, KPI_CATALOG, type KpiMeta } from "./kpis";

const num = (v: string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  // aceita "1.234,56" (BR) e "1234.56"
  const norm = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(norm);
  if (Number.isFinite(n)) return n;
  const n2 = Number(v);
  return Number.isFinite(n2) ? n2 : null;
};

export function groupRows(rows: DashboardRow[]) {
  const out: Record<string, DashboardRow[]> = {
    CONFIG: [], PILAR: [], KPI: [], MODULO: [], INSIGHT: [],
  };
  rows.forEach((r) => {
    const t = (r.tipo || "").toUpperCase();
    if (out[t]) out[t].push(r);
  });
  return out;
}

export function parseConfig(rows: DashboardRow[]): ClienteCfg {
  const cfg: ClienteCfg = {};
  rows.forEach((r) => {
    const k = r.campo;
    const v = r.valor ?? "";
    switch (k) {
      case "cliente_nome": cfg.cliente_nome = v; break;
      case "nome_clinica": cfg.nome_clinica = v; break;
      case "especialidade": cfg.especialidade = v; break;
      case "cidade": cfg.cidade = v; break;
      case "faturamento_inicial":
      // Alias salvo pela ferramenta de Diagnóstico 360° (kpisIniciais.fat)
      case "orcamento_inicial":
        cfg.faturamento_inicial = num(v) ?? undefined; break;
      case "meta_faturamento":
      // Alias salvo pela ferramenta de Diagnóstico 360° (kpisIniciais.meta_fat)
      case "meta_faturamento_6m":
        cfg.meta_faturamento = num(v) ?? undefined; break;
      case "inicio_consultoria": cfg.inicio_consultoria = v; break;
      case "mes_referencia": cfg.mes_referencia = v; break;
      case "ramo": cfg.ramo = v; break;
      case "pilares_foco": cfg.pilares_foco = v; break;
      case "modulos_ativos": cfg.modulos_ativos = v; break;
    }
  });
  return cfg;
}

/** Pega o registro KPI mais recente (último mes que não seja 'Inicial'). */
export function parseKpis(rows: DashboardRow[]): KpiItem[] {
  // agrupa por campo e elege o "atual" (mes != 'Inicial' mais recente; fallback = mais recente geral)
  const byKey = new Map<string, DashboardRow[]>();
  rows.forEach((r) => {
    const arr = byKey.get(r.campo) || [];
    arr.push(r);
    byKey.set(r.campo, arr);
  });

  const items: KpiItem[] = [];
  KPI_CATALOG.forEach((meta) => {
    const list = byKey.get(meta.key) || [];
    if (!list.length) return;

    // ordena por updated_at DESC (fallback: mes string DESC)
    const sorted = [...list].sort((a, b) => {
      const ta = a.updated_at ? Date.parse(a.updated_at) : 0;
      const tb = b.updated_at ? Date.parse(b.updated_at) : 0;
      if (ta !== tb) return tb - ta;
      return String(b.mes ?? "").localeCompare(String(a.mes ?? ""));
    });

    const naoInicial = sorted.find((r) => (r.mes || "").toLowerCase() !== "inicial");
    const chosen = naoInicial || sorted[0];

    const valor = num(chosen.valor);
    const benchmark = num(chosen.benchmark);
    const { status, statusLabel, pct } = computeStatus(valor, benchmark, meta);
    items.push({
      key: meta.key,
      label: meta.label,
      unidade: meta.unidade,
      higher: meta.higher,
      noCompare: meta.noCompare,
      valor, benchmark, status, statusLabel, pct,
    });
  });
  return items;
}

export function computeStatus(
  valor: number | null,
  benchmark: number | null,
  meta: KpiMeta,
): { status: KpiItem["status"]; statusLabel: string; pct: number } {
  if (valor === null || benchmark === null || meta.noCompare) {
    // barra: % do valor vs benchmark se possível, senão 0
    let pct = 0;
    if (valor !== null && benchmark && benchmark > 0) {
      pct = Math.min(100, Math.round((valor / benchmark) * 100));
    }
    return { status: "neutral", statusLabel: "—", pct };
  }
  if (meta.higher) {
    if (valor >= benchmark) return { status: "ok", statusLabel: "✓ Benchmark", pct: 100 };
    if (valor >= benchmark * 0.85) {
      return { status: "warn", statusLabel: "↗ Próximo", pct: Math.round((valor / benchmark) * 100) };
    }
    return { status: "crit", statusLabel: "⚠ Abaixo", pct: Math.max(4, Math.round((valor / benchmark) * 100)) };
  }
  // lower is better
  if (valor <= benchmark) return { status: "ok", statusLabel: "✓ Benchmark", pct: 100 };
  if (valor <= benchmark * 1.30) {
    return { status: "warn", statusLabel: "↗ Próximo", pct: Math.round((benchmark / valor) * 100) };
  }
  return { status: "crit", statusLabel: "⚠ Abaixo", pct: Math.max(4, Math.round((benchmark / valor) * 100)) };
}

/** PILARES: separa Inicial e atual. campo = pilar_key (p01..p07 ou nome).
 *  valor = total bruto do pilar; benchmark = max bruto do pilar. */
export function parsePilares(rows: DashboardRow[]): PilarScore[] {
  const byKey = new Map<string, { inicial: number | null; atual: number | null; max: number; ordem: number }>();
  let i = 0;
  rows.forEach((r) => {
    const campo = r.campo;
    if (!campo || campo.startsWith("SCORE_") || campo === "CLASSIFICACAO" ||
        campo.endsWith("_JSON") || campo === "NOTAS" || campo === "ANALISE" || campo === "RAMO") return;

    const isInicial = (r.mes || "").toLowerCase() === "inicial" || (r.mes || "").toLowerCase() === "diagnóstico";
    const v = num(r.valor);
    if (v === null) return;
    const m = num(r.benchmark);

    const cur = byKey.get(campo) || { inicial: null, atual: null, max: 0, ordem: i++ };
    if (isInicial) cur.inicial = v;
    else cur.atual = v;
    // benchmark mais alto vence (max do pilar deve ser estável; protege contra valores antigos = 100)
    if (m !== null && m > cur.max) cur.max = m;
    byKey.set(campo, cur);
  });

  const arr: PilarScore[] = [];
  let n = 1;
  byKey.forEach((v, key) => {
    const num2 = String(n++).padStart(2, "0");
    const max = v.max > 0 ? v.max : 100; // fallback se nenhum benchmark salvo
    const delta = v.inicial !== null && v.atual !== null ? v.atual - v.inicial : null;
    const pctInicial = v.inicial !== null && max > 0 ? Math.round((v.inicial / max) * 100) : null;
    const pctAtual = v.atual !== null && max > 0 ? Math.round((v.atual / max) * 100) : null;
    const pctDelta = pctInicial !== null && pctAtual !== null ? pctAtual - pctInicial : null;
    arr.push({
      key, label: humanizePilar(key), num: num2,
      inicial: v.inicial, atual: v.atual, delta, max,
      pctInicial, pctAtual, pctDelta,
    });
  });
  return arr;
}

function humanizePilar(key: string): string {
  if (/^p0?\d+$/i.test(key)) {
    const map: Record<string, string> = {
      p01: "Atração & Marketing",
      p02: "Conversão de Leads",
      p03: "Experiência do Paciente",
      p04: "Operações Clínicas",
      p05: "Gestão Financeira",
      p06: "Time & Cultura",
      p07: "Tecnologia & Dados",
    };
    return map[key.toLowerCase()] || key.toUpperCase();
  }
  return key;
}

export function parseModulos(rows: DashboardRow[]): ModuloItem[] {
  return rows.map((r) => {
    // campo esperado: "M03. Funil de Conversão | pilar=p02"
    const raw = r.campo || "";
    const parts = raw.split("|");
    const principal = parts[0]?.trim() || raw;
    const pilarPart = parts.find((p) => p.includes("pilar=")) || "";
    const pilar = pilarPart.split("=")[1]?.trim();

    const m = principal.match(/^([A-Za-z0-9]+)\s*[—–-]\s*(.+)$/);
    const codigo = m?.[1] || "M";
    const nome = m?.[2] || principal;

    const status = sanitizeStatus(r.valor);
    const pctConcluido = (() => {
      const n = num(r.benchmark);
      if (n !== null) return Math.max(0, Math.min(100, Math.round(n)));
      // fallback por status
      return status === "Concluído" ? 100 : status === "Em Andamento" ? 50 : status === "Pausado" ? 25 : 0;
    })();

    return { codigo, nome, pilar, status, pctConcluido };
  });
}

function sanitizeStatus(v: string | null): ModuloItem["status"] {
  const s = (v || "").toLowerCase();
  if (s.includes("conclu")) return "Concluído";
  if (s.includes("andamento")) return "Em Andamento";
  if (s.includes("pausa")) return "Pausado";
  return "Não Iniciado";
}

export function parseInsight(rows: DashboardRow[]): string {
  const r = rows.find((x) => x.campo === "analise_estrategica") || rows[0];
  return r?.valor || "";
}

/** ROI: usa taxa_conversao, ticket_medio_rs, ocupacao_cadeiras */
export function computeRoi(faturamentoBase: number | null | undefined, kpis: KpiItem[]) {
  if (!faturamentoBase || faturamentoBase <= 0) {
    return { combinedFat: 0, totalImpact: 0, anual: 0 };
  }
  const used: KpiItem[] = [];
  ["taxa_conversao", "ticket_medio_rs", "ocupacao_cadeiras"].forEach((k) => {
    const it = kpis.find((x) => x.key === k);
    if (it && it.valor !== null && it.benchmark !== null && it.valor > 0 && it.benchmark > 0) {
      // só conta se há gap a favor do benchmark
      const meta = KPI_BY_KEY[it.key];
      if (meta?.higher && it.valor < it.benchmark) used.push(it);
      else if (meta && !meta.higher && it.valor > it.benchmark) used.push(it);
    }
  });
  let combined = faturamentoBase;
  used.forEach((it) => {
    const meta = KPI_BY_KEY[it.key];
    const ratio = meta.higher
      ? (it.benchmark as number) / (it.valor as number)
      : (it.valor as number) / (it.benchmark as number);
    combined = combined * ratio;
  });
  const totalImpact = combined - faturamentoBase;
  return { combinedFat: combined, totalImpact, anual: totalImpact * 12 };
}

/** Média de pctConcluido dos módulos para o anel do Hero */
export function avgModuloPct(modulos: ModuloItem[]): number {
  if (!modulos.length) return 0;
  return Math.round(modulos.reduce((s, m) => s + m.pctConcluido, 0) / modulos.length);
}

export function fmtBRL(n: number | null | undefined, opts?: { compact?: boolean }): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (opts?.compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
    return `R$ ${(n / 1000).toFixed(1).replace(".", ",")}k`;
  }
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function fmtKpiValue(v: number | null, unidade: KpiItem["unidade"]): string {
  if (v === null || !Number.isFinite(v)) return "—";
  if (unidade === "R$") return fmtBRL(v, { compact: true });
  if (unidade === "%") return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  if (unidade === "min") return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} min`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function fmtDate(s?: string | null): string {
  if (!s) return "—";
  // aceita YYYY-MM-DD ou DD/MM/YYYY
  const iso = /^\d{4}-\d{2}-\d{2}/;
  const d = iso.test(s) ? new Date(s) : new Date(s.split("/").reverse().join("-"));
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
