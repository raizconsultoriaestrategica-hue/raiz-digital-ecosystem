// Edge Function: diagnostico-analise
// Gera uma análise estratégica via Lovable AI Gateway (Gemini Flash)
// para o diagnóstico de um cliente.
//
// Body esperado:
// {
//   clientName: string,
//   ramo: "dentista" | "medico",
//   classifLabel: string,
//   planoName: string,
//   totalPct: number,            // 0..1
//   dor?: string,
//   meta?: string,
//   objetivo?: string,
//   pilares: Array<{ name: string; pct: number; total: number; max: number }>,
// }
//
// Resposta: { analise: string }

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

interface Body {
  clientName?: string;
  ramo?: "dentista" | "medico";
  classifLabel?: string;
  planoName?: string;
  totalPct?: number;
  dor?: string;
  meta?: string;
  objetivo?: string;
  pilares?: Pilar[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return json({ error: "LOVABLE_API_KEY ausente" }, 500);
    }

    const body = (await req.json().catch(() => ({}))) as Body;
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

    const systemPrompt = `Você é um consultor sênior da Raiz Consultoria Estratégica, especialista em ${ramoLabel}. Escreva análises estratégicas diretas, objetivas e acionáveis em português do Brasil. Tom profissional, sem clichês, sem emojis. Use parágrafos curtos. Nunca prometa números financeiros específicos como garantia.`;

    const userPrompt = `Gere uma análise estratégica para ${clientName} (${ramoLabel}).

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
