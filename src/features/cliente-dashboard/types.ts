// Tipos do Dashboard do Cliente — modelo dashboard_data (CSV-like)

export type DashboardTipo = "CONFIG" | "PILAR" | "KPI" | "MODULO" | "INSIGHT";

export interface DashboardRow {
  tipo: string;
  campo: string;
  valor: string | null;
  benchmark: string | null;
  mes: string | null;
  updated_at?: string | null;
}

export interface ClienteCfg {
  cliente_nome?: string;
  nome_clinica?: string;
  especialidade?: string;
  cidade?: string;
  faturamento_inicial?: number;
  meta_faturamento?: number;
  inicio_consultoria?: string;
  mes_referencia?: string;
  ramo?: string;
  pilares_foco?: string;
  modulos_ativos?: string;
}

export interface PilarScore {
  key: string;        // p01..p07 ou nome
  label: string;      // nome amigável
  num: string;        // "01".."07"
  inicial: number | null;
  atual: number | null;
  delta: number | null;
}

export interface KpiItem {
  key: string;
  label: string;
  valor: number | null;
  benchmark: number | null;
  unidade: "%" | "R$" | "min" | "";
  higher: boolean;       // true = maior é melhor
  noCompare?: boolean;   // não comparar (status neutro)
  status: "ok" | "warn" | "crit" | "neutral";
  statusLabel: string;
  pct: number;           // 0-100 para barra
}

export interface ModuloItem {
  codigo: string;
  nome: string;
  pilar?: string;
  status: "Concluído" | "Em Andamento" | "Pausado" | "Não Iniciado";
  pctConcluido: number;
}
