# Auditoria de Taxonomia e Consistência de Dados (Lead/Cliente)
### Plataforma Raiz Consultoria Estratégica · pré-requisito para sync Supabase → Notion

> Auditoria SOMENTE LEITURA. Nada foi alterado no código, no banco ou em produção.
> Este documento é um diagnóstico e uma recomendação. Toda mudança real será feita
> depois, por você, com aprovação explícita.
>
> Data: 2026-06-04. Branch lida: `main`. Base: migrações em `supabase/migrations`,
> `supabase/schema.sql`, `src/integrations/supabase/types.ts` e o código do frontend.
>
> Convenções de marcação:
> `[TÉCNICO]` correção objetiva, baixo risco, assumo com segurança.
> `[DECISÃO PATRICK]` escolha de marca/produto que depende do seu aval.

---

## Sumário executivo (o que está quebrado e por quê)

1. **`plano` em `clientes` não tem CHECK e recebe três vocabulários diferentes.** Default do banco é `'crescimento'` (código curto), os formulários gravam nomes longos (`Raiz Essencial`, `Raiz de Crescimento`, `Raiz de Expansão`), e a tabela `diagnostics` sugere ainda outro conjunto (`Raiz de Base`, e variantes `· Saúde`). É o maior risco para o sync.
2. **`Raiz Essencial` (frontend) não bate com `Raiz de Base` (Brand Book e diagnóstico).** Decisão de marca pendente.
3. **`ramo` diverge entre tabelas.** `clientes.ramo` aceita `odontologia|medicina|estetica|outros`. `diagnostics.ramo` grava `dentista|medico`. São taxonomias incompatíveis para o mesmo conceito.
4. **`ramo` não é capturado em nenhum formulário de cadastro.** Fica sempre no default `'odontologia'`, exceto se editado no Studio.
5. **Coluna duplicada por drift: `especialidade` (texto livre legado) vs `especialidade_clinica` (dropdown do catálogo).** Ambas em uso. Fonte de verdade deve ser `especialidade_clinica`.
6. **Faturamento ATUAL do lead não tem coluna própria.** `clientes.meta_faturamento` é META. O valor atual só existe em `kpis_mensais.faturamento_bruto` (depois que há KPI) ou solto no JSON `diagnostics.client_data` (faixa de texto, no estágio de lead).
7. **ORIGEM do lead não é capturada em lugar nenhum.** Lacuna total.
8. **`email_cliente`, a chave do sync, não é preenchida pela edge function `create-cliente`.** Só o cadastro via painel admin grava `email_cliente`. Clientes criados com login podem ficar sem a chave.

---

## A) Mapa do fluxo de dados do lead/cliente

Fluxo end-to-end e exatamente quais colunas são gravadas em cada etapa.

### Onde um lead entra
Não existe formulário público de captação de lead dentro deste repositório, nem tabela `leads`. A landing page de diagnóstico publicada (subdomínio `diagnostico.…`) é externa (GitHub Pages) e não escreve no Supabase. Portanto, hoje **todo lead entra manualmente**, por dois caminhos internos:

1. **Diagnóstico 360 (ferramenta interna do consultor).**
   Arquivos: `src/features/diagnostico/*`, persistência em `src/features/diagnostico/persistence.ts`.
   Captura dados do lead na tela "Dados do cliente" (`DadosScreen.tsx`) e as 35 respostas dos 7 pilares.
2. **Cadastro manual de cliente (painel).**
   `src/pages/dashboard/AdminDashboard.tsx` (`handleCriarCliente`, linhas 401-447): `INSERT` direto em `clientes`, sem criar login.
   `supabase/functions/create-cliente/index.ts`: cria `auth.users` + `user_roles` + `clientes` (cliente com login), mas grava poucos campos.
   `src/pages/consultor/GestaoCliente.tsx`: edição completa do cadastro (aba 2).

### Etapas e colunas gravadas

