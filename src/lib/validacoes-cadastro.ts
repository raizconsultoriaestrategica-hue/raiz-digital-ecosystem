export type CampoCadastro = "email_cliente" | "telefone" | "dia_vencimento" | "ramo";

export type ErrosCadastro = Partial<Record<CampoCadastro, string>>;

export const RAMOS_VALIDOS = ["odontologia", "medicina", "estetica", "outros"] as const;
export type Ramo = (typeof RAMOS_VALIDOS)[number];

export const RAMO_LABEL: Record<Ramo, string> = {
  odontologia: "Odontologia",
  medicina: "Medicina",
  estetica: "Estética",
  outros: "Outros",
};

export type CadastroClienteValidavel = {
  email_cliente?: string | null;
  telefone?: string | null;
  dia_vencimento?: string | null;
  ramo?: string | null;
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

export function validarCadastroClienteNovo(form: CadastroClienteValidavel): ErrosCadastro {
  const erros: ErrosCadastro = {};
  const eEmail = validarEmail(form.email_cliente);
  if (eEmail) erros.email_cliente = eEmail;
  const eTel = validarWhatsappBR(form.telefone, true);
  if (eTel) erros.telefone = eTel;
  const eDia = validarDiaVencimento(form.dia_vencimento, true);
  if (eDia) erros.dia_vencimento = eDia;
  const eRamo = validarRamo(form.ramo);
  if (eRamo) erros.ramo = eRamo;
  return erros;
}

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

export function temErros(erros: ErrosCadastro): boolean {
  return Object.values(erros).some((v) => !!v);
}
