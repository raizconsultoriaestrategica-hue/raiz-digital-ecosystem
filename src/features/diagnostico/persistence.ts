import { supabase } from "@/integrations/supabase/client";
import { PILARES } from "./data";
import type { DiagnosticoSnapshot } from "./types";

/**
 * Persiste o diagnóstico em dashboard_data:
 * - 1 linha por pilar (tipo='PILAR', campo=nome do pilar, valor=pontuação, benchmark=máximo)
 * - 1 linha resumo SCORE_TOTAL e CLASSIFICACAO para a Home do dashboard
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

  // Resumo (mesma tipo PILAR para reaproveitar política RLS)
  rows.push({
    cliente_id: clienteId,
    tipo: "PILAR",
    mes: "Diagnóstico",
    campo: "SCORE_TOTAL",
    valor: String(snapshot.totalScore),
    benchmark: String(snapshot.totalMax),
  });
  rows.push({
    cliente_id: clienteId,
    tipo: "PILAR",
    mes: "Diagnóstico",
    campo: "CLASSIFICACAO",
    valor: snapshot.classif.label,
    benchmark: snapshot.plano.name,
  });

  const { error } = await supabase.from("dashboard_data").insert(rows);
  if (error) throw error;
}

/* ============================================================
 * Histórico local de diagnósticos para o painel admin do consultor.
 * Mantém em localStorage (igual ao HTML original) com a serialização
 * completa do snapshot para permitir reabrir/exportar.
 * ============================================================ */
/**
 * Salva os dados de contexto do cliente (faturamento, meta, dor) como tipo='CONFIG'
 * em dashboard_data, para serem reaproveitados por outras ferramentas
 * (ex: Máquina de Orçamentos pré-preenche esses campos).
 */
export async function saveClienteConfigToSupabase(
  clienteId: string,
  config: { fat?: string; meta?: string; dor?: string },
) {
  const entries = Object.entries(config).filter(([, v]) => v && v.trim().length > 0);
  if (entries.length === 0) return;

  // Apaga apenas os campos que vamos sobrescrever
  await supabase
    .from("dashboard_data")
    .delete()
    .eq("cliente_id", clienteId)
    .eq("tipo", "CONFIG")
    .in("campo", entries.map(([k]) => k));

  const rows = entries.map(([campo, valor]) => ({
    cliente_id: clienteId,
    tipo: "CONFIG",
    mes: null as string | null,
    campo,
    valor: valor as string,
    benchmark: null as string | null,
  }));

  const { error } = await supabase.from("dashboard_data").insert(rows);
  if (error) throw error;
}

const STORAGE_KEY = "raiz_diag";

export interface StoredDiagnostico extends DiagnosticoSnapshot {
  cliente_id?: string | null;
  notas?: string;
}

export function loadStoredDiagnosticos(): StoredDiagnostico[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveStoredDiagnostico(snapshot: StoredDiagnostico) {
  const all = loadStoredDiagnosticos();
  all.unshift(snapshot);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deleteStoredDiagnostico(idx: number) {
  const all = loadStoredDiagnosticos();
  all.splice(idx, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