| Etapa | Onde acontece | Tabela.coluna gravada |
|---|---|---|
| **Lead criado (com login)** | edge `create-cliente` | `clientes`: `user_id`, `nome_cliente`, `nome_clinica`, `cidade`, `consultor='Raiz Consultoria'`. `status` e `plano` ficam no DEFAULT (`'lead'`, `'crescimento'`). **`email_cliente` NÃO é gravado.** |
| **Lead criado (sem login)** | `AdminDashboard.handleCriarCliente` | `clientes`: `nome_cliente`, `nome_clinica`, `cidade`, `especialidade`, `especialidade_clinica`, `plano`, `status`, `meta_faturamento`, `consultor`, `telefone`, `email_cliente`, `cpf_cnpj`, `endereco`, `data_nascimento`, `instagram`, `observacoes_relacionamento`, `dia_vencimento`, `forma_pagamento`. **`ramo` NÃO é gravado (fica default).** |
| **Diagnóstico 360** | `persistence.saveDiagnosticoToSupabase` | `diagnostics` (upsert por `client_id`): `ramo`(`dentista`/`medico`), `total_score`, `total_max`, `total_pct`, `classif_label`, `plano_name`, `scores`(JSON), `client_data`(JSON com `client`+`selOpts`). Também `dashboard_data` (EAV: linhas PILAR/KPI/CONFIG) e `clientes` via `data_diagnostico` no painel. KPIs iniciais viram `dashboard_data` tipo `KPI` mes `Inicial`. |
| **Orçamento / Proposta** | `src/features/orcamentos/storage.ts` (`saveOrcamento`) | `orcamentos`: `plano`(código curto), `plano_nome`, `valor`, `score`, `score_max`, `storage_path`, `file_name`, `diagnostic_id`, `validade_proposta`, `forma_pagamento_oferecida`, `parcelas_oferecidas`. `cliente_modulos`: módulos com `status='pendente'`. |
| **Contrato / Ativação** | `saveOrcamento` passos E/F | `clientes.status='projeto_ativo'` (NÃO atualiza `clientes.plano`). `contratos_raiz`: `plano`(nome canônico), `valor_mensal`, `data_inicio`, `data_fim`, `status='ativo'`. |
| **Pagamentos** | painel financeiro | `pagamentos_raiz`: `status` (`pago`/`pendente`/`atrasado`), `valor`, `vencimento`, `mes_referencia`. |
| **Dashboard / Pasta do Cliente** | leitura | View `v_cliente_completo` consolida `clientes` + último `diagnostics` + último `kpis_mensais`. KPIs mensais em `kpis_mensais`. |

Observação importante: a etapa de ativação **não sincroniza `clientes.plano`** com o plano do orçamento/contrato. O plano "real" do cliente acaba em `contratos_raiz.plano`, enquanto `clientes.plano` mantém o que foi escolhido (ou o default) no cadastro.

---

## B) Inventário de campos categóricos (frontend vs banco vs referências)

### B.1 `clientes.status` (funil)
- **Banco:** CHECK `clientes_status_check` em `('lead','diagnostico_feito','proposta_enviada','projeto_ativo','encerrado')`. Migração `20260421060534_*.sql:15`.
- **Frontend manda:** os mesmos 5 valores. `AdminDashboard.tsx:73-78` e `GestaoCliente.tsx:80-86`.
- **Divergência:** valores OK. **Rótulos visíveis divergem entre telas:** `projeto_ativo` = "Projeto ativo" (`AdminDashboard:104`) vs "Cliente ativo" (`GestaoCliente:84`); `encerrado` = "Encerrado" vs "Inativo".
- **Risco:** baixo no banco, médio para o sync (rótulo do CRM precisa de uma escolha única).

