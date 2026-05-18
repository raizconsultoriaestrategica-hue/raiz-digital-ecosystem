-- =============================================================
-- P2.1 (Fase 2.1): Tabela arquivos_cliente + bucket Storage
-- =============================================================
-- Objetivo:
--   Persistir arquivos compartilhados com cada cliente (atas,
--   propostas, relatórios, materiais por módulo, etc). A Pasta do
--   Cliente (src/pages/PastaDoCliente.tsx) já consome essa tabela
--   defensivamente. Esta migração habilita upload pelo admin e
--   download pelo cliente.
--
-- Convenção de path no bucket:
--   {cliente_id}/{uuid}-{nome_sanitizado}.{ext}
--   A primeira "pasta" do path É o cliente_id, e essa propriedade
--   é usada pela RLS de storage para filtrar acesso por cliente.
--
-- Categorias possíveis (front exibe filtros):
--   'diagnostico' | 'proposta' | 'ata' | 'material_modulo'
--   | 'relatorio' | 'outros'
--
--   Quando categoria='material_modulo', modulo_id deve ser preenchido
--   (FK opcional). Front usa isso para associar material a módulo.
--
-- RLS:
--   - Tabela arquivos_cliente:
--     - Admin: ALL
--     - Cliente: SELECT apenas dos próprios
--   - Bucket arquivos-cliente (privado):
--     - Admin: ALL
--     - Cliente: SELECT só de arquivos cuja primeira pasta = seu cliente_id
--
-- Espelha exatamente o padrão do bucket "orcamentos"
-- (20260423232649_*.sql).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.arquivos_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,

  categoria TEXT NOT NULL DEFAULT 'outros'
    CHECK (categoria IN (
      'diagnostico','proposta','ata','material_modulo','relatorio','outros'
    )),

  -- FK opcional. Tabela "modulos" existe no schema (criada nas
  -- migrações iniciais do projeto). Se categoria='material_modulo',
  -- front exige modulo_id; em outras categorias, fica null.
  modulo_id UUID REFERENCES public.modulos(id) ON DELETE SET NULL,

  -- Metadados do arquivo
  nome TEXT NOT NULL,
  tipo TEXT,                     -- 'pdf','xlsx','docx','png','mp4', etc.
  storage_path TEXT NOT NULL,    -- '{cliente_id}/{uuid}-{nome}.{ext}'
  url TEXT,                      -- pré-assinada (opcional; front gera sob demanda)
  tamanho_bytes BIGINT,

  -- Auditoria
  enviado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para queries típicas
CREATE INDEX IF NOT EXISTS idx_arquivos_cliente_cliente_created
  ON public.arquivos_cliente (cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_arquivos_cliente_categoria
  ON public.arquivos_cliente (cliente_id, categoria);

CREATE INDEX IF NOT EXISTS idx_arquivos_cliente_modulo
  ON public.arquivos_cliente (cliente_id, modulo_id)
  WHERE modulo_id IS NOT NULL;

-- RLS (tabela)
ALTER TABLE public.arquivos_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_acesso_total_arquivos_cliente" ON public.arquivos_cliente;
CREATE POLICY "admin_acesso_total_arquivos_cliente"
  ON public.arquivos_cliente FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cliente_ve_proprios_arquivos" ON public.arquivos_cliente;
CREATE POLICY "cliente_ve_proprios_arquivos"
  ON public.arquivos_cliente FOR SELECT
  USING (cliente_id IN (
    SELECT id FROM public.clientes WHERE user_id = auth.uid()
  ));

-- =============================================================
-- Bucket Storage
-- =============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('arquivos-cliente', 'arquivos-cliente', false)
ON CONFLICT (id) DO NOTHING;

-- Admin: tudo no bucket
DROP POLICY IF EXISTS "admin_arquivos_cliente_storage_all" ON storage.objects;
CREATE POLICY "admin_arquivos_cliente_storage_all"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'arquivos-cliente'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    bucket_id = 'arquivos-cliente'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Cliente: lê apenas arquivos cuja primeira pasta = seu cliente_id
DROP POLICY IF EXISTS "cliente_le_proprios_arquivos_storage" ON storage.objects;
CREATE POLICY "cliente_le_proprios_arquivos_storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'arquivos-cliente'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.clientes WHERE user_id = auth.uid()
    )
  );

-- =============================================================
-- ROLLBACK
-- =============================================================
-- ATENÇÃO: rollback APAGA a tabela, o bucket e todos os arquivos.
-- O bucket no Supabase Storage precisa estar vazio para ser apagado.
-- Backup recomendado:
--   SELECT * FROM public.arquivos_cliente;
--   E baixar manualmente o conteúdo do bucket "arquivos-cliente".
--
-- DROP POLICY IF EXISTS "cliente_le_proprios_arquivos_storage" ON storage.objects;
-- DROP POLICY IF EXISTS "admin_arquivos_cliente_storage_all" ON storage.objects;
-- DELETE FROM storage.objects WHERE bucket_id = 'arquivos-cliente';
-- DELETE FROM storage.buckets WHERE id = 'arquivos-cliente';
-- DROP POLICY IF EXISTS "cliente_ve_proprios_arquivos" ON public.arquivos_cliente;
-- DROP POLICY IF EXISTS "admin_acesso_total_arquivos_cliente" ON public.arquivos_cliente;
-- DROP INDEX IF EXISTS public.idx_arquivos_cliente_modulo;
-- DROP INDEX IF EXISTS public.idx_arquivos_cliente_categoria;
-- DROP INDEX IF EXISTS public.idx_arquivos_cliente_cliente_created;
-- DROP TABLE IF EXISTS public.arquivos_cliente;
