import type { Pilar, Plano, Classif } from "./types";

export const ADMIN_PIN = "raiz360";

export type Ramo = "dentista" | "medico";

/** Vocabulário canônico de ramo no banco (clientes.ramo, diagnostics.ramo). */
export type RamoCanonico = "odontologia" | "medicina" | "estetica" | "outros";

/**
 * Converte o ramo interno do diagnóstico (dentista|medico) para o vocabulário
 * canônico gravado no banco. Necessário porque diagnostics.ramo tem CHECK em
 * ('odontologia','medicina','estetica','outros').
 */
export function toRamoCanonico(ramo: Ramo): RamoCanonico {
  return ramo === "medico" ? "medicina" : "odontologia";
}

/**
 * Converte o ramo canônico do banco de volta para o ramo interno usado pela
 * lógica de pilares/planos. Aceita também os valores legados (dentista|medico)
 * de registros pré-migração. medicina/estetica/outros caem em "medico"
 * (conjunto de pilares de saúde); odontologia em "dentista".
 */
export function fromRamoCanonico(ramo: string | null | undefined): Ramo {
  if (ramo === "medico" || ramo === "medicina" || ramo === "estetica" || ramo === "outros") {
    return "medico";
  }
  return "dentista";
}

/* ============================================================
 * PILARES. Versão DENTISTA (default)
 * ============================================================ */
