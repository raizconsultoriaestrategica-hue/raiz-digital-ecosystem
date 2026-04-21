import { supabase } from "@/integrations/supabase/client";
import { PILARES, PLANOS, CLASSIFS } from "./data";
import type { ClientData, DiagnosticoSnapshot, ScoresMap, SelOpts } from "./types";

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
  // Limpa diagnóstico anterior do mesmo cliente (mes = 'Diagnóstico')
  await supabase
    .from("dashboard_data")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("tipo", "PILAR")
    .eq("mes", "Diagnóstico");

  const rows: Array<{
    cliente_id: string;
    tipo: string;
    mes: string;
    campo: string;
    valor: string;
    benchmark: string | null;
  }> = [];

  PILARES.forEach((p) => {
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
    campo: "ANALISE", valor: "", benchmark: null,
  });

  const { error } = await supabase.from("dashboard_data").insert(rows);
  if (error) throw error;

  // Também persiste configs (fat, meta, dor, especialidade) para reuso por outras ferramentas (ex.: Orçamentos)
  await saveClienteConfigToSupabase(clienteId, {
    fat: fatLabelToNumber(snapshot.selOpts?.fat),
    meta: snapshot.client?.meta,
    dor: snapshot.client?.dor,
    especialidade: snapshot.client?.proc,
  });
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
 * Painel admin — leitura/atualização do histórico no Supabase
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

  const classif =
    CLASSIFS.find((c) => totalPct < c.max) ?? CLASSIFS[CLASSIFS.length - 1];
  const plano = PLANOS.find((pl) => pl.trigger(totalPct)) ?? PLANOS[PLANOS.length - 1];

  // Sorted ids por pct (do menor para o maior)
  const pctById = new Map<string, number>();
  PILARES.forEach((p) => {
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

  return {
    client, selOpts, scores,
    totalScore, totalMax, totalPct,
    classif, plano, sortedIds,
    notas: map.get("NOTAS")?.valor || "",
    analise: map.get("ANALISE")?.valor || "",
    timestamp,
    cliente_id: cliente.id,
    clienteNomeClinica: cliente.nome_clinica,
  };
}

export async function loadDiagnosticosFromSupabase(): Promise<StoredDiagnostico[]> {
  // 1) Busca todos os registros de diagnóstico
  const { data: rows, error } = await supabase
    .from("dashboard_data")
    .select("cliente_id, campo, valor, benchmark, created_at")
    .eq("tipo", "PILAR")
    .eq("mes", "Diagnóstico");
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  // 2) Busca dados dos clientes referenciados
  const clienteIds = Array.from(new Set(rows.map((r) => r.cliente_id).filter((id): id is string => !!id)));
  if (clienteIds.length === 0) return [];

  const { data: clientes, error: cErr } = await supabase
    .from("clientes")
    .select("id, nome_cliente, nome_clinica, cidade, especialidade")
    .in("id", clienteIds);
  if (cErr) throw cErr;

  const clienteMap = new Map((clientes || []).map((c) => [c.id, c as ClienteRow]));

  // 3) Agrupa rows por cliente_id
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

  // Mais recentes primeiro
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
