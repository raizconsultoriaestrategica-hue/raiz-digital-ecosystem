import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Linha retornada pela view v_saude_plataforma.
 * Snapshot agregado do estado atual do negocio (1 row).
 * MRR e ticket vem de v_saude_financeira_cliente (Bloco A).
 */
export interface SaudePlataforma {
  mes_referencia: string;

  // Clientes
  total_clientes: number;
  clientes_ativos: number;
  clientes_encerrados: number;
  novos_clientes_no_mes: number;
  clientes_ativos_sem_contrato: number;

  // Contratos e MRR
  clientes_com_contrato_ativo: number;
  contratos_ativos: number;
  contratos_renovacao_pendente: number;
  mrr_total: number;
  ticket_medio_contratos: number;

  // Pagamentos
  pagamentos_atrasados: number;
  pagamentos_pendentes: number;
  receita_recebida_no_mes: number;

  // Diagnosticos no mes
  diag_360_no_mes: number;
  diag_fin_no_mes: number;

  // Retencao
  taxa_retencao_pct: number;
}

async function fetchSaudePlataforma(): Promise<SaudePlataforma | null> {
  const { data, error } = await supabase
    .from("v_saude_plataforma" as any)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as SaudePlataforma) ?? null;
}

export function useSaudePlataforma() {
  return useQuery({
    queryKey: ["saude-plataforma"],
    queryFn: fetchSaudePlataforma,
    staleTime: 5 * 60 * 1000,
  });
}