export const PILARES: Pilar[] = [
  {
    id: "p01", num: "01", name: "Marketing Digital & Presença", max: 15,
    desc: "Avalia posicionamento, presença digital, consistência de comunicação e capacidade de atrair pacientes pelo ambiente online.",
    questions: [
      { text: "O profissional tem posicionamento claro. Sabe para quem fala, o que oferece e por que é diferente dos concorrentes?", labels: ["Nunca pensou nisso", "Pensa nisso, mas não está definido", "Posicionamento básico na cabeça", "Posicionamento estratégico documentado"] },
      { text: "Com que consistência publica conteúdo relevante nas redes sociais?", labels: ["Não publica ou raramente", "Esporádico e sem estratégia", "Regular, mas sem planejamento", "Calendário editorial ativo e estratégico"] },
      { text: "A identidade visual da clínica (logo, cores, padrão de posts) transmite autoridade e profissionalismo?", labels: ["Sem identidade definida", "Visual despadronizado e inconsistente", "Identidade básica com alguma consistência", "Marca sólida, premium e reconhecível"] },
      { text: "Tem processo ativo de coleta de avaliações no Google Meu Negócio?", labels: ["Sem cadastro ou perfil incompleto", "Tem cadastro, não gerencia", "Pede avaliações às vezes, sem processo", "Processo ativo + responde avaliações"] },
      { text: "O perfil no Instagram é otimizado para converter visitantes em leads (bio, destaques, CTA)?", labels: ["Sem presença ou perfil incompleto", "Perfil básico sem otimização", "Bio e destaques configurados", "Perfil otimizado para captação com CTA claro"] },
    ],
  },
  {
    id: "p02", num: "02", name: "Captação & Tráfego", max: 15,
    desc: "Mede como novos pacientes chegam, se há estratégia ativa de captação, a qualidade dos leads gerados e o custo de aquisição.",
    questions: [
      { text: "Qual é a principal fonte de novos pacientes hoje?", labels: ["Apenas espera passiva — sem estratégia", "Indicação por acaso", "Indicação + redes sociais orgânicas", "Múltiplos canais ativos e estruturados"] },
      { text: "Investe em tráfego pago (Meta Ads ou Google Ads) com estratégia e acompanhamento de resultados?", labels: ["Nunca investiu", "Já tentou, parou sem resultado", "Investe sem acompanhar ROI", "Estratégia ativa com métricas e ajustes"] },
      { text: "Sabe qual é o custo de aquisição por novo paciente (CAC)?", labels: ["Não conhece o conceito", "Sabe o que é, nunca calculou", "Tem estimativa aproximada", "Calcula e monitora mensalmente"] },
      { text: "Tem funil de captação com landing page e qualificação de leads?", labels: ["Não tem nada estruturado", "Só recebe contatos pelo WhatsApp", "Formulário ou landing page básica", "Funil com qualificação e automação"] },
      { text: "Tem programa formal de indicação com benefícios e processo definidos?", labels: ["Indicação acontece por acaso", "Pede verbalmente, sem processo", "Incentiva informalmente, sem formalidade", "Programa estruturado com mecânica clara"] },
    ],
  },
  {
    id: "p03", num: "03", name: "Atendimento & Conversão", max: 15,
    desc: "Analisa como leads são atendidos, a taxa de conversão real, a qualidade dos scripts e o processo comercial do primeiro contato ao fechamento.",
    questions: [
      { text: "Qual é o tempo médio de resposta a um novo contato pelo WhatsApp?", labels: ["> 24h ou não responde sempre", "Mesmo dia, mas com atraso", "Até 2 horas", "Até 30 minutos com protocolo definido"] },
      { text: "A equipe tem script estruturado para atendimento, qualificação e agendamento de leads?", labels: ["Improvisa no atendimento", "Algumas mensagens salvas no WhatsApp", "Roteiro básico de atendimento", "Script completo por etapa do funil"] },
      { text: "Como é o processo de apresentação do plano de tratamento na consulta?", labels: ["Verbal e informal", "Passado por mensagem sem ancoragem", "Orçamento simples enviado", "Apresentação estruturada com ancoragem de valor"] },
      { text: "Faz follow-up ativo de leads que não responderam ou orçamentos não fechados?", labels: ["Não faz — lead sumiu, acabou", "1 tentativa e desiste", "Faz, mas sem sequência definida", "Sequência multi-touchpoint estruturada"] },
      { text: "A equipe está preparada para lidar com objeções de preço sem dar desconto imediato?", labels: ["Dá desconto ou perde o lead", "Argumenta por intuição, sem técnica", "Algumas respostas preparadas", "Protocolo de objeções treinado e testado"] },
    ],
  },
  {
    id: "p04", num: "04", name: "Financeiro & Precificação", max: 15,
    desc: "Identifica se há controle financeiro real, se os preços são calculados com base em dados e o que de fato sobra ao final do mês.",
    questions: [
      { text: "As finanças pessoais e da clínica estão completamente separadas e controladas?", labels: ["Tudo misturado", "Contas separadas, mas com mistura", "Separadas e controladas minimamente", "Separação total + DRE mensal estruturado"] },
      { text: "Sabe o custo real de cada procedimento (material + tempo + estrutura + impostos)?", labels: ["Precifica por intuição ou mercado", "Tem ideia, sem cálculo formal", "Calculou os principais procedimentos", "Planilha de custo por procedimento atualizada"] },
      { text: "Controla o fluxo de caixa com projeção de receita futura?", labels: ["Não controla", "Anota algumas entradas e saídas", "Planilha básica sem projeção", "Fluxo detalhado com projeção mensal"] },
      { text: "Tem clareza sobre o ticket médio e usa isso para definir metas mensais?", labels: ["Não sabe o ticket médio", "Sabe aproximadamente", "Sabe com precisão", "Usa para metas e decisões estratégicas"] },
      { text: "Já verificou os principais riscos trabalhistas e fiscais da operação?", labels: ["Nunca pensou no assunto", "Tem dúvidas, mas não verificou", "Verificou alguns pontos informalmente", "Assessoria contábil/jurídica ativa e atualizada"] },
    ],
  },
  {
    id: "p05", num: "05", name: "Gestão Operacional", max: 18,
    desc: "Verifica se a clínica tem processos, sistemas e equipe que suportam o crescimento sem depender da memória e presença constante do dono.",
    questions: [
      { text: "Os processos críticos da clínica estão documentados (POPs, checklists, manuais)?", labels: ["Nada documentado — tudo na cabeça", "Algumas anotações informais", "Documentação parcial de alguns processos", "Processos documentados, treinados e atualizados"] },
      { text: "Usa software de gestão clínica com agenda, prontuário e financeiro integrados?", labels: ["Papel ou planilha informal", "Software básico mal explorado", "Sistema em uso com recursos básicos", "Sistema completo com relatórios de performance"] },
      { text: "Tem CRM ou sistema para acompanhar e gerenciar leads e oportunidades?", labels: ["Leads perdidos no WhatsApp", "Etiquetas informais no WhatsApp", "Planilha ou ferramenta básica", "CRM ativo com funil estruturado"] },
      { text: "A clínica consegue funcionar normalmente se o dono se ausentar por 1 semana?", labels: ["Para completamente", "Funciona com muitos problemas", "Funciona com dificuldade", "Funciona com autonomia real"], onlyWithTeam: true },
      { text: "Os papéis e responsabilidades de cada membro da equipe estão claramente definidos?", labels: ["Confusão constante de tarefas", "Definição verbal informal", "Cargos definidos sem documentação", "Matriz de responsabilidades documentada"], onlyWithTeam: true },
      { text: "Usa ferramentas de Inteligência Artificial no dia a dia da clínica?", labels: ["Nunca usou", "Já experimentou, usa pouco", "Usa para conteúdo ou comunicação", "Integrada a processos operacionais ativos"] },
    ],
  },
  {
    id: "p06", num: "06", name: "Relacionamento & Retenção", max: 12,
    desc: "Avalia a experiência do paciente, a qualidade da fidelização, o processo de reativação de inativos e a geração estruturada de indicações.",
    questions: [
      { text: "Tem estratégia ativa de reativação de pacientes inativos (recall por período)?", labels: ["Paciente sumiu — acabou", "Contato em datas comemorativas", "Contato ocasional sem sequência", "Fluxo estruturado de recall por período"] },
      { text: "Mede a satisfação dos pacientes de forma sistemática?", labels: ["Não mede", "Avalia pela percepção, informalmente", "Pede feedback esporadicamente", "NPS implementado com análise periódica"] },
      { text: "Como é a experiência do paciente do primeiro contato até a alta do tratamento?", labels: ["Atendimento básico sem diferencial", "Organizado, mas sem encantamento", "Boa experiência de forma consistente", "Experiência memorável e premium em todas as etapas"] },
      { text: "Tem estratégia para gerar indicações de forma consistente e estruturada?", labels: ["Indicação por acaso — sem processo", "Pede verbalmente sem mecânica", "Incentiva, mas sem formalidade", "Programa estruturado com mecânica e benefícios claros"] },
    ],
  },
  {
    id: "p07", num: "07", name: "Crescimento & Expansão", max: 9,
    desc: "Avalia a maturidade do negócio para o próximo salto. Segunda unidade, modelo de sócio-operador ou replicação da operação em escala.",
    questions: [
      { text: "Tem clareza sobre quando e como expandir (segunda unidade, sócio ou replicação)?", labels: ["Nunca pensou no assunto", "Quer expandir, mas não sabe como/quando", "Tem ideia do caminho, sem plano", "Plano de expansão estruturado com viabilidade calculada"] },
      { text: "Os processos atuais estão documentados a ponto de serem replicados em outra unidade?", labels: ["Processos não existem formalmente", "Estão na cabeça do dono", "Documentados parcialmente", "Manual completo e replicável testado"] },
      { text: "O faturamento atual tem previsibilidade suficiente para suportar o custo de expansão?", labels: ["Faturamento instável e imprevisível", "Faturamento razoável sem previsibilidade", "Previsibilidade moderada", "Alta previsibilidade com reserva de capital"] },
    ],
  },
];

