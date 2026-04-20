import { CLASSIFS, PILARES, PLANOS } from "./data";
import type { Classif, Pilar, Plano, ScoresMap, SelOpts } from "./types";

export function isAutonomo(sel: SelOpts): boolean {
  return sel.tipo === "Dentista Autônomo" || sel.func === "Nenhum (só eu)";
}

export function shouldSkipExpansao(sel: SelOpts): boolean {
  return (
    sel.tipo === "Dentista Autônomo" ||
    sel.func === "Nenhum (só eu)" ||
    sel.func === "1–2 funcionários"
  );
}

export function getActivePilares(sel: SelOpts): Pilar[] {
  return shouldSkipExpansao(sel) ? PILARES.filter((p) => p.id !== "p07") : PILARES;
}

export function getActiveQuestions(pilar: Pilar, sel: SelOpts) {
  return pilar.questions.filter((q) => !q.onlyWithTeam || !isAutonomo(sel));
}

export function initScores(sel: SelOpts): ScoresMap {
  const scores: ScoresMap = {};
  PILARES.forEach((p) => {
    const skipPilar = p.id === "p07" && shouldSkipExpansao(sel);
    scores[p.id] = p.questions.map((q) =>
      skipPilar || (q.onlyWithTeam && isAutonomo(sel)) ? "SKIP" : null,
    );
  });
  return scores;
}

export interface PilarScore {
  total: number;
  max: number;
  pct: number;
}

export function getScore(scores: ScoresMap, pid: string): PilarScore {
  const p = PILARES.find((x) => x.id === pid);
  if (!p) return { total: 0, max: 0, pct: 0 };
  let total = 0;
  let max = 0;
  p.questions.forEach((_q, i) => {
    const v = scores[pid]?.[i];
    if (v === "SKIP") return;
    total += typeof v === "number" ? v : 0;
    max += 3;
  });
  return { total, max, pct: max > 0 ? total / max : 0 };
}

export function getTotals(scores: ScoresMap, sel: SelOpts) {
  const active = getActivePilares(sel);
  const totalMax = active.reduce((a, p) => a + getScore(scores, p.id).max, 0);
  const totalScore = active.reduce((a, p) => a + getScore(scores, p.id).total, 0);
  const totalPct = totalMax > 0 ? totalScore / totalMax : 0;
  return { totalScore, totalMax, totalPct };
}

export function getClassif(pct: number): Classif {
  return CLASSIFS.find((c) => pct < c.max) ?? CLASSIFS[CLASSIFS.length - 1];
}

export function getPlano(pct: number): Plano {
  return PLANOS.find((pl) => pl.trigger(pct)) ?? PLANOS[PLANOS.length - 1];
}

export type StatusKey = "critico" | "atencao" | "regular" | "bom" | "otimo";

export function getStatus(pct: number): { label: string; cls: StatusKey } {
  if (pct < 0.25) return { label: "Crítico", cls: "critico" };
  if (pct < 0.45) return { label: "Atenção", cls: "atencao" };
  if (pct < 0.65) return { label: "Regular", cls: "regular" };
  if (pct < 0.85) return { label: "Bom", cls: "bom" };
  return { label: "Ótimo", cls: "otimo" };
}

export function getSortedByPct(scores: ScoresMap, sel: SelOpts): Pilar[] {
  return [...getActivePilares(sel)].sort(
    (a, b) => getScore(scores, a.id).pct - getScore(scores, b.id).pct,
  );
}

export function countUnanswered(scores: ScoresMap, pid: string): number {
  return (scores[pid] || []).filter((s) => s === null).length;
}

export function fillUnansweredWithZero(scores: ScoresMap, pid: string): ScoresMap {
  return {
    ...scores,
    [pid]: (scores[pid] || []).map((s) => (s === null ? 0 : s)),
  };
}