### B.2 `clientes.plano`
- **Banco:** `text DEFAULT 'crescimento'`, **sem CHECK** (`schema.sql:57`). Aceita qualquer string.
- **Frontend manda:** `AdminDashboard.tsx:117-121` e `GestaoCliente.tsx:88-92` → `"Raiz Essencial"`, `"Raiz de Crescimento"`, `"Raiz de Expansão"`. A edge `create-cliente` não envia (fica `'crescimento'`).
- **Outros vocabulários no mesmo conceito:**
  - `diagnostics.plano_name` (sugerido pelo diagnóstico): `"Raiz de Base"`, `"Raiz de Crescimento"`, `"Raiz de Expansão"` e, no ramo médico, `"Raiz de Base · Saúde"`, `"Raiz de Crescimento · Saúde"`, `"Raiz de Escala · Saúde"`. `src/features/diagnostico/data.ts:176-186`.
  - `orcamentos.plano` (código curto): `"base"|"crescimento"|"expansao"`. `src/features/orcamentos/data.ts:6`.
  - `contratos_raiz.plano` (nome canônico do orçamento): `"Raiz de Base"|"Raiz de Crescimento"|"Raiz de Expansão"`. `storage.ts:268`.
- **Divergência:** crítica. Quatro representações para a mesma dimensão, e `clientes.plano` pode conter `NULL`, `'crescimento'`, ou `"Raiz Essencial"` dependendo do caminho de criação.
- **Risco:** alto. Sem CHECK, qualquer valor passa. O sync por plano fica não confiável.

### B.3 `clientes.ramo`
- **Banco:** CHECK `clientes_ramo_check` em `('odontologia','medicina','estetica','outros')`, `DEFAULT 'odontologia'`. Migração `20260505100000_*.sql:85`. Confirma a memória `reference_raiz_clientes_ramo_check`.
- **Frontend manda:** **nada.** Nenhum formulário de cadastro tem campo `ramo`. `especialidade_clinica` é agrupada por ramo no dropdown, mas o `ramo` em si não é gravado.
- **Conflito com `diagnostics.ramo`:** este grava `dentista|medico` (tipo `Ramo` do front, `diagnostico/types.ts:36`). Vocabulário incompatível.
- **Risco:** médio. `clientes.ramo` é quase sempre `odontologia` por default; `diagnostics.ramo` fala outra língua.

### B.4 `clientes.especialidade` vs `clientes.especialidade_clinica` (DRIFT)
- **`especialidade`** (legada): texto livre. No painel é um `Input` aberto (`AdminDashboard.tsx:773`). Valores históricos imprevisíveis.
- **`especialidade_clinica`** (nova): dropdown do catálogo `especialidades` (`AdminDashboard.tsx:924-931`). Catálogo seedado em `20260505100400_*.sql` (9 odonto, 5 médicas, 2 estéticas).
- **Fonte de verdade recomendada:** `especialidade_clinica` (tipada, ligada ao catálogo). A migração M1 deixou explícito que não renomeou a legada por causa de ~15 referências no front (`20260505100000_*.sql:11-13`).
- **Atenção extra:** o catálogo `especialidades` e a lista hardcoded `ESPECIALIDADES_DENT`/`ESPECIALIDADES_MED` do diagnóstico (`data.ts:221-233`) **não são a mesma lista** (ex.: "Clínico Geral" vs "Clínica Geral", "Estética Dental" vs "Estética / Harmonização"). Mais uma fonte de variação.
- **Risco:** alto para relatórios e médio para o sync.

### B.5 `clientes.forma_pagamento`
- **Banco:** CHECK em `('pix','boleto','cartao','transferencia')` (NULL permitido). `20260505100000_*.sql:76`.
- **Frontend manda:** os mesmos 4 (`AdminDashboard.tsx:123-128`, `GestaoCliente.tsx:94`). OK.
- **Risco:** baixo.

### B.6 `clientes.pilares_foco` e `clientes.modulos_ativos`
- **Banco:** `TEXT` livre, sem constraint. `20260505100000_*.sql:51-52`.
- **Frontend:** texto/CSV livre. Sem padronização.
- **Risco:** médio (deveria referenciar os 7 pilares canônicos).

### B.7 `diagnostics.ramo` e `diagnostics.plano_name`
Ver B.2 e B.3. `diagnostics.ramo = dentista|medico`; `plano_name` = nomes longos com variantes `· Saúde`.

