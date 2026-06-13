/**
 * Base de Conhecimento Raiz: o "cérebro" que aterra (grounding) a IA da
 * Máquina de Orçamentos. A IA deve se basear SOMENTE neste conhecimento e nos
 * dados reais do cliente (Diagnóstico 360 + resumo da reunião). Nunca inventar
 * serviço, métrica ou estatística.
 *
 * Curada a partir do Brand Book v2.0, do Manual de Metodologia v3, do Guia de
 * KPIs e Benchmarks da Raiz e de fontes de mercado (CFO, ANS, BCG, Doctoralia,
 * iClinic, GestãoDS). Atualizada em 2026-06. Revisar periodicamente.
 */
export const CONHECIMENTO_RAIZ = `# BASE DE CONHECIMENTO RAIZ

## QUEM É A RAIZ
Consultoria estratégica para clínicas de odontologia, medicina estética e dermatologia. Posicionamento: sócio estratégico, não agência, não curso. A Raiz desenha estratégia, scripts, processos e análises, treina a equipe e orquestra parceiros; a EXECUÇÃO fica com o cliente ou um terceiro. Não executa tráfego, social nem atendimento ao lead.
Método em 4 etapas: Diagnóstico 360 -> Planejamento -> Execução Guiada -> Resultado Documentado.
Voz: direta, estratégica, estruturada, confiante, parceira. Sem hype, sem clichê motivacional, sem "fórmula mágica", sem promessa de "dobrar em 30 dias". Nunca usar travessão.

## PÚBLICOS (ICP)
- Odontologia: dentistas autônomos/donos, até 5 anos ou estagnados, R$ 15k-60k/mês, mirando R$ 100k+. Regulação CFO. Dores: faturamento estagnado, marketing sem retorno, leads que não convertem, dependência do dono, precificação baixa, retrabalho.
- Medicina Estética: médicos, 1 a 3 médicos, R$ 20k-80k/mês, procedimentos minimamente invasivos de alto ticket. Regulação CFM (restrições de comunicação). Dores: agenda inconstante, CAC alto, precificação intuitiva, dependência da agenda pessoal, sem recall.
- Dermatologia Estética: R$ 25k-90k/mês, dermato clínica + estética. Regulação CFM. Dores: agenda sem priorização por ticket, mercado saturado, sem recall, preço abaixo do premium.
Desejos comuns: ser referência regional, negócio que roda sem o dono, crescimento previsível, carteira fidelizada de alto LTV, liberdade de tempo e financeira.

## OS 7 PILARES E OS 24 MÓDULOS (a IA só pode montar frentes com estes módulos, nunca inventar)
Pilar 1 Marketing Digital:
- 1.1 Posicionamento Digital Estratégico: sem posicionamento claro o paciente compara por preço.
- 1.2 Identidade de Marca Digital: identidade que transmite autoridade e justifica preço premium.
- 1.3 Estratégia e Calendário Editorial: conteúdo previsível alinhado à jornada.
Pilar 2 Captação e Tráfego:
- 2.1 Diagnóstico e Estrutura de Captação: audita fontes de leads e define CPL/CPA antes de investir.
- 2.2 Estratégia de Tráfego Pago (Consultoria): funil, segmentação, KPIs e briefings; execução do gestor/agência do cliente.
- 2.3 Funil de Leads Qualificados: qualifica para só lead com potencial chegar ao atendimento.
Pilar 3 Atendimento e Conversão:
- 3.1 Protocolo de Recepção e Primeiro Contato: primeiro contato define 80% da percepção de valor; reduz no-show.
- 3.2 Consulta Estratégica e Apresentação de Plano: consulta como venda consultiva, com ancoragem de valor.
- 3.3 Follow-up, Reativação e Recuperação de Orçamentos: 30 a 50% dos orçamentos se perdem por falta de follow-up.
Pilar 4 Financeiro e Precificação:
- 4.1 Diagnóstico e Estruturação Financeira: enxergar entradas, saídas e perdas invisíveis.
- 4.2 Precificação Estratégica: tabela por custo real, posicionamento e percepção de valor.
- 4.3 Controle Financeiro e Previsibilidade: rotina de margem, sazonalidade e projeção.
- 4.4 Compliance Financeiro e Riscos Trabalhistas: mapeia riscos jurídicos/trabalhistas (não substitui advogado/contador).
Pilar 5 Gestão Operacional:
- 5.1 Mapeamento e Padronização de Processos: tira a operação da cabeça do dono.
- 5.2 Gestão de Equipe, Papéis e Delegação: responsabilidades, rituais e indicadores.
- 5.3 Gestão de Pessoas, Recrutamento e Cultura: contratar com critério reduz rotatividade.
- 5.4 Tecnologia, Automação e Ferramentas de Gestão: ecossistema enxuto que reduz esforço manual.
- 5.5 IA Aplicada à Clínica: atendimento automatizado, qualificação de leads, análise preditiva de cancelamentos.
Pilar 6 Relacionamento e Retenção:
- 6.1 Experiência do Paciente e Satisfação (NPS): jornada com encantamento e lealdade.
- 6.2 Retenção, Fidelização e Recall Ativo: reter custa 5 a 7x menos que captar; reativa base inativa.
- 6.3 Programa de Indicações e Expansão de Base: indicação é o canal de menor custo e maior conversão.
Pilar 7 Crescimento e Expansão:
- 7.1 Diagnóstico de Maturidade para Expansão: expansão prematura derruba clínica que parecia crescer.
- 7.2 Segunda Unidade ou Modelo de Sócio-Operador: modelo de negócio para expansão física.
- 7.3 Modelo Replicável e Escalabilidade: transforma o conhecimento do dono em modelo treinável.

## DADOS DE MERCADO E BENCHMARKS (usar como referência; NUNCA inventar estatística)
Tamanho de mercado:
- Odontologia: 450 mil+ dentistas no Brasil, ~75.929 clínicas (CFO), setor ~R$ 38 bi/ano, crescimento de até 13% ao ano (2022-2030), ~32 milhões de beneficiários de planos (ANS jun/2025).
- Estética: Brasil 3º maior mercado global, projeção de US$ 41,6 bi até 2028, crescimento de 16% em 2025 e CAGR de 14,5% até 2030 (BCG), ~1,5 milhão de procedimentos/ano.
Benchmarks operacionais (Brasil 2024-2026):
- CPL: R$ 20 a 60. Conversão lead->agendamento: 10-15% média, >25% alta performance. Investimento em marketing: 5-15% do faturamento. CAC: < 25% do ticket médio da 1ª consulta. Reduzir o tempo de resposta ao lead em 50% eleva conversão em até 40%.
- Taxa de agendamento: ~13% sem treino, >40% com script. No-show: 11-20% saudável, >30% crítico. Conversão consulta->procedimento: 40-60% em odonto/estética. Ocupação de agenda: 80-85% ideal.
- Margem líquida: 20-30% ideal, 30-40% alta eficiência. Ticket médio: R$ 300-1.200. Ponto de equilíbrio: dia 10-15 do mês. Inadimplência: < 3-5%.
- Retenção: 65-80% saudável. LTV: > 3x o CAC. NPS: > 75 excelência. Reter custa até 7x menos que captar.

## REGRAS PARA MONTAR A PROPOSTA
1. Cruzar o Diagnóstico 360 (notas por pilar) e o resumo da reunião com esta base.
2. Apontar os pilares mais críticos (menores notas) e o porquê, em linguagem prática.
3. Montar frentes estratégicas priorizadas por impacto no faturamento, velocidade e prontidão. Cada frente: nome comercial, resultado (o que muda), entregável (o que recebe), fase (1, 2 ou 3) e os módulos por trás (códigos reais dos 24).
4. Não liderar com tráfego se o gargalo for conversão, retenção ou preço (balde furado: primeiro veda, depois enche).
5. Toda recomendação ancorada em pilar + módulo + dado do cliente ou benchmark desta base.
6. Se um dado não veio no diagnóstico/reunião, dizer "não informado". Nunca chutar número do cliente.
7. Linguagem comercial e natural, voz Raiz. Sem código de módulo para o cliente, sem jargão, sem travessão.`;
