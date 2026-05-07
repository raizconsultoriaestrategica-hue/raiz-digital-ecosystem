import { supabase } from "@/integrations/supabase/client";

/**
 * A ferramenta de Diagnóstico 360° hoje grava em `dashboard_data`
 * (tipo='PILAR' / mes='Diagnóstico'), e não na tabela `diagnostics`.
 * Este helper reconstrói o "diagnóstico" no formato que as telas
 * de cliente esperam (scores, total_pct, classif_label, plano_name, created_at)
 * lendo direto de dashboard_data — assim a Área do Cliente reflete o que
 * o consultor publicou pela ferramenta.
 */
export interface ClienteDiagResumo {
  scores: Record<string, unknown>;
  total_score: number;
  total_max: number;
  total_pct: number; // 0..100
  classif_label: string | null;
  plano_name: string | null;
  created_at: string | null;
}

export async function loadDiagnosticoFromDashboardData(
  clienteId: string,
): Promise<ClienteDiagResumo | null> {
  const { data, error } = await supabase
    .from("dashboard_data")
    .select("campo, valor, benchmark, created_at")
    .eq("cliente_id", clienteId)
    .eq("tipo", "PILAR")
    .eq("mes", "Diagnóstico");

  if (error || !data || data.length === 0) return null;

  const map = new Map(data.map((r) => [r.campo, r] as const));

  const scoresJson = map.get("SCORES_JSON")?.valor;
  let scores: Record<string, unknown> = {};
  if (scoresJson) {
    try { scores = JSON.parse(scoresJson); } catch { /* noop */ }
  }

  const totRow = map.get("SCORE_TOTAL");
  const total_score = Number(totRow?.valor || 0);
  const total_max = Number(totRow?.benchmark || 0);
  if (total_max === 0 && Object.keys(scores).length === 0) return null;
  const total_pct = total_max > 0 ? Math.round((total_score / total_max) * 100) : 0;

  const classifRow = map.get("CLASSIFICACAO");
  const classif_label = classifRow?.valor ?? null;
  const plano_name = classifRow?.benchmark ?? null;

  const created_at =
    totRow?.created_at ||
    data.reduce<string | null>((acc, r) => {
      if (!r.created_at) return acc;
      if (!acc) return r.created_at;
      return r.created_at > acc ? r.created_at : acc;
    }, null);

  return { scores, total_score, total_max, total_pct, classif_label, plano_name, created_at };
}
