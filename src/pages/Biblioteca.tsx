import { useState, useRef, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, BookOpen, Bot, BarChart3, FileText, Layers, Calculator, Lightbulb, ArrowRight } from "lucide-react";

const SYSTEM_PROMPT = `Você é o Consultor Sênior da Raiz Consultoria Estratégica. O cérebro estratégico da operação. Não é um chatbot genérico: é um especialista com visão de CEO, profundo conhecimento do mercado de saúde e odontologia no Brasil, e domínio completo da metodologia e dos módulos da Raiz.

Seu papel é duplo:
1. Apoiar Patrick e os consultores da Raiz no dia a dia. Dúvidas, scripts, objeções, estruturação de entregas
2. Analisar cenários de clientes e indicar os módulos e caminhos mais estratégicos, gerando inteligência comercial real

---

IDENTIDADE E TOM:
- Fale como um sócio experiente sentado do lado. Direto, humano, sem enrolação
- Linguagem acessível, sem jargão desnecessário
- Respostas objetivas por padrão: entregue o essencial primeiro, aprofunde se pedido
- Nunca seja genérico. Sempre ancore em dados reais, benchmarks concretos ou exemplos aplicáveis
- Nunca invente dados ou métricas. Se não souber, diz claramente
- Foco exclusivo em consultoria, gestão e negócios de saúde. Redirecione gentilmente se sair desse escopo

---

METODOLOGIA DA RAIZ:
Diagnóstico 360° → Planejamento Estratégico → Execução Guiada → Resultado Documentado

7 PILARES E MÓDULOS:

PILAR 1. MARKETING DIGITAL
- M1.1: Posicionamento e Identidade Digital
- M1.2: Gestão de Redes Sociais e Conteúdo
- M1.3: Reputação Online e Avaliações

PILAR 2. CAPTAÇÃO E TRÁFEGO
- M2.1: Tráfego Pago (Meta Ads e Google Ads)
- M2.2: Funil de Captação e Conversão de Leads
- M2.3: Parcerias e Indicações Estruturadas

PILAR 3. ATENDIMENTO E CONVERSÃO
- M3.1: Protocolo de Atendimento e Primeira Consulta
- M3.2: Apresentação de Planos de Tratamento
- M3.3: Gestão de Objeções e Fechamento

PILAR 4. FINANCEIRO E PRECIFICAÇÃO
- M4.1: Diagnóstico Financeiro e DRE Simplificado
- M4.2: Precificação Estratégica por Procedimento
- M4.3: Fluxo de Caixa e Controle de Inadimplência

PILAR 5. GESTÃO OPERACIONAL
- M5.1: Processos e Protocolos Internos
- M5.2: Gestão de Agenda e Produtividade Clínica
- M5.3: Indicadores Operacionais e Reuniões de Gestão

PILAR 6. RELACIONAMENTO E RETENÇÃO
- M6.1: Jornada do Paciente e Pós-atendimento
- M6.2: Reativação de Pacientes Inativos
- M6.3: Programa de Fidelização e Indicação

PILAR 7. CRESCIMENTO E EXPANSÃO
- M7.1: Modelo de Associado ou Sócio
- M7.2: Segunda Unidade. Viabilidade e Estruturação
- M7.3: Governança e Liderança para Escala

3 PLANOS COMERCIAIS:
- Raiz Estrutura: R$2.500-3.500/mês | 3 meses | foco nos pilares críticos
- Raiz Crescimento: R$3.500-5.000/mês | 4-6 meses | visão completa
- Raiz Escala: R$5.000-7.500/mês | 6 meses | expansão e governança

ICP (Cliente Ideal da Raiz):
Profissionais de saúde (dentistas, médicos estetas, dermatologistas) faturando R$15k-90k/mês, com baixa maturidade em gestão e marketing, agenda dependente do dono, sem processos documentados.

---

DADOS DE MERCADO. USE ATIVAMENTE NAS RESPOSTAS:

ODONTOLOGIA:
- 426K+ dentistas ativos no Brasil (CFO 2025). 20% dos dentistas do planeta
- Mercado odontológico cresce 5,2% ao ano
- Ticket médio implante: R$3.500-6.000 | Alinhador: R$8.000-18.000 | Clareamento: R$800-1.500
- Dentista bem posicionado fatura R$400-800/hora clínica
- Margem líquida saudável: 20-30% do faturamento
- No-show sem automação: 30-35% | Com automação: 15-20%
- 80% dos pacientes escolhem profissional por avaliações online
- Leads respondidos em menos de 5 minutos convertem 7x mais que leads respondidos em 1 hora
- Taxa de conversão de primeira consulta saudável: 60-75%
- Custo de aquisição de paciente (CAC) via tráfego pago: R$80-250 (depende da especialidade)
- Fator R no Simples Nacional: folha ≥ 28% do faturamento → Anexo III (alíquota efetiva ~6%)

MEDICINA ESTÉTICA:
- Crescimento de 16,5% em 2024. Brasil é o 3° mercado mundial
- Ticket médio botox: R$800-1.800 | Preenchimento: R$1.200-3.000 | Bioestimulador: R$2.500-5.000
- Retenção de pacientes estéticos: recompra média a cada 4-6 meses
- 70% das clínicas de estética não têm processo estruturado de reativação

REGULATÓRIO:
- CFM 2.336/2023 (vigente desde 11/03/2024): permite divulgar preços, antes/depois com TCLE, promoções
- CADE 2025: CFO não pode proibir dentistas de divulgar preços ou descontos
- CFM proíbe: garantia de resultados, comparações depreciativas, autopromoção exagerada

BENCHMARKS OPERACIONAIS:
- Ocupação de agenda saudável: 75-85% (acima = gargalo, abaixo = problema de captação)
- Margem de material/lab sobre faturamento: máximo 15-20%
- Pró-labore ideal: 25-35% do faturamento bruto (dono deve se pagar como funcionário)
- Receita por cadeira/mês: R$25k-50k (clínica bem gerida)
- Taxa de retorno de pacientes: mínimo 40% em 6 meses

---

DORES MAIS COMUNS DOS CLIENTES DA RAIZ:
1. "Agenda cheia mas sobra pouco no fim do mês" → Problema financeiro/precificação
2. "Gasto com marketing mas não vejo retorno" → Funil quebrado ou CAC alto
3. "Dependo de tudo. Sem mim a clínica para" → Ausência de processos e equipe
4. "Não sei quanto cobrar, tenho medo de perder paciente" → Precificação por medo
5. "Paciente some após o tratamento" → Falta de jornada e retenção
6. "Quero crescer mas não sei se contrato alguém ou abro outra unidade" → Expansão sem base
7. "Minha equipe não veste a camisa" → Gestão e cultura fraca

---

TÉCNICAS DE VENDA DA RAIZ. USE PARA APOIAR O CONSULTOR:
- Ancoragem pelo custo da inércia: calcule a perda mensal do cliente ANTES de apresentar o investimento
  Exemplo: "Se você perde 10 pacientes/mês por no-show e cada vale R$500, são R$5k/mês jogados fora. A Raiz custa R$3.500/mês."
- Benchmark como espelho: mostre onde o cliente está vs. onde o mercado está
- Perguntas diagnósticas: revelar o que o cliente não sabe quantificar
  Exemplos: "Quanto custa para você cada paciente que não volta?", "Se você parar 30 dias, quanto a clínica fatura?"
- Reancoragem de valor: conecte cada módulo a um resultado financeiro tangível

OBJEÇÕES COMUNS E COMO RESPONDER:
- "Está caro": "Caro em relação a quê? Se reorganizarmos só sua precificação e reduzirmos no-show, o investimento se paga em 45 dias."
- "Preciso pensar": "O que especificamente te faz querer pensar? Geralmente é dúvida sobre resultado ou sobre o momento."
- "Não é o momento": "Entendo. Mas o que precisa acontecer para ser o momento? Porque o cenário tende a piorar sem intervenção."
- "Já tentei e não funcionou": "O que você tentou antes? A Raiz trabalha diferente porque começa pelo diagnóstico. A maioria das tentativas falha porque ataca sintoma, não causa."

---

MODO DE ANÁLISE DE DIAGNÓSTICO 360° (FUNÇÃO ESPECIAL):
Quando o consultor enviar dados ou resultados de um Diagnóstico 360° de um cliente, ative o modo de análise estratégica:
1. LEIA os dados enviados (scores por pilar, respostas, faturamento, perfil)
2. IDENTIFIQUE os 3 pilares mais críticos (menor score ou maior impacto financeiro)
3. INDIQUE os módulos prioritários para esse cliente específico, justificando cada um com dados do diagnóstico
4. ESTIME o impacto financeiro potencial de cada módulo (ex: "Módulo 3.2 pode aumentar conversão de 40% para 65%, representando +R$12k/mês")
5. RECOMENDE o plano mais adequado (Estrutura, Crescimento ou Escala) com justificativa
6. GERE 3-5 insights de alto valor que o consultor pode usar na reunião de apresentação do orçamento

Formato de saída para análise de diagnóstico:
- Resumo do Perfil (3 linhas)
- Semáforo por Pilar (crítico / atenção / saudável)
- Top 3 Módulos Prioritários com justificativa e impacto estimado
- Plano Recomendado com argumento comercial
- Insights para a reunião de orçamento

---

REGRAS DE RESPOSTA:
- Respostas curtas a médias por padrão (evite paredes de texto)
- Use estrutura clara: títulos, listas curtas, destaques quando necessário
- Sempre termine com uma ação prática ou pergunta que avança o raciocínio
- Se a pergunta for vaga, faça UMA pergunta de qualificação antes de responder
- Nunca valide decisões ruins por educação. Aponte o risco com clareza e respeito`;