/* ============================================================
 * PILARES. Versão MÉDICO / SAÚDE
 * ============================================================ */
export const PILARES_MEDICO: Pilar[] = [
  {
    id: "p01", num: "01", name: "Marketing Digital", max: 15,
    desc: "Avalia especialização, presença digital, posicionamento como autoridade e capacidade de atrair pacientes respeitando as diretrizes éticas.",
    questions: [
      { text: "O médico tem especialidade/nicho de atendimento claramente definido e comunicado estrategicamente ao mercado?", labels: ["Atende tudo sem especialização", "Tem especialidade, mas não comunica", "Comunica a especialidade sem estratégia", "Nicho definido + comunicação estratégica consistente"] },
      { text: "Produz conteúdo educativo regularmente para se posicionar como autoridade na sua área?", labels: ["Não produz conteúdo", "Esporádico, sem planejamento", "Publica com alguma regularidade, sem estratégia", "Calendário editorial com conteúdo de autoridade"] },
      { text: "A identidade visual do consultório transmite autoridade e profissionalismo condizente com o nível de atendimento?", labels: ["Sem identidade visual definida", "Visual básico e despadronizado", "Identidade básica com alguma consistência", "Marca sólida, premium e reconhecível no nicho"] },
      { text: "Tem presença ativa no Google Meu Negócio com avaliações positivas e processo de coleta de reviews?", labels: ["Sem cadastro ou perfil incompleto", "Tem cadastro, não gerencia", "Gerencia esporadicamente, sem processo", "Perfil completo + processo ativo + 4.5+ estrelas"] },
      { text: "Entende e aplica as regras éticas do CFM/CRM para marketing médico de forma estratégica?", labels: ["Não sabe o que pode ou não fazer", "Sabe das restrições, não tem estratégia", "Segue as regras com marketing básico", "Marketing ético e estratégico, alinhado com CFM/CRM"] },
    ],
  },
  {
    id: "p02", num: "02", name: "Captação & Tráfego", max: 15,
    desc: "Mede como novos pacientes chegam, se há estratégia ativa de captação, a qualidade dos leads e o processo de conversão de contatos em consultas.",
    questions: [
      { text: "Qual é a principal fonte de novos pacientes hoje?", labels: ["Apenas espera passiva — sem estratégia", "Indicação por acaso", "Indicação + redes sociais orgânicas", "Múltiplos canais ativos e estruturados"] },
      { text: "Tem estratégia ativa para aumentar a proporção de pacientes particulares em relação a convênios?", labels: ["Sem estratégia — aceita qualquer paciente", "Sabe que precisa, mas não age", "Alguma ação, sem estratégia clara", "Estratégia ativa com metas e execução"] },
      { text: "Investe em tráfego pago (Meta Ads, Google Ads) com estratégia e acompanhamento de resultados?", labels: ["Nunca investiu", "Já tentou, parou sem resultado", "Investe sem acompanhar ROI", "Estratégia ativa com métricas e ajustes periódicos"] },
      { text: "Tem funil de captação estruturado para converter contatos em consultas agendadas?", labels: ["Não tem estrutura alguma", "Só recebe contatos pelo WhatsApp", "Formulário ou landing page básica", "Funil com qualificação, automação e confirmação"] },
      { text: "Sabe qual é o custo de aquisição por novo paciente particular (CAC)?", labels: ["Não conhece o conceito", "Sabe o que é, nunca calculou", "Tem estimativa aproximada", "Calcula e monitora mensalmente"] },
    ],
  },
  {
    id: "p03", num: "03", name: "Atendimento & Conversão", max: 15,
    desc: "Analisa como leads são atendidos, a taxa de agendamento, o processo de confirmação de consultas e a qualidade da experiência do primeiro contato.",
    questions: [
      { text: "Qual é o tempo médio de resposta a um novo contato pelo WhatsApp ou formulário?", labels: [">24h ou não responde sempre", "Mesmo dia, mas com atraso", "Até 2 horas", "Até 30 minutos com protocolo definido"] },
      { text: "Tem processo estruturado de confirmação de consultas e redução de faltas (no-show)?", labels: ["Sem processo — faltas frequentes", "Liga para confirmar sem protocolo", "Envia lembrete básico por WhatsApp", "Protocolo multi-etapas: confirmação + lembrete + recall"] },
      { text: "Como é feita a comunicação do valor do atendimento ao paciente antes e durante a consulta?", labels: ["Valor não é comunicado", "Explica verbalmente sem técnica", "Argumentos preparados informalmente", "Protocolo de comunicação de valor treinado"] },
      { text: "Faz acompanhamento pós-consulta ativo (follow-up, retornos, recall programado)?", labels: ["Sem acompanhamento", "Contato pontual sem sequência", "Faz, mas sem processo estruturado", "Protocolo de follow-up por tipo de paciente"] },
      { text: "Tem estratégia para lidar com pacientes que comparam preço e resistem a pagar particular?", labels: ["Perde o paciente ou cede ao convênio", "Argumenta por intuição", "Algumas respostas preparadas", "Protocolo de comunicação de valor treinado"] },
    ],
  },
  {
    id: "p04", num: "04", name: "Financeiro & Precificação", max: 15,
    desc: "Identifica controle financeiro real, precificação baseada em dados, relação convênio/particular e o que sobra ao final do mês.",
    questions: [
      { text: "As finanças pessoais e do consultório estão completamente separadas e controladas?", labels: ["Tudo misturado", "Contas separadas, mas com mistura", "Separadas com controle mínimo", "Separação total + DRE mensal estruturado"] },
      { text: "Sabe o custo real por consulta ou procedimento (tempo + estrutura + impostos + equipe)?", labels: ["Precifica por intuição", "Tem ideia, sem cálculo formal", "Calculou os principais", "Planilha de custo por procedimento atualizada"] },
      { text: "Qual é a proporção de receita de convênios vs. particular e como está sendo gerenciada?", labels: ["Depende quase 100% de convênios", "Tem particular, sem estratégia", "Trabalha para aumentar particular sem plano", "Estratégia de transição com metas definidas"] },
      { text: "Controla fluxo de caixa com projeção de receita, considerando sazonalidades e repasses de convênio?", labels: ["Não controla", "Anota entradas e saídas", "Planilha básica sem projeção", "Fluxo detalhado com projeção e sazonalidades"] },
      { text: "Já avaliou os riscos trabalhistas, fiscais e de responsabilidade civil da operação?", labels: ["Nunca pensou no assunto", "Tem dúvidas, não verificou", "Verificou pontos informalmente", "Assessoria ativa + seguro de responsabilidade civil"] },
    ],
  },
  {
    id: "p05", num: "05", name: "Gestão Operacional", max: 18,
    desc: "Verifica se o consultório tem processos, sistemas e equipe que suportam o crescimento sem depender da presença constante do médico.",
    questions: [
      { text: "Os processos críticos do consultório estão documentados (protocolos, checklists, manuais)?", labels: ["Nada documentado", "Algumas anotações informais", "Documentação parcial", "Processos documentados, treinados e atualizados"] },
      { text: "Usa sistema de gestão clínica com agenda, prontuário eletrônico e financeiro integrados?", labels: ["Papel ou planilha informal", "Software básico mal explorado", "Sistema em uso com recursos básicos", "Sistema completo com relatórios e performance"] },
      { text: "Tem processo estruturado de gestão da agenda para maximizar produtividade?", labels: ["Agenda com muitos buracos", "Gerencia informalmente", "Algum processo, não maximizado", "Agenda otimizada com protocolo de preenchimento"] },
      { text: "O consultório consegue funcionar normalmente se o médico se ausentar por alguns dias?", labels: ["Para completamente", "Funciona com muitos problemas", "Funciona com dificuldade", "Funciona com autonomia real"], onlyWithTeam: true },
      { text: "Os papéis e responsabilidades de cada membro da equipe estão claramente definidos?", labels: ["Confusão constante de tarefas", "Definição verbal informal", "Cargos definidos sem documentação", "Matriz de responsabilidades documentada"], onlyWithTeam: true },
      { text: "Usa ferramentas de Inteligência Artificial no dia a dia do consultório?", labels: ["Nunca usou", "Já experimentou, usa pouco", "Usa para conteúdo ou comunicação", "Integrada a processos operacionais ativos"] },
    ],
  },
  {
    id: "p06", num: "06", name: "Relacionamento & Retenção", max: 12,
    desc: "Avalia experiência do paciente, fidelização, recall de inativos e geração estruturada de indicações.",
    questions: [
      { text: "Tem estratégia ativa de recall e reativação de pacientes que não retornam há mais de 6 meses?", labels: ["Paciente sumiu — sem processo", "Contato em datas comemorativas", "Contato ocasional sem sequência", "Protocolo de recall por período e tipo"] },
      { text: "Mede sistematicamente a satisfação dos pacientes e usa isso para melhorar processos?", labels: ["Não mede", "Avalia pela percepção", "Pede feedback esporadicamente", "NPS implementado + análise + ações de melhoria"] },
      { text: "Como é a experiência do paciente do primeiro contato ao pós-atendimento?", labels: ["Básico sem diferencial", "Organizado, sem encantamento", "Boa experiência consistente", "Memorável e premium em todas as etapas"] },
      { text: "Tem estratégia para gerar indicações de pacientes satisfeitos de forma consistente?", labels: ["Indicação por acaso", "Pede verbalmente sem mecânica", "Incentiva, sem formalidade", "Programa estruturado com mecânica e benefícios"] },
    ],
  },
  {
    id: "p07", num: "07", name: "Crescimento & Expansão", max: 9,
    desc: "Avalia a maturidade do negócio para o próximo salto. Segunda unidade, sócio-operador ou replicação em escala.",
    questions: [
      { text: "Tem clareza sobre quando e como expandir (segunda unidade, sócio ou replicação)?", labels: ["Nunca pensou no assunto", "Quer expandir, sem saber como", "Tem ideia do caminho, sem plano", "Plano estruturado com viabilidade calculada"] },
      { text: "Os processos atuais estão documentados a ponto de serem replicados?", labels: ["Processos não existem formalmente", "Na cabeça do dono", "Documentados parcialmente", "Manual completo e replicável testado"] },
      { text: "O faturamento atual tem previsibilidade suficiente para suportar o custo de expansão?", labels: ["Instável e imprevisível", "Razoável sem previsibilidade", "Previsibilidade moderada", "Alta previsibilidade com reserva de capital"] },
    ],
  },
];

