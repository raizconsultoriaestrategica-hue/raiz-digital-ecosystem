import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Cloud, Database, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustosClinica } from "@/hooks/useCustosClinica";
import type {
  CustosFixos,
  CustosVariaveis,
  Financiamentos,
  CustoExtra,
} from "@/features/diagnostico-financeiro/logic";

// Mapping entre categorias do form (frontend) e categoria persistida no banco.
const CATEGORIAS_FIXOS: { key: keyof CustosFixos; label: string }[] = [
  { key: "aluguel", label: "Aluguel" },
  { key: "folha", label: "Folha de pagamento" },
  { key: "pro_labore", label: "Pró-labore" },
  { key: "contabilidade", label: "Contabilidade" },
  { key: "utilities", label: "Água / luz / internet" },
  { key: "software", label: "Softwares / SaaS" },
  { key: "outros_fixos", label: "Outros fixos" },
];

const CATEGORIAS_VARIAVEIS: { key: keyof CustosVariaveis; label: string }[] = [
  { key: "materiais", label: "Materiais" },
  { key: "laboratorio", label: "Laboratório" },
  { key: "comissoes", label: "Comissões" },
  { key: "impostos", label: "Impostos" },
  { key: "taxas_cartao", label: "Taxas de cartão" },
  { key: "outros_variaveis", label: "Outros variáveis" },
];

const CATEGORIAS_FINANCIAMENTOS: { key: keyof Financiamentos; label: string }[] = [
  { key: "parcelas_equipamentos", label: "Parcelas de equipamentos" },
];

interface Props {
  clienteId: string | null;
  custosFixos: CustosFixos;
  custosVariaveis: CustosVariaveis;
  financiamentos: Financiamentos;
  extrasFixos: CustoExtra[];
  extrasVariaveis: CustoExtra[];
  onChange: (patch: {
    custos_fixos?: Partial<CustosFixos>;
    custos_variaveis?: Partial<CustosVariaveis>;
    financiamentos?: Partial<Financiamentos>;
    extras_fixos?: CustoExtra[];
    extras_variaveis?: CustoExtra[];
  }) => void;
}

