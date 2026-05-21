// Edge Function: send-resumo-mensal
// Envia para cada cliente ativo um resumo dos KPIs do mes anterior.
// Pensada pra rodar via cron na primeira segunda do mes as 9h SP.
//
// Trigger: HTTP POST. Cron passa Authorization: Bearer <service_role>.
//
// Retorno:
//   200 { mes_referencia, total_elegiveis, sem_email, sent, failed, errors }
//   500 { error: "..." }

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Cliente {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  email_cliente: string | null;
  status: string | null;
}

interface KpiMes {
  cliente_id: string;
  mes_referencia: string;
  faturamento_bruto: number | null;
  ticket_medio: number | null;
  pacientes_novos: number | null;
  margem_liquida: number | null;
}

// Retorna o primeiro dia do mes anterior em America/Sao_Paulo no formato YYYY-MM-01.
function mesAnteriorSP(): { mes_referencia: string; mes_label: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  });
  const partes = fmt.formatToParts(new Date());
  const ano = Number(partes.find((p) => p.type === "year")!.value);
  const mes = Number(partes.find((p) => p.type === "month")!.value);

  // Subtrai 1 mes
  let anoAnt = ano;
  let mesAnt = mes - 1;
  if (mesAnt === 0) {
    mesAnt = 12;
    anoAnt -= 1;
  }

  const mm = String(mesAnt).padStart(2, "0");
  const mes_referencia = `${anoAnt}-${mm}-01`;

  const labelFmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "long",
    year: "numeric",
  });
  const dataParaLabel = new Date(Date.UTC(anoAnt, mesAnt - 1, 15));
  const mes_label = labelFmt
    .format(dataParaLabel)
    .replace(/^./, (c) => c.toUpperCase());

  return { mes_referencia, mes_label };
}

// Calcula mes anterior a um YYYY-MM-01. Util pra pegar T-2 e fazer variacao.
function mesAnteriorDe(mesRef: string): string {
  const [y, m] = mesRef.split("-").map(Number);
  let anoAnt = y;
  let mesAnt = m - 1;
  if (mesAnt === 0) {
    mesAnt = 12;
    anoAnt -= 1;
  }
  return `${anoAnt}-${String(mesAnt).padStart(2, "0")}-01`;
}

function fmtBRL(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toFixed(1)}%`;
}

function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
  return String(Math.round(Number(n)));
}

// Retorna { texto, cor } para variacao percentual.
// Se nao houver T-2 ou T-2 = 0, retorna null (omite no template).
function variacao(
  atual: number | null | undefined,
  anterior: number | null | undefined,
): { texto: string; cor: string } | null {
  if (
    atual === null ||
    atual === undefined ||
    anterior === null ||
    anterior === undefined
  ) {
    return null;
  }
  const a = Number(atual);
  const b = Number(anterior);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  const pct = ((a - b) / Math.abs(b)) * 100;
  if (Math.abs(pct) < 0.05) return { texto: "→ estável", cor: "#7a7a7a" };
  const seta = pct > 0 ? "↑" : "↓";
  const cor = pct > 0 ? "#2d7a4a" : "#b04545";
  return { texto: `${seta} ${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`, cor };
}

function cardKpi(
  titulo: string,
  valor: string,
  variacao: { texto: string; cor: string } | null,
): string {
  const varBlock = variacao
    ? `<div style="margin-top:4px;font-size:12px;color:${variacao.cor};font-weight:600;">${variacao.texto}</div>`
    : "";
  return `
    <td style="padding:8px;width:50%;vertical-align:top;">
      <div style="padding:16px;border:1px solid #e5e0d3;border-radius:8px;background:#fafafa;">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#5a5a5a;">
          ${titulo}
        </div>
        <div style="margin-top:6px;font-size:22px;font-weight:600;color:#2d3f29;">${valor}</div>
        ${varBlock}
      </div>
    </td>
  `;
}

function montarHtmlEmail(
  cliente: Cliente,
  kpi: KpiMes,
  kpiAnterior: KpiMes | null,
  mesLabel: string,
): string {
  const nome = cliente.nome_cliente;
  const clinica = cliente.nome_clinica ?? "";

  const cards = [
    cardKpi(
      "Faturamento bruto",
      fmtBRL(kpi.faturamento_bruto),
      variacao(kpi.faturamento_bruto, kpiAnterior?.faturamento_bruto),
    ),
    cardKpi(
      "Ticket médio",
      fmtBRL(kpi.ticket_medio),
      variacao(kpi.ticket_medio, kpiAnterior?.ticket_medio),
    ),
    cardKpi(
      "Pacientes novos",
      fmtInt(kpi.pacientes_novos),
      variacao(kpi.pacientes_novos, kpiAnterior?.pacientes_novos),
    ),
    cardKpi(
      "Margem líquida",
      fmtPct(kpi.margem_liquida),
      variacao(kpi.margem_liquida, kpiAnterior?.margem_liquida),
    ),
  ];

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <body style="margin:0;padding:0;background:#f5f1e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2a2a2a;">
      <div style="max-width:560px;margin:0 auto;padding:24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;color:#c9a961;">
            Raiz Consultoria Estratégica
          </div>
        </div>

        <div style="background:#ffffff;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <h1 style="margin:0 0 8px;font-size:22px;color:#2d3f29;font-weight:600;">
            Seu resumo de ${mesLabel}
          </h1>
          <p style="margin:0 0 20px;color:#5a5a5a;font-size:14px;">
            Olá, ${nome}${clinica ? ` (${clinica})` : ""}. Aqui está o resumo dos indicadores que registramos juntos no mês passado.
          </p>

          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:separate;">
            <tr>${cards[0]}${cards[1]}</tr>
            <tr>${cards[2]}${cards[3]}</tr>
          </table>

          <p style="margin-top:24px;font-size:14px;color:#2a2a2a;line-height:1.6;">
            O detalhamento completo, com gráficos e próximos passos do projeto, está na sua Pasta do Cliente.
          </p>

          <div style="text-align:center;margin-top:24px;">
            <a href="https://www.raizconsultoriaestrategica.com.br/pasta-do-cliente"
               style="display:inline-block;padding:12px 24px;background:#2d3f29;color:#f5f1e8;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
              Ver detalhes na Pasta
            </a>
          </div>

          <p style="margin-top:32px;font-size:13px;color:#7a7a7a;">
            Obrigado pela parceria,<br>Equipe Raiz Consultoria
          </p>
        </div>

        <p style="text-align:center;margin-top:16px;font-size:11px;color:#a0a0a0;">
          Você está recebendo porque é cliente ativo da Raiz Consultoria Estratégica.
        </p>
      </div>
    </body>
    </html>
  `;
}