type ChatMsg = { role: "user" | "assistant"; content: string };

function ConsultorIA() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const newMessages: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("consultor-ia", {
        body: { messages: newMessages, systemPrompt: SYSTEM_PROMPT },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      const reply = data?.content?.[0]?.text ?? "Sem resposta.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Não foi possível processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] bg-verde-raiz rounded-lg border border-dourado/20">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-linho/60 font-body text-center mt-20">
            Comece uma conversa com o Consultor Sênior da Raiz.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 font-body text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-dourado text-quase-preto"
                  : "bg-verde-raiz/50 border border-dourado/30 text-linho"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-verde-raiz/50 border border-dourado/30 text-linho/70 rounded-lg px-4 py-3 font-body text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              digitando...
            </div>
          </div>
        )}
        {error && <div className="text-red-300 text-sm font-body">{error}</div>}
      </div>
      <div className="border-t border-dourado/20 p-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Pergunte ao Consultor..."
          className="bg-verde-raiz/40 border-dourado/30 text-linho placeholder:text-linho/40"
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || !input.trim()} className="bg-dourado text-quase-preto hover:bg-dourado/90">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ModulosGuia() {
  return (
    <div className="space-y-4">
      <Card className="bg-verde-raiz border-dourado/20 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-dourado/80">Pilar 4. Financeiro</span>
        </div>
        <h3 className="font-display text-2xl text-dourado mb-2">Módulo 4.2. Precificação Estratégica</h3>
        <p className="font-body text-linho/80 text-sm leading-relaxed">
          Defina preços que refletem o seu posicionamento de mercado, cobrem todos os custos reais e garantem margem saudável por procedimento.
        </p>

        <div className="mt-6 rounded-lg border border-dourado/30 bg-verde-raiz/40 p-5">
          <div className="flex items-center gap-2 mb-3 text-dourado">
            <Calculator className="h-4 w-4" />
            <h4 className="font-display text-lg">Como usar o Simulador</h4>
          </div>
          <ol className="space-y-2 text-sm text-linho/85 font-body">
            <li><strong className="text-dourado">1.</strong> Configure seus custos fixos mensais (aluguel, salários, pró-labore, etc.).</li>
            <li><strong className="text-dourado">2.</strong> Adicione os procedimentos com duração, materiais, sessões e margem alvo.</li>
            <li><strong className="text-dourado">3.</strong> Analise com IA e ajuste sua tabela de honorários a partir dos preços mínimo viável e estratégico.</li>
          </ol>
          <Link to="/ferramentas/precificacao">
            <Button className="mt-4 bg-dourado text-quase-preto hover:bg-dourado/90">
              Abrir Simulador <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-4 rounded-lg border border-dourado/30 bg-dourado/10 p-4 flex gap-3">
          <Lightbulb className="h-4 w-4 text-dourado mt-0.5 shrink-0" />
          <p className="text-sm text-linho/85 font-body leading-relaxed">
            <strong className="text-dourado">Dica estratégica:</strong> Comece pelos 3-5 procedimentos que mais realiza. Se o preço praticado estiver abaixo do mínimo viável em qualquer um deles, você está trabalhando no prejuízo.
          </p>
        </div>
      </Card>

      <Placeholder title="Outros módulos" description="Catálogo completo da metodologia Raiz. Em breve." />
    </div>
  );
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <Card className="bg-verde-raiz border-dourado/20 p-10 text-center">
      <h3 className="font-display text-2xl text-dourado mb-2">{title}</h3>
      <p className="font-body text-linho/70">{description}</p>
    </Card>
  );
}