### B.8 Pilares (nomes) na persistência
- `persistence.ts:54-70` grava cada pilar **duas vezes**: por `id` (`p01..p07`) e por `name`. O `name` muda entre dentista e médico e diverge do Brand Book (ex.: P01 "Marketing Digital & Presença" vs "Marketing & Posicionamento" vs Brand Book "Marketing Digital"; P07 "Crescimento & Expansão" vs Brand Book "Expansão").
- **Fonte de verdade:** os slugs de `PILAR_MAP` (`data.ts:200-208`): `marketing_digital`, `captacao_trafego`, `atendimento_conversao`, `financeiro_precificacao`, `gestao_operacional`, `relacionamento_retencao`, `expansao`. Estes batem 1:1 com os 7 pilares do Brand Book.

### B.9 Outras categorias (contexto, fora do escopo direto do lead)
- `orcamentos.forma_pagamento_oferecida`: CHECK existe (`20260505100300_*.sql:38-41`), confirmar lista exata em produção via SELECT.
- `contratos_raiz.status`: `ativo|encerrado|renovacao_pendente` (default `ativo`).
- `pagamentos_raiz.status`: `pago|pendente|atrasado`.
- `custos_clinica.tipo`: CHECK `fixo|variavel`.
- `especialidades.ramo`: CHECK `odontologia|medicina|estetica|outros`.

### B.10 Drift de tipos gerados
`src/integrations/supabase/types.ts` está **desatualizado** para `clientes`: o `Row` (linhas 79-101) não inclui `telefone`, `email_cliente`, `cpf_cnpj`, `endereco`, `data_nascimento`, `instagram`, `observacoes_relacionamento`, `dia_vencimento`, `forma_pagamento`, `especialidade_clinica`. O código acessa essas colunas via cast manual. Não quebra hoje, mas o TypeScript não protege a chave do sync (`email_cliente`).

---

## C) Lista priorizada de ajustes (P0 a P2)

> "Registros" é estimativa qualitativa, já que não rodei SELECT em produção (preciso das credenciais para confirmar contagens). Onde digo "todos os clientes", é a tabela inteira.

### P0 (faz o sync ser confiável; resolver antes de ligar a integração)

**P0.1 Padronizar `clientes.plano` e adicionar CHECK.** `[DECISÃO PATRICK]` no rótulo, `[TÉCNICO]` na constraint.
- O quê: definir um vocabulário único (recomendo os nomes do Brand Book: `Raiz de Base`, `Raiz de Crescimento`, `Raiz de Expansão`), normalizar os dados legados e criar CHECK.
- Por quê: hoje há 4 vocabulários e nenhum CHECK. Sem isso o sync por plano não fecha.
- Impacto: ~4 arquivos de front (`AdminDashboard.tsx`, `GestaoCliente.tsx`, `orcamentos/data.ts`, `diagnostico/data.ts`) + 1 migração de normalização + CHECK. Todos os registros de `clientes` precisam ser auditados (UPDATE de `'crescimento'` curto e de `'Raiz Essencial'`).

**P0.2 Decidir `Raiz Essencial` vs `Raiz de Base`.** `[DECISÃO PATRICK]`
- O quê: escolher o nome do plano de entrada. Brand Book e diagnóstico dizem `Raiz de Base`; os formulários dizem `Raiz Essencial`.
- Impacto: se canônico for `Raiz de Base`, trocar em `AdminDashboard.tsx:118` e `GestaoCliente.tsx:89` e migrar registros existentes com `plano='Raiz Essencial'`.

**P0.3 Garantir `email_cliente` sempre preenchido.** `[TÉCNICO]`
- O quê: a edge `create-cliente` cria o login mas não grava `clientes.email_cliente`. Passar a gravar o mesmo e-mail do `auth.users`.
- Por quê: `email_cliente` é a chave do sync. Cliente com login e sem `email_cliente` fica invisível para o Notion.
- Impacto: 1 arquivo (`supabase/functions/create-cliente/index.ts:112-122`) + backfill dos clientes já criados por essa via (UPDATE casando por `user_id` → `auth.users.email`).

### P1 (consistência forte; antes de confiar em relatórios cruzados)

