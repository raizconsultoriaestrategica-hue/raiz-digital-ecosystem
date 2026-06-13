import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tipagem mínima do retorno da RPC detectar_gargalos
interface Gargalo {
  kpi: string;
  pilar: string | null;
  unidade: string;
  polaridade: string;
  valor_atual: number;
  benchmark_min: number;
  benchmark_max: number;
  status: string;
  severidade: string;
  descricao: string | null;
  fonte: string | null;
}

interface ReqBody {
  messages: Array<{ role: string; content: string }>;
  systemPrompt: string;
  // Opcionais: quando presentes, edge busca gargalos do cliente e
  // injeta como contexto no systemPrompt.
  cliente_id?: string;
  mes?: string; // YYYY-MM-DD (primeiro dia do mês)
}

async function fetchGargalos(
  authHeader: string,
  cliente_id: string,
  mes: string,
): Promise<Gargalo[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    throw new Error("SUPABASE_URL ou SUPABASE_ANON_KEY ausentes no edge.");
  }
  const r = await fetch(`${supabaseUrl}/rest/v1/rpc/detectar_gargalos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: authHeader,
    },
    body: JSON.stringify({ p_cliente_id: cliente_id, p_mes: mes }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`RPC detectar_gargalos falhou (${r.status}): ${txt}`);
  }
  const data = await r.json();
  return Array.isArray(data) ? (data as Gargalo[]) : [];
}

function fmtValor(g: Gargalo): string {
  if (g.unidade === "%") return `${g.valor_atual}%`;
  if (g.unidade === "BRL") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(g.valor_atual));
  }
  return `${g.valor_atual} ${g.unidade}`;
}

function fmtFaixa(g: Gargalo): string {
  if (g.unidade === "%") return `${g.benchmark_min}% a ${g.benchmark_max}%`;
  if (g.unidade === "BRL") {
    const f = (v: number) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v);
    return `${f(Number(g.benchmark_min))} a ${f(Number(g.benchmark_max))}`;
  }
  return `${g.benchmark_min} a ${g.benchmark_max} ${g.unidade}`;
}

function gargalosToPrompt(gargalos: Gargalo[], mes: string): string {
  if (!gargalos.length) {
    return `\n\n[CONTEXTO BENCHMARKS] Sem dados de KPIs para ${mes}. Sinalize ao usuário que precisamos do preenchimento mensal antes de gerar análise de gargalos.`;
  }

  const criticos = gargalos.filter((g) => g.severidade === "critico");
  const atencao = gargalos.filter((g) => g.severidade === "atencao");
  const ok = gargalos.filter((g) => g.severidade === "ok");

  const linhas: string[] = [];
  linhas.push(
    `\n\n[CONTEXTO BENCHMARKS — ${mes}] Indicadores mensais do cliente comparados com a faixa saudável de mercado para a especialidade dele. Use estes dados como base factual. Não invente números.`,
  );

  if (criticos.length) {
    linhas.push(`\n## KPIs CRÍTICOS (${criticos.length})`);
    for (const g of criticos) {
      linhas.push(
        `- **${g.kpi}** (${g.pilar ?? "—"}): ${fmtValor(g)} · faixa saudável ${fmtFaixa(g)} · status ${g.status}. ${g.descricao ?? ""}`,
      );
    }
  }
  if (atencao.length) {
    linhas.push(`\n## KPIs EM ATENÇÃO (${atencao.length})`);
    for (const g of atencao) {
      linhas.push(
        `- **${g.kpi}** (${g.pilar ?? "—"}): ${fmtValor(g)} · faixa ${fmtFaixa(g)} · status ${g.status}. ${g.descricao ?? ""}`,
      );
    }
  }
  if (ok.length) {
    linhas.push(`\n## KPIs DENTRO DO ESPERADO (${ok.length})`);
    for (const g of ok) {
      linhas.push(`- ${g.kpi}: ${fmtValor(g)} (faixa ${fmtFaixa(g)})`);
    }
  }
  return linhas.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ReqBody;
    const { messages, systemPrompt, cliente_id, mes } = body;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Injeta contexto de gargalos quando cliente_id + mes estão presentes.
    // Caller passa o próprio JWT no header Authorization. A RPC roda como
    // SECURITY INVOKER, então o RLS de kpis_mensais filtra naturalmente.
    let finalSystemPrompt = systemPrompt ?? "";
    if (cliente_id && mes) {
      const authHeader = req.headers.get("authorization") ?? "";
      if (!authHeader) {
        return new Response(
          JSON.stringify({
            error:
              "Authorization header ausente. Necessario para buscar gargalos do cliente.",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      try {
        const gargalos = await fetchGargalos(authHeader, cliente_id, mes);
        finalSystemPrompt += gargalosToPrompt(gargalos, mes);
      } catch (e) {
        console.error("[consultor-ia] falha ao buscar gargalos:", e);
        // Não bloqueia a chamada: prossegue sem contexto de gargalos.
        finalSystemPrompt += `\n\n[CONTEXTO BENCHMARKS] Falha ao carregar gargalos do banco. Sinalize ao usuario.`;
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: finalSystemPrompt,
        messages,
      }),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[consultor-ia] erro:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
