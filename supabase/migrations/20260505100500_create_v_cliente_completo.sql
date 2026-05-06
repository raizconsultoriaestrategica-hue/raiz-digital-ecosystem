-- =============================================================
-- M6 (Fase 2): View v_cliente_completo (fonte canônica)
-- =============================================================
-- Objetivo:
--   Consolidar dados do cliente + último diagnóstico + último mês
--   de KPIs em uma única query. Fonte do auto-preenchimento que
--   será implementado na Fase 3.
--
-- DEPENDÊNCIAS:
--   - M1: colunas novas em clientes (telefone, email_cliente, ...)
--   - M2: tabela kpis_mensais (já criada na branch)
--   - diagnostics (tabela existente em produção)
--
-- ============= ALERTA DE SEGURANÇA =============
-- Esta view usa WITH (security_invoker = true), disponível em
-- Postgres 15+. Sem isso, a view executaria com privilégios do
-- criador (superuser) e BIPASSARIA a RLS das tabelas underlying,
-- expondo dados de TODOS os clientes a qualquer usuário autenticado.
--
-- Com security_invoker = true:
--   - Admin: vê tudo (tem RLS ALL nas 3 tabelas)
--   - Cliente: vê só a linha do próprio cadastro (RLS de clientes
--     filtra por user_id = auth.uid())
--   - Não autenticado: vê nada
-- ===============================================
-- =============================================================

-- Índice de apoio para o LEFT JOIN LATERAL em diagnostics
CREATE INDEX IF NOT EXISTS idx_diagnostics_client_created
  ON public.diagnostics (client_id, created_at DESC);

-- View canônica
CREATE OR REPLACE VIEW public.v_cliente_completo
WITH (security_invoker = true) AS
SELECT
  -- Dados do cliente
  c.id,
  c.user_id,
  c.nome_cliente,
  c.nome_clinica,
  c.cidade,
  c.ramo,
  c.especialidade,                    -- legada (preservada)
  c.especialidade_clinica,            -- nova tipada
  c.telefone,
  c.email_cliente,
  c.cpf_cnpj,
  c.endereco,
  c.instagram,
  c.observacoes_relacionamento,
  c.plano,
  c.status,
  c.meta_faturamento,
  c.orcamento_inicial,
  c.valor_mensalidade,
  c.data_inicio_projeto,
  c.duracao_meses,
  c.dia_vencimento,
  c.forma_pagamento,
  c.created_at AS cliente_created_at,

  -- Último diagnóstico
  d.id AS ultimo_diagnostico_id,
  d.total_pct AS ultimo_diagnostico_score,
  d.total_score AS ultimo_diagnostico_score_absoluto,
  d.total_max AS ultimo_diagnostico_score_max,
  d.classif_label AS ultimo_diagnostico_classif,
  d.scores AS ultimo_diagnostico_scores,
  d.plano_name AS ultimo_diagnostico_plano_sugerido,
  d.created_at AS ultimo_diagnostico_data,

  -- Último mês de KPIs
  k.mes_referencia AS kpi_mes_referencia,
  k.faturamento_bruto AS faturamento_atual,
  k.ticket_medio AS ticket_atual,
  k.taxa_conversao AS conversao_atual,
  k.taxa_no_show AS no_show_atual,
  k.ocupacao_cadeiras AS ocupacao_atual,
  k.margem_liquida AS margem_atual,
  k.taxa_inadimplencia AS inadimplencia_atual,
  k.investimento_marketing AS investimento_marketing_atual

FROM public.clientes c
LEFT JOIN LATERAL (
  SELECT *
  FROM public.diagnostics
  WHERE client_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) d ON TRUE
LEFT JOIN LATERAL (
  SELECT *
  FROM public.kpis_mensais
  WHERE cliente_id = c.id
  ORDER BY mes_referencia DESC
  LIMIT 1
) k ON TRUE;

-- GRANT explícito (documenta intent, não confia no default)
GRANT SELECT ON public.v_cliente_completo TO authenticated;

-- =============================================================
-- ROLLBACK
-- =============================================================
-- View não tem dados próprios. Drop é seguro.
--
-- DROP VIEW IF EXISTS public.v_cliente_completo;
-- DROP INDEX IF EXISTS public.idx_diagnostics_client_created;
