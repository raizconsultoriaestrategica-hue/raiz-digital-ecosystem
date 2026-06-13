import { supabase } from "@/integrations/supabase/client";
import { PILARES } from "./data";
import { CONHECIMENTO_RAIZ } from "./conhecimentoRaiz";
import type { Frente, ModuloDb, OrcamentoForm } from "./types";

export interface AiAnalysisResult {
  analise: string;
  ancoragem: string;
  frentes: Frente[];
  justificativas: Record<string, string>;
}

const SYSTEM_PROMPT = `Você é o Consultor Sênior da Raiz Consultoria Estratégica. Baseie suas análises EXCLUSIVAMENTE na Base de Conhecimento Raiz abaixo e nos dados reais do cliente. Nunca invente serviço, módulo, métrica ou estatística; se um dado do cliente não veio, diga "não informado". Compare os indicadores do cliente com os benchmarks da base quando fizer sentido, citando a referência de mercado. Tom consultivo e direto, voz Raiz. NUNCA use travessão (—); use ponto, vírgula ou dois-pontos. Quando solicitado JSON, retorne APENAS JSON válido sem markdown, sem texto adicional, sem code fences.

${CONHECIMENTO_RAIZ}`;

/** Remove travessão (—) do texto da IA, conforme padrão de escrita da Raiz. */
function semTravessao(s: string): string {
  return s.replace(/\s*—\s*/g, ", ");
}

function buildUserPrompt(form: OrcamentoForm, modulosDb: ModuloDb[]): string {
  const pilaresLinhas = PILARES.map((p) => {
    const v = form.pilarScores[p.id];
    return `- ${p.id} ${p.name}: ${v ? v + "%" : "—"}`;
  }).join("\n");

  const catalogoModulos = modulosDb
    .map((m) => `- ${m.codigo}: ${m.nome} (Pilar ${m.pilar} ${m.pilar_nome} · Fase ${m.fase})`)
    .join("\n");

  const fat = form.faturamento ? `R$ ${Number(form.faturamento).toLocaleString("pt-BR")}` : "—";
  const meta = form.meta ? `R$ ${Number(form.meta).toLocaleString("pt-BR")}` : "—";

  return `Analise o diagnóstico 360° e o resumo da reunião deste cliente e gere quatro blocos em JSON:

1. "analise": texto de 3-4 parágrafos sobre os principais gargalos identificados, pilares críticos e oportunidades. Tom consultivo e direto, sem bullet points. Quando fizer sentido, compare os indicadores do cliente com os benchmarks de mercado da Base de Conhecimento (no-show, conversão, retenção, margem, ticket) para dar peso e referência. Não invente número que o cliente não informou.
2. "frentes": array com 3 a 6 frentes estratégicas de trabalho, priorizadas por impacto no faturamento, velocidade e prontidão de execução, de acordo com a realidade deste cliente. Não lidere com tráfego se o gargalo for conversão, retenção ou preço (balde furado). Cada frente é um objeto: { "nome": nome comercial curto da frente, "resultado": uma frase do que muda para o cliente, "entrega": entregável em linguagem de valor (sem nome técnico de módulo), "fase": número 1, 2 ou 3 (sequência de execução), "modulos": array com os códigos dos módulos que compõem a frente, escolhidos APENAS do catálogo abaixo }.
3. "ancoragem": uma frase de até 2 linhas que use obrigatoriamente números reais do cliente (faturamento atual, perdas por no-show, pacientes inativos ou conversão baixa) para mostrar o custo concreto da inércia. Direta e emocional, em reais por mês ou por ano, sem jargão. Exemplo de estrutura (não copiar): 'Com [faturamento] por mês e [problema], você está deixando cerca de R$X na mesa todo mês. Isso é R$Y por ano.' Calcule com base nos dados reais.
4. "justificativas": objeto onde cada chave é o código de um módulo usado nas frentes e o valor é uma frase curta (máx 15 palavras) do impacto esperado para este cliente.

Retorne APENAS o JSON, sem texto adicional.

DADOS DO CLIENTE:
- Nome: ${form.nomeCliente || "—"}
- Clínica: ${form.nomeClinica || "—"}
- Especialidade: ${form.especialidade || "—"}
- Cidade: ${form.cidade || "—"}
- Faturamento atual: ${fat}
- Meta de faturamento: ${meta}
- Dor principal: ${form.dor || "—"}
- Score total: ${form.score || "—"} / ${form.scoreMax || "—"}

SCORES POR PILAR (quanto menor, mais crítico):
${pilaresLinhas}

RESUMO DA REUNIÃO (TL.DV):
${form.resumoReuniao?.trim() || "(não informado)"}

CATÁLOGO DE MÓDULOS (use somente estes códigos nas frentes):
${catalogoModulos}`;
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
  modulosDb: ModuloDb[]
): Promise<AiAnalysisResult> {
  const userPrompt = buildUserPrompt(form, modulosDb);

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

  // Frentes geradas pela IA, validadas: só códigos de módulo que existem.
  const validCodes = new Set(modulosDb.map((m) => m.codigo));
  const frentesRaw = Array.isArray(parsed.frentes) ? parsed.frentes : [];
  const frentes: Frente[] = frentesRaw
    .map((f: any) => ({
      nome: semTravessao(String(f?.nome ?? "").trim()),
      resultado: semTravessao(String(f?.resultado ?? "").trim()),
      entrega: semTravessao(String(f?.entrega ?? "").trim()),
      fase: Math.min(3, Math.max(1, parseInt(String(f?.fase), 10) || 1)),
      modulos: Array.isArray(f?.modulos)
        ? f.modulos.map((c: any) => String(c)).filter((c: string) => validCodes.has(c))
        : [],
    }))
    .filter((f: Frente) => f.nome)
    .sort((a: Frente, b: Frente) => a.fase - b.fase);

  return {
    analise: semTravessao(String(parsed.analise || "").trim()),
    ancoragem: semTravessao(String(parsed.ancoragem || "").trim()),
    frentes,
    justificativas,
  };
}
