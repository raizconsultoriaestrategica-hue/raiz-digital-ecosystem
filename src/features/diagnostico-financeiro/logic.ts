export type { Semaforo } from "./semaforos";
import type { Semaforo } from "./semaforos";

export interface DadosConsultorio {
  nome_profissional: string;
  especialidade: string;
  cidade: string;
  regime_tributario: string;
  num_profissionais: number;
  dias_trabalhados: number;
  horas_clinicas_dia: number;
  atendimentos_dia: number;
}

export interface Receitas {
  faturamento_bruto: number;
  faturamento_convenios: number;
  ticket_medio: number;
  pacientes_novos_mes: number;
  taxa_conversao: number;
  taxa_inadimplencia: number;
  pct_vista: number;
  investimento_marketing: number;
  no_show: number;
  ocupacao_agenda: number;
}

export interface CustosFixos {
  aluguel: number;
  folha: number;
  pro_labore: number;
  contabilidade: number;
  utilities: number;
  software: number;
  outros_fixos: number;
}
export interface CustosVariaveis {
  materiais: number;
  laboratorio: number;
  comissoes: number;
  impostos: number;
  taxas_cartao: number;
  outros_variaveis: number;
}
export interface Financiamentos {
  parcelas_equipamentos: number;
}

export interface DiagFinForm {
  cliente_id: string | null;
  dados: DadosConsultorio;
  receitas: Receitas;
  custos_fixos: CustosFixos;
  custos_variaveis: CustosVariaveis;
  financiamentos: Financiamentos;
}

export interface Indicador {
  key: string;
  label: string;
  valor: number;
  unidade: "%" | "R$" | "R$/h" | "R$/at";
  semaforo?: Semaforo;
}

export interface Alerta {
  nivel: "amarelo" | "vermelho";
  titulo: string;
  texto: string;
  recomendacao: string;
}

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + (Number(b) || 0), 0);

export const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// Semáforos centralizados em ./semaforos.ts — aliases legados para compat.
import {
  semMargemLiquida, semNoShow as semNoShowCore, semInadimplencia,
  semOcupacaoAgenda, semCustoMaterial, semProLabore as semProLaboreCore,
  semPontoEquilibrio as semPECore,
} from "./semaforos";

export const semMargem = semMargemLiquida;
export const semNoShow = semNoShowCore;
export const semInadimp = semInadimplencia;
export const semOcupacao = semOcupacaoAgenda;
export const semMatLab = semCustoMaterial;
export const semProLabore = semProLaboreCore;
export const semPontoEquilibrio = semPECore;

export interface CalcResult {
  totalFixos: number;
  totalVariaveis: number;
  totalFinanciamentos: number;
  custosTotais: number;
  faturamento: number;
  lucroLiquido: number;
  margemLiquida: number;
  pontoEquilibrio: number;
  diaPontoEquilibrio: number;
  custoHora: number;
  custoAtendimento: number;
  faturamentoHora: number;
  indiceLucratividade: number;
  pctMatLab: number;
  pctProLabore: number;
  indicadores: Indicador[];
  alertas: Alerta[];
  rankingCustos: { nome: string; valor: number; tipo: string }[];
}

const FIX_LABELS: Record<keyof CustosFixos, string> = {
  aluguel: "Aluguel/condomínio",
  folha: "Folha de pagamento",
  pro_labore: "Pró-labore",
  contabilidade: "Contabilidade",
  utilities: "Energia/água/telefone",
  software: "Sistemas/softwares",
  outros_fixos: "Outros fixos",
};
const VAR_LABELS: Record<keyof CustosVariaveis, string> = {
  materiais: "Materiais/insumos",
  laboratorio: "Laboratório/terceirizados",
  comissoes: "Comissões",
  impostos: "Impostos/tributos",
  taxas_cartao: "Taxas de cartão",
  outros_variaveis: "Outros variáveis",
};

