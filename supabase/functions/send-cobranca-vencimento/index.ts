// Edge Function: send-cobranca-vencimento
// Busca clientes ativos cujo dia_vencimento == dia de hoje e envia email
// lembrando do pagamento da mensalidade. Pensada pra ser disparada por
// cron job diariamente cedo (sugestão: 8h America/Sao_Paulo).
//
// Trigger: HTTP POST. Cron passa Authorization: Bearer <service_role>.
//
// Retorno:
//   200 { dia, total, sem_email, sent, failed, errors }
//   500 { error: "..." }

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ClienteCobranca {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  email_cliente: string | null;
  valor_mensalidade: number | null;
  dia_vencimento: number | null;
  forma_pagamento: string | null;
  plano: string | null;
}

// Dia do mês (1-31) em America/Sao_Paulo.
function diaHojeSP(): number {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
  });
  return Number(fmt.format(new Date()));
}

// Data por extenso no formato "DD/MM/YYYY" para o dia atual em SP.
function dataHojeSP(): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return fmt.format(new Date());
}

function fmtBRL(n: number | null): string {
  if (!n || !Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const FORMA_LABEL: Record<string, string> = {
  pix: "PIX",
  boleto: "Boleto",
  cartao: "Cartão",
  transferencia: "Transferência",
};

function montarHtmlEmail(c: ClienteCobranca, dataHoje: string): string {
  const nome = c.nome_cliente;
  const clinica = c.nome_clinica ?? "";
  const valor = fmtBRL(c.valor_mensalidade);
  const formaLabel = c.forma_pagamento ? FORMA_LABEL[c.forma_pagamento] || c.forma_pagamento : "";

  const valorBlock = valor
    ? `<div style="padding:16px;border:1px solid #e5e0d3;border-radius:8px;background:#fafafa;">
         <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#5a5a5a;">
           Valor
         </div>
         <div style="margin-top:4px;font-size:24px;font-weight:600;color:#2d3f29;">${valor}</div>
         ${
           formaLabel
             ? `<div style="margin-top:6px;font-size:13px;color:#5a5a5a;">Forma de pagamento: ${formaLabel}</div>`
             : ""
         }
       </div>`
    : "";

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
            Vencimento da mensalidade hoje
          </h1>
          <p style="margin:0 0 20px;color:#5a5a5a;font-size:14px;">
            Olá, ${nome}${clinica ? ` (${clinica})` : ""}. Passando pra lembrar que sua mensalidade vence hoje, ${dataHoje}.
          </p>

          ${valorBlock}

          <p style="margin-top:24px;font-size:14px;color:#2a2a2a;line-height:1.6;">
            Se já realizou o pagamento, pode desconsiderar este email. Qualquer dúvida sobre a fatura, basta responder esta mensagem ou chamar no WhatsApp.
          </p>

          <p style="margin-top:32px;font-size:13px;color:#7a7a7a;">
            Obrigado pela parceria,<br>Equipe Raiz Consultoria
          </p>
        </div>

        <p style="text-align:center;margin-top:16px;font-size:11px;color:#a0a0a0;">
          Você está recebendo porque o vencimento do seu plano com a Raiz é hoje.
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
          error: "Faltando env var: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou RESEND_API_KEY",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const dia = diaHojeSP();
    const dataFmt = dataHojeSP();

    const { data: clientes, error } = await sb
      .from("clientes")
      .select(
        "id, nome_cliente, nome_clinica, email_cliente, valor_mensalidade, dia_vencimento, forma_pagamento, plano, status",
      )
      .eq("dia_vencimento", dia)
      .eq("status", "projeto_ativo");

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lista = (clientes ?? []) as ClienteCobranca[];
    const elegiveis = lista.filter((c) => c.email_cliente);
    const semEmail = lista.length - elegiveis.length;

    console.log(`[send-cobranca] dia=${dia} total=${lista.length} elegiveis=${elegiveis.length} sem_email=${semEmail}`);

    let sent = 0;
    let failed = 0;
    const errors: { cliente_id: string; error: string }[] = [];

    for (const c of elegiveis) {
      const toEmail = c.email_cliente!;
      const subject = `Vencimento hoje: mensalidade Raiz Consultoria`;
      const html = montarHtmlEmail(c, dataFmt);

      const result = await enviarEmailResend(RESEND_API_KEY, FROM_EMAIL, toEmail, subject, html);
      if (result.ok) {
        sent++;
        console.log(`[send-cobranca] enviado cliente=${c.id} to=${toEmail} resend_id=${result.id}`);
      } else {
        failed++;
        errors.push({ cliente_id: c.id, error: result.error });
        console.error(`[send-cobranca] falha cliente=${c.id} to=${toEmail} erro=${result.error}`);
      }
    }

    return new Response(
      JSON.stringify({
        dia,
        data: dataFmt,
        total_clientes: lista.length,
        sem_email: semEmail,
        sent,
        failed,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[send-cobranca] erro fatal", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
