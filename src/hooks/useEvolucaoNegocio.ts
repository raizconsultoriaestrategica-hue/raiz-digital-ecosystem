import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Linha retornada pela view v_evolucao_negocio_mensal.
 * Serie temporal de 12 meses (mes corrente + 11 anteriores)
 * no fuso America/Sao_Paulo. Meses sem dados vem zerados.
 */
export interface EvolucaoMes {
  mes: string;
  mes_label: string;
  receita_mensal: number;
  diag_360_criados: number;
  diag_fin_criados: number;
  novos_clientes: number;
}

async function fetchEvolucaoNegocio(): Promise<EvolucaoMes[]> {
  const { data, error } = await supabase
    .from("v_evolucao_negocio_mensal" as any)
    .select("*")
    .order("mes", { ascending: true });
  if (error) throw error;
  return (data as unknown as EvolucaoMes[]) ?? [];
}

export function useEvolucaoNegocio() {
  return useQuery({
    queryKey: ["evolucao-negocio"],
    queryFn: fetchEvolucaoNegocio,
    staleTime: 10 * 60 * 1000,
  });
}
