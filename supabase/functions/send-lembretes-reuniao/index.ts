// Edge Function: send-lembretes-reuniao
// Busca reuniões agendadas pro próximo dia útil e envia email de lembrete
// via Resend para o cliente. Pensada pra ser disparada por cron job
// diariamente às 9h (America/Sao_Paulo).
//
// Trigger: HTTP POST (qualquer body). Cron Job do Supabase envia POST
// agendado. Em produção use SERVICE_ROLE key no header Authorization
// pra autenticar a chamada do cron.
//
// Retorno:
//   200 { sent: N, failed: M, errors: [...] }
//   500 { error: "..." }

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReuniaoLembrete {
  id: string;
  cliente_id: string;
  data: string;
  hora_inicio: string | null;
  duracao_minutos: number | null;
  titulo: string | null;
  link_meet: string | null;
  proximos_passos: string | null;
  clientes: {
    nome_cliente: string;
    nome_clinica: string | null;
    email_cliente: string | null;
  } | null;
}

// Data de amanhã no timezone America/Sao_Paulo, formato YYYY-MM-DD.
function dataAmanhaSP(): string {
  // Date.toLocaleString com timeZone retorna a string formatada na TZ pedida.
  // pt-BR usa "dd/MM/yyyy"; convertemos pra ISO. Como é só data (sem hora),
  // pegar o dia em SP e somar 1 dia evita erro de borda à meia-noite UTC.
  const agora = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const partes = fmt.format(agora); // "2026-05-18" (en-CA já dá ISO)
  const [yStr, mStr, dStr] = partes.split("-");
  const d = new Date(Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr)));
  d.setUTCDate(d.getUTCDate() + 1);
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatarData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatarHora(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

function montarHtmlEmail(r: ReuniaoLembrete): string {
  const c = r.clientes;
  const nome = c?.nome_cliente ?? "Cliente";
  const clinica = c?.nome_clinica ?? "";
  const dataFmt = formatarData(r.data);
  const horaFmt = formatarHora(r.hora_inicio);
  const titulo = r.titulo || "Reunião agendada";
  const linkBlock = r.link_meet
    ? `<p style="margin:24px 0;">
         <a href="${r.link_meet}" style="display:inline-block;padding:12px 24px;background:#2d3f29;color:#f5f1e8;text-decoration:none;border-radius:6px;font-weight:600;">
           Abrir reunião
         </a>
       </p>`
    : "";
  const passosBlock = r.proximos_passos
    ? `<div style="margin-top:24px;padding:16px;border-left:4px solid #c9a961;background:#fef9ec;">
         <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#2d3f29;margin-bottom:8px;">
           Próximos passos
         </div>
         <p style="margin:0;color:#2a2a2a;line-height:1.5;white-space:pre-line;">${r.proximos_passos}</p>
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
            Lembrete da sua reunião
          </h1>
          <p style="margin:0 0 20px;color:#5a5a5a;font-size:14px;">
            Olá, ${nome}${clinica ? ` (${clinica})` : ""}.
          </p>

          <div style="padding:16px;border:1px solid #e5e0d3;border-radius:8px;">
            <div style="font-weight:600;color:#2d3f29;font-size:16px;">${titulo}</div>
            <div style="margin-top:6px;color:#5a5a5a;font-size:14px;">
              ${dataFmt}${horaFmt ? ` · ${horaFmt}` : ""}${
                r.duracao_minutos ? ` · ${r.duracao_minutos} min` : ""
              }
            </div>
          </div>

          ${linkBlock}
          ${passosBlock}

          <p style="margin-top:32px;font-size:13px;color:#7a7a7a;">
            Até amanhã!<br>Equipe Raiz Consultoria
          </p>
        </div>

        <p style="text-align:center;margin-top:16px;font-size:11px;color:#a0a0a0;">
          Você está recebendo porque é cliente da Raiz Consultoria Estratégica.
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
    const amanha = dataAmanhaSP();

    const { data: reunioes, error } = await sb
      .from("reunioes")
      .select(
        "id, cliente_id, data, hora_inicio, duracao_minutos, titulo, link_meet, proximos_passos, clientes!inner(nome_cliente, nome_clinica, email_cliente)",
      )
      .eq("data", amanha)
      .eq("status", "agendada");

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lista = (reunioes ?? []) as unknown as ReuniaoLembrete[];
    const elegiveis = lista.filter((r) => r.clientes?.email_cliente);
    const semEmail = lista.length - elegiveis.length;

    console.log(`[send-lembretes] amanhã=${amanha} total=${lista.length} elegiveis=${elegiveis.length} sem_email=${semEmail}`);

    let sent = 0;
    let failed = 0;
    const errors: { reuniao_id: string; error: string }[] = [];

    for (const r of elegiveis) {
      const toEmail = r.clientes!.email_cliente!;
      const subject = `Lembrete: ${r.titulo || "reunião"} amanhã${
        r.hora_inicio ? " às " + formatarHora(r.hora_inicio) : ""
      }`;
      const html = montarHtmlEmail(r);

      const result = await enviarEmailResend(RESEND_API_KEY, FROM_EMAIL, toEmail, subject, html);
      if (result.ok) {
        sent++;
        console.log(`[send-lembretes] enviado reuniao=${r.id} to=${toEmail} resend_id=${result.id}`);
      } else {
        failed++;
        errors.push({ reuniao_id: r.id, error: result.error });
        console.error(`[send-lembretes] falha reuniao=${r.id} to=${toEmail} erro=${result.error}`);
      }
    }

    return new Response(
      JSON.stringify({
        amanha,
        total_reunioes: lista.length,
        sem_email: semEmail,
        sent,
        failed,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[send-lembretes] erro fatal", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
