import { supabase } from "@/integrations/supabase/client";
import { CLASSIFS, fromRamoCanonico, getPilaresByRamo, getPlanosByRamo, KPI_INIT_FIELDS, PILARES, PLANOS, toRamoCanonico } from "./data";
import type { ClientData, DiagnosticoSnapshot, KpisIniciaisData, Ramo, ScoresMap, SelOpts } from "./types";
import type { Json } from "@/integrations/supabase/types";

/**
 * Persiste o diagnóstico em dashboard_data:
 * - 1 linha por pilar (tipo='PILAR', campo=nome do pilar, valor=pontuação, benchmark=máximo)
 * - Linhas resumo SCORE_TOTAL e CLASSIFICACAO para a Home do dashboard
 * - Linhas auxiliares (SCORES_JSON, CLIENT_JSON, NOTAS, ANALISE) para reabrir/editar no painel admin
 * Apaga registros anteriores marcados como mes='Diagnóstico' para sobrescrever.
 */
export async function saveDiagnosticoToSupabase(
  clienteId: string,
  snapshot: DiagnosticoSnapshot,
) {
  // Limpa diagnóstico anterior do mesmo cliente
  await supabase
    .from("dashboard_data")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("tipo", "PILAR")
    .eq("mes", "Diagnóstico");
  await supabase
    .from("dashboard_data")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("tipo", "KPI")
    .eq("mes", "Inicial");

  const rows: Array<{
    cliente_id: string;
    tipo: string;
    mes: string;
    campo: string;
    valor: string;
    benchmark: string | null;
  }> = [];

  const ramo: Ramo = snapshot.ramo || "dentista";
  const pilaresList = getPilaresByRamo(ramo);
  pilaresList.forEach((p) => {
    const arr = snapshot.scores[p.id] || [];
    let total = 0;
    let max = 0;
    p.questions.forEach((_q, i) => {
      const v = arr[i];
      if (v === "SKIP") return;
      total += typeof v === "number" ? v : 0;
      max += 3;
    });
    if (max === 0) return; // Pilar inteiramente pulado
    // Grava por ID (p01..p07). Fonte de verdade
    rows.push({
      cliente_id: clienteId,
      tipo: "PILAR",
      mes: "Diagnóstico",
      campo: p.id,
      valor: String(total),
      benchmark: String(max),
    });
    // Mantém também por nome (retrocompat com leitores antigos do Dashboard)
    rows.push({
      cliente_id: clienteId,
      tipo: "PILAR",
      mes: "Diagnóstico",
      campo: p.name,
      valor: String(total),
      benchmark: String(max),
    });
  });

  // Resumo
  rows.push({
    cliente_id: clienteId, tipo: "PILAR", mes: "Diagnóstico",
    campo: "SCORE_TOTAL", valor: String(snapshot.totalScore), benchmark: String(snapshot.totalMax),
  });
  rows.push({
    cliente_id: clienteId, tipo: "PILAR", mes: "Diagnóstico",
    campo: "CLASSIFICACAO", valor: snapshot.classif.label, benchmark: snapshot.plano.name,
  });

  // Snapshot serializado para reconstrução no painel admin
  rows.push({
    cliente_id: clienteId, tipo: "PILAR", mes: "Diagnóstico",
    campo: "SCORES_JSON", valor: JSON.stringify(snapshot.scores), benchmark: null,
  });
  rows.push({
    cliente_id: clienteId, tipo: "PILAR", mes: "Diagnóstico",
    campo: "CLIENT_JSON", valor: JSON.stringify({ client: snapshot.client, selOpts: snapshot.selOpts }), benchmark: null,
  });
  rows.push({
    cliente_id: clienteId, tipo: "PILAR", mes: "Diagnóstico",
    campo: "NOTAS", valor: snapshot.notas || "", benchmark: null,
  });
  rows.push({
    cliente_id: clienteId, tipo: "PILAR", mes: "Diagnóstico",
    campo: "ANALISE", valor: snapshot.analise || "", benchmark: null,
  });
  rows.push({
    cliente_id: clienteId, tipo: "PILAR", mes: "Diagnóstico",
    campo: "RAMO", valor: toRamoCanonico(ramo), benchmark: null,
  });
  if (snapshot.kpisIniciais) {
    rows.push({
      cliente_id: clienteId, tipo: "PILAR", mes: "Diagnóstico",
      campo: "KPIS_INICIAIS_JSON", valor: JSON.stringify(snapshot.kpisIniciais), benchmark: null,
    });
    // Também grava cada KPI individual como tipo='KPI' para o dashboard do cliente
    KPI_INIT_FIELDS.forEach((f) => {
      const v = snapshot.kpisIniciais?.[f.key];
      if (!v) return;
      const campo = ramo === "medico" && f.campoMed ? f.campoMed : f.campo;
      const benchmark = ramo === "medico" ? f.benchmarkMed : f.benchmarkDent;
      rows.push({
        cliente_id: clienteId, tipo: "KPI", mes: "Inicial",
        campo, valor: String(v), benchmark: benchmark ?? null,
      });
    });
  }

  const { error } = await supabase.from("dashboard_data").insert(rows);
  if (error) throw error;

  // Dual-write: tabela diagnostics (tipada)
  // Garante que novos diagnosticos aparecam no auto-fill da Maquina de
  // Orcamentos e na view v_cliente_completo.
  // Usa upsert com onConflict (UNIQUE constraint em client_id, M8).
  // Nao bloqueia o fluxo principal se falhar.
  try {
    const totalPctForDb = snapshot.totalMax > 0
      ? Math.round((snapshot.totalScore / snapshot.totalMax) * 10000) / 100
      : 0;

    const { error: diagErr } = await supabase.from("diagnostics").upsert(
      {
        client_id: clienteId,
        ramo: toRamoCanonico(ramo),
        total_score: snapshot.totalScore,
        total_max: snapshot.totalMax,
        total_pct: totalPctForDb,
        classif_label: snapshot.classif.label,
        plano_name: snapshot.plano.name,
        scores: snapshot.scores as unknown as Json,
        client_data: {
          client: snapshot.client,
          selOpts: snapshot.selOpts,
        } as unknown as Json,
      },
      { onConflict: "client_id" },
    );

    if (diagErr) throw diagErr;
  } catch (e) {
    console.warn("[saveDiagnosticoToSupabase] dual-write diagnostics falhou:", e);
  }

  // Também persiste configs (fat, meta, dor, especialidade) para reuso por outras ferramentas (ex.: Orçamentos)
  await saveClienteConfigToSupabase(clienteId, {
    fat: fatLabelToNumber(snapshot.selOpts?.fat),
    meta: parseMoneyToNumber(snapshot.client?.meta),
    dor: snapshot.client?.dor,
    especialidade: snapshot.client?.proc,
  });
}

