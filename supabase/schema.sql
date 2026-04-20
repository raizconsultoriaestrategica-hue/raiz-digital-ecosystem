-- =============================================================
-- Raiz Consultoria — Schema inicial (rodar no SQL Editor do Supabase)
-- Padrão SEGURO de roles: tabela user_roles + função has_role()
-- =============================================================

-- 1) Enum de papéis
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'cliente');
  end if;
end$$;

-- 2) Tabela user_roles (NUNCA armazenar role em profiles/users)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 3) Função SECURITY DEFINER (evita recursão de RLS)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Policies de leitura na própria role
drop policy if exists "user_le_proprias_roles" on public.user_roles;
create policy "user_le_proprias_roles" on public.user_roles
  for select using (user_id = auth.uid());

drop policy if exists "admin_gerencia_roles" on public.user_roles;
create policy "admin_gerencia_roles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 4) CLIENTES
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  nome_cliente text not null,
  nome_clinica text,
  especialidade text,
  cidade text,
  plano text default 'crescimento', -- 'base' | 'crescimento' | 'expansao'
  consultor text,
  created_at timestamptz default now()
);

alter table public.clientes enable row level security;

drop policy if exists "cliente_ve_proprio_perfil" on public.clientes;
create policy "cliente_ve_proprio_perfil" on public.clientes
  for select using (user_id = auth.uid());

drop policy if exists "admin_acesso_total_clientes" on public.clientes;
create policy "admin_acesso_total_clientes" on public.clientes
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 5) DASHBOARD DATA (modelo CSV: TIPO/MES/CAMPO/VALOR/BENCHMARK)
create table if not exists public.dashboard_data (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  tipo text not null,       -- 'CONFIG' | 'PILAR' | 'KPI' | 'MODULO' | 'INSIGHT'
  mes text,
  campo text not null,
  valor text,
  benchmark text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.dashboard_data enable row level security;

drop policy if exists "cliente_ve_proprios_dados" on public.dashboard_data;
create policy "cliente_ve_proprios_dados" on public.dashboard_data
  for select using (
    cliente_id in (select id from public.clientes where user_id = auth.uid())
  );

drop policy if exists "admin_acesso_total_dashboard" on public.dashboard_data;
create policy "admin_acesso_total_dashboard" on public.dashboard_data
  for all using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =============================================================
-- Como atribuir admin a um usuário (após ele se cadastrar):
--   insert into public.user_roles (user_id, role)
--   values ('<UUID_DO_USUARIO>', 'admin');
-- Para clientes, atribua role 'cliente' da mesma forma.
-- =============================================================
