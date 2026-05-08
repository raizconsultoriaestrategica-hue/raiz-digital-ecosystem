-- =============================================================
-- M8 (Fase 3): UNIQUE constraint em diagnostics.client_id
-- =============================================================
-- Objetivo:
--   Garantir no máximo 1 diagnóstico por cliente na tabela tipada.
--   Permite ON CONFLICT (client_id) DO UPDATE no dual-write do frontend,
--   eliminando o pattern delete+insert.
--
-- PRE-REQUISITO:
--   Não pode haver client_id duplicado. O backfill M7 já garante
--   unicidade (usa INSERT ... ON CONFLICT DO NOTHING com id gerado).
--   Caso existam duplicatas, a query abaixo as remove antes do ALTER:
--
--   DELETE FROM diagnostics
--   WHERE id NOT IN (
--     SELECT DISTINCT ON (client_id) id
--     FROM diagnostics
--     ORDER BY client_id, created_at DESC
--   );
-- =============================================================

-- 1. Remove duplicatas (mantém o mais recente por client_id)
DELETE FROM public.diagnostics
WHERE id NOT IN (
  SELECT DISTINCT ON (client_id) id
  FROM public.diagnostics
  ORDER BY client_id, created_at DESC
);

-- 2. Adiciona constraint UNIQUE
ALTER TABLE public.diagnostics
  ADD CONSTRAINT diagnostics_client_id_unique UNIQUE (client_id);

-- =============================================================
-- ROLLBACK
-- =============================================================
-- ALTER TABLE public.diagnostics DROP CONSTRAINT diagnostics_client_id_unique;