/**
 * Converte uma string monetária livre (ex.: "R$ 100.000,00", "100k", "100 mil")
 * em um valor numérico em reais como string. Retorna undefined se vazio,
 * ou a string original limpa quando não consegue interpretar.
 */
export function parseMoneyToNumber(raw?: string): string | undefined {
  if (!raw) return undefined;
  let s = String(raw).trim().toLowerCase();
  if (!s) return undefined;

  // Detecta sufixos k / mil / m / mi / milhão
  let multiplier = 1;
  if (/(milh(ão|oes|ões)|\bmi\b|\bm\b)/.test(s)) multiplier = 1_000_000;
  else if (/(mil|\bk\b)/.test(s)) multiplier = 1_000;

  // Remove tudo exceto dígitos, vírgula e ponto
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return undefined;

  // Normaliza separadores: se tem vírgula e ponto, ponto é milhar; vírgula é decimal
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    // Só vírgula → decimal pt-BR
    s = s.replace(",", ".");
  }
  // Se só tem ponto, mantemos como decimal padrão

  const n = parseFloat(s);
  if (isNaN(n)) return undefined;
  return String(Math.round(n * multiplier));
}

/**
 * Converte o label do select de faturamento (ex.: "R$ 20–50k") em valor médio numérico em reais.
 * Mantém a string original se não corresponder a nenhuma faixa conhecida.
 */
