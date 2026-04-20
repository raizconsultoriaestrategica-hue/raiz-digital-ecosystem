import type { PlanoKey } from "./data";

export interface OrcamentoForm {
  nome: string;
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
  modulos: Record<string, boolean>; // id → checked
  whatsapp: string;
  email: string;
}

export const initialForm = (): OrcamentoForm => ({
  nome: "",
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
});