export function getPilaresByRamo(ramo: Ramo): Pilar[] {
  return ramo === "medico" ? PILARES_MEDICO : PILARES;
}

/* ============================================================
 * PLANOS
 * ============================================================ */
export const PLANOS: Plano[] = [
  { trigger: (p) => p < 0.35, badge: "FASE 1. BASE", name: "Raiz de Base", desc: "Para clínicas que precisam construir a fundação do negócio. Estruturamos os pilares críticos: financeiro, atendimento e operação, para destravar o faturamento e criar a base mínima viável de crescimento.", modulos: ["Financeiro & Precificação", "Atendimento & Conversão", "Gestão Operacional", "Posicionamento Digital"], valor: "R$ 2.500 – R$ 3.500/mês", duracao: "3–4 meses · 1 encontro/semana", roi: "+40–80%" },
  { trigger: (p) => p < 0.65, badge: "FASE 1–2 · CRESCIMENTO", name: "Raiz de Crescimento", desc: "Para clínicas com alguma estrutura mas crescimento estagnado. Expandimos captação, marketing e gestão financeira para acelerar o faturamento com previsibilidade e consistência.", modulos: ["Captação & Tráfego", "Marketing Digital", "Atendimento & Conversão", "Financeiro & Precificação", "Gestão Operacional"], valor: "R$ 3.500 – R$ 5.000/mês", duracao: "4–5 meses · 1 encontro/semana", roi: "+60–120%" },
  { trigger: () => true, badge: "FASE 2–3 · ESCALA", name: "Raiz de Expansão", desc: "Para clínicas com base consolidada, prontas para escalar. Foco em retenção de pacientes, gestão de equipe, tecnologia, IA aplicada à clínica e estruturação para crescimento sustentável.", modulos: ["Relacionamento & Retenção", "Gestão de Pessoas", "Tecnologia & IA", "Crescimento & Expansão"], valor: "R$ 5.000 – R$ 7.500/mês", duracao: "5–6+ meses · encontros semanais ou quinzenais", roi: "+80–150%" },
];

