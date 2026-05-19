import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Cloud, Database, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCustosClinica, type CustoClinica } from "@/hooks/useCustosClinica";
import type {
  CustosFixos,
  CustosVariaveis,
  Financiamentos,
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
  onChange: (patch: {
    custos_fixos?: Partial<CustosFixos>;
    custos_variaveis?: Partial<CustosVariaveis>;
    financiamentos?: Partial<Financiamentos>;
  }) => void;
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function CustosClinicaSection({
  clienteId,
  custosFixos,
  custosVariaveis,
  financiamentos,
  onChange,
}: Props) {
  const { data: custos = [], isLoading, refetch } = useCustosClinica(clienteId);
  const [hidratado, setHidratado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [customCustos, setCustomCustos] = useState<CustoClinica[]>([]);

  // Hidrata o form quando os custos chegam (apenas uma vez por cliente)
  useEffect(() => {
    if (!clienteId || isLoading) return;
    if (hidratado) return;

    const patchFixos: Partial<CustosFixos> = {};
    const patchVariaveis: Partial<CustosVariaveis> = {};
    const patchFinanciamentos: Partial<Financiamentos> = {};
    const customs: CustoClinica[] = [];

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
      } else {
        customs.push(c);
      }
    }

    setCustomCustos(customs);
    onChange({
      custos_fixos: patchFixos,
      custos_variaveis: patchVariaveis,
      financiamentos: patchFinanciamentos,
    });
    setHidratado(true);
  }, [clienteId, isLoading, custos, hidratado, onChange]);

  // Reseta hidratação quando o cliente muda
  useEffect(() => {
    setHidratado(false);
    setCustomCustos([]);
  }, [clienteId]);

  async function handleSalvar() {
    if (!clienteId) {
      toast.error("Selecione um cliente antes de salvar");
      return;
    }
    setSalvando(true);
    try {
      type Linha = { tipo: string; categoria: string; valor: number };
      const linhas: Linha[] = [
        ...CATEGORIAS_FIXOS.map((c) => ({
          tipo: "fixo",
          categoria: c.key as string,
          valor: Number(custosFixos[c.key]) || 0,
        })),
        ...CATEGORIAS_VARIAVEIS.map((c) => ({
          tipo: "variavel",
          categoria: c.key as string,
          valor: Number(custosVariaveis[c.key]) || 0,
        })),
        ...CATEGORIAS_FINANCIAMENTOS.map((c) => ({
          tipo: "financiamento",
          categoria: c.key as string,
          valor: Number(financiamentos[c.key]) || 0,
        })),
      ];

      // Upsert manual: lê existentes, atualiza ou insere
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
            valor: linha.valor,
          });
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

  async function handleExcluirCustom(id: string) {
    if (!confirm("Excluir este custo customizado?")) return;
    try {
      await supabase.from("custos_clinica").update({ ativo: false }).eq("id", id);
      await refetch();
      setCustomCustos((prev) => prev.filter((c) => c.id !== id));
      toast.success("Custo excluído");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir");
    }
  }

  const totalFixos = CATEGORIAS_FIXOS.reduce((s, c) => s + (Number(custosFixos[c.key]) || 0), 0);
  const totalVariaveis = CATEGORIAS_VARIAVEIS.reduce(
    (s, c) => s + (Number(custosVariaveis[c.key]) || 0),
    0,
  );
  const totalFinanc = CATEGORIAS_FINANCIAMENTOS.reduce(
    (s, c) => s + (Number(financiamentos[c.key]) || 0),
    0,
  );
  const totalCustom = customCustos.reduce((s, c) => s + (Number(c.valor) || 0), 0);

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

      {/* Custos customizados (categorias livres cadastradas no banco) */}
      {customCustos.length > 0 && (
        <Card className="p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-serif text-lg text-verde-raiz">Custos customizados</h3>
              <p className="text-xs text-quase-preto/55">
                Cadastrados manualmente no banco. Não entram nos campos padrão acima, mas estão somados no total geral.
              </p>
            </div>
            <span className="font-display text-sm text-quase-preto/70">{fmtBRL(totalCustom)}</span>
          </div>
          <div className="divide-y divide-border">
            {customCustos.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5">
                <Badge variant="outline" className="capitalize">
                  {c.tipo}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-quase-preto/85">
                    {c.descricao || c.categoria}
                  </div>
                  <div className="text-xs text-quase-preto/55">{c.categoria}</div>
                </div>
                <span className="shrink-0 font-display text-sm">{fmtBRL(Number(c.valor) || 0)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleExcluirCustom(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
