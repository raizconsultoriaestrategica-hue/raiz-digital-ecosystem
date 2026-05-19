import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Gargalo = Database["public"]["Functions"]["detectar_gargalos"]["Returns"][number];

export type SeveridadeGargalo = "critico" | "atencao" | "ok";
export type StatusGargalo = "abaixo" | "dentro" | "acima";

/**
 * Chama a função SQL detectar_gargalos(p_cliente_id, p_mes) e retorna
 * a lista de KPIs com status (abaixo/dentro/acima) e severidade
 * (critico/atencao/ok). Vazio se o cliente não tem dados no mês.
 *
 * `mes` deve ser uma data no formato YYYY-MM-DD apontando para o
 * primeiro dia do mês (DATE em Postgres). Aceita Date ou string.
 */
export function useGargalos(
  clienteId: string | null | undefined,
  mes: Date | string | null | undefined,
) {
  const mesIso = toIsoDate(mes);
  return useQuery({
    queryKey: ["gargalos", clienteId, mesIso],
    queryFn: async (): Promise<Gargalo[]> => {
      const { data, error } = await supabase.rpc("detectar_gargalos", {
        p_cliente_id: clienteId!,
        p_mes: mesIso!,
      });
      if (error) throw error;
      return (data ?? []) as Gargalo[];
    },
    enabled: !!clienteId && !!mesIso,
  });
}

function toIsoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === "string") {
    return d.length >= 10 ? d.slice(0, 10) : null;
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