**P1.1 Unificar `ramo`: `diagnostics.ramo` deve falar o vocabulário de `clientes.ramo`.** `[TÉCNICO]`
- O quê: mapear `dentista→odontologia`, `medico→medicina` na escrita do diagnóstico, ou criar uma camada de tradução. Manter `odontologia|medicina|estetica|outros` como único vocabulário.
- Impacto: `persistence.ts:138` e o tipo `Ramo` (`diagnostico/types.ts:36`, `data.ts:5`). Registros de `diagnostics` existentes precisam de UPDATE.

**P1.2 Capturar `ramo` no cadastro.** `[TÉCNICO]`
- O quê: adicionar campo `ramo` nos formulários (hoje só `especialidade_clinica` aparece, agrupada por ramo, mas o ramo não é salvo).
- Impacto: `AdminDashboard.tsx` e `GestaoCliente.tsx` (form state + select). Sem isso, todo `clientes.ramo` continua `odontologia` por default.

**P1.3 Eleger `especialidade_clinica` como fonte de verdade e planejar aposentadoria de `especialidade`.** `[TÉCNICO]` na consolidação, `[DECISÃO PATRICK]` se for descontinuar a coluna legada.
- Impacto: ~15 referências de front à `especialidade` (conforme nota da M1). Migração de leitura para `especialidade_clinica` com fallback.

**P1.4 Criar coluna de faturamento ATUAL no cadastro do lead.** `[DECISÃO PATRICK]`
- O quê: hoje não há coluna de faturamento atual em `clientes`. Recomendo `faturamento_atual NUMERIC` (ou capturar a faixa do diagnóstico de forma estruturada).
- Por quê: o ICP é faturamento atual R$15k a R$60k. Esse dado é central para qualificação e hoje fica só em `kpis_mensais` (pós-KPI) ou no JSON do diagnóstico (faixa de texto).
- Impacto: 1 migração + form + sync. Ver seção E (campo "faturamento").

### P2 (higiene; melhora qualidade mas não bloqueia o sync)

**P2.1 Padronizar `pilares_foco`/`modulos_ativos` para os 7 slugs canônicos.** `[TÉCNICO]`
**P2.2 Unificar listas de especialidade entre catálogo `especialidades` e hardcode do diagnóstico.** `[TÉCNICO]`
**P2.3 Unificar rótulos de `status` entre `AdminDashboard` e `GestaoCliente`.** `[TÉCNICO]`
**P2.4 Regenerar `types.ts` para refletir as colunas de M1.** `[TÉCNICO]`
**P2.5 Padronizar nomes de pilares por ramo (display) alinhados ao Brand Book.** `[DECISÃO PATRICK]` (decisão de marca sobre os nomes exibidos no diagnóstico médico).

---

## D) Riscos de cada renomeação e como mitigar (antes de aplicar)

Princípio geral: **toda renomeação de valor categórico que tenha CHECK exige a ordem certa**: normalizar os dados primeiro, depois trocar o CHECK, depois trocar o front. Caso contrário a constraint barra registros legados (foi exatamente o que a M1 previu para `ramo`, com os UPDATE `dentista→odontologia` antes do CHECK).

