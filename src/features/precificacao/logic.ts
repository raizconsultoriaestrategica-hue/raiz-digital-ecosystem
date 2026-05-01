export type Posicionamento = "popular" | "intermediario" | "premium" | "ultra";

export const MULTIPLICADORES: Record<Posicionamento, number> = {
  popular: 0.85,
  intermediario: 1.0,
  premium: 1.25,
  ultra: 1.6,
};

export const POSICIONAMENTO_LABEL: Record<Posicionamento, string> = {
  popular: "Popular (×0.85)",
  intermediario: "Intermediário (×1.00)",
  premium: "Premium (×1.25)",
  ultra: "Ultra-Premium (×1.60)",
};

export interface CustoFixo {
  id: string;
  nome: string;
  valor: number;
}

export interface Procedimento {
  id: string;
  nome: string;
  duracao_horas: number;
  materiais: number;
  laboratorio: number;
  sessoes: number;
  margem_alvo_pct: number;
  frequencia_mes: number;
  preco_praticado: number; // opcional para alerta
}

export interface PrecificacaoForm {
  cliente_id: string | null;
  nome_clinica: string;
  segmento: "Odontologia" | "Medicina Estética" | "Dermatologia" | "";
  posicionamento: Posicionamento;
  horas_dia: number;
  dias_mes: number;
  custos_fixos: CustoFixo[];
  procedimentos: Procedimento[];
}

export interface ProcedimentoCalc {
  custo_total: number;
  preco_minimo: number;
  preco_estrategico: number;
  faturamento_mes: number;
  alerta_abaixo_minimo: boolean;
  horas_mes: number;
}

export interface ResultadosGlobais {
  custo_hora_clinica: number;
  total_custos_fixos: number;
  faturamento_total: number;
  lucro_total: number;
  margem_global_pct: number;
  capacidade_total_horas: number;
  horas_utilizadas: number;
  capacidade_utilizada_pct: number;
  por_procedimento: Record<string, ProcedimentoCalc>;
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export function emptyForm(): PrecificacaoForm {
  return {
    cliente_id: null,
    nome_clinica: "",
    segmento: "",
    posicionamento: "intermediario",
    horas_dia: 8,
    dias_mes: 22,
    custos_fixos: [
      { id: uid(), nome: "Aluguel / Condomínio", valor: 0 },
      { id: uid(), nome: "Folha de Pagamento / Salários", valor: 0 },
      { id: uid(), nome: "Pró-labore do Titular", valor: 0 },
      { id: uid(), nome: "Contabilidade", valor: 0 },
      { id: uid(), nome: "Energia / Água / Telefone", valor: 0 },
      { id: uid(), nome: "Sistemas / Softwares / Internet", valor: 0 },
    ],
    procedimentos: [],
  };
}

export function novoCusto(): CustoFixo {
  return { id: uid(), nome: "", valor: 0 };
}

export function novoProcedimento(): Procedimento {
  return {
    id: uid(),
    nome: "",
    duracao_horas: 1,
    materiais: 0,
    laboratorio: 0,
    sessoes: 1,
    margem_alvo_pct: 30,
    frequencia_mes: 0,
    preco_praticado: 0,
  };
}

export function calcular(form: PrecificacaoForm): ResultadosGlobais {
  const total_custos_fixos = form.custos_fixos.reduce((s, c) => s + (c.valor || 0), 0);
  const capacidade_total_horas = (form.horas_dia || 0) * (form.dias_mes || 0);
  const custo_hora_clinica = capacidade_total_horas > 0 ? total_custos_fixos / capacidade_total_horas : 0;
  const mult = MULTIPLICADORES[form.posicionamento] ?? 1;

  const por_procedimento: Record<string, ProcedimentoCalc> = {};
  let faturamento_total = 0;
  let custo_total_geral = 0;
  let horas_utilizadas = 0;

  for (const p of form.procedimentos) {
    const custo_total =
      ((p.duracao_horas || 0) * custo_hora_clinica + (p.materiais || 0) + (p.laboratorio || 0)) *
      (p.sessoes || 1);
    const margem = Math.min(0.99, Math.max(0, (p.margem_alvo_pct || 0) / 100));
    const preco_minimo = margem < 1 ? custo_total / (1 - margem) : custo_total;
    const preco_estrategico = preco_minimo * mult;
    const faturamento_mes = preco_estrategico * (p.frequencia_mes || 0);
    const alerta_abaixo_minimo = (p.preco_praticado || 0) > 0 && p.preco_praticado < preco_minimo;
    const horas_mes = (p.duracao_horas || 0) * (p.sessoes || 1) * (p.frequencia_mes || 0);

    por_procedimento[p.id] = {
      custo_total,
      preco_minimo,
      preco_estrategico,
      faturamento_mes,
      alerta_abaixo_minimo,
      horas_mes,
    };

    faturamento_total += faturamento_mes;
    custo_total_geral += custo_total * (p.frequencia_mes || 0);
    horas_utilizadas += horas_mes;
  }

  const lucro_total = faturamento_total - custo_total_geral - total_custos_fixos;
  // Margem global = média ponderada das margens alvo pelo faturamento de cada procedimento
  let lucro_estimado_total = 0;
  for (const p of form.procedimentos) {
    const r = por_procedimento[p.id];
    if (!r) continue;
    lucro_estimado_total += r.faturamento_mes * ((p.margem_alvo_pct || 0) / 100);
  }
  const margem_global_pct = faturamento_total > 0 ? (lucro_estimado_total / faturamento_total) * 100 : 0;
  const capacidade_utilizada_pct =
    capacidade_total_horas > 0 ? (horas_utilizadas / capacidade_total_horas) * 100 : 0;

  return {
    custo_hora_clinica,
    total_custos_fixos,
    faturamento_total,
    lucro_total,
    margem_global_pct,
    capacidade_total_horas,
    horas_utilizadas,
    capacidade_utilizada_pct,
    por_procedimento,
  };
}

export const fmtBRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;
