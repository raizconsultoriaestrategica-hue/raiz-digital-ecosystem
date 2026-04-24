import type { PlanoKey } from "./data";

export interface OrcamentoForm {
  nomeCliente: string;
  nomeClinica: string;
  especialidade: string;
  cidade: string;
  faturamento: string;
  meta: string;
  dor: string;
  data: string;
  score: string;
  scoreMax: string;
  pilarScores: Record<string, string>; // p01..p07 → "0".."100"
  plano: PlanoKey;
  analise: string;
  modulos: Record<string, boolean>; // id (codigo) → checked
  whatsapp: string;
  email: string;
  /** Valor final acordado (editável). String para permitir edição livre. */
  valorFinal: string;
}

export const initialForm = (): OrcamentoForm => ({
  nomeCliente: "",
  nomeClinica: "",
  especialidade: "",
  cidade: "",
  faturamento: "",
  meta: "",
  dor: "",
  data: new Date().toISOString().split("T")[0],
  score: "",
  scoreMax: "",
  pilarScores: {},
  plano: "crescimento",
  analise: "",
  modulos: {},
  whatsapp: "",
  email: "",
  valorFinal: "",
});

/** Pesos por fase (R$ por módulo) */
export const FASE_VALOR: Record<number, number> = {
  1: 400,
  2: 500,
  3: 600,
};

export interface ModuloDb {
  id: string;       // uuid
  codigo: string;   // ex: "1.1"
  nome: string;
  pilar: number;    // 1..7
  pilar_nome: string;
  fase: number;     // 1..3
}

/** Calcula valor total a partir dos códigos de módulos selecionados */
export function calcValorModulos(
  selecionados: string[],
  modulosDb: ModuloDb[]
): number {
  let total = 0;
  for (const codigo of selecionados) {
    const m = modulosDb.find((x) => x.codigo === codigo);
    if (m) total += FASE_VALOR[m.fase] ?? 0;
  }
  return total;
}
