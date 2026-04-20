import type { Pilar, Plano, Classif } from "./types";

export const ADMIN_PIN = "raiz360";

export const PILARES: Pilar[] = [
  {
    id: "p01", num: "01", name: "Marketing Digital & Presença", max: 15,
    desc: "Avalia posicionamento, presença digital, consistência de comunicação e capacidade de atrair pacientes pelo ambiente online.",
    questions: [
      { text: "O profissional tem posicionamento claro — sabe para quem fala, o que oferece e por que é diferente dos concorrentes?", labels: ["Nunca pensou nisso", "Pensa nisso, mas não está definido", "Posicionamento básico na cabeça", "Posicionamento estratégico documentado"] },
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
    desc: "Avalia a maturidade do negócio para o próximo salto — segunda unidade, modelo de sócio-operador ou replicação da operação em escala.",
    questions: [
      { text: "Tem clareza sobre quando e como expandir (segunda unidade, sócio ou replicação)?", labels: ["Nunca pensou no assunto", "Quer expandir, mas não sabe como/quando", "Tem ideia do caminho, sem plano", "Plano de expansão estruturado com viabilidade calculada"] },
      { text: "Os processos atuais estão documentados a ponto de serem replicados em outra unidade?", labels: ["Processos não existem formalmente", "Estão na cabeça do dono", "Documentados parcialmente", "Manual completo e replicável testado"] },
      { text: "O faturamento atual tem previsibilidade suficiente para suportar o custo de expansão?", labels: ["Faturamento instável e imprevisível", "Faturamento razoável sem previsibilidade", "Previsibilidade moderada", "Alta previsibilidade com reserva de capital"] },
    ],
  },
];

export const PLANOS: Plano[] = [
  { trigger: (p) => p < 0.35, badge: "FASE 1 — BASE", name: "Raiz de Base", desc: "Para clínicas que precisam construir a fundação do negócio. Estruturamos os pilares críticos — financeiro, atendimento e operação — para destravar o faturamento e criar a base mínima viável de crescimento.", modulos: ["Financeiro & Precificação", "Atendimento & Conversão", "Gestão Operacional", "Posicionamento Digital"], valor: "R$ 2.500 – R$ 3.500/mês", duracao: "3–4 meses · 1 encontro/semana", roi: "+40–80%" },
  { trigger: (p) => p < 0.65, badge: "FASE 1–2 · CRESCIMENTO", name: "Raiz de Crescimento", desc: "Para clínicas com alguma estrutura mas crescimento estagnado. Expandimos captação, marketing e gestão financeira para acelerar o faturamento com previsibilidade e consistência.", modulos: ["Captação & Tráfego", "Marketing Digital", "Atendimento & Conversão", "Financeiro & Precificação", "Gestão Operacional"], valor: "R$ 3.500 – R$ 5.000/mês", duracao: "4–5 meses · 1 encontro/semana", roi: "+60–120%" },
  { trigger: () => true, badge: "FASE 2–3 · ESCALA", name: "Raiz de Expansão", desc: "Para clínicas com base consolidada, prontas para escalar. Foco em retenção de pacientes, gestão de equipe, tecnologia, IA aplicada à clínica e estruturação para crescimento sustentável.", modulos: ["Relacionamento & Retenção", "Gestão de Pessoas", "Tecnologia & IA", "Crescimento & Expansão"], valor: "R$ 5.000 – R$ 7.500/mês", duracao: "5–6+ meses · encontros semanais ou quinzenais", roi: "+80–150%" },
];

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
export const OPT_FAT = ["Até R$ 20k", "R$ 20–50k", "R$ 50–100k", "R$ 100–200k", "R$ 200k+"];
export const OPT_TIPO = ["Dentista Autônomo", "Clínica Pequena", "Clínica Média", "Clínica Grande"];
export const OPT_FUNC = ["Nenhum (só eu)", "1–2 funcionários", "3–5 funcionários", "6+ funcionários"];
export const OPT_TICKET = ["Até R$ 500", "R$ 500–1.500", "R$ 1.500–3.000", "R$ 3.000+"];
export const OPT_CADEIRAS = ["1", "2", "3", "4+"];
export const OPT_TEMPO = ["< 1 ano", "1–3 anos", "3–5 anos", "5+ anos"];
export const OPT_PACIENTES = ["< 50", "50–150", "150–300", "300+"];
