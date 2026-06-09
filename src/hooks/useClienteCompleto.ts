import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * Linha retornada pela view v_cliente_completo.
 * Consolida: clientes + ultimo diagnostico + ultimo mes de KPIs.
 */
export interface ClienteCompleto {
  // Dados do cliente
  id: string;
  user_id: string | null;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  ramo: string | null;
  especialidade: string | null;
  especialidade_clinica: string | null;
  telefone: string | null;
  email_cliente: string | null;
  cpf_cnpj: string | null;
  endereco: string | null;
  instagram: string | null;
  observacoes_relacionamento: string | null;
  origem: string | null;
  plano: string | null;
  status: string | null;
  meta_faturamento: number | null;
  faturamento_atual_cadastro: number | null;
  orcamento_inicial: number | null;
  valor_mensalidade: number | null;
  data_inicio_projeto: string | null;
  duracao_meses: number | null;
  dia_vencimento: number | null;
  forma_pagamento: string | null;
  cliente_created_at: string | null;

  // Ultimo diagnostico
  ultimo_diagnostico_id: string | null;
  ultimo_diagnostico_score: number | null;
  ultimo_diagnostico_score_absoluto: number | null;
  ultimo_diagnostico_score_max: number | null;
  ultimo_diagnostico_classif: string | null;
  ultimo_diagnostico_scores: Json | null;
  ultimo_diagnostico_plano_sugerido: string | null;
  ultimo_diagnostico_data: string | null;

  // Ultimo mes de KPIs
  kpi_mes_referencia: string | null;
  faturamento_atual: number | null;
  ticket_atual: number | null;
  conversao_atual: number | null;
  no_show_atual: number | null;
  ocupacao_atual: number | null;
  margem_atual: number | null;
  inadimplencia_atual: number | null;
  investimento_marketing_atual: number | null;
}

async function fetchClienteCompleto(id: string): Promise<ClienteCompleto | null> {
  const { data, error } = await supabase
    .from("v_cliente_completo" as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ClienteCompleto) ?? null;
}

async function fetchClientesCompletos(): Promise<ClienteCompleto[]> {
  const { data, error } = await supabase
    .from("v_cliente_completo" as any)
    .select("*")
    .order("nome_cliente");
  if (error) throw error;
  return (data as unknown as ClienteCompleto[]) ?? [];
}

/**
 * Busca um unico cliente pela view v_cliente_completo.
 * Retorna dados do cliente + ultimo diagnostico + ultimos KPIs.
 */
export function useClienteCompleto(id: string | null | undefined) {
  return useQuery({
    queryKey: ["cliente-completo", id],
    queryFn: () => fetchClienteCompleto(id!),
    enabled: !!id,
  });
}

/**
 * Busca todos os clientes pela view v_cliente_completo.
 * Util para dropdowns e listas que precisam de score/KPIs inline.
 */
export function useClientesCompletos(enabled = true) {
  return useQuery({
    queryKey: ["clientes-completos"],
    queryFn: fetchClientesCompletos,
    enabled,
  });
}
