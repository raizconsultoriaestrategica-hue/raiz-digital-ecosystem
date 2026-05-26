export type CampoCadastro = "email_cliente" | "telefone" | "dia_vencimento" | "ramo";
export type CampoAtivacao =
  | "plano"
  | "valor_mensalidade"
  | "dia_vencimento"
  | "forma_pagamento"
  | "data_inicio_projeto"
  | "duracao_meses";

export type ErrosCadastro = Partial<Record<CampoCadastro, string>>;
export type ErrosAtivacao = Partial<Record<CampoAtivacao, string>>;

export const RAMOS_VALIDOS = ["odontologia", "medicina", "estetica", "outros"] as const;
export type Ramo = (typeof RAMOS_VALIDOS)[number];

export const RAMO_LABEL: Record<Ramo, string> = {
  odontologia: "Odontologia",
  medicina: "Medicina",
  estetica: "Estética",
  outros: "Outros",
};

export type CadastroLeadValidavel = {
  email_cliente?: string | null;
  telefone?: string | null;
  ramo?: string | null;
};

export type CadastroClienteValidavel = CadastroLeadValidavel & {
  dia_vencimento?: string | null;
};

export type AtivacaoClienteValidavel = {
  plano?: string | null;
  valor_mensalidade?: string | number | null;
  dia_vencimento?: string | null;
  forma_pagamento?: string | null;
  data_inicio_projeto?: string | null;
  duracao_meses?: string | number | null;
};

export function validarRamo(valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  if (!v) return "Ramo é obrigatório.";
  if (!(RAMOS_VALIDOS as readonly string[]).includes(v)) {
    return `Ramo inválido. Use: ${RAMOS_VALIDOS.join(", ")}.`;
  }
  return null;
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RE_WHATSAPP_BR = /^\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}$/;

export function validarEmail(valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  if (!v) return "Email é obrigatório.";
  if (!RE_EMAIL.test(v)) return "Email inválido. Use o formato nome@dominio.com.";
  return null;
}

export function validarEmailOpcional(valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  if (!v) return null;
  if (!RE_EMAIL.test(v)) return "Email inválido. Use o formato nome@dominio.com.";
  return null;
}

export function validarWhatsappBR(valor: string | null | undefined, obrigatorio: boolean): string | null {
  const v = (valor ?? "").trim();
  if (!v) return obrigatorio ? "Telefone é obrigatório." : null;
  if (!RE_WHATSAPP_BR.test(v)) return "Telefone inválido. Use (11) 99999-9999.";
  return null;
}

export function validarDiaVencimento(valor: string | null | undefined, obrigatorio: boolean): string | null {
  const v = (valor ?? "").trim();
  if (!v) return obrigatorio ? "Dia de vencimento é obrigatório." : null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 31) return "Dia de vencimento deve ser um inteiro entre 1 e 31.";
  return null;
}

/** Validação do cadastro inicial do lead. Campos mínimos: email, telefone, ramo. */
export function validarCadastroLead(form: CadastroLeadValidavel): ErrosCadastro {
  const erros: ErrosCadastro = {};
  const eEmail = validarEmail(form.email_cliente);
  if (eEmail) erros.email_cliente = eEmail;
  const eTel = validarWhatsappBR(form.telefone, true);
  if (eTel) erros.telefone = eTel;
  const eRamo = validarRamo(form.ramo);
  if (eRamo) erros.ramo = eRamo;
  return erros;
}

/** Validação dos campos comerciais quando se ativa o lead como cliente (projeto_ativo). */
export function validarAtivacaoCliente(form: AtivacaoClienteValidavel): ErrosAtivacao {
  const erros: ErrosAtivacao = {};
  if (!form.plano || !String(form.plano).trim()) {
    erros.plano = "Plano é obrigatório para ativar como cliente.";
  }
  const valor = form.valor_mensalidade;
  const valorNum = typeof valor === "number" ? valor : Number(String(valor ?? "").replace(",", "."));
  if (!valorNum || !Number.isFinite(valorNum) || valorNum <= 0) {
    erros.valor_mensalidade = "Valor mensalidade deve ser maior que zero.";
  }
  const eDia = validarDiaVencimento(typeof form.dia_vencimento === "string" ? form.dia_vencimento : String(form.dia_vencimento ?? ""), true);
  if (eDia) erros.dia_vencimento = eDia;
  if (!form.forma_pagamento || !String(form.forma_pagamento).trim()) {
    erros.forma_pagamento = "Forma de pagamento é obrigatória.";
  }
  if (!form.data_inicio_projeto || !String(form.data_inicio_projeto).trim()) {
    erros.data_inicio_projeto = "Data de início do projeto é obrigatória.";
  }
  const dur = form.duracao_meses;
  const durNum = typeof dur === "number" ? dur : Number(String(dur ?? ""));
  if (!Number.isInteger(durNum) || durNum < 1) {
    erros.duracao_meses = "Duração em meses deve ser um inteiro positivo.";
  }
  return erros;
}

/** Validação para edição de cliente já existente (GestaoCliente). Email + ramo obrigatórios, demais opcionais. */
export function validarCadastroClienteEdicao(form: CadastroClienteValidavel): ErrosCadastro {
  const erros: ErrosCadastro = {};
  const eEmail = validarEmail(form.email_cliente);
  if (eEmail) erros.email_cliente = eEmail;
  const eTel = validarWhatsappBR(form.telefone, false);
  if (eTel) erros.telefone = eTel;
  const eDia = validarDiaVencimento(form.dia_vencimento, false);
  if (eDia) erros.dia_vencimento = eDia;
  const eRamo = validarRamo(form.ramo);
  if (eRamo) erros.ramo = eRamo;
  return erros;
}

export function temErros(erros: ErrosCadastro | ErrosAtivacao): boolean {
  return Object.values(erros).some((v) => !!v);
}
