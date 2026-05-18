import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ClienteModuloRow = Database["public"]["Tables"]["cliente_modulos"]["Row"];
type ClienteModuloUpdate = Database["public"]["Tables"]["cliente_modulos"]["Update"];

export interface ModuloMeta {
  nome: string;
  pilar_nome: string;
  ordem: number;
  descricao: string | null;
}

export interface ClienteModuloComMeta extends ClienteModuloRow {
  modulos: ModuloMeta | null;
}

const keyList = (clienteId: string) => ["cliente-modulos", clienteId] as const;

export function useModulosCliente(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: keyList(clienteId ?? ""),
    queryFn: async (): Promise<ClienteModuloComMeta[]> => {
      const { data, error } = await supabase
        .from("cliente_modulos")
        .select("*, modulos(nome, pilar_nome, ordem, descricao)")
        .eq("cliente_id", clienteId!);
      if (error) throw error;
      const rows = (data ?? []) as unknown as ClienteModuloComMeta[];
      return [...rows].sort((a, b) => {
        const oa = a.modulos?.ordem ?? a.mes_execucao ?? 0;
        const ob = b.modulos?.ordem ?? b.mes_execucao ?? 0;
        return oa - ob;
      });
    },
    enabled: !!clienteId,
  });
}

export function useUpdateModuloCliente(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ClienteModuloUpdate }) => {
      const { data, error } = await supabase
        .from("cliente_modulos")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keyList(clienteId) }),
  });
}
