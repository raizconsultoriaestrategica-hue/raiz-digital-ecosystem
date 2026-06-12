export interface Pilar { id: string; name: string }
export interface Plano { key: PlanoKey; badge: string; name: string; desc: string; valor: string; dur: string; roi: string }
export interface Classif { max: number; label: string; desc: string }

export type PlanoKey = "base" | "crescimento" | "expansao";

export const PILARES: Pilar[] = [
  { id: "p01", name: "Marketing Digital & Presença" },
  { id: "p02", name: "Captação & Tráfego" },
  { id: "p03", name: "Atendimento & Conversão" },
  { id: "p04", name: "Financeiro & Precificação" },
  { id: "p05", name: "Gestão Operacional" },
  { id: "p06", name: "Relacionamento & Retenção" },
  { id: "p07", name: "Crescimento & Expansão" },
];

/** Mapa pilar -> frente (nome + resultado + entrega), alinhado à linguagem do
 * deck. O cliente vê frentes, resultados e entregáveis em linguagem de valor,
 * nunca códigos nem nomes técnicos de módulo. */
export const FRENTES: Record<string, { nome: string; resultado: string; entrega: string }> = {
  p01: { nome: "Posicionamento & Conteúdo", resultado: "presença que vira autoridade e converte", entrega: "posicionamento documentado, linha editorial e calendário de conteúdo para a clínica publicar" },
  p02: { nome: "Captação Previsível", resultado: "saber de onde vem cada paciente, com previsibilidade", entrega: "diagnóstico de canais, desenho do funil e gestão do parceiro de tráfego" },
  p03: { nome: "Conversão & Atendimento", resultado: "nenhum paciente se perde no contato", entrega: "scripts de atendimento e fechamento, estrutura de follow-up e treino da equipe" },
  p04: { nome: "Receita & Margem", resultado: "faturar mais com os mesmos pacientes", entrega: "custo e margem por procedimento, tabela de preços e rotina de controle financeiro" },
  p05: { nome: "Gestão & Sistema", resultado: "a operação para de depender do dono", entrega: "processos documentados, papéis definidos e ferramentas de gestão" },
  p06: { nome: "Retenção & Reativação", resultado: "a base de pacientes volta a gerar caixa", entrega: "protocolo de pós-atendimento, estrutura de recall e programa de indicação" },
  p07: { nome: "Expansão & Operação", resultado: "crescer com estrutura, sem depender de você", entrega: "diagnóstico de maturidade e plano de expansão sustentável" },
};

export const PLANOS: Record<PlanoKey, Plano> = {
  base: {
    key: "base",
    badge: "FASE 1. BASE",
    name: "Raiz de Base",
    desc: "Para clínicas que precisam construir a fundação do negócio. Estruturamos os pilares críticos. Financeiro, atendimento e operação. Para destravar o faturamento e criar a base mínima viável de crescimento.",
    valor: "R$ 2.500 – R$ 3.500",
    dur: "3–4 meses · 1 encontro/semana",
    roi: "+40–80%",
  },
  crescimento: {
    key: "crescimento",
    badge: "FASE 1–2 · CRESCIMENTO",
    name: "Raiz de Crescimento",
    desc: "Para clínicas com alguma estrutura mas crescimento estagnado. Expandimos captação, marketing e gestão financeira para acelerar o faturamento com previsibilidade e consistência.",
    valor: "R$ 3.500 – R$ 5.000",
    dur: "4–5 meses · 1 encontro/semana",
    roi: "+60–120%",
  },
  expansao: {
    key: "expansao",
    badge: "FASE 2–3 · EXPANSÃO",
    name: "Raiz de Expansão",
    desc: "Para clínicas com base consolidada, prontas para escalar. Foco em retenção de pacientes, gestão de equipe, tecnologia, IA aplicada e estruturação para segunda unidade ou modelo de franquia.",
    valor: "R$ 5.000 – R$ 7.500",
    dur: "5–6 meses · 1–2 encontros/semana",
    roi: "+80–150%",
  },
};

// A lista de módulos é a fonte de verdade no banco (tabela `modulos`), carregada
// em runtime via useOrcamento. A constante estática anterior (MODULOS_ALL) estava
// órfã e desatualizada em relação ao manual; foi removida para evitar divergência.

export const CLASSIFS: Classif[] = [
  { max: 25, label: "🚧 Fundação a Construir", desc: "A base do negócio precisa ser estruturada. Enorme potencial de crescimento com orientação correta." },
  { max: 45, label: "⚡ Em Desenvolvimento", desc: "Alguns pilares já funcionam, mas há gargalos críticos travando o crescimento." },
  { max: 65, label: "📈 Em Crescimento", desc: "Boa estrutura em áreas-chave. O foco agora é acelerar os pontos de atenção." },
  { max: 85, label: "✅ Sólido & Escalável", desc: "Negócio bem estruturado. Hora de escalar com inteligência e consistência." },
  { max: 101, label: "🏆 Alta Performance", desc: "Clínica modelo. Foco em autoridade, expansão e novos mercados." },
];

export function fmtMoney(v: number | null | undefined) {
  if (!v || isNaN(v)) return "—";
  return "R$ " + Number(v).toLocaleString("pt-BR");
}

export function getBarColor(pct: number) {
  if (pct < 25) return "#C53030";
  if (pct < 45) return "#C05621";
  if (pct < 65) return "#B7791F";
  if (pct < 85) return "#4A7C5F";
  return "#1C3D2E";
}

export function classifFor(scorePct: number): Classif {
  return CLASSIFS.find((c) => scorePct < c.max) || CLASSIFS[CLASSIFS.length - 1];
}
