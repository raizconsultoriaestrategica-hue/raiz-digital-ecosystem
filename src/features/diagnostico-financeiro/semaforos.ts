/**
 * Semáforos de indicadores financeiros. Fonte única de verdade.
 *
 * Use estas funções tanto na ferramenta do consultor (input) quanto
 * na exibição do cliente (Pasta do Cliente). Para alterar regras,
 * edite APENAS este arquivo.
 */

export type Semaforo = "verde" | "amarelo" | "vermelho";

// ----- Indicadores percentuais / numéricos -----

/** Margem líquida (%): verde ≥20, amarelo 10–19, vermelho <10 */
export function semMargemLiquida(p: number): Semaforo {
  if (p >= 20) return "verde";
  if (p >= 10) return "amarelo";
  return "vermelho";
}

/** No-show (%): verde ≤15, amarelo 16–25, vermelho >25 */
export function semNoShow(p: number): Semaforo {
  if (p <= 15) return "verde";
  if (p <= 25) return "amarelo";
  return "vermelho";
}

/** Inadimplência (%): verde ≤5, amarelo 5–10, vermelho >10 */
export function semInadimplencia(p: number): Semaforo {
  if (p <= 5) return "verde";
  if (p <= 10) return "amarelo";
  return "vermelho";
}

/** Ponto de equilíbrio (dia do mês): verde ≤15, amarelo 16–20, vermelho >20 */
export function semPontoEquilibrio(diaPe: number): Semaforo {
  if (diaPe <= 15) return "verde";
  if (diaPe <= 20) return "amarelo";
  return "vermelho";
}

/** Ocupação de agenda (%): verde 75–85, amarelo 60–74, vermelho <60 ou >90 */
export function semOcupacaoAgenda(p: number): Semaforo {
  if (p >= 75 && p <= 85) return "verde";
  if (p >= 60 && p < 75) return "amarelo";
  if (p > 85 && p <= 90) return "amarelo";
  return "vermelho";
}

/** Custo de material (%): verde ≤15, amarelo 15–20, vermelho >20 */
export function semCustoMaterial(p: number): Semaforo {
  if (p <= 15) return "verde";
  if (p <= 20) return "amarelo";
  return "vermelho";
}

/** Pró-labore (%): verde 25–35, amarelo 15–24, vermelho <15 ou >35 */
export function semProLabore(p: number): Semaforo {
  if (p >= 25 && p <= 35) return "verde";
  if (p >= 15 && p < 25) return "amarelo";
  return "vermelho";
}

/** CPL. Custo Por Lead (R$): verde 20–60, amarelo 60–100, vermelho >100 ou <20 */
export function semCPL(reais: number): Semaforo {
  if (reais >= 20 && reais <= 60) return "verde";
  if (reais > 60 && reais <= 100) return "amarelo";
  return "vermelho";
}

/** Taxa de conversão (%): verde >25, amarelo 10–25, vermelho <10 */
export function semTaxaConversao(p: number): Semaforo {
  if (p > 25) return "verde";
  if (p >= 10) return "amarelo";
  return "vermelho";
}

/** Taxa de retenção (%): verde 65–80, amarelo 50–64, vermelho <50 ou >80 */
export function semTaxaRetencao(p: number): Semaforo {
  if (p >= 65 && p <= 80) return "verde";
  if (p >= 50 && p < 65) return "amarelo";
  return "vermelho";
}

/** NPS (0–100): verde >75, amarelo 50–75, vermelho <50 */
export function semNPS(n: number): Semaforo {
  if (n > 75) return "verde";
  if (n >= 50) return "amarelo";
  return "vermelho";
}

/**
 * CAC: comparado ao ticket médio.
 * verde <25% do ticket, amarelo 25–40%, vermelho >40%
 */
export function semCAC(cac: number, ticketMedio: number): Semaforo {
  if (!ticketMedio || ticketMedio <= 0) return "amarelo";
  const pct = (cac / ticketMedio) * 100;
  if (pct < 25) return "verde";
  if (pct <= 40) return "amarelo";
  return "vermelho";
}