| Mudança | Risco | Mitigação |
|---|---|---|
| `plano` ganhar CHECK | Registros com `'crescimento'`(curto), `'Raiz Essencial'`, `NULL` violam o CHECK e o `ALTER` falha. | SELECT de diagnóstico (distinct `plano`, contagem) **antes**. UPDATE de normalização. Só então adicionar CHECK com `IF NOT EXISTS` (padrão das migrações existentes). |
| `Raiz Essencial → Raiz de Base` | Telas que filtram por string literal `'Raiz Essencial'` quebram silenciosamente; contratos antigos podem citar o nome. | Buscar todas as referências (`AdminDashboard.tsx:118`, `GestaoCliente.tsx:89`); UPDATE em `clientes` e conferir `contratos_raiz`. Comunicar a troca de nome comercial. |
| `diagnostics.ramo dentista→odontologia` | A reconstrução do snapshot usa `ramo` para escolher `PILARES`/`PLANOS` (`persistence.ts:402-404`). Trocar o valor sem ajustar `getPilaresByRamo` quebra o histórico. | Atualizar `getPilaresByRamo`/`getPlanosByRamo` para o novo vocabulário no mesmo deploy; migrar dados e código juntos; testar reabertura de um diagnóstico antigo. |
| Aposentar `especialidade` legada | ~15 referências de front; views (`v_cliente_completo` expõe ambas, linhas 43-44). | Migrar leituras para `especialidade_clinica` com fallback `COALESCE`; só depois considerar drop. Nunca dropar antes do front parar de ler. |
| Adicionar `faturamento_atual` | Baixo (coluna nova, nullable). | Coluna nullable, sem CHECK rígido no início. Backfill opcional a partir de `kpis_mensais` (primeiro mês) ou do JSON do diagnóstico. |
| `email_cliente` na edge | Duplicidade se já houver `email_cliente` divergente do `auth` em algum registro. | Backfill com `COALESCE(email_cliente, auth.email)`; validar unicidade antes de usar como chave do sync. |

Regra de ouro (memória `feedback_select_elegibilidade_pre_deploy`): rodar o SELECT de diagnóstico contra produção antes de qualquer migração que dependa de dado operacional. Para isso preciso que você me passe o acesso de leitura; não vou adivinhar credenciais.

---

## E) TABELA DE TRADUÇÃO FINAL (a peça central)

Uma linha por campo categórico. "Valor atual no Supabase" lista o que de fato pode estar gravado hoje. "Rótulo canônico recomendado" é o destino. "Opção no CRM Notion" é a sugestão de propriedade/opção correspondente.

### E.1 Status do funil (`clientes.status`)

| Valor atual no Supabase | Rótulo canônico recomendado | Opção no CRM Notion | Tipo |
|---|---|---|---|
| `lead` | `lead` (rótulo: "Lead") | Etapa: **Lead** | `[TÉCNICO]` |
| `diagnostico_feito` | `diagnostico_feito` (rótulo: "Diagnóstico feito") | Etapa: **Diagnóstico realizado** | `[TÉCNICO]` |
| `proposta_enviada` | `proposta_enviada` (rótulo: "Proposta enviada") | Etapa: **Proposta enviada** | `[TÉCNICO]` |
| `projeto_ativo` | `projeto_ativo` (rótulo único: "Cliente ativo") | Etapa: **Cliente ativo** | `[DECISÃO PATRICK]` (escolher entre "Projeto ativo" e "Cliente ativo") |
| `encerrado` | `encerrado` (rótulo único: "Encerrado") | Etapa: **Encerrado / Inativo** | `[DECISÃO PATRICK]` (escolher entre "Encerrado" e "Inativo") |

Recomendo manter os **valores do banco** como estão (já têm CHECK e estão corretos) e unificar apenas os **rótulos visíveis**.

### E.2 Ramo (`clientes.ramo` e `diagnostics.ramo`)

| Valor atual no Supabase | Rótulo canônico recomendado | Opção no CRM Notion | Tipo |
|---|---|---|---|
| `odontologia` (clientes) / `dentista` (diagnostics) | `odontologia` | **Odontologia** | `[TÉCNICO]` |
| `medicina` (clientes) / `medico` (diagnostics) | `medicina` | **Medicina** | `[TÉCNICO]` |
| `estetica` | `estetica` | **Estética** | `[TÉCNICO]` |
| `outros` | `outros` | **Outros** | `[TÉCNICO]` |

Canônico = vocabulário de `clientes.ramo` (Brand Book: odontologia como nicho principal). `diagnostics.ramo` deve convergir para cá.

### E.3 Especialidade

| Valor atual no Supabase | Rótulo canônico recomendado | Opção no CRM Notion | Tipo |
|---|---|---|---|
| `especialidade` (texto livre legado) | descontinuar como fonte | (não mapear) | `[DECISÃO PATRICK]` |
| `especialidade_clinica` (catálogo `especialidades`) | **fonte de verdade** | Propriedade **Especialidade** (select alimentado pelo catálogo) | `[TÉCNICO]` |

