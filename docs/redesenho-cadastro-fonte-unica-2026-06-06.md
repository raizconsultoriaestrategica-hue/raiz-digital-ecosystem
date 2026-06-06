# Redesenho do Cadastro, Status e Fonte Única de Dados do Cliente
### Plataforma Raiz Consultoria Estratégica

> Documento de redesenho, SOMENTE LEITURA. Nada foi alterado no código ou no banco.
> Objetivo: simplificar o cadastro e a mudança de status do cliente, e garantir
> que a informação viva num lugar só, de onde as ferramentas leem sem risco de bug.
>
> Data: 2026-06-06. Base: `origin/main` (com o PR #49 já mergeado).
> Sem travessão. Decisões marcadas como [TÉCNICO] (assumo) ou [DECISÃO PATRICK].

---

## Sumário executivo

Hoje a plataforma funciona, mas a informação do cliente está espalhada e o status muda por vários caminhos. Isso gera três dores:

1. **O status do cliente é alterado em 5 lugares diferentes.** Três deles deixam um cliente virar "ativo" sem nenhum dado comercial (sem plano, sem valor). O funil vaza.
2. **O mesmo dado vive em vários lugares.** Plano aparece em 4 tabelas, faturamento em 4. Quando muda num lugar, os outros ficam desatualizados.
3. **As ferramentas leem de fontes diferentes** (view, tabela direta, EAV legado). Não há uma porta única de leitura, então o que cada tela mostra pode divergir.

O alvo é: **um lugar para escrever (a tabela `clientes`), uma porta para ler (a view `v_cliente_completo`), uma porta para mudar status (o fluxo "Ativar como Cliente")**, e aposentar o que duplica (a `dashboard_data` EAV).

---

## A) Estado atual (mapa real do código)

### A.1 Onde o cliente é cadastrado e editado

| Tela / fluxo | O que faz | Campos |
|---|---|---|
| **Novo Lead** (`AdminDashboard`) | INSERT em `clientes`, `status='lead'` | contato, ramo, especialidade_clinica, origem, observações |
| **Ativar como Cliente** (edge `activate-cliente`) | UPDATE: `status='projeto_ativo'` + plano, valor, vencimento, forma pgto, início, duração | dados comerciais |
| **Lápis de editar** (`AdminDashboard`, `saveEdit`) | UPDATE: status, datas, orçamento_inicial, valor_mensalidade | sem plano |
| **Gestão do Cliente** (`GestaoCliente`) | UPDATE de quase todos os campos do cadastro | cadastro completo + plano, faturamento_atual, origem |

São 3 telas e 1 edge para manter o mesmo registro. Os campos se sobrepõem parcialmente entre elas.

### A.2 Quem muda o `status` (a raiz do vazamento)

| Onde | Vira que status | Exige dado comercial? |
|---|---|---|
| Novo Lead (insert) | `lead` | n/a |
| `activate-cliente` (edge) | `projeto_ativo` | SIM (plano, valor, vencimento) |
| Geração de orçamento (`orcamentos/storage.ts:243`) | `projeto_ativo` | NÃO |
| Lápis de editar (`AdminDashboard:615`) | qualquer (dropdown) | NÃO |
| Gestão do Cliente (`GestaoCliente:544`) | qualquer (dropdown) | NÃO |

Resultado observado no teste de 06/06: um cliente ficou `projeto_ativo` com plano, valor, vencimento, início e duração **todos null**, porque o status foi mudado por uma via que não é o `activate-cliente`. Só o `activate-cliente` é "completo"; as outras 3 vias deixam o funil inconsistente.

### A.3 Onde o mesmo dado está duplicado

| Dado | Aparece em | Risco |
|---|---|---|
| **Plano** | `clientes.plano`, `contratos_raiz.plano`, `orcamentos.plano`, `diagnostics.plano_name` | qual é o verdadeiro? hoje podem divergir |
| **Faturamento** | `clientes.faturamento_atual`, `kpis_mensais.faturamento_bruto`, `dashboard_data` (CONFIG/KPI), `diagnostics.client_data` (faixa) | 4 fontes para "quanto fatura" |
| **Especialidade** | `clientes.especialidade` (legada) + `clientes.especialidade_clinica` (canônica) | resolvido no PR #49 (clinica é a fonte), legada dormente |
| **KPIs mensais** | `kpis_mensais` (tipada) + `dashboard_data` (EAV legada, em paralelo) | escrita/leitura dupla |

Colisão de nome importante: a view `v_cliente_completo` expõe um campo chamado `faturamento_atual`, mas ele vem de `kpis_mensais.faturamento_bruto` (`k.faturamento_bruto AS faturamento_atual`), **não** da coluna nova `clientes.faturamento_atual`. Dois campos, mesmo nome, fontes diferentes. A view também não expõe `origem` nem a coluna de cadastro de faturamento.

### A.4 De onde as ferramentas leem (fragmentação)

| Fonte | Quem lê |
|---|---|
| `v_cliente_completo` (view boa, consolida cliente + último diagnóstico + último KPI) | `useClienteCompleto`, auto-preenchimento de Orçamentos |
| `v_saude_financeira_cliente` | dashboard de saúde financeira |
| `kpis_mensais` (direto) | AnaliseIACard, `useKpiMesCorrente`, `useUltimosKpisMensais` |
| `dashboard_data` (EAV legado) | ClienteDashboard, Diagnóstico (persistence, load, ResultScreen), GestaoCliente, AdminDashboard |
| `clientes` (direto) | PastaDoCliente, ClientPortal, ClienteSelector, AdminDashboard |

A view `v_cliente_completo` já é uma boa "porta única" para parte dos dados, mas só dois consumidores a usam. O resto lê direto da tabela ou da EAV. A `dashboard_data` ainda é central no fluxo de diagnóstico (6 arquivos).

---

## B) Problemas concretos que isso causa

1. **Cliente ativo sem dado comercial** (vazamento do funil). MRR, ticket médio e relatórios ficam errados.
2. **Divergência de plano/faturamento** entre telas, porque cada uma lê de uma fonte.
3. **Bug silencioso ao atualizar:** mudar um dado num lugar não reflete nos outros. Ex.: corrigir o plano em `clientes` não muda `contratos_raiz`.
4. **Manutenção cara:** três telas para manter o mesmo cadastro, com campos sobrepostos.
5. **EAV frágil:** `dashboard_data` guarda número como texto, exige conversões no front e convive com a `kpis_mensais` tipada que deveria substituí-la.

---

## C) Desenho alvo (princípios)

1. **Uma fonte de escrita: a tabela `clientes`.** Todo atributo do cliente (incluindo plano e faturamento atual) mora em `clientes`. O contrato (`contratos_raiz`) referencia o cliente e guarda histórico de contrato, mas o "plano vigente" do cliente é lido de `clientes`. [DECISÃO PATRICK] sobre tratar `contratos_raiz` como histórico.
2. **Uma porta de leitura: a view `v_cliente_completo`.** Toda ferramenta lê dela. A view é atualizada para expor `origem`, o `clientes.faturamento_atual` (com nome sem ambiguidade) e o faturamento do KPI com nome próprio (ex.: `faturamento_kpi_ultimo_mes`). [TÉCNICO]
3. **Uma porta de transição de status.** Só o fluxo "Ativar como Cliente" leva a `projeto_ativo` (exigindo plano/valor). O lápis e a geração de orçamento param de mexer no status à revelia. Reativar/encerrar viram ações explícitas e controladas. [DECISÃO PATRICK] sobre as regras exatas de transição.
4. **Aposentar a `dashboard_data` EAV**, migrando leitura/escrita para `kpis_mensais` (KPIs) e `diagnostics` (diagnóstico). [TÉCNICO, faseado]
5. **Cadastro e edição num formulário só e coerente**, organizado por seções (Contato, Categoria clínica, Comercial, Qualificação), reaproveitado entre "criar" e "editar". [TÉCNICO/UX]

Modelo mental final:

```
            ESCRITA                         LEITURA
  Novo Lead ─┐
  Editar ────┤──>  clientes  ──>  v_cliente_completo  ──>  todas as ferramentas
  Ativar ────┘      (+ kpis_mensais, diagnostics como satélites tipados)
```

---

## D) Plano em fases (cada uma testável, com rollback)

> Ordem pensada do menor risco e maior alívio diário para o mais estrutural.

### Fase 1: Porta única de status [resolve o vazamento do funil]
- `activate-cliente` passa a ser o único caminho para `projeto_ativo`.
- Geração de orçamento deixa de setar `status` (ou só sugere, sem ativar).
- Lápis de editar perde o controle livre de status; transições viram botões explícitos (Ativar, Encerrar, Reabrir) com as regras.
- Impacto: `AdminDashboard` (saveEdit), `orcamentos/storage.ts`. Risco baixo. Sem mudança de schema.

### Fase 2: View como porta única de leitura
- Atualizar `v_cliente_completo` para expor `origem`, `clientes.faturamento_atual` (nome claro) e separar o faturamento do KPI.
- Migrar consumidores que leem `clientes` direto ou EAV para a view.
- Impacto: 1 migração de view (sem tocar dados) + ajustes de leitura no front. Risco baixo/médio.

### Fase 3: Cadastro unificado
- Um componente de formulário só, usado em criar e editar, por seções.
- Impacto: refactor de `AdminDashboard` + `GestaoCliente`. Risco médio (UX), sem schema.

### Fase 4: Aposentar a dashboard_data EAV
- Mover o que o diagnóstico ainda grava/lê na EAV para `diagnostics`/`kpis_mensais`.
- Só depois que ninguém mais ler a EAV, considerar parar de escrevê-la.
- Impacto: feature de diagnóstico (6 arquivos). Risco médio. É a fase mais trabalhosa.

### Fase 5: Desduplicar plano/faturamento
- Definir `clientes` como verdade para plano e faturamento; `contratos_raiz` vira histórico; remover gravações redundantes.
- Impacto: revisão de `orcamentos/storage.ts` e leitura financeira. Risco médio.

---

## E) Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Quebrar transições de status que alguém usa hoje | Mapear todos os botões antes; manter Ativar/Encerrar/Reabrir cobrindo os casos atuais; testar com lead de teste |
| View nova quebrar leitura existente | Manter os nomes de campo atuais da view e só ADICIONAR os novos; não renomear sem ajustar consumidores juntos |
| Aposentar EAV e perder histórico de diagnóstico antigo | A `diagnostics` tipada já é a fonte canônica desde o dual-write (Fase 2 anterior); migrar antes de parar de escrever; backup |
| Desduplicar plano e perder o plano de contratos antigos | `contratos_raiz` continua existindo como histórico; só paramos de tratá-lo como fonte de verdade do "plano atual" |
| Refactor de cadastro introduzir regressão | Reusar componente único + checklist de validação por fluxo (lead, ativação, edição) |

Regra geral: cada fase em branch própria, validada (tsc + build + teste manual do fluxo com cliente de teste) e aprovada por você antes da próxima. Toda migração com rollback escrito. Nada irreversível sem seu OK.

---

## F) Decisões que dependem de você [DECISÃO PATRICK]

1. **Regras de transição de status.** Quais transições existem e quem pode fazê-las? Sugestão inicial:
   - `lead` -> `diagnostico_feito` (automático ao salvar diagnóstico)
   - `diagnostico_feito` -> `proposta_enviada` (ao gerar/enviar orçamento)
   - `proposta_enviada` -> `projeto_ativo` (só via "Ativar como Cliente", com plano/valor)
   - `projeto_ativo` -> `encerrado` (ação explícita "Encerrar")
   - `encerrado` -> `projeto_ativo` (ação "Reabrir")
2. **`contratos_raiz` é histórico?** Concorda que o "plano vigente" do cliente vive em `clientes.plano` e o `contratos_raiz` guarda só o histórico de contratos?
3. **Faturamento: cadastro vs KPI.** `clientes.faturamento_atual` (informado no cadastro/qualificação) e `kpis_mensais.faturamento_bruto` (real, mês a mês) coexistem. Confirmar que ambos existem com nomes distintos e que o "oficial" para acompanhamento é o do KPI.
4. **Profundidade agora.** Fazemos as 5 fases ou paramos nas Fases 1 a 3 (as de maior impacto no dia a dia) e deixamos 4 e 5 para depois?

---

## Próximo passo

Quando você revisar este documento e responder as 4 decisões do bloco F, eu detalho a Fase 1 (porta única de status) item a item: o que muda, em qual arquivo, ordem, riscos e teste. Só começo a codar depois do seu OK, em branch separada.
