import { supabase } from "@/integrations/supabase/client";
import { PILARES } from "./data";
import type { ModuloDb, OrcamentoForm } from "./types";

export interface AiAnalysisResult {
  analise: string;
  ancoragem: string;
  justificativas: Record<string, string>;
}

const SYSTEM_PROMPT = `Você é o Consultor Sênior da Raiz Consultoria Estratégica. Gere análises personalizadas para o diagnóstico de clientes (dentistas/médicos), com tom consultivo, direto e ancorado em dados. Nunca invente métricas. Quando solicitado JSON, retorne APENAS JSON válido sem markdown, sem texto adicional, sem code fences.`;

function buildUserPrompt(
  form: OrcamentoForm,
  modulosDb: ModuloDb[],
  selectedCodes: string[]
): string {
  const pilaresLinhas = PILARES.map((p) => {
    const v = form.pilarScores[p.id];
    return `- ${p.id} ${p.name}: ${v ? v + "%" : "—"}`;
  }).join("\n");

  const modsSelecionados = selectedCodes
    .map((c) => modulosDb.find((m) => m.codigo === c))
    .filter(Boolean)
    .map((m) => `- ${m!.codigo}: ${m!.nome} (Pilar ${m!.pilar} · Fase ${m!.fase})`)
    .join("\n");

  const fat = form.faturamento ? `R$ ${Number(form.faturamento).toLocaleString("pt-BR")}` : "—";
  const meta = form.meta ? `R$ ${Number(form.meta).toLocaleString("pt-BR")}` : "—";

  return `Analise o diagnóstico 360° deste cliente e gere três blocos em JSON:

1. "analise": texto de 3-4 parágrafos sobre os principais gargalos identificados, pilares críticos e oportunidades — tom consultivo e direto, sem bullet points
2. "ancoragem": uma frase de até 2 linhas, criada especificamente para este cliente com base no seu faturamento, dor principal, pilares críticos e contexto. A frase deve gerar impacto emocional e conexão real — falando sobre o que ele perde, o que ele quer ou o que o impede de chegar lá. Linguagem humana e direta, sem jargão técnico ou corporativo. Não use fórmulas fixas — crie algo que só faria sentido para esse cliente específico.
3. "justificativas": objeto onde cada chave é o código do módulo selecionado e o valor é uma frase curta (máx 15 palavras) explicando o impacto esperado para esse cliente específico

Retorne APENAS o JSON, sem texto adicional.

DADOS DO CLIENTE:
- Nome: ${form.nomeCliente || "—"}
- Clínica: ${form.nomeClinica || "—"}
- Especialidade: ${form.especialidade || "—"}
- Cidade: ${form.cidade || "—"}
- Faturamento atual: ${fat}
- Meta de faturamento: ${meta}
- Dor principal: ${form.dor || "—"}
- Plano selecionado: ${form.plano}
- Score total: ${form.score || "—"} / ${form.scoreMax || "—"}

SCORES POR PILAR:
${pilaresLinhas}

MÓDULOS SELECIONADOS:
${modsSelecionados || "(nenhum)"}`;
}

function extractJson(text: string): string {
  // Remove code fences se vierem
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  // Pega do primeiro { ao último }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return s;
}

export async function gerarAnaliseIA(
  form: OrcamentoForm,
  modulosDb: ModuloDb[],
  selectedCodes: string[]
): Promise<AiAnalysisResult> {
  const userPrompt = buildUserPrompt(form, modulosDb, selectedCodes);

  const { data, error } = await supabase.functions.invoke("consultor-ia", {
    body: {
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    },
  });

  if (error) throw new Error(error.message || "Falha ao chamar consultor-ia");
  if (data?.error) throw new Error(data.error);

  // Resposta crua da Anthropic: { content: [{ type: 'text', text: '...' }] }
  const text: string =
    data?.content?.[0]?.text ??
    data?.content?.map?.((c: any) => c?.text).filter(Boolean).join("\n") ??
    "";

  if (!text) throw new Error("Resposta vazia da IA");

  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch (e) {
    console.error("[gerarAnaliseIA] JSON inválido:", text);
    throw new Error("A IA retornou um formato inválido. Tente novamente.");
  }

  return {
    analise: String(parsed.analise || "").trim(),
    ancoragem: String(parsed.ancoragem || "").trim(),
    justificativas: (parsed.justificativas && typeof parsed.justificativas === "object")
      ? parsed.justificativas
      : {},
  };
}
