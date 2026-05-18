import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ArquivoCliente = Database["public"]["Tables"]["arquivos_cliente"]["Row"];
export type ArquivoClienteInsert = Database["public"]["Tables"]["arquivos_cliente"]["Insert"];

const BUCKET = "arquivos-cliente";
const keyList = (clienteId: string) => ["arquivos_cliente", clienteId] as const;

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function inferTipo(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : null;
}

export function useArquivosCliente(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: keyList(clienteId ?? ""),
    queryFn: async (): Promise<ArquivoCliente[]> => {
      const { data, error } = await supabase
        .from("arquivos_cliente")
        .select("*")
        .eq("cliente_id", clienteId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clienteId,
  });
}

export interface UploadArquivoInput {
  file: File;
  categoria: ArquivoCliente["categoria"];
  modulo_id?: string | null;
}

export function useUploadArquivo(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, categoria, modulo_id }: UploadArquivoInput) => {
      const safeName = sanitizeFileName(file.name);
      const path = `${clienteId}/${crypto.randomUUID()}-${safeName}`;

      const upload = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (upload.error) throw upload.error;

      const { data, error } = await supabase
        .from("arquivos_cliente")
        .insert({
          cliente_id: clienteId,
          categoria,
          modulo_id: modulo_id ?? null,
          nome: file.name,
          tipo: inferTipo(file.name),
          storage_path: path,
          tamanho_bytes: file.size,
        })
        .select()
        .single();
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keyList(clienteId) }),
  });
}

export function useDeleteArquivo(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arquivo: Pick<ArquivoCliente, "id" | "storage_path">) => {
      const rm = await supabase.storage.from(BUCKET).remove([arquivo.storage_path]);
      if (rm.error) throw rm.error;
      const { error } = await supabase
        .from("arquivos_cliente")
        .delete()
        .eq("id", arquivo.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keyList(clienteId) }),
  });
}

export async function gerarSignedUrl(storagePath: string, expiresInSeconds = 600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
