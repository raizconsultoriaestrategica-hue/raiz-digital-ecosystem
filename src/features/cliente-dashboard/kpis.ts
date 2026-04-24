// Catálogo de KPIs — labels, unidades e direção (higher/lower é melhor)

export type KpiKey =
  | "taxa_conversao"
  | "ticket_medio_rs"
  | "taxa_no_show"
  | "taxa_followup"
  | "tempo_resposta_min"
  | "tempo_resposta_lead"
  | "faturamento_bruto"
  | "margem_liquida"
  | "overhead"
  | "inadimplencia"
  | "ocupacao_cadeiras"
  | "nps"
  | "atricao_pacientes";

export interface KpiMeta {
  key: KpiKey;
  label: string;
  unidade: "%" | "R$" | "min" | "";
  higher: boolean;
  noCompare?: boolean;
  grupo: "atendimento" | "financeiro" | "operacional";
}

export const KPI_CATALOG: KpiMeta[] = [
  // Atendimento & Conversão
  { key: "taxa_conversao",     label: "Taxa de Conversão",   unidade: "%", higher: true,  grupo: "atendimento" },
  { key: "ticket_medio_rs",    label: "Ticket Médio",        unidade: "R$", higher: true, grupo: "atendimento" },
  { key: "taxa_no_show",       label: "Taxa de No-Show",     unidade: "%", higher: false, grupo: "atendimento" },
  { key: "taxa_followup",      label: "Taxa de Follow-up",   unidade: "%", higher: true,  grupo: "atendimento" },
  { key: "tempo_resposta_min", label: "Tempo de Resposta",   unidade: "min", higher: false, grupo: "atendimento" },
  { key: "tempo_resposta_lead", label: "Tempo de Resposta Lead", unidade: "", higher: true, grupo: "atendimento" },

  // Financeiro
  { key: "faturamento_bruto",  label: "Faturamento Bruto",   unidade: "R$", higher: true, noCompare: true, grupo: "financeiro" },
  { key: "margem_liquida",     label: "Margem Líquida",      unidade: "%", higher: true,  grupo: "financeiro" },
  { key: "overhead",           label: "Overhead",            unidade: "%", higher: false, grupo: "financeiro" },
  { key: "inadimplencia",      label: "Inadimplência",       unidade: "%", higher: false, grupo: "financeiro" },

  // Operacional & Retenção
  { key: "ocupacao_cadeiras",  label: "Ocupação de Cadeiras", unidade: "%", higher: true,  grupo: "operacional" },
  { key: "nps",                label: "NPS",                  unidade: "",  higher: true,  grupo: "operacional" },
  { key: "atricao_pacientes",  label: "Atrição de Pacientes", unidade: "%", higher: false, grupo: "operacional" },
];

export const KPI_BY_KEY: Record<string, KpiMeta> = KPI_CATALOG.reduce(
  (acc, k) => ({ ...acc, [k.key]: k }),
  {},
);

export const GRUPO_LABEL: Record<KpiMeta["grupo"], string> = {
  atendimento: "Atendimento & Conversão",
  financeiro: "Financeiro",
  operacional: "Operacional & Retenção",
};