async function enviarEmailResend(
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  html: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: toEmail,
      subject,
      html,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data?.message || `HTTP ${res.status}` };
  }
  return { ok: true, id: data?.id || "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
    const FROM_EMAIL =
      Deno.env.get("RESEND_FROM_EMAIL") ||
      "Raiz Consultoria <noreply@raizconsultoriaestrategica.com.br>";

    if (!SUPABASE_URL || !SERVICE_ROLE || !RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Faltando env var: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou RESEND_API_KEY",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { mes_referencia, mes_label } = mesAnteriorSP();
    const mes_anterior_ao_referencia = mesAnteriorDe(mes_referencia);

    // 1. Clientes ativos com email
    const { data: clientesRaw, error: erroClientes } = await sb
      .from("clientes")
      .select("id, nome_cliente, nome_clinica, email_cliente, status")
      .eq("status", "projeto_ativo");

    if (erroClientes) {
      return new Response(JSON.stringify({ error: erroClientes.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientesAtivos = (clientesRaw ?? []) as Cliente[];
    const clientesComEmail = clientesAtivos.filter((c) => c.email_cliente);
    const semEmail = clientesAtivos.length - clientesComEmail.length;

    if (clientesComEmail.length === 0) {
      return new Response(
        JSON.stringify({
          mes_referencia,
          total_elegiveis: 0,
          sem_email: semEmail,
          sent: 0,
          failed: 0,
          errors: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ids = clientesComEmail.map((c) => c.id);

    // 2. KPIs do mes anterior para os clientes ativos
    const { data: kpisRaw, error: erroKpis } = await sb
      .from("kpis_mensais")
      .select(
        "cliente_id, mes_referencia, faturamento_bruto, ticket_medio, pacientes_novos, margem_liquida",
      )
      .in("cliente_id", ids)
      .eq("mes_referencia", mes_referencia);

    if (erroKpis) {
      return new Response(JSON.stringify({ error: erroKpis.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const kpis = (kpisRaw ?? []) as KpiMes[];
    const kpiByCliente: Record<string, KpiMes> = {};
    for (const k of kpis) kpiByCliente[k.cliente_id] = k;

    // 3. KPIs do mes anterior ao referencia (T-2) para variacao
    const { data: kpisAntRaw } = await sb
      .from("kpis_mensais")
      .select(
        "cliente_id, mes_referencia, faturamento_bruto, ticket_medio, pacientes_novos, margem_liquida",
      )
      .in("cliente_id", ids)
      .eq("mes_referencia", mes_anterior_ao_referencia);

    const kpisAnteriores = (kpisAntRaw ?? []) as KpiMes[];
    const kpiAntByCliente: Record<string, KpiMes> = {};
    for (const k of kpisAnteriores) kpiAntByCliente[k.cliente_id] = k;

    // 4. Elegiveis: clientes com email E com KPI do mes referencia
    const elegiveis = clientesComEmail.filter((c) => kpiByCliente[c.id]);

    console.log(
      `[send-resumo-mensal] mes=${mes_referencia} ativos=${clientesAtivos.length} com_email=${clientesComEmail.length} elegiveis=${elegiveis.length}`,
    );

    let sent = 0;
    let failed = 0;
    const errors: { cliente_id: string; error: string }[] = [];

    for (const c of elegiveis) {
      const kpi = kpiByCliente[c.id];
      const kpiAnterior = kpiAntByCliente[c.id] ?? null;
      const subject = `Seu resumo de ${mes_label.split(" ")[0].toLowerCase()} na Raiz`;
      const html = montarHtmlEmail(c, kpi, kpiAnterior, mes_label);

      const result = await enviarEmailResend(
        RESEND_API_KEY,
        FROM_EMAIL,
        c.email_cliente!,
        subject,
        html,
      );
      if (result.ok) {
        sent++;
        console.log(
          `[send-resumo-mensal] enviado cliente=${c.id} to=${c.email_cliente} resend_id=${result.id}`,
        );
      } else {
        failed++;
        errors.push({ cliente_id: c.id, error: result.error });
        console.error(
          `[send-resumo-mensal] falha cliente=${c.id} to=${c.email_cliente} erro=${result.error}`,
        );
      }
    }

    return new Response(
      JSON.stringify({
        mes_referencia,
        mes_label,
        total_ativos: clientesAtivos.length,
        sem_email: semEmail,
        sem_kpi: clientesComEmail.length - elegiveis.length,
        total_elegiveis: elegiveis.length,
        sent,
        failed,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[send-resumo-mensal] erro fatal", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