export const PLANOS_MEDICO: Plano[] = [
  { trigger: (p) => p < 0.35, badge: "FASE 1. BASE", name: "Raiz de Base", desc: "Para consultórios que precisam construir a fundação. Estruturamos financeiro, atendimento e operação para destravar o faturamento, reduzir dependência de convênios e criar previsibilidade.", modulos: ["Financeiro & Precificação", "Atendimento & Conversão", "Gestão Operacional", "Marketing Digital"], valor: "R$ 2.500 – R$ 3.500/mês", duracao: "3–4 meses · 1 encontro/semana", roi: "+40–80%" },
  { trigger: (p) => p < 0.65, badge: "FASE 1–2 · CRESCIMENTO", name: "Raiz de Crescimento", desc: "Para consultórios com alguma estrutura mas crescimento estagnado. Expandimos captação de particulares, marketing médico ético e gestão financeira para acelerar faturamento com consistência.", modulos: ["Captação & Tráfego", "Marketing Digital", "Atendimento & Conversão", "Financeiro & Precificação", "Gestão Operacional"], valor: "R$ 3.500 – R$ 5.000/mês", duracao: "4–5 meses · 1 encontro/semana", roi: "+60–120%" },
  { trigger: () => true, badge: "FASE 2–3 · EXPANSÃO", name: "Raiz de Expansão", desc: "Para consultórios com boa base que buscam o próximo nível. Consolidamos posicionamento de autoridade, redução de convênios, expansão de serviços de alto valor e estrutura para crescimento sustentável.", modulos: ["Marketing Digital", "Crescimento & Expansão", "Relacionamento & Retenção", "Financeiro & Precificação"], valor: "R$ 5.000 – R$ 8.000/mês", duracao: "5–6 meses · 1 encontro/semana", roi: "+80–150%" },
];

