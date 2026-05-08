import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { initialForm, OrcamentoForm, ModuloDb } from "../types";
import { PILARES } from "../data";
import type { ClienteCompleto } from "@/hooks/useClienteCompleto";

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
  const [modulosDb, setModulosDb] = useState<ModuloDb[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(true);

  // Buscar clientes + módulos em paralelo
  useEffect(() => {
    (async () => {
      const [cliRes, modRes] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, nome_cliente, nome_clinica, cidade, especialidade")
          .order("nome_cliente"),
        supabase
          .from("modulos")
          .select("id, codigo, nome, pilar, pilar_nome, fase")
          .order("pilar")
          .order("ordem"),
      ]);
      if (cliRes.error) toast.error("Erro ao carregar clientes: " + cliRes.error.message);
      setClientes(cliRes.data || []);
      setLoadingClientes(false);

      if (modRes.error) toast.error("Erro ao carregar módulos: " + modRes.error.message);
      setModulosDb((modRes.data || []) as ModuloDb[]);
      setLoadingModulos(false);
    })();
  }, []);

  const setField = <K extends keyof OrcamentoForm>(key: K, value: OrcamentoForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setPilarScore = (pilarId: string, value: string) =>
    setForm((f) => ({ ...f, pilarScores: { ...f.pilarScores, [pilarId]: value } }));

  const toggleModulo = (codigo: string) =>
    setForm((f) => ({ ...f, modulos: { ...f.modulos, [codigo]: !f.modulos[codigo] } }));

  const reset = () => {
    if (!confirm("Limpar todos os dados e começar uma nova proposta?")) return;
    setForm(initialForm());
    setClienteId("");
  };

  /** Marca automaticamente módulos cujo pilar tem score < 50% */
  function autoSelecionarModulos(
    pilarScores: Record<string, string>,
    mods: ModuloDb[]
  ): Record<string, boolean> {
    const sel: Record<string, boolean> = {};
    for (const m of mods) {
      const pid = `p${String(m.pilar).padStart(2, "0")}`;
      const raw = pilarScores[pid];
      if (raw === undefined || raw === "") continue;
      const v = parseFloat(raw);
      if (!isNaN(v) && v < 50) sel[m.codigo] = true;
    }
    return sel;
  }

  // Selecionar cliente: query unica via v_cliente_completo
  const selectCliente = async (id: string) => {
    setClienteId(id);
    if (!id) return;

    setLoadingDiag(true);

    const { data: cli, error } = await supabase
      .from("v_cliente_completo" as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    setLoadingDiag(false);

    if (error) {
      toast.error("Erro ao buscar cliente: " + error.message);
      return;
    }
    if (!cli) return;

    const vc = cli as unknown as ClienteCompleto;
    const updates: Partial<OrcamentoForm> = {};

    updates.nomeCliente = vc.nome_cliente || "";
    updates.nomeClinica = vc.nome_clinica || "";
    updates.especialidade = vc.ramo || vc.especialidade || "";
    updates.cidade = vc.cidade || "";

    // Faturamento: prefere kpis_mensais (view), senao orcamento_inicial
    updates.faturamento =
      vc.faturamento_atual != null ? String(vc.faturamento_atual) :
      vc.orcamento_inicial != null ? String(vc.orcamento_inicial) : "";

    updates.meta =
      vc.meta_faturamento != null ? String(vc.meta_faturamento) : "";

    // Dor principal: preenchimento manual pelo consultor
    updates.dor = "";

    // Scores por pilar: extraidos de ultimo_diagnostico_scores (ScoresMap JSON)
    const pilarScores: Record<string, string> = {};
    let scoreTotal = 0;
    let benchTotal = 0;

    if (vc.ultimo_diagnostico_scores && typeof vc.ultimo_diagnostico_scores === "object") {
      const scoresMap = vc.ultimo_diagnostico_scores as Record<string, unknown>;

      for (const pilar of PILARES) {
        const arr = scoresMap[pilar.id];
        if (!Array.isArray(arr)) continue;

        let total = 0;
        let max = 0;
        for (const v of arr) {
          if (v === "SKIP") continue;
          if (typeof v === "number") { total += v; max += 3; }
        }
        if (max > 0) {
          pilarScores[pilar.id] = String(Math.round((total / max) * 100));
          scoreTotal += total;
          benchTotal += max;
        }
      }
    }

    updates.pilarScores = pilarScores;
    if (benchTotal > 0) {
      updates.score = String(Math.round(scoreTotal));
      updates.scoreMax = String(Math.round(benchTotal));
    } else if (vc.ultimo_diagnostico_score_absoluto != null && vc.ultimo_diagnostico_score_max != null) {
      updates.score = String(vc.ultimo_diagnostico_score_absoluto);
      updates.scoreMax = String(vc.ultimo_diagnostico_score_max);
    }

    // Auto-selecao de modulos (pilares com score < 50%)
    if (modulosDb.length > 0 && Object.keys(pilarScores).length > 0) {
      updates.modulos = autoSelecionarModulos(pilarScores, modulosDb);
    }

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
    modulosDb,
    loadingModulos,
  };
}
