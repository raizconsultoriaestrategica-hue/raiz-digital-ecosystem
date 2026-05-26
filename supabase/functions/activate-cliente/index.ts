// Ativa um lead como cliente projeto_ativo.
// Cria auth.users + user_roles=cliente se ainda não tem (caso normal),
// ou só faz UPDATE se cliente já tem user_id (caso onboarding excepcional).
// Requer chamador admin.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SENHA_PROVISORIA = "Raiz@2026";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Validar admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso restrito a admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Body
    const body = await req.json().catch(() => ({}));
    const cliente_id = String(body.cliente_id ?? "").trim();
    const plano = String(body.plano ?? "").trim();
    const valor_mensalidade = Number(body.valor_mensalidade);
    const dia_vencimento = Number(body.dia_vencimento);
    const forma_pagamento = String(body.forma_pagamento ?? "").trim();
    const data_inicio_projeto = String(body.data_inicio_projeto ?? "").trim();
    const duracao_meses = Number(body.duracao_meses);
    const meta_faturamento = body.meta_faturamento != null ? Number(body.meta_faturamento) : null;
    const cpf_cnpj = body.cpf_cnpj ? String(body.cpf_cnpj).trim() : null;
    const endereco = body.endereco ? String(body.endereco).trim() : null;

    if (!cliente_id) {
      return new Response(
        JSON.stringify({ error: "cliente_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!plano || !valor_mensalidade || !dia_vencimento || !forma_pagamento || !data_inicio_projeto || !duracao_meses) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: plano, valor_mensalidade, dia_vencimento, forma_pagamento, data_inicio_projeto, duracao_meses" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Admin client (service role)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 4) Buscar cliente e checar se já tem user_id
    const { data: cliente, error: cliErr } = await admin
      .from("clientes")
      .select("id, email_cliente, user_id, nome_cliente, nome_clinica")
      .eq("id", cliente_id)
      .maybeSingle();
    if (cliErr || !cliente) {
      return new Response(
        JSON.stringify({ error: "Cliente não encontrado: " + (cliErr?.message ?? "id inválido") }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!cliente.email_cliente) {
      return new Response(
        JSON.stringify({ error: "Cliente não tem email cadastrado. Edite o cadastro antes de ativar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let user_id = cliente.user_id as string | null;
    let senhaProvisoriaRetornada: string | null = null;
    let auth_criado = false;

    // 5) Criar auth.users se ainda não tem
    if (!user_id) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: cliente.email_cliente,
        password: SENHA_PROVISORIA,
        email_confirm: true,
        user_metadata: {
          nome_cliente: cliente.nome_cliente,
          nome_clinica: cliente.nome_clinica,
        },
      });
      if (createErr || !created?.user) {
        return new Response(
          JSON.stringify({ error: "Falha ao criar auth: " + (createErr?.message ?? "desconhecido") }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      user_id = created.user.id;
      senhaProvisoriaRetornada = SENHA_PROVISORIA;
      auth_criado = true;

      // 6) user_roles = cliente
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id, role: "cliente" });
      if (roleErr) {
        return new Response(
          JSON.stringify({ error: "Auth criado, mas falhou ao definir role: " + roleErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 7) UPDATE clientes com dados de ativação
    const { error: updErr } = await admin
      .from("clientes")
      .update({
        status: "projeto_ativo",
        user_id,
        plano,
        valor_mensalidade,
        dia_vencimento,
        forma_pagamento,
        data_inicio_projeto,
        duracao_meses,
        ...(meta_faturamento !== null ? { meta_faturamento } : {}),
        ...(cpf_cnpj !== null ? { cpf_cnpj } : {}),
        ...(endereco !== null ? { endereco } : {}),
        primeiro_acesso: auth_criado ? true : undefined,
      })
      .eq("id", cliente_id);
    if (updErr) {
      return new Response(
        JSON.stringify({ error: "Falha ao atualizar cliente: " + updErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        cliente_id,
        email: cliente.email_cliente,
        senha_provisoria: senhaProvisoriaRetornada,
        auth_criado,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("activate-cliente error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
