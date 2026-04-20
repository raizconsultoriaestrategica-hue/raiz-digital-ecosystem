export interface Pilar { id: string; name: string }
export interface Plano { key: PlanoKey; badge: string; name: string; desc: string; valor: string; dur: string; roi: string }
export interface Modulo { id: string; name: string; pilar: string }
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

export const PLANOS: Record<PlanoKey, Plano> = {
  base: {
    key: "base",
    badge: "FASE 1 — BASE",
    name: "Raiz de Base",
    desc: "Para clínicas que precisam construir a fundação do negócio. Estruturamos os pilares críticos — financeiro, atendimento e operação — para destravar o faturamento e criar a base mínima viável de crescimento.",
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

export const MODULOS_ALL: Modulo[] = [
  { id: "1.1", name: "Posicionamento Digital", pilar: "Marketing Digital" },
  { id: "1.2", name: "Identidade de Marca", pilar: "Marketing Digital" },
  { id: "1.3", name: "Calendário Editorial", pilar: "Marketing Digital" },
  { id: "2.1", name: "Estratégia de Tráfego Pago", pilar: "Captação & Tráfego" },
  { id: "2.2", name: "Funil de Captação", pilar: "Captação & Tráfego" },
  { id: "2.3", name: "Programa de Indicação", pilar: "Captação & Tráfego" },
  { id: "3.1", name: "Protocolo de Recepção", pilar: "Atendimento & Conversão" },
  { id: "3.2", name: "Consulta Estratégica (Apresentação de Planos)", pilar: "Atendimento & Conversão" },
  { id: "3.3", name: "Follow-up e Reativação", pilar: "Atendimento & Conversão" },
  { id: "4.1", name: "Estruturação Financeira", pilar: "Financeiro & Precificação" },
  { id: "4.2", name: "Precificação Estratégica", pilar: "Financeiro & Precificação" },
  { id: "4.3", name: "Controle de Fluxo de Caixa", pilar: "Financeiro & Precificação" },
  { id: "4.4", name: "Gestão de Inadimplência", pilar: "Financeiro & Precificação" },
  { id: "5.1", name: "Padronização de Processos (POPs)", pilar: "Gestão Operacional" },
  { id: "5.2", name: "Gestão de Equipe", pilar: "Gestão Operacional" },
  { id: "5.3", name: "Sistema de Gestão Clínica", pilar: "Gestão Operacional" },
  { id: "5.4", name: "Tecnologia e Automação", pilar: "Gestão Operacional" },
  { id: "5.5", name: "Dashboard de Indicadores", pilar: "Gestão Operacional" },
  { id: "6.1", name: "Jornada do Paciente", pilar: "Relacionamento & Retenção" },
  { id: "6.2", name: "Programa de Fidelização", pilar: "Relacionamento & Retenção" },
  { id: "6.3", name: "Recall e Reativação", pilar: "Relacionamento & Retenção" },
  { id: "7.1", name: "Modelo de Escala", pilar: "Crescimento & Expansão" },
  { id: "7.2", name: "Documentação Replicável", pilar: "Crescimento & Expansão" },
  { id: "7.3", name: "Viabilidade de Expansão", pilar: "Crescimento & Expansão" },
];

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
