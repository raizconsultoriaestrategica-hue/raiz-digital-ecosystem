import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { initialForm, OrcamentoForm } from "../types";
import { PILARES } from "../data";

export interface ClienteOpt {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  especialidade: string | null;
}

export function useOrcamento() {
  const [form, setForm] = useState<OrcamentoForm>(initialForm);
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingDiag, setLoadingDiag] = useState(false);

  // Buscar clientes
  useEffect(() => {
    (async () => {
      setLoadingClientes(true);
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome_cliente, nome_clinica, cidade, especialidade")
        .order("nome_cliente");
      if (error) toast.error("Erro ao carregar clientes: " + error.message);
      setClientes(data || []);
      setLoadingClientes(false);
    })();
  }, []);

  const setField = <K extends keyof OrcamentoForm>(key: K, value: OrcamentoForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setPilarScore = (pilarId: string, value: string) =>
    setForm((f) => ({ ...f, pilarScores: { ...f.pilarScores, [pilarId]: value } }));

  const toggleModulo = (modId: string) =>
    setForm((f) => ({ ...f, modulos: { ...f.modulos, [modId]: !f.modulos[modId] } }));

  const reset = () => {
    if (!confirm("Limpar todos os dados e começar uma nova proposta?")) return;
    setForm(initialForm());
    setClienteId("");
  };

  // Selecionar cliente → pré-preenche dados + busca diagnóstico + CONFIG
  const selectCliente = async (id: string) => {
    setClienteId(id);
    if (!id) return;
    const c = clientes.find((x) => x.id === id);
    if (c) {
      setForm((f) => ({
        ...f,
        nomeCliente: c.nome_cliente || "",
        nomeClinica: c.nome_clinica || "",
        cidade: c.cidade || "",
        especialidade: c.especialidade || "",
      }));
    }

    // Buscar diagnóstico salvo + CONFIG (faturamento/meta/dor) em duas queries
    setLoadingDiag(true);
    const [diagRes, cfgRes] = await Promise.all([
      supabase
        .from("dashboard_data")
        .select("campo, valor, benchmark, tipo, mes")
        .eq("cliente_id", id)
        .eq("tipo", "PILAR")
        .eq("mes", "Diagnóstico"),
      supabase
        .from("dashboard_data")
        .select("campo, valor, benchmark, tipo, mes")
        .eq("cliente_id", id)
        .eq("tipo", "CONFIG"),
    ]);
    setLoadingDiag(false);

    if (diagRes.error) {
      toast.error("Erro ao buscar diagnóstico: " + diagRes.error.message);
      return;
    }
    if (cfgRes.error) {
      toast.error("Erro ao buscar contexto: " + cfgRes.error.message);
      return;
    }
    const data = [...(diagRes.data || []), ...(cfgRes.data || [])];
    if (data.length === 0) {
      toast.info("Nenhum diagnóstico ou contexto salvo para este cliente");
      return;
    }

    // Mapeia: SCORE_TOTAL → score/scoreMax; pilares → pilarScores; CONFIG → fat/meta/dor
    const updates: Partial<OrcamentoForm> = { pilarScores: {} };
    const pilarScores: Record<string, string> = {};

    data.forEach((row) => {
      if (row.tipo === "CONFIG") {
        if (row.campo === "fat" && row.valor) updates.faturamento = row.valor;
        else if (row.campo === "meta" && row.valor) updates.meta = row.valor;
        else if (row.campo === "dor" && row.valor) updates.dor = row.valor;
        else if (row.campo === "especialidade" && row.valor) updates.especialidade = row.valor;
        return;
      }
      // tipo === PILAR
      if (row.campo === "SCORE_TOTAL") {
        updates.score = row.valor || "";
        updates.scoreMax = row.benchmark || "";
      } else if (row.campo === "CLASSIFICACAO") {
        // ignora — derivamos do score
      } else {
        const pilar = PILARES.find((p) => p.name === row.campo || p.name.startsWith(row.campo));
        if (pilar && row.valor && row.benchmark) {
          const v = parseFloat(row.valor);
          const b = parseFloat(row.benchmark);
          if (b > 0 && !isNaN(v)) {
            pilarScores[pilar.id] = String(Math.round((v / b) * 100));
          }
        }
      }
    });

    updates.pilarScores = pilarScores;
    setForm((f) => ({ ...f, ...updates }));
    toast.success("Dados do cliente carregados");
  };

  return {
    form,
    setField,
    setPilarScore,
    toggleModulo,
    reset,
    clientes,
    clienteId,
    selectCliente,
    loadingClientes,
    loadingDiag,
  };
}