### E.4 Plano (`clientes.plano`)

| Valor atual no Supabase | Rótulo canônico recomendado | Opção no CRM Notion | Tipo |
|---|---|---|---|
| `crescimento` (default curto) / `Raiz de Crescimento` | `Raiz de Crescimento` | **Raiz de Crescimento** | `[TÉCNICO]` |
| `Raiz Essencial` / `base` / `Raiz de Base` | `Raiz de Base` (sujeito ao seu aval) | **Raiz de Base** | `[DECISÃO PATRICK]` |
| `expansao` / `Raiz de Expansão` | `Raiz de Expansão` | **Raiz de Expansão** | `[TÉCNICO]` |
| `NULL` | (vazio até definir) | em branco | `[TÉCNICO]` |

Referência Brand Book (faixas de ticket total): Raiz de Base R$15k a 40k, Raiz de Crescimento R$30k a 70k, Raiz de Expansão acima de R$60k. Nota: os valores exibidos no front (`R$ 2.500 a 7.500/mês`) são mensalidade, eixo diferente das faixas totais do Brand Book. Vale alinhar essa comunicação, mas é assunto à parte da taxonomia.

### E.5 Faturamento

| Conceito | Onde está hoje | Rótulo canônico recomendado | Opção no CRM Notion | Tipo |
|---|---|---|---|---|
| Faturamento ATUAL | `kpis_mensais.faturamento_bruto` (pós-KPI); faixa em `diagnostics.client_data.selOpts.fat` (lead) | criar `clientes.faturamento_atual` (NUMERIC) | Propriedade **Faturamento atual (R$)** | `[DECISÃO PATRICK]` |
| META de faturamento | `clientes.meta_faturamento` | `meta_faturamento` | Propriedade **Meta de faturamento (R$)** | `[TÉCNICO]` |

Faixas de referência do ICP (atual R$15k a R$60k, meta R$100k) podem virar um select de faixas no Notion: `Até R$15k`, `R$15k a 60k`, `R$60k a 100k`, `R$100k+`.

### E.6 Pilares (7)

| Slug atual (`PILAR_MAP`) | Rótulo canônico (Brand Book) | Opção no CRM Notion | Tipo |
|---|---|---|---|
| `marketing_digital` | Marketing Digital | **Marketing Digital** | `[TÉCNICO]` |
| `captacao_trafego` | Captação & Tráfego | **Captação & Tráfego** | `[TÉCNICO]` |
| `atendimento_conversao` | Atendimento & Conversão | **Atendimento & Conversão** | `[TÉCNICO]` |
| `financeiro_precificacao` | Financeiro & Precificação | **Financeiro & Precificação** | `[TÉCNICO]` |
| `gestao_operacional` | Gestão Operacional | **Gestão Operacional** | `[TÉCNICO]` |
| `relacionamento_retencao` | Relacionamento & Retenção | **Relacionamento & Retenção** | `[TÉCNICO]` |
| `expansao` | Expansão | **Expansão** | `[TÉCNICO]` |

Os slugs já batem 1:1 com o Brand Book. O ajuste fica nos **nomes de exibição** (`Pilar.name`), que hoje variam por ramo e divergem do Brand Book (P01 e P07 principalmente). Isso é `[DECISÃO PATRICK]` por ser texto de marca.

### E.7 Origem do lead (lacuna)

| Valor atual no Supabase | Rótulo canônico recomendado | Opção no CRM Notion | Tipo |
|---|---|---|---|
| **não existe** | criar `clientes.origem` (TEXT/enum) | Propriedade **Origem** | `[DECISÃO PATRICK]` |

Opções recomendadas para o enum/select: `site`, `landing_diagnostico`, `indicacao`, `instagram`, `whatsapp`, `outro`. Ver seção F e a recomendação de onde criar abaixo.

---

## F) Pré-requisitos para o sync Supabase → Notion (mão única, casando por e-mail)

