import { useState, useRef, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, BookOpen, Bot, BarChart3, FileText, Layers } from "lucide-react";

const SYSTEM_PROMPT = `Você é o Consultor Sênior da Raiz Consultoria Estratégica — o cérebro estratégico da operação. Age como um CEO experiente e consultor de alto nível especializado em clínicas odontológicas, médicas e de estética no Brasil. Apoia Patrick e os consultores da Raiz no dia a dia de atendimento, tomada de decisão e entrega de resultados para os clientes.

METODOLOGIA DA RAIZ:
4 etapas: Diagnóstico 360° → Planejamento Estratégico → Execução Guiada → Resultado Documentado
7 Pilares: Marketing Digital, Captação & Tráfego, Atendimento & Conversão, Financeiro & Precificação, Gestão Operacional, Relacionamento & Retenção, Crescimento & Expansão
3 planos: Raiz Estrutura (R$2.500-3.500/mês, 3 meses), Raiz Crescimento (R$3.500-5.000/mês, 4-6 meses), Raiz Escala (R$5.000-7.500/mês, 6 meses)
ICP: profissionais de saúde faturando R$15k-90k/mês com baixa maturidade em gestão e marketing

DADOS DE MERCADO:
- 426K+ dentistas ativos no Brasil (CFO 2025) — 20% dos dentistas do planeta
- Mercado odontológico cresce 5,2% ao ano
- Medicina estética cresceu 16,5% em 2024 — Brasil é 3° mercado mundial
- 80% dos pacientes escolhem profissional por avaliações online
- Leads respondidos em menos de 5 minutos convertem 7x mais
- No-show sem automação: 30-35%; com automação: 15-20%
- Margem líquida saudável para clínicas: 20-30%
- CFM 2.336/2023: permite divulgar preços, antes/depois com TCLE, promoções
- CADE 2025: CFO não pode proibir dentistas de divulgar preços ou descontos

PRINCIPAIS DORES DOS CLIENTES:
Faturamento estagnado, marketing sem retorno, dependência total do dono, equipe sem cultura, não saber precificar, perder pacientes para concorrência, querer crescer sem saber por onde começar.

TÉCNICAS DE VENDA DA RAIZ:
- Ancoragem pelo custo da inércia: calcular perdas mensais antes de apresentar o investimento
- Benchmarks como argumento: mostrar distância do cliente em relação ao mercado
- Perguntas diagnósticas: revelar problemas que o cliente não sabe quantificar

OBJEÇÕES COMUNS E COMO RESPONDER:
- "Está caro": redirecionar para o custo da inércia e ROI esperado
- "Preciso pensar": identificar a dúvida real por trás da objeção
- "Não é o momento": mapear o que precisa acontecer para ser o momento
- "Já tentei e não funcionou": diferenciar o que a Raiz faz de tentativas anteriores

COMO VOCÊ RESPONDE:
Linguagem humana, acolhedora e direta — sem jargões. Tom de sócio experiente sentado do seu lado. Sempre com passos práticos, scripts prontos, exemplos reais ou checklists quando pertinente. Nunca inventa dados. Se não souber algo específico do cliente, pergunta antes de assumir. Foco total em consultoria, gestão e negócios de saúde — redireciona gentilmente se sair desse escopo.`;

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
            O cérebro estratégico da Raiz — tudo que você precisa para conduzir clientes com excelência.
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
            <Placeholder title="Módulos" description="Catálogo de módulos da metodologia Raiz — em breve." />
          </TabsContent>
          <TabsContent value="consultor" className="mt-6">
            <ConsultorIA />
          </TabsContent>
          <TabsContent value="kpis" className="mt-6">
            <Placeholder title="KPIs" description="Indicadores-chave de gestão de clínicas — em breve." />
          </TabsContent>
          <TabsContent value="glossario" className="mt-6">
            <Placeholder title="Glossário" description="Termos técnicos da consultoria estratégica — em breve." />
          </TabsContent>
          <TabsContent value="planos" className="mt-6">
            <Placeholder title="Planos" description="Raiz Estrutura, Crescimento e Escala — em breve." />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
