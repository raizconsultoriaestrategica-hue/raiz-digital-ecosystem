import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type KpisMensais = Database["public"]["Tables"]["kpis_mensais"]["Row"];

/**
 * Busca a linha mais recente de kpis_mensais para o cliente.
 * Usada por Diag Financeiro e Simulador para auto-preencher campos
 * de receitas/operação.
 */
export function useUltimosKpisMensais(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ["ultimos-kpis-mensais", clienteId],
    queryFn: async (): Promise<KpisMensais | null> => {
      const { data, error } = await supabase
        .from("kpis_mensais")
        .select("*")
        .eq("cliente_id", clienteId!)
        .order("mes_referencia", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });
}