export function getPlanosByRamo(ramo: Ramo): Plano[] {
  return ramo === "medico" ? PLANOS_MEDICO : PLANOS;
}

export const CLASSIFS: Classif[] = [
  { max: 0.25, label: "🚧 Fundação a Construir", desc: "A base do negócio precisa ser estruturada. Enorme potencial de crescimento." },
  { max: 0.45, label: "⚡ Em Desenvolvimento", desc: "Alguns pilares já funcionam, mas há gargalos críticos travando o crescimento." },
  { max: 0.65, label: "📈 Em Crescimento", desc: "Boa estrutura em áreas-chave. O foco agora é acelerar os pontos de atenção." },
  { max: 0.85, label: "✅ Sólido & Escalável", desc: "Negócio bem estruturado. Hora de escalar com inteligência e consistência." },
  { max: 1.01, label: "🏆 Alta Performance", desc: "Clínica modelo. Foco em autoridade, expansão e novos mercados." },
];

export const PILAR_MAP: Record<string, string> = {
  p01: "marketing_digital",
  p02: "captacao_trafego",
  p03: "atendimento_conversao",
  p04: "financeiro_precificacao",
  p05: "gestao_operacional",
  p06: "relacionamento_retencao",
  p07: "expansao",
};

/* Opções para a tela "Dados do cliente" */
export const OPT_FAT = ["Até R$10k", "R$10–25k", "R$25–50k", "R$50–100k", "R$100k+"];
export const OPT_TIPO_DENT = ["Dentista Autônomo", "Clínica Pequena (1-2 cadeiras)", "Clínica Média (3-5 cadeiras)", "Clínica Grande (5+ cadeiras)"];
export const OPT_TIPO_MED = ["Médico Autônomo", "Consultório Pequeno (1–2 salas)", "Clínica Médica Média", "Clínica Médica Grande"];
export const OPT_FUNC = ["Nenhum (só eu)", "1 funcionário", "2–3 funcionários", "4–6 funcionários", "7–10 funcionários", "10+ funcionários"];
export const OPT_TICKET = ["Até R$500", "R$500–1.500", "R$1.500–4.000", "R$4.000+"];
export const OPT_CADEIRAS = ["1 cadeira", "2–3 cadeiras", "4–5 cadeiras", "+6 cadeiras"];
export const OPT_TEMPO = ["Menos de 1 ano", "1–3 anos", "3–7 anos", "+7 anos"];
export const OPT_PACIENTES = ["Menos de 10", "10–30 pacientes", "30–60 pacientes", "+60 pacientes"];
export const OPT_CONVENIO = ["0% — 100% particular", "Até 30% convênios", "30–60% convênios", "60%+ convênios"];