### F.1 Chave de casamento
- **Chave:** `clientes.email_cliente` (normalizada: `trim` + `lowercase`).
- **Pré-condições antes de ligar o sync:**
  1. `email_cliente` preenchido em 100% dos registros (resolver P0.3 e fazer backfill).
  2. `email_cliente` único (validar; tratar duplicatas manualmente).
  3. No Notion, a propriedade de e-mail é a chave de upsert (procurar a página por e-mail; criar se não existir, atualizar se existir).

### F.2 Correspondência status → etapa do funil

| `clientes.status` | Etapa no funil do CRM Notion |
|---|---|
| `lead` | Lead |
| `diagnostico_feito` | Diagnóstico realizado |
| `proposta_enviada` | Proposta enviada |
| `projeto_ativo` | Cliente ativo |
| `encerrado` | Encerrado / Inativo |

### F.3 Campos mínimos a sincronizar (sugestão de payload)
- Identificação: `nome_cliente`, `nome_clinica`, `cidade`, `email_cliente` (chave), `telefone`, `instagram`.
- Qualificação: `ramo` (já normalizado), `especialidade_clinica`, `faturamento_atual` (após P1.4), `meta_faturamento`.
- Comercial: `status` → etapa, `plano` (após P0.1/P0.2), `orcamento_inicial`, `valor_mensalidade`.
- Diagnóstico (de `v_cliente_completo`): `ultimo_diagnostico_score`, `ultimo_diagnostico_classif`, `ultimo_diagnostico_plano_sugerido`, `ultimo_diagnostico_data`.
- Origem: `origem` (após criar o campo).

### F.4 Onde criar `origem` (recomendação)
- Curto prazo: coluna `clientes.origem` preenchida manualmente no cadastro (`AdminDashboard`/`GestaoCliente`), select com as opções da seção E.7.
- Médio prazo: quando houver formulário público de captação (landing de diagnóstico escrevendo no Supabase), gravar `origem` automaticamente (`landing_diagnostico`, mais `utm_source` se disponível).
- O sync envia `origem` como propriedade do CRM; sem o campo, a origem fica em branco no Notion e o relatório de canais não fecha.

### F.5 Ordem segura de execução (quando você autorizar)
1. SELECT de diagnóstico em produção (distinct de `plano`, `ramo` de ambas as tabelas, contagem de `email_cliente` nulos).
2. P0.3 (`email_cliente` na edge) + backfill.
3. P0.1/P0.2 (normalizar `plano`, decidir `Raiz de Base`, CHECK).
4. P1.1/P1.2 (`ramo` unificado e capturado).
5. P1.4 (`faturamento_atual`) e `origem`.
6. Só então ligar o sync mão única.

Cada passo em branch própria, com rollback escrito, conforme o CLAUDE.md. Confirme antes de eu rascunhar qualquer migração (este documento não contém nenhuma).

---

## Anexo: arquivos-fonte lidos nesta auditoria
- `supabase/schema.sql`
- `supabase/migrations/20260421060534_*.sql` (status CHECK)
- `supabase/migrations/20260505100000_alter_clientes_cadastro_completo.sql` (M1, ramo/forma_pagamento/especialidade_clinica)
- `supabase/migrations/20260505100100_create_kpis_mensais.sql`
- `supabase/migrations/20260505100400_create_especialidades.sql`
- `supabase/migrations/20260505100500_create_v_cliente_completo.sql`
- `supabase/migrations/20260423232649_*.sql` (orcamentos), `20260501031443_*.sql` (contratos/pagamentos)
- `supabase/functions/create-cliente/index.ts`
- `src/integrations/supabase/types.ts`
- `src/pages/dashboard/AdminDashboard.tsx`
- `src/pages/consultor/GestaoCliente.tsx`
- `src/features/diagnostico/data.ts`, `types.ts`, `persistence.ts`
- `src/features/orcamentos/data.ts`, `types.ts`, `storage.ts`

Fim do diagnóstico. Nada foi alterado. Aguardo sua revisão e autorização para qualquer ajuste.
