// Edge Function: diagnostico-analise
// Gera análises estratégicas via Lovable AI Gateway (Gemini Flash).
// Suporta dois modos:
//   1) Diagnóstico inicial (default): recebe pilares e gera análise do diagnóstico 360°.
//   2) Atualização mensal (mode = "mensal"): recebe KPIs do mês atual + anterior,
//      relatório do consultor, dados do diagnóstico inicial e meta — gera análise mensal.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Pilar {
  name: string;
  pct: number;
  total: number;
  max: number;
}

interface KpiMensal {
  label: string;
  valor: number | string | null;
  benchmark?: number | string | null;
  unidade?: string;
}

interface Body {
  // modo
  mode?: "diagnostico" | "mensal";

  // diagnóstico
  clientName?: string;
  ramo?: "dentista" | "medico";
  classifLabel?: string;
  planoName?: string;
  totalPct?: number;
  dor?: string;
  meta?: string;
  objetivo?: string;
  pilares?: Pilar[];

  // mensal
  mesReferencia?: string;
  mesAnterior?: string;
  kpisAtuais?: KpiMensal[];
  kpisAnteriores?: KpiMensal[];
  relatorioConsultor?: string;
  diagnosticoResumo?: string;
  metaConsultoria?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY ausente" }, 500);

    const body = (await req.json().catch(() => ({}))) as Body;
    const mode = body.mode === "mensal" ? "mensal" : "diagnostico";

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "mensal") {
      const {
        clientName = "o cliente",
        ramo = "dentista",
        mesReferencia = "—",
        mesAnterior = "—",
        kpisAtuais = [],
        kpisAnteriores = [],
        relatorioConsultor = "",
        diagnosticoResumo = "",
        metaConsultoria = "—",
      } = body;

      const ramoLabel = ramo === "medico" ? "consultório médico" : "clínica odontológica";

      const fmtKpis = (list: KpiMensal[]) =>
        list.length === 0
          ? "(sem dados)"
          : list
              .map((k) => {
                const v = k.valor === null || k.valor === "" ? "—" : k.valor;
                const u = k.unidade ? ` ${k.unidade}` : "";
                const b =
                  k.benchmark !== undefined && k.benchmark !== null && k.benchmark !== ""
                    ? ` (bench: ${k.benchmark}${u})`
                    : "";
                return `- ${k.label}: ${v}${u}${b}`;
              })
              .join("\n");

      systemPrompt = `Você é um consultor sênior da Raiz Consultoria Estratégica, especialista em ${ramoLabel}. Escreva análises mensais diretas, objetivas e acionáveis em português do Brasil. Tom profissional, sem clichês, sem emojis. Use parágrafos curtos. Nunca prometa números financeiros como garantia.`;

      userPrompt = `Gere uma análise estratégica MENSAL para ${clientName} (${ramoLabel}).

CONTEXTO:
- Mês de referência: ${mesReferencia}
- Mês anterior comparado: ${mesAnterior}
- Meta da consultoria: ${metaConsultoria}

DIAGNÓSTICO INICIAL (resumo):
${diagnosticoResumo || "(não informado)"}

KPIs DO MÊS ATUAL (${mesReferencia}):
${fmtKpis(kpisAtuais)}

KPIs DO MÊS ANTERIOR (${mesAnterior}):
${fmtKpis(kpisAnteriores)}

RELATÓRIO DO CONSULTOR:
${relatorioConsultor || "(não preenchido)"}

Estruture a resposta em 4 blocos com títulos em **negrito**:
1. **Resumo do mês** (2-3 frases sobre evolução vs. mês anterior)
2. **Destaques e ganhos** (KPIs que melhoraram + ações que funcionaram)
3. **Pontos de atenção** (KPIs estagnados ou em queda + causas prováveis)
4. **Próximos 30 dias** (3 ações concretas e mensuráveis)

Total: 250-350 palavras. Seja direto.`;
    } else {
      const {
        clientName = "o cliente",
        ramo = "dentista",
        classifLabel = "—",
        planoName = "—",
        totalPct = 0,
        dor = "não informada",
        meta = "não informada",
        objetivo = "não informado",
        pilares = [],
      } = body;

      if (!Array.isArray(pilares) || pilares.length === 0) {
        return json({ error: "pilares vazio" }, 400);
      }

      const sorted = [...pilares].sort((a, b) => a.pct - b.pct);
      const ramoLabel = ramo === "medico" ? "consultório médico" : "clínica odontológica";
      const pilaresTxt = sorted
        .map(
          (p, i) =>
            `${i + 1}. ${p.name} — ${Math.round(p.pct * 100)}% de maturidade (${p.total}/${p.max} pts)`,
        )
        .join("\n");

      systemPrompt = `Você é um consultor sênior da Raiz Consultoria Estratégica, especialista em ${ramoLabel}. Escreva análises estratégicas diretas, objetivas e acionáveis em português do Brasil. Tom profissional, sem clichês, sem emojis. Use parágrafos curtos. Nunca prometa números financeiros específicos como garantia.`;

      userPrompt = `Gere uma análise estratégica para ${clientName} (${ramoLabel}).

CONTEXTO:
- Classificação atual: ${classifLabel}
- Plano recomendado: ${planoName}
- Maturidade geral: ${Math.round(totalPct * 100)}%
- Objetivo declarado: ${objetivo}
- Dor mais urgente: "${dor}"
- Meta de faturamento: ${meta}

PILARES DIAGNOSTICADOS (do mais crítico ao mais maduro):
${pilaresTxt}

Estruture a resposta em 4 blocos com títulos em **negrito**:
1. **Diagnóstico geral** (2-3 frases conectando os pilares críticos com a dor declarada)
2. **Gargalos prioritários** (os 2-3 pilares mais urgentes e por que importam)
3. **Caminho recomendado** (sequência lógica de intervenção, por que nessa ordem)
4. **Próximos 90 dias** (3 ações concretas e mensuráveis)

Total: 250-350 palavras. Seja direto.`;
    }

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      },
    );

    if (aiResp.status === 429) {
      return json({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." }, 429);
    }
    if (aiResp.status === 402) {
      return json({ error: "Créditos do workspace esgotados." }, 402);
    }
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return json({ error: `AI Gateway: ${aiResp.status} ${txt}` }, 500);
    }

    const data = await aiResp.json();
    const analise = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!analise) return json({ error: "Resposta vazia do modelo" }, 500);

    return json({ analise });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
