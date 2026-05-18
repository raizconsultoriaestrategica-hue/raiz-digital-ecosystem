-- =============================================================
-- P2.1 (Fase 2.1): Adicionar 'contrato' às categorias permitidas
-- de arquivos_cliente
-- =============================================================
-- Objetivo:
--   A aba "Meu Plano" da Pasta do Cliente passa a exibir bloco
--   "Documentos do projeto" que lista arquivos com categoria
--   'contrato' (contrato principal + termos aditivos). O CHECK
--   original (migração 20260518100100_create_arquivos_cliente.sql)
--   não incluía 'contrato'.
--
-- Esta migração troca o CHECK constraint sem perda de dados.
-- =============================================================

ALTER TABLE public.arquivos_cliente
  DROP CONSTRAINT IF EXISTS arquivos_cliente_categoria_check;

ALTER TABLE public.arquivos_cliente
  ADD CONSTRAINT arquivos_cliente_categoria_check
  CHECK (categoria IN (
    'diagnostico','proposta','contrato','ata','material_modulo','relatorio','outros'
  ));

-- =============================================================
-- ROLLBACK
-- =============================================================
-- Reverte o CHECK para o conjunto original. ATENÇÃO: se houver
-- linhas com categoria='contrato', a reversão vai falhar até que
-- elas sejam movidas pra 'outros' ou apagadas.
--
-- ALTER TABLE public.arquivos_cliente
--   DROP CONSTRAINT IF EXISTS arquivos_cliente_categoria_check;
--
-- ALTER TABLE public.arquivos_cliente
--   ADD CONSTRAINT arquivos_cliente_categoria_check
--   CHECK (categoria IN (
--     'diagnostico','proposta','ata','material_modulo','relatorio','outros'
--   ));
