# CLAUDE.md — Plataforma Raiz Consultoria Estratégica

> Este arquivo é lido automaticamente pelo Claude Code em toda nova sessão.
> Contém o briefing operacional da plataforma. Mantenha atualizado.

---

## 1. Contexto

Sou Patrick Ferreira, sócio estratégico da Raiz Consultoria Estratégica.

A Raiz é uma consultoria para dentistas e clínicas odontológicas que atua via plataforma SaaS.

A plataforma está em produção em https://www.raizconsultoriaestrategica.com.br

**Stack:**
- Frontend: Lovable (React + TypeScript)
- Banco e auth: Supabase
- Email: Resend
- Versionamento: GitHub
- DNS: Registro.br

---

## 2. Documento de referência

Existe uma auditoria estratégica completa da plataforma em:

`C:\Users\usuario\Documents\Claude\Projects\Raiz Consultoria Estratégica\07_Ferramentas_e_Produtos\Plataforma_Web\Auditoria_Plataforma_Raiz_2026-05-04.docx`

**Sua PRIMEIRA AÇÃO em qualquer nova sessão é ler esse documento por completo.** Ele contém:

- Diagnóstico de bugs e anti-padrões
- 20 bugs priorizados (P0 a P3)
- Recomendações em 3 horizontes (P0, P1, P2)
- 6 migrações SQL prontas
- 8 prompts prontos para o Lovable
- Roadmap em 7 fases ao longo de 12 semanas
- Checklist de validação pós-deploy

Toda decisão técnica deve estar alinhada com esse documento. Se discordar de algo, levante a discussão antes de executar, não em paralelo.

---

## 3. Objetivo final

Plataforma 100% funcional, com todas as integrações ajustadas, código otimizado, schema consistente, zero bugs visíveis, fluxo end-to-end funcionando: Lead, Diagnóstico 360, Máquina de Orçamentos, Contrato, Dashboard do Cliente, Pasta do Cliente, Atualização Mensal, Pagamentos.

### Indicadores de sucesso

1. MRR e Ticket Médio do painel admin batem com a soma real dos contratos
2. Score Geral de qualquer cliente é IDÊNTICO em todas as telas onde aparece
3. Auto-preenchimento real funciona em todas as ferramentas que pedem cliente
4. Cliente loga, cai direto no `/dashboard`, navega na Pasta do Cliente, baixa PDFs, agenda reuniões, sem encontrar empty state genérico
5. Consultor cadastra novo cliente do zero pela UI sem tocar no Supabase
6. Notificações Resend disparam corretamente (lembrete reunião, cobrança)
7. Nenhuma rota retorna 404 em fluxo legítimo de uso

---

## 4. Modo de trabalho

Vamos seguir o roadmap em 7 fases descrito no documento de auditoria. Em cada fase:

1. **ANTES de codar**, revise comigo o escopo e me diga o que vai mudar
2. Execute mudanças em **branches Git separadas, uma por fase**
3. Para mudanças no Supabase (CREATE/ALTER/DROP), me peça **confirmação explícita ANTES de executar**. Toda migração precisa ter rollback escrito.
4. Após implementar a fase, rode o **checklist de validação** correspondente (Anexo B do documento de auditoria) e me reporte item por item
5. Só passa para a próxima fase depois que eu aprovar a anterior

**Não faça mudanças irreversíveis** (DROP TABLE, DELETE em produção, deploy forçado) sem confirmação explícita minha em chat.

---

## 5. Critérios de qualidade de código

- TypeScript strict, sem `any` solto
- Componentes reutilizáveis, tipados, com props bem definidas
- Queries Supabase via tipos gerados (não strings cruas)
- Estado global via React Query ou Zustand, não prop drilling
- Loading states e error states tratados em TODA query async
- Testes unitários para lógica de cálculo (scores, indicadores, projeções)
- Acessibilidade básica (labels, aria, contraste WCAG AA)
- Performance: lazy loading de rotas, memoização onde for caro, imagens otimizadas

---

## 6. Protocolo de comunicação

- Tom direto, profissional, sem clichês motivacionais. Sou seu sócio estratégico, não cliente final.
- Português brasileiro
- **Nunca use travessão (—).** Substitua por ponto, vírgula ou dois-pontos.
- Estruture respostas com headers e bullets quando ajudar a leitura, mas evite formatação excessiva
- Se descobrir algo crítico que muda a estratégia, **pause e me alerte**
- Antes de executar tarefas longas, mostre o plano em alto nível e espere meu OK
- Reporte progresso ao final de cada bloco de trabalho com:
  - O que foi feito
  - O que falta
  - Riscos identificados
  - Próximo passo

---

## 7. Recursos disponíveis

Tenho acesso a:

- Supabase (admin)
- Lovable (project owner)
- GitHub (repositório)
- Resend
- Registro.br
- Claude in Chrome (para você navegar na plataforma e validar visualmente)

Me peça acessos específicos quando precisar.

---

## 8. Primeira ação ao iniciar sessão

1. Ler o documento de auditoria completo (`Auditoria_Plataforma_Raiz_2026-05-04.docx`)
2. Confirmar em texto que entendeu o escopo, os 6 princípios da plataforma (Anexo C) e o roadmap das 7 fases
3. Apresentar o plano de execução da Fase 1 (Estabilização) item por item: o que vai mudar, em qual arquivo/componente, ordem de execução, riscos, tempo estimado
4. Aguardar minha aprovação antes de tocar em qualquer código

---

## 9. Estrutura de pastas da Raiz Consultoria

A pasta principal do projeto está em:
`C:\Users\usuario\Documents\Claude\Projects\Raiz Consultoria Estratégica\`

Organizada por categorias numeradas (01 a 08). Documentos da plataforma ficam em:
`07_Ferramentas_e_Produtos\Plataforma_Web\`

Skills criadas devem ser salvas em:
`08_Ferramentas_e_Produtos\Skills\`
