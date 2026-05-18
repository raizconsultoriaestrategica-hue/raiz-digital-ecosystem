import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CustoClinica = Database["public"]["Tables"]["custos_clinica"]["Row"];
export type CustoClinicaInsert = Database["public"]["Tables"]["custos_clinica"]["Insert"];
export type CustoClinicaUpdate = Database["public"]["Tables"]["custos_clinica"]["Update"];

const keyList = (clienteId: string) => ["custos-clinica", clienteId] as const;

export function useCustosClinica(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: keyList(clienteId ?? ""),
    queryFn: async (): Promise<CustoClinica[]> => {
      const { data, error } = await supabase
        .from("custos_clinica")
        .select("*")
        .eq("cliente_id", clienteId!)
        .eq("ativo", true)
        .order("tipo")
        .order("categoria");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clienteId,
  });
}

export function useCreateCusto(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<CustoClinicaInsert, "cliente_id">) => {
      const { data, error } = await supabase
        .from("custos_clinica")
        .insert({ ...input, cliente_id: clienteId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keyList(clienteId) }),
  });
}

export function useUpdateCusto(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: CustoClinicaUpdate }) => {
      const { data, error } = await supabase
        .from("custos_clinica")
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

export function useDeleteCusto(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete: ativo = false
      const { error } = await supabase
        .from("custos_clinica")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keyList(clienteId) }),
  });
}
