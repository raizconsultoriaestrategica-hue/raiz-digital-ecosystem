import { supabase } from "@/integrations/supabase/client";
import { PILARES } from "./data";
import { CONHECIMENTO_RAIZ } from "./conhecimentoRaiz";
import type { ModuloDb, OrcamentoForm } from "./types";

export interface AiAnalysisResult {
  analise: string;
  ancoragem: string;
  justificativas: Record<string, string>;
}

const SYSTEM_PROMPT = `Você é o Consultor Sênior da Raiz Consultoria Estratégica. Baseie suas análises EXCLUSIVAMENTE na Base de Conhecimento Raiz abaixo e nos dados reais do cliente. Nunca invente serviço, módulo, métrica ou estatística; se um dado do cliente não veio, diga "não informado". Compare os indicadores do cliente com os benchmarks da base quando fizer sentido, citando a referência de mercado. Tom consultivo e direto, voz Raiz. NUNCA use travessão (—); use ponto, vírgula ou dois-pontos. Quando solicitado JSON, retorne APENAS JSON válido sem markdown, sem texto adicional, sem code fences.

${CONHECIMENTO_RAIZ}`;

/** Remove travessão (—) do texto da IA, conforme padrão de escrita da Raiz. */
function semTravessao(s: string): string {
  return s.replace(/\s*—\s*/g, ", ");
}

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

1. "analise": texto de 3-4 parágrafos sobre os principais gargalos identificados, pilares críticos e oportunidades. Tom consultivo e direto, sem bullet points. Quando fizer sentido, compare os indicadores do cliente com os benchmarks de mercado da Base de Conhecimento (no-show, conversão, retenção, margem, ticket) para dar peso e referência. Não invente número que o cliente não informou
2. "ancoragem": uma frase de até 2 linhas que use obrigatoriamente números reais do cliente (faturamento atual, perdas calculadas por no-show, pacientes inativos ou conversão baixa) para mostrar o custo concreto da inércia. A frase deve ser direta e emocional. Falar o que ele está perdendo em reais por mês ou por ano, de forma que qualquer pessoa entenda sem precisar de explicação. Sem jargão, sem termos técnicos como ROI ou KPI. Tom de conversa honesta entre sócios. Exemplo de estrutura (não copiar, apenas referência de formato): 'Com [faturamento] por mês e [problema identificado], você está deixando cerca de R$X na mesa todo mês. Isso é R$Y por ano trabalhando de graça.' Calcule os números com base nos dados reais do diagnóstico.
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

  const justRaw =
    parsed.justificativas && typeof parsed.justificativas === "object"
      ? parsed.justificativas
      : {};
  const justificativas: Record<string, string> = {};
  for (const [k, v] of Object.entries(justRaw)) {
    justificativas[k] = semTravessao(String(v ?? ""));
  }

  return {
    analise: semTravessao(String(parsed.analise || "").trim()),
    ancoragem: semTravessao(String(parsed.ancoragem || "").trim()),
    justificativas,
  };
}
