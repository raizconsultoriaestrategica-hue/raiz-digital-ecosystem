// Cria um cliente completo: auth.users + user_roles + clientes
// Requer que o chamador seja admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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
    const SERVICE_ROLE_PRIMARY = Deno.env.get("SERVICE_ROLE_KEY");
    const SERVICE_ROLE_FALLBACK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    console.log("create-cliente env check", {
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRolePrimary: Boolean(SERVICE_ROLE_PRIMARY),
      hasServiceRoleFallback: Boolean(SERVICE_ROLE_FALLBACK),
      hasAnon: Boolean(ANON),
    });

    if (!SUPABASE_URL || !ANON || (!SERVICE_ROLE_PRIMARY && !SERVICE_ROLE_FALLBACK)) {
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminKeys = [SERVICE_ROLE_PRIMARY, SERVICE_ROLE_FALLBACK].filter(
      (value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index,
    );

    const resolveAdminClient = async () => {
      for (const key of adminKeys) {
        const candidate = createClient(SUPABASE_URL, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error } = await candidate.auth.admin.listUsers({ page: 1, perPage: 1 });
        if (!error) return candidate;
        if (!/unregistered api key/i.test(error.message)) throw error;
      }

      return null;
    };

    // 1) Validar que o chamador está autenticado e é admin
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
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso restrito a admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Body
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const nome_cliente = String(body.nome_cliente ?? "").trim();
    const nome_clinica = body.nome_clinica ? String(body.nome_clinica).trim() : null;
    const cidade = body.cidade ? String(body.cidade).trim() : null;

    if (!email || !nome_cliente) {
      return new Response(
        JSON.stringify({ error: "Email e nome do cliente são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = await resolveAdminClient();
    if (!admin) {
      return new Response(JSON.stringify({ error: "Service role key inválida ou indisponível" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Criar usuário em auth.users
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: SENHA_PROVISORIA,
      email_confirm: true,
      user_metadata: { nome_cliente, nome_clinica },
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message ?? "Erro ao criar usuário";
      const status = /already registered|already exists|email.*exists/i.test(msg) ? 409 : 400;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = created.user.id;

    // 4) user_roles = cliente
    const { error: roleInsErr } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "cliente" });
    if (roleInsErr) {
      return new Response(
        JSON.stringify({ error: "Usuário criado, mas falhou ao definir role: " + roleInsErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5) clientes
    const { data: cliente, error: cliErr } = await admin
      .from("clientes")
      .insert({
        user_id: newUserId,
        nome_cliente,
        nome_clinica,
        cidade,
        consultor: "Raiz Consultoria",
      })
      .select("id, nome_cliente, nome_clinica, cidade")
      .single();

    if (cliErr || !cliente) {
      return new Response(
        JSON.stringify({ error: "Falha ao criar cliente: " + (cliErr?.message ?? "desconhecido") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        cliente,
        email,
        senha_provisoria: SENHA_PROVISORIA,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
