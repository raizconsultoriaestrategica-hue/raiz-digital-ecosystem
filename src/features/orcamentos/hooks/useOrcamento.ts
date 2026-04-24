import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { initialForm, OrcamentoForm, ModuloDb } from "../types";
import { PILARES } from "../data";

export interface ClienteOpt {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  especialidade: string | null;
}

function toNumeric(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/[^\d.,-]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n);
}

/** Pilar id "p01" → número 1 */
function pilarIdToNum(pid: string): number {
  return parseInt(pid.replace(/\D/g, ""), 10);
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

  // Selecionar cliente → pré-preenche dados + busca diagnóstico
  const selectCliente = async (id: string) => {
    setClienteId(id);
    if (!id) return;

    setLoadingDiag(true);

    // 1. Dados completos do cliente da tabela clientes
    const [cliFullRes, diagRes] = await Promise.all([
      supabase
        .from("clientes")
        .select(
          "nome_cliente, nome_clinica, especialidade, cidade, orcamento_inicial, meta_faturamento, pilares_foco"
        )
        .eq("id", id)
        .maybeSingle(),
      // 2. Scores dos pilares no diagnóstico
      supabase
        .from("dashboard_data")
        .select("campo, valor, benchmark")
        .eq("cliente_id", id)
        .eq("tipo", "PILAR")
        .eq("mes", "Diagnóstico"),
    ]);

    setLoadingDiag(false);

    if (cliFullRes.error) {
      toast.error("Erro ao buscar cliente: " + cliFullRes.error.message);
      return;
    }
    if (diagRes.error) {
      toast.error("Erro ao buscar diagnóstico: " + diagRes.error.message);
    }

    const cli = cliFullRes.data;
    const updates: Partial<OrcamentoForm> = {};

    if (cli) {
      updates.nomeCliente = cli.nome_cliente || "";
      updates.nomeClinica = cli.nome_clinica || "";
      updates.especialidade = cli.especialidade || "";
      updates.cidade = cli.cidade || "";
      updates.faturamento =
        cli.orcamento_inicial != null ? String(cli.orcamento_inicial) : "";
      updates.meta =
        cli.meta_faturamento != null ? String(cli.meta_faturamento) : "";
      updates.dor = cli.pilares_foco || "";
    }

    // 3. Mapear scores por pilar (apenas campos começando com p0)
    const pilarScores: Record<string, string> = {};
    let scoreTotal = 0;
    let benchTotal = 0;

    (diagRes.data || []).forEach((row) => {
      const campo = row.campo || "";
      if (!/^p0\d/i.test(campo)) return;

      const v = parseFloat(row.valor || "");
      const b = parseFloat(row.benchmark || "");
      if (!isNaN(v) && !isNaN(b) && b > 0) {
        // Match por id (p01..p07); match case-insensitive
        const pilar =
          PILARES.find((p) => p.id.toLowerCase() === campo.toLowerCase()) ?? null;
        if (pilar) {
          pilarScores[pilar.id] = String(Math.round((v / b) * 100));
          scoreTotal += v;
          benchTotal += b;
        }
      }
    });

    updates.pilarScores = pilarScores;
    if (benchTotal > 0) {
      updates.score = String(Math.round(scoreTotal));
      updates.scoreMax = String(Math.round(benchTotal));
    }

    // 4. Auto-seleção inteligente de módulos (pilares com score < 50%)
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
