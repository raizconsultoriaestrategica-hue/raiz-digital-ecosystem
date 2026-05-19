import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Linha retornada pela view v_saude_financeira_cliente.
 * Consolida contratos, pagamentos, KPIs mensais, custos e
 * diagnostico financeiro por cliente.
 */
export interface SaudeFinanceiraCliente {
  // Identificacao
  cliente_id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  ramo: string | null;
  especialidade_clinica: string | null;
  cliente_status: string | null;

  // MRR e contrato
  mrr_atual: number;
  contrato_id: string | null;
  contrato_plano: string | null;
  contrato_status: string | null;
  contrato_data_inicio: string | null;
  contrato_data_fim: string | null;
  valor_mensalidade_cadastro: number | null;
  mrr_diverge_cadastro: boolean | null;

  // Ultimo KPI mensal
  ultimo_kpi_mes: string | null;
  ultimo_faturamento: number | null;
  ultimo_ticket_medio: number | null;
  ultima_margem_liquida: number | null;
  ultima_taxa_conversao: number | null;
  ultima_taxa_inadimplencia: number | null;
  ultimo_investimento_marketing: number | null;

  // Media movel 3 meses
  faturamento_medio_3m: number | null;
  ticket_medio_3m: number | null;
  margem_liquida_3m: number | null;
  meses_preenchidos_3m: number;

  // Custos
  custo_fixo_total: number;
  custo_variavel_total: number;
  custo_total: number;

  // Pagamentos Raiz
  pagamentos_atrasados: number;
  pagamentos_pendentes: number;
  pagamentos_quitados: number;
  total_pago: number;
  ultimo_pagamento_data: string | null;

  // Diagnostico financeiro
  diagnostico_financeiro_id: string | null;
  diagnostico_financeiro_data: string | null;

  // Flags
  tem_kpis_mensais: boolean;
  tem_diagnostico_financeiro: boolean;
  tem_contrato: boolean;
}

async function fetchSaudeFinanceiraCliente(
  clienteId: string,
): Promise<SaudeFinanceiraCliente | null> {
  const { data, error } = await supabase
    .from("v_saude_financeira_cliente" as any)
    .select("*")
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as SaudeFinanceiraCliente) ?? null;
}

async function fetchSaudeFinanceiraClientes(): Promise<SaudeFinanceiraCliente[]> {
  const { data, error } = await supabase
    .from("v_saude_financeira_cliente" as any)
    .select("*")
    .order("nome_cliente");
  if (error) throw error;
  return (data as unknown as SaudeFinanceiraCliente[]) ?? [];
}

/**
 * Saude financeira de um cliente especifico.
 */
export function useSaudeFinanceiraCliente(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ["saude-financeira-cliente", clienteId],
    queryFn: () => fetchSaudeFinanceiraCliente(clienteId!),
    enabled: !!clienteId,
  });
}

/**
 * Saude financeira de todos os clientes. Usado no painel admin
 * de visao geral financeira para somar MRR, ticket medio, custos.
 */
export function useSaudeFinanceiraClientes(enabled = true) {
  return useQuery({
    queryKey: ["saude-financeira-clientes"],
    queryFn: fetchSaudeFinanceiraClientes,
    enabled,
  });
}
