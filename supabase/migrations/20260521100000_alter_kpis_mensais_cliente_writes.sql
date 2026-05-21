-- =============================================================
-- Fase 7 / P2.4: kpis_mensais permite cliente escrever proprios KPIs
-- =============================================================
-- Objetivo:
--   Habilitar P2.4 da auditoria. Hoje a tabela kpis_mensais tem 2
--   policies:
--     - admin_acesso_total_kpis_mensais (ALL, admin)
--     - cliente_ve_proprios_kpis (SELECT, cliente do proprio cliente_id)
--   Cliente pode ler, mas nao pode INSERT nem UPDATE. Esta migration
--   adiciona 2 policies novas que permitem cliente fazer INSERT e
--   UPDATE somente nos proprios registros, alinhado ao padrao das
--   outras tabelas onde o cliente escreve (atualmente nenhuma).
--
-- DEPENDENCIAS:
--   - kpis_mensais (Fase 2)
--   - clientes (Fase 0, com coluna user_id)
--
-- DECISOES:
--   1. Duas policies separadas (INSERT e UPDATE) em vez de uma FOR ALL,
--      pra nao dar DELETE ao cliente. Cliente nunca apaga KPI; se quiser
--      remover, pede ao consultor (que tem ALL).
--   2. Mesmo predicado da policy SELECT existente:
--      cliente_id IN (SELECT id FROM clientes WHERE user_id = auth.uid()).
--      Consistente com o restante do schema.
--   3. WITH CHECK no INSERT garante que o cliente nao consegue gravar
--      KPI em cliente_id que nao seja o dele.
--   4. UNIQUE (cliente_id, mes_referencia) ja existe na tabela, entao
--      upsert no client (onConflict) funciona naturalmente.
--   5. preenchido_por: o frontend deve setar auth.uid() para que o
--      registro saiba se foi cliente ou consultor que digitou. Schema
--      ja prove a coluna (nullable, FK auth.users).
--
-- ============= ALERTA DE SEGURANCA =============
-- Cliente passa a poder INSERT/UPDATE em kpis_mensais. O escopo eh
-- limitado aos proprios registros via predicado RLS. Nao ha risco de
-- escalacao de privilegio porque clientes.user_id eh o vinculo unico
-- e nao eh editavel pelo cliente.
-- ===============================================
-- =============================================================

-- Idempotencia
DROP POLICY IF EXISTS "cliente_atualiza_proprios_kpis" ON public.kpis_mensais;
DROP POLICY IF EXISTS "cliente_edita_proprios_kpis"   ON public.kpis_mensais;

-- INSERT: cliente pode criar KPI para o proprio cliente_id
CREATE POLICY "cliente_atualiza_proprios_kpis"
  ON public.kpis_mensais
  FOR INSERT
  WITH CHECK (
    cliente_id IN (
      SELECT id FROM public.clientes WHERE user_id = auth.uid()
    )
  );

-- UPDATE: cliente pode editar KPI existente do proprio cliente_id
CREATE POLICY "cliente_edita_proprios_kpis"
  ON public.kpis_mensais
  FOR UPDATE
  USING (
    cliente_id IN (
      SELECT id FROM public.clientes WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    cliente_id IN (
      SELECT id FROM public.clientes WHERE user_id = auth.uid()
    )
  );

-- =============================================================
-- ROLLBACK
-- =============================================================
-- DROP POLICY IF EXISTS "cliente_atualiza_proprios_kpis" ON public.kpis_mensais;
-- DROP POLICY IF EXISTS "cliente_edita_proprios_kpis"   ON public.kpis_mensais;