function novoExtra(): CustoExtra {
  return { id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, nome: "", valor: 0 };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60) || "extra";
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function CustosClinicaSection({
  clienteId,
  custosFixos,
  custosVariaveis,
  financiamentos,
  extrasFixos,
  extrasVariaveis,
  onChange,
}: Props) {
  const { data: custos = [], isLoading, refetch } = useCustosClinica(clienteId);
  const [hidratado, setHidratado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Hidrata o form quando os custos chegam (apenas uma vez por cliente).
  // Custos com categoria conhecida (aluguel, folha, etc) vao para custosFixos/Variaveis.
  // Custos com categoria livre vao para extras_fixos/variaveis (editaveis).
  useEffect(() => {
    if (!clienteId || isLoading) return;
    if (hidratado) return;

    const patchFixos: Partial<CustosFixos> = {};
    const patchVariaveis: Partial<CustosVariaveis> = {};
    const patchFinanciamentos: Partial<Financiamentos> = {};
    const extrasF: CustoExtra[] = [];
    const extrasV: CustoExtra[] = [];

    const keysFixos = new Set(CATEGORIAS_FIXOS.map((c) => c.key));
    const keysVariaveis = new Set(CATEGORIAS_VARIAVEIS.map((c) => c.key));
    const keysFinanc = new Set(CATEGORIAS_FINANCIAMENTOS.map((c) => c.key));

    for (const c of custos) {
      const v = Number(c.valor) || 0;
      if (c.tipo === "fixo" && keysFixos.has(c.categoria as keyof CustosFixos)) {
        patchFixos[c.categoria as keyof CustosFixos] = v;
      } else if (c.tipo === "variavel" && keysVariaveis.has(c.categoria as keyof CustosVariaveis)) {
        patchVariaveis[c.categoria as keyof CustosVariaveis] = v;
      } else if (c.tipo === "financiamento" && keysFinanc.has(c.categoria as keyof Financiamentos)) {
        patchFinanciamentos[c.categoria as keyof Financiamentos] = v;
      } else if (c.tipo === "fixo") {
        extrasF.push({ id: c.id, nome: c.descricao || c.categoria, valor: v });
      } else if (c.tipo === "variavel") {
        extrasV.push({ id: c.id, nome: c.descricao || c.categoria, valor: v });
      }
    }

    onChange({
      custos_fixos: patchFixos,
      custos_variaveis: patchVariaveis,
      financiamentos: patchFinanciamentos,
      extras_fixos: extrasF,
      extras_variaveis: extrasV,
    });
    setHidratado(true);
  }, [clienteId, isLoading, custos, hidratado, onChange]);

  // Reseta hidratação quando o cliente muda
  useEffect(() => {
    setHidratado(false);
  }, [clienteId]);

  async function handleSalvar() {
    if (!clienteId) {
      toast.error("Selecione um cliente antes de salvar");
      return;
    }
    setSalvando(true);
    try {
      type Linha = { tipo: string; categoria: string; descricao?: string | null; valor: number };
      const linhas: Linha[] = [
        ...CATEGORIAS_FIXOS.map((c) => ({
          tipo: "fixo",
          categoria: c.key as string,
          descricao: c.label,
          valor: Number(custosFixos[c.key]) || 0,
        })),
        ...CATEGORIAS_VARIAVEIS.map((c) => ({
          tipo: "variavel",
          categoria: c.key as string,
          descricao: c.label,
          valor: Number(custosVariaveis[c.key]) || 0,
        })),
        ...CATEGORIAS_FINANCIAMENTOS.map((c) => ({
          tipo: "financiamento",
          categoria: c.key as string,
          descricao: c.label,
          valor: Number(financiamentos[c.key]) || 0,
        })),
      ];

      // Upsert manual das categorias padrao
      for (const linha of linhas) {
        const { data: existente } = await supabase
          .from("custos_clinica")
          .select("id")
          .eq("cliente_id", clienteId)
          .eq("tipo", linha.tipo)
          .eq("categoria", linha.categoria)
          .eq("ativo", true)
          .maybeSingle();

        if (existente) {
          await supabase
            .from("custos_clinica")
            .update({ valor: linha.valor })
            .eq("id", existente.id);
        } else if (linha.valor > 0) {
          await supabase.from("custos_clinica").insert({
            cliente_id: clienteId,
            tipo: linha.tipo,
            categoria: linha.categoria,
            descricao: linha.descricao ?? null,
            valor: linha.valor,
          });
        }
      }

      // Extras: soft-delete dos existentes ja inativos nao tem efeito, dos ativos
      // com tipo customizado e re-insert dos atuais. Mais simples que diff.
      // Pega ids dos extras carregados que ainda estao na UI (mantem ids estaveis).
      const extrasUI = [
        ...extrasFixos.filter((e) => e.nome.trim() && Number(e.valor) > 0).map((e) => ({
          tipo: "fixo" as const, ...e,
        })),
        ...extrasVariaveis.filter((e) => e.nome.trim() && Number(e.valor) > 0).map((e) => ({
          tipo: "variavel" as const, ...e,
        })),
      ];
      const idsExtrasUI = new Set(extrasUI.filter((e) => !e.id.startsWith("e_")).map((e) => e.id));

      // Soft-delete dos extras (custos com categoria fora das whitelists) que sumiram da UI
      const keysFixos = new Set(CATEGORIAS_FIXOS.map((c) => c.key));
      const keysVariaveis = new Set(CATEGORIAS_VARIAVEIS.map((c) => c.key));
      const extrasBanco = custos.filter(
        (c) =>
          (c.tipo === "fixo" && !keysFixos.has(c.categoria as keyof CustosFixos)) ||
          (c.tipo === "variavel" && !keysVariaveis.has(c.categoria as keyof CustosVariaveis)),
      );
      for (const ext of extrasBanco) {
        if (!idsExtrasUI.has(ext.id)) {
          await supabase.from("custos_clinica").update({ ativo: false }).eq("id", ext.id);
        }
      }

      // INSERT/UPDATE extras
      for (const ext of extrasUI) {
        if (ext.id.startsWith("e_")) {
          // ID temporario do form, e novo
          await supabase.from("custos_clinica").insert({
            cliente_id: clienteId,
            tipo: ext.tipo,
            categoria: slugify(ext.nome),
            descricao: ext.nome.trim(),
            valor: Number(ext.valor),
          });
        } else {
          // ID veio do banco, faz UPDATE
          await supabase
            .from("custos_clinica")
            .update({ descricao: ext.nome.trim(), valor: Number(ext.valor) })
            .eq("id", ext.id);
        }
      }

      await refetch();
      toast.success("Custos salvos no cadastro do cliente");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar custos");
    } finally {
      setSalvando(false);
    }
  }

  function addExtraFixo() {
    onChange({ extras_fixos: [...extrasFixos, novoExtra()] });
  }
  function addExtraVariavel() {
    onChange({ extras_variaveis: [...extrasVariaveis, novoExtra()] });
  }
  function updateExtraFixo(id: string, patch: Partial<CustoExtra>) {
    onChange({ extras_fixos: extrasFixos.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  }
  function updateExtraVariavel(id: string, patch: Partial<CustoExtra>) {
    onChange({ extras_variaveis: extrasVariaveis.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  }
  function removeExtraFixo(id: string) {
    onChange({ extras_fixos: extrasFixos.filter((e) => e.id !== id) });
  }
  function removeExtraVariavel(id: string) {
    onChange({ extras_variaveis: extrasVariaveis.filter((e) => e.id !== id) });
  }

  const totalFixos =
    CATEGORIAS_FIXOS.reduce((s, c) => s + (Number(custosFixos[c.key]) || 0), 0) +
    extrasFixos.reduce((s, e) => s + (Number(e.valor) || 0), 0);
  const totalVariaveis =
    CATEGORIAS_VARIAVEIS.reduce((s, c) => s + (Number(custosVariaveis[c.key]) || 0), 0) +
    extrasVariaveis.reduce((s, e) => s + (Number(e.valor) || 0), 0);
  const totalFinanc = CATEGORIAS_FINANCIAMENTOS.reduce(
    (s, c) => s + (Number(financiamentos[c.key]) || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Banner status */}
      {clienteId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-verde-raiz/20 bg-verde-raiz/5 px-4 py-2 text-sm">
          <div className="flex items-center gap-2 text-verde-raiz/85">
            {custos.length > 0 ? (
              <>
                <Cloud className="h-4 w-4" />
                <span>
                  {custos.length} {custos.length === 1 ? "custo carregado" : "custos carregados"} do cadastro do cliente
                </span>
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                <span>Nenhum custo cadastrado ainda. Preencha abaixo e clique em "Salvar custos no cadastro".</span>
              </>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSalvar}
            disabled={salvando}
            className="border-verde-raiz/40 text-verde-raiz hover:bg-verde-raiz/10"
          >
            <Save className="mr-1 h-3.5 w-3.5" />
            {salvando ? "Salvando..." : "Salvar custos no cadastro"}
          </Button>
        </div>
      )}

      {/* Custos Fixos */}
      <Card className="p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-serif text-lg text-verde-raiz">Custos fixos</h3>
          <span className="font-display text-sm text-quase-preto/70">{fmtBRL(totalFixos)}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIAS_FIXOS.map((c) => (
            <div key={c.key}>
              <Label className="text-xs font-semibold text-quase-preto">{c.label}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={custosFixos[c.key] || ""}
                onChange={(e) =>
                  onChange({ custos_fixos: { [c.key]: Number(e.target.value) || 0 } as Partial<CustosFixos> })
                }
                placeholder="0"
                className="mt-1.5 h-10"
              />
            </div>
          ))}
        </div>

        {extrasFixos.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-quase-preto/55">
              Outros custos fixos
            </Label>
            {extrasFixos.map((e) => (
              <div key={e.id} className="flex items-center gap-2">
                <Input
                  placeholder="Nome do custo (ex: limpeza, segurança)"
                  value={e.nome}
                  onChange={(ev) => updateExtraFixo(e.id, { nome: ev.target.value })}
                  className="h-10 flex-1"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  value={e.valor || ""}
                  onChange={(ev) => updateExtraFixo(e.id, { valor: Number(ev.target.value) || 0 })}
                  placeholder="0"
                  className="h-10 w-32"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExtraFixo(e.id)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={addExtraFixo} className="mt-3">
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar outro custo fixo
        </Button>
      </Card>

      {/* Custos Variáveis */}
      <Card className="p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-serif text-lg text-verde-raiz">Custos variáveis</h3>
          <span className="font-display text-sm text-quase-preto/70">{fmtBRL(totalVariaveis)}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIAS_VARIAVEIS.map((c) => (
            <div key={c.key}>
              <Label className="text-xs font-semibold text-quase-preto">{c.label}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={custosVariaveis[c.key] || ""}
                onChange={(e) =>
                  onChange({
                    custos_variaveis: { [c.key]: Number(e.target.value) || 0 } as Partial<CustosVariaveis>,
                  })
                }
                placeholder="0"
                className="mt-1.5 h-10"
              />
            </div>
          ))}
        </div>

        {extrasVariaveis.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-quase-preto/55">
              Outros custos variáveis
            </Label>
            {extrasVariaveis.map((e) => (
              <div key={e.id} className="flex items-center gap-2">
                <Input
                  placeholder="Nome do custo (ex: brindes, eventos)"
                  value={e.nome}
                  onChange={(ev) => updateExtraVariavel(e.id, { nome: ev.target.value })}
                  className="h-10 flex-1"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  value={e.valor || ""}
                  onChange={(ev) => updateExtraVariavel(e.id, { valor: Number(ev.target.value) || 0 })}
                  placeholder="0"
                  className="h-10 w-32"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExtraVariavel(e.id)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={addExtraVariavel} className="mt-3">
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar outro custo variável
        </Button>
      </Card>

      {/* Financiamentos */}
      <Card className="p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-serif text-lg text-verde-raiz">Financiamentos</h3>
          <span className="font-display text-sm text-quase-preto/70">{fmtBRL(totalFinanc)}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIAS_FINANCIAMENTOS.map((c) => (
            <div key={c.key}>
              <Label className="text-xs font-semibold text-quase-preto">{c.label}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={financiamentos[c.key] || ""}
                onChange={(e) =>
                  onChange({
                    financiamentos: { [c.key]: Number(e.target.value) || 0 } as Partial<Financiamentos>,
                  })
                }
                placeholder="0"
                className="mt-1.5 h-10"
              />
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