export function fatLabelToNumber(label?: string): string | undefined {
  if (!label) return undefined;
  const trimmed = label.trim();
  if (!trimmed || trimmed === "—") return undefined;
  const map: Record<string, number> = {
    "Até R$ 20k": 15000,
    "R$ 20–50k": 35000,
    "R$ 20-50k": 35000,
    "R$ 20~50k": 35000,
    "R$ 50–100k": 75000,
    "R$ 50-100k": 75000,
    "R$ 50~100k": 75000,
    "R$ 100–200k": 150000,
    "R$ 100-200k": 150000,
    "R$ 100~200k": 150000,
    "R$ 200k+": 250000,
  };
  if (map[trimmed] != null) return String(map[trimmed]);
  // Já é numérico?
  const onlyDigits = trimmed.replace(/[^\d]/g, "");
  if (onlyDigits && /^\d+$/.test(onlyDigits)) return onlyDigits;
  return trimmed;
}

/**
 * Salva os dados de contexto do cliente como tipo='CONFIG' / mes='Diagnóstico'
 * em dashboard_data, para serem reaproveitados por outras ferramentas.
 */
export async function saveClienteConfigToSupabase(
  clienteId: string,
  config: { fat?: string; meta?: string; dor?: string; especialidade?: string },
) {
  if (!clienteId) return;
  const entries = Object.entries(config).filter(([, v]) => v && String(v).trim().length > 0);
  if (entries.length === 0) return;

  // Remove versões antigas (com mes=NULL ou mes='Diagnóstico') para os mesmos campos
  await supabase
    .from("dashboard_data")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("tipo", "CONFIG")
    .in("campo", entries.map(([k]) => k));

  const rows = entries.map(([campo, valor]) => ({
    cliente_id: clienteId,
    tipo: "CONFIG",
    mes: "Diagnóstico" as string | null,
    campo,
    valor: String(valor),
    benchmark: null as string | null,
  }));

  const { error } = await supabase.from("dashboard_data").insert(rows);
  if (error) throw error;
}

/* ============================================================
 * Painel admin. Leitura/atualização do histórico no Supabase
 * ============================================================ */

export interface StoredDiagnostico extends DiagnosticoSnapshot {
  cliente_id?: string | null;
  notas?: string;
  analise?: string;
  clienteNomeClinica?: string | null;
}

interface ClienteRow {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  especialidade: string | null;
  especialidade_clinica: string | null;
}

