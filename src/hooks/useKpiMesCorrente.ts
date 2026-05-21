import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type KpiRow = Database["public"]["Tables"]["kpis_mensais"]["Row"];

export interface KpiMesCorrenteInput {
  faturamento_bruto: number;
  ticket_medio: number;
  pacientes_novos: number;
  margem_liquida: number;
  observacoes: string;
}

/**
 * Primeiro dia do mes corrente em America/Sao_Paulo no formato YYYY-MM-01.
 * Espelha o padrao usado nas views (v_saude_plataforma, v_evolucao_negocio_mensal)
 * e na edge function send-resumo-mensal.
 */
export function mesCorrenteSP(): { mes_referencia: string; mes_label: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  });
  const partes = fmt.formatToParts(new Date());
  const ano = partes.find((p) => p.type === "year")!.value;
  const mes = partes.find((p) => p.type === "month")!.value;
  const mes_referencia = `${ano}-${mes}-01`;

  const labelFmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "long",
    year: "numeric",
  });
  const dataLabel = new Date(Date.UTC(Number(ano), Number(mes) - 1, 15));
  const mes_label = labelFmt
    .format(dataLabel)
    .replace(/^./, (c) => c.toUpperCase());

  return { mes_referencia, mes_label };
}

/**
 * Le e faz upsert do KPI do mes corrente em SP para o cliente.
 *
 * RLS:
 *   - Cliente: SELECT/INSERT/UPDATE apenas dos proprios registros.
 *   - Admin: ALL.
 *
 * Invalida queries dependentes no sucesso (ultimos KPIs, gargalos, saude
 * financeira, snapshot da plataforma) pra refletir a atualizacao em
 * todas as telas sem reload manual.
 */
export function useKpiMesCorrente(clienteId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { mes_referencia, mes_label } = mesCorrenteSP();

  const query = useQuery({
    queryKey: ["kpi-mes-corrente", clienteId, mes_referencia],
    queryFn: async (): Promise<KpiRow | null> => {
      if (!clienteId) return null;
      const { data, error } = await supabase
        .from("kpis_mensais")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("mes_referencia", mes_referencia)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });

  const mutation = useMutation({
    mutationFn: async (input: KpiMesCorrenteInput): Promise<KpiRow> => {
      if (!clienteId) throw new Error("Cliente nao identificado.");
      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

      const payload = {
        cliente_id: clienteId,
        mes_referencia,
        faturamento_bruto: input.faturamento_bruto,
        ticket_medio: input.ticket_medio,
        pacientes_novos: Math.round(input.pacientes_novos),
        margem_liquida: input.margem_liquida,
        observacoes: input.observacoes || null,
        preenchido_por: userId,
      };

      const { data, error } = await supabase
        .from("kpis_mensais")
        .upsert(payload, { onConflict: "cliente_id,mes_referencia" })
        .select("*")
        .single();

      if (error) throw error;
      return data as KpiRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-mes-corrente", clienteId, mes_referencia] });
      queryClient.invalidateQueries({ queryKey: ["ultimos-kpis-mensais", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["gargalos", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["saude-financeira-cliente", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["saude-financeira-clientes"] });
      queryClient.invalidateQueries({ queryKey: ["saude-plataforma"] });
      queryClient.invalidateQueries({ queryKey: ["evolucao-negocio"] });
    },
  });

  return {
    kpi: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    salvar: mutation.mutateAsync,
    salvando: mutation.isPending,
    mes_referencia,
    mes_label,
  };
}