export const ESPECIALIDADES_DENT = [
  "Clínico Geral", "Ortodontia", "Implantodontia", "Endodontia", "Periodontia",
  "Prótese Dentária", "Estética Dental", "Cirurgia Oral e Maxilofacial",
  "Odontopediatria", "Dentística Restauradora", "Odontogeriatria", "Outra",
];

export const ESPECIALIDADES_MED = [
  "Cardiologia", "Dermatologia", "Ginecologia & Obstetrícia", "Neurologia",
  "Oftalmologia", "Ortopedia & Traumatologia", "Otorrinolaringologia",
  "Pediatria", "Psiquiatria", "Urologia", "Clínica Geral / Medicina de Família",
  "Endocrinologia", "Gastroenterologia", "Reumatologia",
  "Cirurgia Plástica & Estética", "Oncologia", "Outra",
];

/* KPIs Iniciais. Definição declarativa para reuso (form + persistência + dashboard) */
export interface KpiInitField {
  key: keyof KpisIniciais;
  label: string;
  labelMedico?: string;
  type: "money" | "percent";
  benchmarkDent?: string;
  benchmarkMed?: string;
  /** Campo no CSV/dashboard_data */
  campo: string;
  campoMed?: string;
}
export interface KpisIniciais {
  fat?: string;
  meta_fat?: string;
  conversao?: string;
  ticket?: string;
  ocupacao?: string;
  noshow?: string;
  margem?: string;
}
export const KPI_INIT_FIELDS: KpiInitField[] = [
  { key: "fat", label: "Faturamento Atual (R$)", type: "money", campo: "faturamento_bruto" },
  { key: "meta_fat", label: "Meta de Faturamento em 6 meses (R$)", type: "money", campo: "meta_faturamento_6m" },
  { key: "conversao", label: "Taxa de Conversão (%)", labelMedico: "Taxa de Agendamento (%)", type: "percent", benchmarkDent: "55", benchmarkMed: "60", campo: "taxa_conversao", campoMed: "taxa_agendamento" },
  { key: "ticket", label: "Ticket Médio (R$)", type: "money", benchmarkDent: "2000", benchmarkMed: "350", campo: "ticket_medio_rs" },
  { key: "ocupacao", label: "Ocupação de Cadeiras (%)", labelMedico: "Proporção Particular (%)", type: "percent", benchmarkDent: "75", benchmarkMed: "60", campo: "ocupacao_cadeiras", campoMed: "proporcao_particular" },
  { key: "noshow", label: "Taxa de No-show (%)", type: "percent", benchmarkDent: "10", benchmarkMed: "10", campo: "taxa_no_show" },
  { key: "margem", label: "Margem Líquida (%)", type: "percent", benchmarkDent: "20", benchmarkMed: "25", campo: "margem_liquida" },
];