function reconstructSnapshot(
  cliente: ClienteRow,
  rows: Array<{ campo: string; valor: string | null; benchmark: string | null; created_at: string | null }>,
): StoredDiagnostico | null {
  const map = new Map(rows.map((r) => [r.campo, r] as const));

  let scores: ScoresMap = {};
  let client: ClientData | null = null;
  let selOpts: SelOpts = {};

  const scoresJson = map.get("SCORES_JSON")?.valor;
  if (scoresJson) {
    try { scores = JSON.parse(scoresJson); } catch { /* noop */ }
  }
  const clientJson = map.get("CLIENT_JSON")?.valor;
  if (clientJson) {
    try {
      const parsed = JSON.parse(clientJson);
      client = parsed.client;
      selOpts = parsed.selOpts || {};
    } catch { /* noop */ }
  }

  // Fallback: se não há CLIENT_JSON (registros antigos), monta a partir do cliente
  if (!client) {
    client = {
      name: cliente.nome_cliente,
      cidade: cliente.cidade || "",
      proc: "", objetivo: "", dor: "", meta: "", data: "",
      fat: "—", tipo: "—", func: "—", ticket: "—", cadeiras: "—", tempo: "—", pacientes: "—",
    };
  }

  const totalScore = Number(map.get("SCORE_TOTAL")?.valor || 0);
  const totalMax = Number(map.get("SCORE_TOTAL")?.benchmark || 0);
  if (totalMax === 0) return null;
  const totalPct = totalScore / totalMax;

  const ramo: Ramo = fromRamoCanonico(map.get("RAMO")?.valor);
  const pilaresList = getPilaresByRamo(ramo);
  const planosList = getPlanosByRamo(ramo);

  const classif =
    CLASSIFS.find((c) => totalPct < c.max) ?? CLASSIFS[CLASSIFS.length - 1];
  const plano = planosList.find((pl) => pl.trigger(totalPct)) ?? planosList[planosList.length - 1];

  // Sorted ids por pct (do menor para o maior)
  const pctById = new Map<string, number>();
  pilaresList.forEach((p) => {
    const arr = scores[p.id] || [];
    let t = 0, m = 0;
    p.questions.forEach((_q, i) => {
      const v = arr[i];
      if (v === "SKIP") return;
      t += typeof v === "number" ? v : 0;
      m += 3;
    });
    if (m > 0) pctById.set(p.id, t / m);
  });
  const sortedIds = [...pctById.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);

  const created = map.get("SCORE_TOTAL")?.created_at || rows[0]?.created_at;
  const timestamp = created ? new Date(created).getTime() : Date.now();

  let kpisIniciais: KpisIniciaisData | undefined;
  const kjson = map.get("KPIS_INICIAIS_JSON")?.valor;
  if (kjson) {
    try { kpisIniciais = JSON.parse(kjson); } catch { /* noop */ }
  }

  return {
    client, selOpts, scores,
    totalScore, totalMax, totalPct,
    classif, plano, sortedIds,
    notas: map.get("NOTAS")?.valor || "",
    analise: map.get("ANALISE")?.valor || "",
    ramo,
    kpisIniciais,
    timestamp,
    cliente_id: cliente.id,
    clienteNomeClinica: cliente.nome_clinica,
  };
}

export async function loadDiagnosticosFromSupabase(): Promise<StoredDiagnostico[]> {
  // Prefere tabela tipada diagnostics (fonte canonica desde Fase 2 dual-write).
  // Fallback para EAV apenas se diagnostics estiver vazia.
  const typed = await loadDiagnosticosFromTypedTable();
  if (typed.length > 0) return typed;

  return loadDiagnosticosFromEAV();
}

/**
 * Le diagnosticos da tabela tipada `diagnostics` + dados do cliente.
 * Reconstroi StoredDiagnostico sem passar pelo EAV.
 */
async function loadDiagnosticosFromTypedTable(): Promise<StoredDiagnostico[]> {
  const { data: rows, error } = await supabase
    .from("diagnostics")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const clienteIds = rows.map((r) => r.client_id).filter((id): id is string => !!id);
  if (clienteIds.length === 0) return [];

  const { data: clientes, error: cErr } = await supabase
    .from("clientes")
    .select("id, nome_cliente, nome_clinica, cidade, especialidade, especialidade_clinica")
    .in("id", [...new Set(clienteIds)]);
  if (cErr) throw cErr;

  const clienteMap = new Map((clientes || []).map((c) => [c.id, c as ClienteRow]));

  const out: StoredDiagnostico[] = [];
  for (const row of rows) {
    if (!row.client_id) continue;
    const cliente = clienteMap.get(row.client_id);
    if (!cliente) continue;

    const ramo: Ramo = fromRamoCanonico(row.ramo);
    const pilaresList = getPilaresByRamo(ramo);
    const planosList = getPlanosByRamo(ramo);

    const scores = (row.scores ?? {}) as ScoresMap;
    const totalScore = row.total_score;
    const totalMax = row.total_max;
    const totalPct = totalMax > 0 ? totalScore / totalMax : 0;

    const classif =
      CLASSIFS.find((c) => totalPct < c.max) ?? CLASSIFS[CLASSIFS.length - 1];
    const plano =
      planosList.find((pl) => pl.trigger(totalPct)) ?? planosList[planosList.length - 1];

    // Sorted pilar ids por pct (menor primeiro)
    const pctById = new Map<string, number>();
    pilaresList.forEach((p) => {
      const arr = scores[p.id] || [];
      let t = 0, m = 0;
      p.questions.forEach((_q, i) => {
        const v = arr[i];
        if (v === "SKIP") return;
        t += typeof v === "number" ? v : 0;
        m += 3;
      });
      if (m > 0) pctById.set(p.id, t / m);
    });
    const sortedIds = [...pctById.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);

    const clientData = (row.client_data ?? {}) as Record<string, unknown>;
    const client = (clientData.client as ClientData) ?? {
      name: cliente.nome_cliente,
      cidade: cliente.cidade || "",
      proc: "", objetivo: "", dor: "", meta: "", data: "",
      fat: "", tipo: "", func: "", ticket: "", cadeiras: "", tempo: "", pacientes: "",
    };
    const selOpts = (clientData.selOpts as SelOpts) ?? {};

    const timestamp = row.created_at ? new Date(row.created_at).getTime() : Date.now();

    out.push({
      client,
      selOpts,
      scores,
      totalScore,
      totalMax,
      totalPct,
      classif,
      plano,
      sortedIds,
      notas: "",
      analise: "",
      ramo,
      timestamp,
      cliente_id: row.client_id,
      clienteNomeClinica: cliente.nome_clinica,
    });
  }

  return out;
}

