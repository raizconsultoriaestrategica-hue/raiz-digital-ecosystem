import { FRENTES, type PlanoKey } from "./data";

/** Frente da proposta: agrupamento nomeado de módulos com resultado e entregável.
 * O cliente vê isto (nome, resultado, entrega), nunca códigos de módulo. */
export interface Frente {
  nome: string;
  resultado: string;
  entrega: string;
  fase: number; // 1 | 2 | 3
  modulos: string[]; // códigos dos módulos nesta frente
}

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
  /** Resumo da reunião (TL.DV), colado pelo consultor. A IA lê junto ao diagnóstico. */
  resumoReuniao: string;
  plano: PlanoKey;
  analise: string;
  modulos: Record<string, boolean>; // id (codigo) → checked
  whatsapp: string;
  email: string;
  /** Valor de referência do plano (valor cheio antes de desconto). */
  valorReferencia: string;
  /** Desconto comercial de relacionamento (R$). */
  descontoComercial: string;
  /** Forma de pagamento: "unica" ou "2x" (1ª até dia 10, 2ª até dia 20). */
  formaPagamento: string;
  /** Ciclo inicial do contrato em meses: "3" a "6". */
  cicloInicialMeses: string;
  /** Quantidade de indicados ativos (programa de indicação). */
  qtdIndicadosAtivos: string;
  /** Frase de ancoragem de valor selecionada (índice 0-9) ou null para "Nenhuma". */
  ancoragem: number | null;
  /** Ancoragem personalizada gerada pela IA (sobrescreve `ancoragem` quando preenchida). */
  ancoragemIA: string;
  /** Justificativas por código de módulo, geradas pela IA. */
  justificativasIA: Record<string, string>;
  /** Frentes customizadas da proposta. Se vazio, são derivadas por pilar. */
  frentes: Frente[];
}

/** Frases de ancoragem de valor (10 opções). */
export const ANCORAGENS: string[] = [
  "O custo de não agir é silencioso, mas aparece todo mês no extrato.",
  "Você foi formado para cuidar de pacientes, não para gerir empresa. A Raiz cuida da segunda parte.",
  "Você cuida dos pacientes. A Raiz cuida do negócio. Simples assim.",
  "A Raiz desmistifica a gestão para quem foi formado para curar, não para administrar.",
  "Mais do que lucratividade: estrutura que traz tranquilidade para quem carrega o negócio nas costas.",
  "Processos que funcionam sem você. Captação previsível. Equipe alinhada. É o que construímos junto.",
  "Entendemos o que trava uma clínica. E sabemos exatamente por onde começar.",
  "Cada mês sem processo estruturado é receita que não se converte. A Raiz existe para mudar isso.",
  "Menos do que você paga de laboratório protético por mês.",
  "O equivalente a 1 a 2 procedimentos por mês, com estrutura que multiplica os demais.",
];

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
  resumoReuniao: "",
  plano: "crescimento",
  analise: "",
  modulos: {},
  whatsapp: "",
  email: "",
  valorReferencia: "",
  descontoComercial: "0",
  formaPagamento: "2x",
  cicloInicialMeses: "",
  qtdIndicadosAtivos: "0",
  ancoragem: null,
  ancoragemIA: "",
  justificativasIA: {},
  frentes: [],
});

/** Gera as frentes padrão a partir dos módulos selecionados, agrupando por
 * pilar e usando a linguagem do mapa FRENTES. Serve de ponto de partida
 * editável no construtor de frentes. */
export function frentesFromPilares(selectedMods: ModuloDb[]): Frente[] {
  const byPilar = new Map<number, ModuloDb[]>();
  for (const m of selectedMods) {
    if (!byPilar.has(m.pilar)) byPilar.set(m.pilar, []);
    byPilar.get(m.pilar)!.push(m);
  }
  return [...byPilar.entries()]
    .map(([pilar, mods]) => {
      const pid = `p${String(pilar).padStart(2, "0")}`;
      const f = FRENTES[pid] ?? { nome: mods[0].pilar_nome, resultado: "", entrega: mods.map((m) => m.nome).join(" · ") };
      const fase = Math.min(...mods.map((m) => m.fase));
      return { nome: f.nome, resultado: f.resultado, entrega: f.entrega, fase, modulos: mods.map((m) => m.codigo) };
    })
    .sort((a, b) => a.fase - b.fase);
}

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

/** Desconto por indicado ativo no programa de indicação (Cláusula Sexta do contrato). */
export const INDICACAO_VALOR = 400;

export interface MensalidadeCalc {
  valorReferencia: number;
  descontoComercial: number;
  mensalidadeLiquida: number;
  qtdIndicados: number;
  descontoIndicacao: number;
  mensalidadeComIndicacao: number;
}

/**
 * Mensalidade líquida e com indicação, a partir do formulário.
 * Validações: nada abaixo de zero; o desconto de indicação é limitado à
 * mensalidade líquida (não gera crédito nem valor negativo).
 */
export function calcMensalidade(form: OrcamentoForm): MensalidadeCalc {
  const valorReferencia = Math.max(0, parseFloat(form.valorReferencia) || 0);
  const descontoComercial = Math.max(0, parseFloat(form.descontoComercial) || 0);
  const mensalidadeLiquida = Math.max(0, valorReferencia - descontoComercial);
  const qtdIndicados = Math.max(0, parseInt(form.qtdIndicadosAtivos, 10) || 0);
  const descontoIndicacao = Math.min(qtdIndicados * INDICACAO_VALOR, mensalidadeLiquida);
  const mensalidadeComIndicacao = Math.max(0, mensalidadeLiquida - descontoIndicacao);
  return {
    valorReferencia,
    descontoComercial,
    mensalidadeLiquida,
    qtdIndicados,
    descontoIndicacao,
    mensalidadeComIndicacao,
  };
}