export function calcular(form: DiagFinForm): CalcResult {
  const fat = Number(form.receitas.faturamento_bruto) || 0;
  const tF = sum(form.custos_fixos as any);
  const tV = sum(form.custos_variaveis as any);
  const tFin = sum(form.financiamentos as any);
  const custos = tF + tV + tFin;
  const lucro = fat - custos;
  const margem = fat > 0 ? (lucro / fat) * 100 : 0;
  const pctVar = fat > 0 ? tV / fat : 0;
  const pe = pctVar < 1 ? (tF + tFin) / (1 - pctVar) : 0;
  const diaPe = fat > 0 ? Math.min(31, Math.ceil((pe / fat) * (form.dados.dias_trabalhados || 22))) : 31;
  const dias = form.dados.dias_trabalhados || 22;
  const horas = form.dados.horas_clinicas_dia || 8;
  const atDia = form.dados.atendimentos_dia || 0;
  const custoHora = dias && horas ? custos / (dias * horas) : 0;
  const custoAt = dias && atDia ? custos / (dias * atDia) : 0;
  const fatHora = dias && horas ? fat / (dias * horas) : 0;
  const indLuc = fat > 0 ? lucro / fat : 0;

  const matLab = (Number(form.custos_variaveis.materiais) || 0) + (Number(form.custos_variaveis.laboratorio) || 0);
  const pctMatLab = fat > 0 ? (matLab / fat) * 100 : 0;
  const pctProLabore = fat > 0 ? ((Number(form.custos_fixos.pro_labore) || 0) / fat) * 100 : 0;

  const indicadores: Indicador[] = [
    { key: "margem", label: "Margem líquida", valor: margem, unidade: "%", semaforo: semMargem(margem) },
    { key: "pe", label: "Ponto de equilíbrio", valor: pe, unidade: "R$", semaforo: semPontoEquilibrio(diaPe) },
    { key: "ch", label: "Custo por hora clínica", valor: custoHora, unidade: "R$/h" },
    { key: "ca", label: "Custo por atendimento", valor: custoAt, unidade: "R$/at" },
    { key: "fh", label: "Faturamento por hora clínica", valor: fatHora, unidade: "R$/h" },
    { key: "il", label: "Índice de lucratividade", valor: indLuc * 100, unidade: "%", semaforo: semMargem(indLuc * 100) },
    { key: "noshow", label: "No-show", valor: form.receitas.no_show || 0, unidade: "%", semaforo: semNoShow(form.receitas.no_show || 0) },
    { key: "inad", label: "Inadimplência", valor: form.receitas.taxa_inadimplencia || 0, unidade: "%", semaforo: semInadimp(form.receitas.taxa_inadimplencia || 0) },
    { key: "ocup", label: "Ocupação de agenda", valor: form.receitas.ocupacao_agenda || 0, unidade: "%", semaforo: semOcupacao(form.receitas.ocupacao_agenda || 0) },
    { key: "matlab", label: "Material+Lab / Faturamento", valor: pctMatLab, unidade: "%", semaforo: semMatLab(pctMatLab) },
    { key: "prolab", label: "Pró-labore / Faturamento", valor: pctProLabore, unidade: "%", semaforo: semProLabore(pctProLabore) },
  ];

  const alertas: Alerta[] = [];
  const push = (cond: Semaforo | undefined, t: Alerta) => {
    if (cond === "amarelo" || cond === "vermelho") alertas.push({ ...t, nivel: cond });
  };
  push(semMargem(margem), {
    nivel: "amarelo", titulo: "Margem líquida abaixo do saudável",
    texto: `Sua margem líquida é de ${margem.toFixed(1)}%. O saudável é acima de 20%.`,
    recomendacao: "Revise precificação e composição de custos. Módulo 4.2 — Precificação Estratégica recomendado.",
  });
  push(semNoShow(form.receitas.no_show || 0), {
    nivel: "amarelo", titulo: "No-show elevado",
    texto: `${(form.receitas.no_show || 0).toFixed(1)}% das consultas viram cadeira vazia — receita perdida sem retorno.`,
    recomendacao: "Implementar confirmação ativa, lista de espera e política de remarcação. Módulo 2.1 — Gestão de Agenda.",
  });
  push(semInadimp(form.receitas.taxa_inadimplencia || 0), {
    nivel: "amarelo", titulo: "Inadimplência fora do ideal",
    texto: `${(form.receitas.taxa_inadimplencia || 0).toFixed(1)}% de inadimplência compromete o caixa.`,
    recomendacao: "Reforçar política de cobrança, antecipar à vista e revisar parcelamentos.",
  });
  push(semOcupacao(form.receitas.ocupacao_agenda || 0), {
    nivel: "amarelo", titulo: "Ocupação fora da faixa ideal",
    texto: `Ocupação de ${(form.receitas.ocupacao_agenda || 0).toFixed(1)}%. O ideal é entre 75% e 85%.`,
    recomendacao: "Se baixa, ativar marketing e reativação. Se acima de 90%, atenção à qualidade do atendimento.",
  });
  push(semMatLab(pctMatLab), {
    nivel: "amarelo", titulo: "Custo de material e laboratório alto",
    texto: `Material+Lab consomem ${pctMatLab.toFixed(1)}% do faturamento. Saudável: até 15%.`,
    recomendacao: "Renegociar fornecedores, padronizar protocolos e revisar repasse no preço.",
  });
  push(semProLabore(pctProLabore), {
    nivel: "amarelo", titulo: "Pró-labore desalinhado",
    texto: `Pró-labore representa ${pctProLabore.toFixed(1)}% do faturamento. Faixa saudável: 25-35%.`,
    recomendacao: "Reavaliar retirada para equilibrar reinvestimento e remuneração do titular.",
  });
  push(semPontoEquilibrio(diaPe), {
    nivel: "amarelo", titulo: "Ponto de equilíbrio tardio no mês",
    texto: `Você só cobre os custos por volta do dia ${diaPe} do mês.`,
    recomendacao: "Aumentar receita média ou cortar custos fixos. Módulo 4.1/4.2 da Raiz.",
  });

  const ranking: { nome: string; valor: number; tipo: string }[] = [];
  (Object.keys(form.custos_fixos) as (keyof CustosFixos)[]).forEach((k) => {
    const v = Number(form.custos_fixos[k]) || 0;
    if (v > 0) ranking.push({ nome: FIX_LABELS[k], valor: v, tipo: "Fixo" });
  });
  (Object.keys(form.custos_variaveis) as (keyof CustosVariaveis)[]).forEach((k) => {
    const v = Number(form.custos_variaveis[k]) || 0;
    if (v > 0) ranking.push({ nome: VAR_LABELS[k], valor: v, tipo: "Variável" });
  });
  if (tFin > 0) ranking.push({ nome: "Parcelas equipamentos/financ.", valor: tFin, tipo: "Financiamento" });
  ranking.sort((a, b) => b.valor - a.valor);

  return {
    totalFixos: tF, totalVariaveis: tV, totalFinanciamentos: tFin,
    custosTotais: custos, faturamento: fat, lucroLiquido: lucro,
    margemLiquida: margem, pontoEquilibrio: pe, diaPontoEquilibrio: diaPe,
    custoHora, custoAtendimento: custoAt, faturamentoHora: fatHora,
    indiceLucratividade: indLuc, pctMatLab, pctProLabore,
    indicadores, alertas, rankingCustos: ranking,
  };
}

export function emptyForm(): DiagFinForm {
  return {
    cliente_id: null,
    dados: {
      nome_profissional: "", especialidade: "Odontologia", cidade: "",
      regime_tributario: "Simples Nacional", num_profissionais: 1,
      dias_trabalhados: 22, horas_clinicas_dia: 8, atendimentos_dia: 0,
    },
    receitas: {
      faturamento_bruto: 0, faturamento_convenios: 0, ticket_medio: 0,
      pacientes_novos_mes: 0, taxa_conversao: 0, taxa_inadimplencia: 0,
      pct_vista: 0, investimento_marketing: 0, no_show: 0, ocupacao_agenda: 0,
    },
    custos_fixos: { aluguel: 0, folha: 0, pro_labore: 0, contabilidade: 0, utilities: 0, software: 0, outros_fixos: 0 },
    custos_variaveis: { materiais: 0, laboratorio: 0, comissoes: 0, impostos: 0, taxas_cartao: 0, outros_variaveis: 0 },
    financiamentos: { parcelas_equipamentos: 0 },
  };
}