/** Fallback: le diagnosticos do EAV (dashboard_data). Usado apenas para dados pre-dual-write. */
async function loadDiagnosticosFromEAV(): Promise<StoredDiagnostico[]> {
  const { data: rows, error } = await supabase
    .from("dashboard_data")
    .select("cliente_id, campo, valor, benchmark, created_at")
    .eq("tipo", "PILAR")
    .eq("mes", "Diagnóstico");
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const clienteIds = Array.from(new Set(rows.map((r) => r.cliente_id).filter((id): id is string => !!id)));
  if (clienteIds.length === 0) return [];

  const { data: clientes, error: cErr } = await supabase
    .from("clientes")
    .select("id, nome_cliente, nome_clinica, cidade, especialidade, especialidade_clinica")
    .in("id", clienteIds);
  if (cErr) throw cErr;

  const clienteMap = new Map((clientes || []).map((c) => [c.id, c as ClienteRow]));

  const byCliente = new Map<string, typeof rows>();
  rows.forEach((r) => {
    if (!r.cliente_id) return;
    const arr = byCliente.get(r.cliente_id) || [];
    arr.push(r);
    byCliente.set(r.cliente_id, arr);
  });

  const out: StoredDiagnostico[] = [];
  byCliente.forEach((clienteRows, cid) => {
    const cliente = clienteMap.get(cid);
    if (!cliente) return;
    const snap = reconstructSnapshot(cliente, clienteRows);
    if (snap) out.push(snap);
  });

  out.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return out;
}

export async function deleteDiagnosticoFromSupabase(clienteId: string) {
  const { error } = await supabase
    .from("dashboard_data")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("tipo", "PILAR")
    .eq("mes", "Diagnóstico");
  if (error) throw error;
}

/**
 * Atualiza apenas as notas e o texto de análise de um diagnóstico já salvo.
 * Faz delete+insert dos campos NOTAS e ANALISE para o cliente.
 */
export async function updateDiagnosticoNotasInSupabase(
  clienteId: string,
  notas: string,
  analise: string,
) {
  await supabase
    .from("dashboard_data")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("tipo", "PILAR")
    .eq("mes", "Diagnóstico")
    .in("campo", ["NOTAS", "ANALISE"]);

  const { error } = await supabase.from("dashboard_data").insert([
    { cliente_id: clienteId, tipo: "PILAR", mes: "Diagnóstico", campo: "NOTAS", valor: notas, benchmark: null },
    { cliente_id: clienteId, tipo: "PILAR", mes: "Diagnóstico", campo: "ANALISE", valor: analise, benchmark: null },
  ]);
  if (error) throw error;
}
