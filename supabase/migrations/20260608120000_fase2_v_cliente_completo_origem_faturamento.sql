-- =============================================================
-- Fase 2: v_cliente_completo como porta única de leitura
-- =============================================================
-- Objetivo:
--   Expor na view canônica os campos que faltavam para as ferramentas e o
--   sync: `origem` e o faturamento informado no cadastro
--   (clientes.faturamento_atual), com nome distinto do faturamento do KPI.
--
-- Resolve a colisão de nomes apontada na auditoria:
--   - `faturamento_atual`           = k.faturamento_bruto (KPI real, mês a mês). MANTIDO.
--   - `faturamento_atual_cadastro`  = c.faturamento_atual (informado no cadastro). NOVO.
--   - `origem`                      = c.origem. NOVO.
--
-- Nenhum nome de coluna existente muda, então os consumidores atuais não quebram.
-- Recriada via DROP + CREATE (nada depende dela; confirmado).
-- security_invoker = true preservado (RLS das tabelas base continua valendo).
-- =============================================================

DROP VIEW IF EXISTS public.v_cliente_completo;

CREATE VIEW public.v_cliente_completo
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
  c.origem,                           -- NOVO (Fase 2)
  c.plano,
  c.status,
  c.meta_faturamento,
  c.faturamento_atual AS faturamento_atual_cadastro,  -- NOVO (Fase 2): informado no cadastro
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
  k.faturamento_bruto AS faturamento_atual,   -- KPI real (mês a mês). Nome mantido.
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

GRANT SELECT ON public.v_cliente_completo TO authenticated;

-- =============================================================
-- ROLLBACK: recriar a versão anterior (sem origem nem faturamento_atual_cadastro).
-- A definição anterior está em 20260505100500_create_v_cliente_completo.sql.
-- DROP VIEW IF EXISTS public.v_cliente_completo; e reaplicar aquela migração.
-- =============================================================
