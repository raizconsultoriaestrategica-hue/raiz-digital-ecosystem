import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Reuniao = Database["public"]["Tables"]["reunioes"]["Row"];
export type ReuniaoInsert = Database["public"]["Tables"]["reunioes"]["Insert"];
export type ReuniaoUpdate = Database["public"]["Tables"]["reunioes"]["Update"];

const keyList = (clienteId: string) => ["reunioes", clienteId] as const;

export function useReunioes(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: keyList(clienteId ?? ""),
    queryFn: async (): Promise<Reuniao[]> => {
      const { data, error } = await supabase
        .from("reunioes")
        .select("*")
        .eq("cliente_id", clienteId!)
        .order("data", { ascending: false })
        .order("hora_inicio", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clienteId,
  });
}

export function useCreateReuniao(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ReuniaoInsert, "cliente_id">) => {
      const { data, error } = await supabase
        .from("reunioes")
        .insert({ ...input, cliente_id: clienteId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keyList(clienteId) }),
  });
}

export function useUpdateReuniao(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ReuniaoUpdate }) => {
      const { data, error } = await supabase
        .from("reunioes")
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

export function useDeleteReuniao(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reunioes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keyList(clienteId) }),
  });
}