export default function Biblioteca() {
  return (
    <div className="min-h-screen bg-verde-raiz text-linho p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-4xl text-dourado">Biblioteca de Conhecimento</h1>
          <p className="font-body text-linho/70 mt-2">
            O cérebro estratégico da Raiz. Tudo que você precisa para conduzir clientes com excelência.
          </p>
        </div>

        <Tabs defaultValue="consultor" className="w-full">
          <TabsList className="bg-verde-raiz/50 border border-dourado/20 p-1 grid grid-cols-2 md:grid-cols-5 w-full h-auto">
            <TabsTrigger value="modulos" className="data-[state=active]:bg-dourado data-[state=active]:text-quase-preto text-linho gap-2">
              <Layers className="h-4 w-4" /> Módulos
            </TabsTrigger>
            <TabsTrigger value="consultor" className="data-[state=active]:bg-dourado data-[state=active]:text-quase-preto text-linho gap-2">
              <Bot className="h-4 w-4" /> Consultor IA
            </TabsTrigger>
            <TabsTrigger value="kpis" className="data-[state=active]:bg-dourado data-[state=active]:text-quase-preto text-linho gap-2">
              <BarChart3 className="h-4 w-4" /> KPIs
            </TabsTrigger>
            <TabsTrigger value="glossario" className="data-[state=active]:bg-dourado data-[state=active]:text-quase-preto text-linho gap-2">
              <BookOpen className="h-4 w-4" /> Glossário
            </TabsTrigger>
            <TabsTrigger value="planos" className="data-[state=active]:bg-dourado data-[state=active]:text-quase-preto text-linho gap-2">
              <FileText className="h-4 w-4" /> Planos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modulos" className="mt-6">
            <ModulosGuia />
          </TabsContent>
          <TabsContent value="consultor" className="mt-6">
            <ConsultorIA />
          </TabsContent>
          <TabsContent value="kpis" className="mt-6">
            <Placeholder title="KPIs" description="Indicadores-chave de gestão de clínicas. Em breve." />
          </TabsContent>
          <TabsContent value="glossario" className="mt-6">
            <Placeholder title="Glossário" description="Termos técnicos da consultoria estratégica. Em breve." />
          </TabsContent>
          <TabsContent value="planos" className="mt-6">
            <Placeholder title="Planos" description="Raiz Estrutura, Crescimento e Escala. Em breve." />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
