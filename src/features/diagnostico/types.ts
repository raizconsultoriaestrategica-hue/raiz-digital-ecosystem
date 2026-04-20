export interface Question {
  text: string;
  labels: [string, string, string, string];
  onlyWithTeam?: boolean;
}

export interface Pilar {
  id: string;
  num: string;
  name: string;
  max: number;
  desc: string;
  questions: Question[];
}

export interface Plano {
  trigger: (p: number) => boolean;
  badge: string;
  name: string;
  desc: string;
  modulos: string[];
  valor: string;
  duracao: string;
  roi: string;
}

export interface Classif {
  max: number;
  label: string;
  desc: string;
}

export type ScoreValue = number | "SKIP" | null;
export type ScoresMap = Record<string, ScoreValue[]>;

export interface ClientData {
  name: string;
  cidade: string;
  proc: string;
  objetivo: string;
  dor: string;
  meta: string;
  data: string;
  fat: string;
  tipo: string;
  func: string;
  ticket: string;
  cadeiras: string;
  tempo: string;
  pacientes: string;
}

export interface SelOpts {
  fat?: string;
  tipo?: string;
  func?: string;
  ticket?: string;
  cadeiras?: string;
  tempo?: string;
  pacientes?: string;
  [k: string]: string | undefined;
}

export interface DiagnosticoSnapshot {
  client: ClientData;
  selOpts: SelOpts;
  scores: ScoresMap;
  totalScore: number;
  totalMax: number;
  totalPct: number;
  classif: Classif;
  plano: Plano;
  sortedIds: string[];
  notas?: string;
  timestamp: number;
  cliente_id?: string | null;
}
