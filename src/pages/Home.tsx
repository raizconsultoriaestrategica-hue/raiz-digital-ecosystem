import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  MessageCircle,
  Check,
  X,
  Instagram,
  Linkedin,
  TrendingUp,
  Target,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import patrickPortrait from "@/assets/patrick-portrait.jpg";

const WHATSAPP_URL = "https://wa.me/5544999993334";

const NAV_LINKS = [
  { label: "O Método", href: "#metodo" },
  { label: "Os 7 Pilares", href: "#diagnostico" },
  { label: "Planos", href: "#planos" },
  { label: "Calculadora", href: "#calculadora" },
];

const PROBLEMAS = [
  { n: "01", t: "Agenda cheia, caixa vazio", d: "Atendimentos acima da capacidade, mas o lucro no final do mês não reflete o esforço. O problema está na precificação e no mix de serviços." },
  { n: "02", t: "Marketing sem retorno mensurável", d: "Você investe em tráfego, em agência, em posts. Mas não consegue rastrear quantos pacientes pagantes isso está gerando. Dinheiro saindo sem métrica." },
  { n: "03", t: "A clínica depende de você para tudo", d: "Você é o dentista, o gerente, o atendente e o financeiro. Sem processos, sem equipe autônoma. A operação para quando você para." },
  { n: "04", t: "Conversão baixa no atendimento", d: "Pacientes chegam, fazem avaliação e somem. A taxa de conversão de orçamentos em tratamentos revela uma falha crítica no processo comercial." },
  { n: "05", t: "Sem previsibilidade financeira", d: "O faturamento oscila mês a mês sem que você saiba exatamente por quê. Sem indicadores, impossível planejar crescimento ou segurança." },
  { n: "06", t: "Crescimento emperrado há meses", d: "Você sabe que a clínica poderia faturar mais, mas não sabe por onde começar. Cada tentativa sozinho gera mais sobrecarga e menos resultado." },
];

const DADOS = [
  { n: "73%", d: "das clínicas fecham em 5 anos por falta de gestão" },
  { n: "R$18k", d: "de faturamento médio deixado na mesa por mês por ineficiência" },
  { n: "40%", d: "dos orçamentos não são convertidos por falta de processo de vendas" },
  { n: "1 em 3", d: "dentistas não sabe sua margem líquida real" },
];

const STATS = [
  { n: "+R$2M", d: "em faturamento gerado com clientes ativos" },
  { n: "7", d: "pilares estratégicos mapeados e trabalhados" },
  { n: "4", d: "etapas do método Raiz de resultado" },
  { n: "100%", d: "foco em clínicas odontológicas" },
];

const ETAPAS = [
  { n: "01", t: "Diagnóstico 360°", d: "Mapeamento completo dos 7 pilares da clínica. Você sai com um raio-x real do negócio." },
  { n: "02", t: "Planejamento Estratégico", d: "Plano de ação com prioridades, prazos, metas financeiras e responsáveis. Sem achismo, com dados." },
  { n: "03", t: "Execução Guiada", d: "Acompanhamos cada etapa da implementação ao lado do seu time. Não entregamos um documento e sumimos." },
  { n: "04", t: "Resultado Mensurável", d: "Cada ação gera uma métrica. O crescimento é rastreado mês a mês. Você vê o resultado em números." },
];

const PILARES = [
  { n: "01", t: "Marketing Digital", d: "Presença, posicionamento e autoridade online. Do Google ao Instagram." },
  { n: "02", t: "Captação & Tráfego", d: "Funil de aquisição de pacientes e custo por lead qualificado." },
  { n: "03", t: "Atendimento & Conversão", d: "Processos de recepção, orçamento e conversão de tratamentos." },
  { n: "04", t: "Financeiro & Precificação", d: "Margens reais, ponto de equilíbrio e precificação estratégica." },
  { n: "05", t: "Gestão Operacional", d: "Processos, indicadores e autonomia da equipe sem depender do dono." },
  { n: "06", t: "Relacionamento & Retenção", d: "LTV do paciente, reativação, NPS e fidelização ativa." },
  { n: "07", t: "Crescimento & Expansão", d: "Estratégia de escala: novas especialidades, segunda unidade, franquia ou sociedade. Crescimento com estrutura." },
];

const PARA_VOCE = [
  "Fatura entre R$15k e R$60k/mês e quer crescer",
  "Está disposto a implementar processos e abrir o financeiro",
  "Quer parar de ser o gargalo da própria operação",
  "Investe em marketing mas não mede o retorno",
  "Quer decisões com dados, não com intuição",
  "Está comprometido a dedicar tempo à execução",
];

const NAO_VOCE = [
  "Quer resultado sem mudar nada",
  "Não quer envolver a equipe no processo",
  "Busca solução de curto prazo sem comprometimento",
  "Não abre os indicadores financeiros da clínica",
  "Acredita que o único problema é falta de pacientes novos",
];

const PLANOS = [
  { nome: "PLANO RAIZ", preco: "Sob consulta", contrato: "Contrato trimestral mínimo", sub: "Para clínicas em estruturação (R$15k–R$30k/mês)", itens: ["Diagnóstico 360° completo","Plano de ação 90 dias","2 reuniões mensais","Dashboards de KPI","Suporte WhatsApp dias úteis"], cta: "Falar sobre o Plano Raiz", destaque: false },
  { nome: "PLANO CRESCIMENTO", preco: "Sob consulta", contrato: "Contrato semestral", sub: "Para clínicas em aceleração (R$30k–R$60k/mês)", itens: ["Tudo do Plano Raiz + 4 reuniões + visita presencial trimestral","Marketing, comercial e financeiro em paralelo","Treinamento de equipe (recepção e vendas)","Reestruturação de precificação e mix","Suporte prioritário"], cta: "Falar sobre o Plano Crescimento", destaque: true },
  { nome: "PLANO EXPANSÃO", preco: "Sob consulta", contrato: "Contrato anual", sub: "Para clínicas prontas para escalar (acima de R$60k/mês)", itens: ["Tudo do Plano Crescimento + Atuação semanal com Patrick como sócio estratégico","Estratégia de escala e expansão de unidades","Estruturação societária","Rede de parceiros da Raiz","Consultoria presencial sob demanda"], cta: "Falar sobre o Plano Expansão", destaque: false },
];

const FAQ = [
  { q: "Quanto tempo leva para ver os primeiros resultados?", a: "Os primeiros resultados aparecem entre 30 e 60 dias. Ajustes de precificação e conversão tendem a gerar retorno mais rápido. Resultados estruturais levam de 3 a 6 meses." },
  { q: "Preciso abrir o financeiro da clínica?", a: "Sim. Sem os números reais da clínica, como faturamento, ticket médio e inadimplência, não tem como identificar onde o dinheiro está vazando. Tudo o que você compartilhar fica restrito à consultoria." },
  { q: "O Diagnóstico 360° tem compromisso de contratação?", a: "Não. É uma sessão de análise sem compromisso nenhum. Você recebe o relatório completo e o plano de ação. Depois, você decide se quer a Raiz do seu lado ou prefere tocar por conta própria." },
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/* ---------- Reveal on scroll ---------- */
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ---------- NAV ---------- */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "bg-verde-raiz/95 backdrop-blur shadow-soft" : "bg-transparent"}`}>
      <div className="container mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <a href="#topo" className="font-display text-xl text-linho md:text-2xl">
          Raiz <span className="font-body text-xs uppercase tracking-[0.22em] text-linho/60">Consultoria Estratégica</span>
        </a>
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="font-body text-sm text-linho/80 transition-colors hover:text-dourado">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild className="hidden bg-dourado text-marrom-raiz hover:bg-dourado/90 md:inline-flex">
            <Link to="/login">Acessar Plataforma</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-linho lg:hidden" aria-label="Abrir menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-verde-raiz border-verde-raiz">
              <nav className="mt-12 flex flex-col gap-6">
                {NAV_LINKS.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="font-display text-2xl text-linho hover:text-dourado">
                    {l.label}
                  </a>
                ))}
                <Button asChild className="mt-6 bg-dourado text-marrom-raiz hover:bg-dourado/90">
                  <Link to="/login">Acessar Plataforma</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

/* ---------- HERO 2 colunas com gradiente radial ---------- */
function Hero() {
  return (
    <section
      id="topo"
      className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28"
      style={{
        background:
          "radial-gradient(circle at 85% 30%, rgba(201,168,76,0.18) 0%, transparent 50%), linear-gradient(135deg, hsl(var(--primary)) 0%, #14302a 100%)",
      }}
    >
      <div className="container mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-5">
          {/* Coluna esquerda 60% */}
          <div className="lg:col-span-3">
            <span className="inline-block rounded-full bg-dourado/20 px-4 py-1.5 font-body text-xs uppercase tracking-[0.22em] text-dourado">
              Consultoria Estratégica para Odontologia
            </span>
            <h1
              className="mt-8 font-display font-medium leading-[1.05] text-linho"
              style={{ fontSize: "clamp(2.25rem, 5.5vw, 4.5rem)" }}
            >
              Sua agenda está cheia. Seu faturamento está travado.{" "}
              <em className="text-dourado not-italic">A gente sabe exatamente por quê.</em>
            </h1>
            <p className="mt-8 max-w-2xl font-body font-light text-lg leading-relaxed text-linho/75 md:text-xl">
              Diagnóstico personalizado, plano sob medida, execução guiada. Resultado mensurável. Transforme sua clínica num negócio lucrativo e previsível.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="bg-dourado px-8 py-6 text-marrom-raiz hover:bg-dourado/90">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Agendar Diagnóstico 360°</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-linho/30 bg-transparent px-8 py-6 text-linho hover:bg-linho/10 hover:text-linho">
                <a href="#metodo">Ver o Método</a>
              </Button>
            </div>
            <p className="mt-8 font-body font-light text-sm text-linho/60">
              14+ anos em marketing, vendas, tecnologia e operações, aplicados ao setor de saúde
            </p>
            <div className="mt-6 inline-block rounded-md border border-amber-400/40 bg-amber-500/20 px-4 py-2 font-body text-sm text-amber-300">
              ⏰ Vagas limitadas para Abril/2026: apenas 4 vagas disponíveis neste ciclo.
            </div>
          </div>

          {/* Coluna direita 40% */}
          <div className="flex justify-center lg:col-span-2 lg:justify-end">
            <div className="relative">
              <div className="relative aspect-[3/4] w-64 overflow-hidden rounded-2xl border-2 border-dourado/60 shadow-editorial md:w-80">
                <img
                  src={patrickPortrait}
                  alt="Patrick Ferreira, fundador e estrategista da Raiz Consultoria"
                  width={768}
                  height={1024}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-quase-preto/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="font-display text-xl text-linho">Patrick Ferreira</div>
                  <div className="font-body text-xs uppercase tracking-[0.18em] text-dourado">Fundador & Estrategista</div>
                </div>
              </div>
              <span className="absolute -bottom-3 -left-3 rounded-full bg-dourado px-4 py-2 font-body text-xs font-semibold uppercase tracking-wider text-marrom-raiz shadow-lg">
                14+ anos
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- STATS BAR ---------- */
function StatsBar() {
  return (
    <section className="border-y border-dourado/20 bg-verde-raiz">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 divide-y divide-dourado/15 md:grid-cols-4 md:divide-x md:divide-y-0">
          {STATS.map((s, i) => (
            <div
              key={i}
              className={`px-4 py-8 text-center md:py-10 ${i % 2 === 1 ? "border-l border-dourado/15 md:border-l-0" : ""}`}
            >
              <div className="font-display text-4xl text-dourado md:text-5xl">{s.n}</div>
              <div className="mx-auto mt-3 max-w-[200px] font-body font-light text-sm leading-snug text-linho/75">
                {s.d}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- PROBLEMA ---------- */
function Problema() {
  return (
    <section id="problema" className="bg-off-white py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
            A realidade que ninguém quer ver
          </span>
          <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
            Você trabalha mais do que nunca.
            <br />
            E o resultado não cresce no mesmo ritmo.
          </h2>
          <p className="mt-6 max-w-3xl font-body font-light text-lg text-quase-preto/70">
            Isso não é falta de esforço. É um problema de estrutura. Existe uma causa raiz identificável para isso.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {PROBLEMAS.map((p) => (
              <article
                key={p.n}
                className="group relative overflow-hidden rounded-xl border border-border bg-linho p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-editorial"
              >
                <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 rounded-t-xl bg-dourado transition-transform duration-300 group-hover:scale-x-100" />
                <div className="font-display text-3xl text-dourado">{p.n}</div>
                <h3 className="mt-3 font-display text-2xl text-verde-raiz">{p.t}</h3>
                <p className="mt-3 font-body font-light text-base leading-relaxed text-quase-preto/75">{p.d}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- DADOS ---------- */
function Dados() {
  return (
    <section className="bg-marrom-raiz py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-dourado">
            Os números que ninguém te conta
          </span>
          <h2 className="mt-4 max-w-3xl font-display text-4xl text-linho md:text-5xl">
            O setor odontológico em dados
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {DADOS.map((d, i) => (
              <div
                key={i}
                className="rounded-r-xl border-l-4 border-dourado bg-quase-preto/40 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-quase-preto/60"
              >
                <div className="font-display text-5xl text-dourado md:text-6xl">{d.n}</div>
                <p className="mt-4 font-body font-light text-sm leading-relaxed text-linho/75">{d.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- DIFERENCIAL ---------- */
function Diferencial() {
  return (
    <section className="bg-verde-raiz py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="max-w-4xl font-display text-3xl text-linho md:text-5xl">
            Agência te vende post. Curso te vende método.{" "}
            <em className="text-dourado not-italic">A Raiz senta do seu lado e constrói junto.</em>
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-14 grid gap-4 md:grid-cols-4 md:gap-0">
            {/* Header column - Critério */}
            <div className="hidden flex-col md:flex">
              <div className="h-20" />
              <div className="flex-1 space-y-px">
                {["Entrega", "Presença", "Resultado"].map((c) => (
                  <div
                    key={c}
                    className="flex h-24 items-center px-6 font-body text-sm font-semibold uppercase tracking-wider text-linho/60"
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>

            {/* Agência */}
            <ComparisonCol
              title="Agência"
              icon={<X className="h-6 w-6 text-red-400" />}
              items={["Material e relatório", "Gestão remota", "Relatório de alcance"]}
              dim
            />
            {/* Curso */}
            <ComparisonCol
              title="Curso"
              icon={<X className="h-6 w-6 text-red-400" />}
              items={["Conteúdo e método", "Assíncrona, gravada", "Certificado de conclusão"]}
              dim
            />
            {/* Raiz */}
            <ComparisonCol
              title="Raiz Consultoria"
              icon={<Check className="h-6 w-6 text-dourado" />}
              items={[
                "Execução guiada junto com você",
                "Na operação, todo mês",
                "Meta rastreada mês a mês",
              ]}
              highlight
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ComparisonCol({
  title,
  icon,
  items,
  highlight,
  dim,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-px transition-all duration-300 ${
        highlight
          ? "border-2 border-dourado bg-verde-raiz shadow-editorial md:scale-105"
          : "border border-linho/10"
      } ${dim ? "opacity-70 hover:opacity-100" : ""}`}
    >
      <div className={`rounded-[10px] ${highlight ? "bg-verde-raiz" : "bg-verde-raiz/40"}`}>
        <div
          className={`flex h-20 items-center justify-center gap-3 border-b ${
            highlight ? "border-dourado/40" : "border-linho/10"
          }`}
        >
          {icon}
          <span
            className={`font-display text-lg ${
              highlight ? "text-dourado" : "text-linho/70"
            }`}
          >
            {title}
          </span>
        </div>
        {items.map((it, i) => (
          <div
            key={i}
            className={`flex h-24 items-center px-6 font-body text-sm transition-colors hover:bg-linho/5 ${
              highlight ? "text-linho" : "font-light text-linho/70"
            } ${i < items.length - 1 ? "border-b border-linho/10" : ""}`}
          >
            <span className="font-body text-xs uppercase tracking-wider text-linho/40 md:hidden">
              {["Entrega: ", "Presença: ", "Resultado: "][i]}
            </span>
            <span>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- FOUNDER ---------- */
function Founder() {
  return (
    <section id="founder" className="bg-off-white py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
            Quem está do seu lado
          </span>
        </Reveal>

        <div className="mt-6 grid items-center gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <h2 className="font-display text-4xl text-verde-raiz md:text-5xl">
              Patrick Ferreira:{" "}
              <em className="text-dourado not-italic">
                o estrategista que entende de negócio tanto quanto você entende de clínica.
              </em>
            </h2>
            <p className="mt-6 font-body font-light text-lg leading-relaxed text-quase-preto/75">
              14+ anos de atuação em marketing, vendas, tecnologia e operações. Especializado em diagnosticar e estruturar clínicas odontológicas que querem crescer com consistência, não com sorte.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {["14+ anos", "100+ clínicas", "R$2M+ gerados"].map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-verde-raiz/20 bg-linho px-4 py-2 font-body text-sm font-semibold text-verde-raiz"
                >
                  {p}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal className="lg:col-span-5" delay={120}>
            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border border-dourado/30 shadow-editorial">
              <img
                src={patrickPortrait}
                alt="Patrick Ferreira, fundador e estrategista da Raiz Consultoria"
                width={768}
                height={1024}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-quase-preto/85 via-quase-preto/30 to-transparent p-6">
                <span className="rounded-full bg-dourado px-4 py-1.5 font-body text-xs font-semibold uppercase tracking-wider text-marrom-raiz">
                  Fundador & Estrategista
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- METODO ---------- */
function Metodo() {
  return (
    <section id="metodo" className="bg-linho py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
            Como funciona
          </span>
          <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">O Método Raiz em 4 etapas</h2>
          <p className="mt-6 max-w-3xl font-body font-light text-lg text-quase-preto/70">
            Cada etapa tem uma entrega clara, um responsável definido e uma métrica para acompanhar o avanço.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-14 grid gap-6 md:grid-cols-4">
            <div className="absolute left-0 right-0 top-12 hidden h-px bg-dourado/30 md:block" />
            {ETAPAS.map((e) => (
              <article key={e.n} className="relative rounded-xl border border-border bg-off-white p-6 shadow-soft">
                <div className="relative z-10 mx-auto -mt-12 flex h-14 w-14 items-center justify-center rounded-full bg-verde-raiz font-display text-xl text-dourado shadow-editorial">
                  {e.n}
                </div>
                <h3 className="mt-4 text-center font-display text-xl text-verde-raiz">{e.t}</h3>
                <p className="mt-3 text-center font-body font-light text-sm leading-relaxed text-quase-preto/70">{e.d}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 7 PILARES ---------- */
function SeteP() {
  return (
    <section id="diagnostico" className="bg-verde-raiz py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-dourado">Diagnóstico 360°</span>
          <h2 className="mt-4 font-display text-4xl text-linho md:text-5xl">
            Os 7 pilares que determinam o crescimento da sua clínica
          </h2>
          <p className="mt-6 max-w-3xl font-body font-light text-lg text-linho/75">
            Ignorar qualquer um desses pilares é como tentar encher um balde furado. O Diagnóstico 360° avalia todos com profundidade. Você recebe um plano de ação para cada um.
          </p>

          <ul className="mt-8 grid max-w-3xl gap-3 md:grid-cols-2">
            {[
              "Avaliação completa dos 7 pilares em sessão estruturada de 2 a 3 horas",
              "Relatório com pontuação por pilar e priorização de oportunidades",
              "Plano de ação personalizado para os próximos 90 dias",
              "Sem compromisso de contratação. Você decide o próximo passo",
            ].map((b) => (
              <li key={b} className="flex items-start gap-3 font-body font-light text-linho/85">
                <Check className="mt-1 h-5 w-5 flex-shrink-0 text-dourado" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Button asChild size="lg" className="bg-dourado px-8 py-6 text-marrom-raiz hover:bg-dourado/90">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Agendar meu Diagnóstico</a>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PILARES.map((p) => (
              <article
                key={p.n}
                className="group relative overflow-hidden rounded-xl border border-dourado/20 bg-verde-raiz p-6 transition-all duration-300 hover:-translate-y-1 hover:border-dourado hover:shadow-md"
              >
                <span
                  className="pointer-events-none absolute -bottom-6 -right-2 select-none font-display leading-none text-dourado/15"
                  style={{ fontSize: "8rem" }}
                  aria-hidden
                >
                  {p.n}
                </span>
                <div className="relative font-body text-xs font-semibold uppercase tracking-[0.22em] text-dourado">
                  Pilar {p.n}
                </div>
                <h3 className="relative mt-2 font-display text-2xl text-linho">{p.t}</h3>
                <p className="relative mt-3 font-body font-light text-sm leading-relaxed text-linho/70">{p.d}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- RESULTADOS ---------- */
function Resultados() {
  const antes = [
    "Faturamento R$18k–R$22k/mês",
    "Conversão menor que 30%",
    "Dono em 100% das decisões",
    "Marketing sem ROI",
    "Equipe sem autonomia",
  ];
  const depois = [
    "Faturamento escalado para R$52k/mês",
    "Conversão 68% com script novo",
    "Equipe autônoma com KPIs",
    "CAC rastreado, custo caiu 40%",
    "Dentista-dono com 2 dias livres por semana",
  ];

  return (
    <section className="bg-off-white py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
            Resultados reais
          </span>
          <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
            O que muda quando a estrutura está certa
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 grid gap-6 md:grid-cols-2 md:items-stretch">
            <div className="flex flex-col rounded-xl border border-red-900/30 bg-red-950/10 p-8">
              <div className="font-body text-xs font-semibold uppercase tracking-wider text-red-900/80">Antes</div>
              <ul className="mt-5 flex-1 space-y-4 font-body font-light text-quase-preto/80">
                {antes.map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <X className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-700" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col rounded-xl border border-dourado/40 bg-verde-raiz p-8 shadow-editorial">
              <div className="font-body text-xs font-semibold uppercase tracking-wider text-dourado">Após 6 meses</div>
              <ul className="mt-5 flex-1 space-y-4 font-body font-light text-linho/85">
                {depois.map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-dourado" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className="relative mt-12 overflow-hidden rounded-xl border-l-4 border-dourado bg-marrom-raiz p-10 shadow-editorial md:p-12">
            <span className="absolute -left-2 top-2 font-display leading-none text-dourado/15 select-none" style={{ fontSize: "10rem" }} aria-hidden>
              "
            </span>
            <div className="relative grid items-center gap-8 md:grid-cols-3">
              <div className="md:col-span-1">
                <div className="font-display text-dourado" style={{ fontSize: "clamp(3.5rem, 7vw, 4.5rem)", lineHeight: 1 }}>
                  3×
                </div>
                <div className="mt-2 font-body text-sm uppercase tracking-wider text-dourado/80">faturamento</div>
              </div>
              <div className="md:col-span-2">
                <p className="font-display text-2xl italic leading-snug text-linho md:text-3xl">
                  "Em 4 meses, a Raiz identificou onde eu estava perdendo dinheiro sem saber. Reestruturamos o atendimento, ajustamos a precificação e o faturamento cresceu 3 vezes com a mesma quantidade de pacientes."
                </p>
                <div className="mt-6 font-body text-sm text-linho/70">
                  Dra. Anna Krause · Especialista em Facetas de Resina · Sinop, MT
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- QUALIFICACAO ---------- */
function Qualificacao() {
  return (
    <section className="bg-verde-menta py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
            A Raiz é para você?
          </span>
          <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
            Trabalhamos com quem está pronto para sair do lugar
          </h2>
          <p className="mt-6 max-w-3xl font-body font-light text-lg text-quase-preto/75">
            Não atendemos todo mundo. Isso é intencional.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border-2 border-verde-raiz/30 bg-off-white p-8">
              <h3 className="font-display text-2xl text-verde-raiz">✅ A Raiz é para você se...</h3>
              <ul className="mt-5 space-y-3">
                {PARA_VOCE.map((i) => (
                  <li key={i} className="flex items-start gap-3 font-body font-light text-quase-preto/80">
                    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-verde-raiz" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border-2 border-marrom-raiz/20 bg-off-white/60 p-8">
              <h3 className="font-display text-2xl text-marrom-raiz">❌ Não é para você se...</h3>
              <ul className="mt-5 space-y-3">
                {NAO_VOCE.map((i) => (
                  <li key={i} className="flex items-start gap-3 font-body font-light text-quase-preto/80">
                    <X className="mt-1 h-5 w-5 flex-shrink-0 text-marrom-raiz" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10">
            <Button asChild size="lg" className="bg-verde-raiz px-8 py-6 text-linho hover:bg-verde-musgo">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Falar com Especialista</a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- PLANOS ---------- */
function Planos() {
  return (
    <section id="planos" className="bg-off-white py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/15 p-5 text-amber-800">
            <p className="font-body text-sm md:text-base">
              ⏰ <strong>Vagas limitadas para novas clínicas em Abril/2026</strong> — Apenas 4 vagas disponíveis neste ciclo.{" "}
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-amber-900">
                Garantir minha vaga →
              </a>
            </p>
          </div>

          <div className="mt-12">
            <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
              Planos de consultoria
            </span>
            <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
              Escolha o nível de parceria ideal para sua clínica
            </h2>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-14 grid gap-6 md:grid-cols-3 md:items-stretch">
            {PLANOS.map((p) => (
              <article
                key={p.nome}
                className={`relative flex flex-col rounded-xl border bg-linho p-8 transition-all ${
                  p.destaque ? "border-2 border-dourado shadow-editorial md:-translate-y-2" : "border-border shadow-soft"
                }`}
              >
                {p.destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-dourado px-4 py-1 font-body text-xs font-semibold uppercase tracking-wider text-marrom-raiz">
                    Mais escolhido
                  </span>
                )}
                <div className="font-body text-xs font-semibold uppercase tracking-[0.22em] text-verde-raiz">
                  {p.nome}
                </div>
                <div className="mt-4 font-display text-2xl text-verde-raiz">{p.preco}</div>
                <div className="mt-1 font-body text-sm text-quase-preto/60">{p.contrato}</div>
                <p className="mt-4 font-body font-light text-sm text-quase-preto/75">{p.sub}</p>

                <ul className="mt-6 flex-1 space-y-3">
                  {p.itens.map((i) => (
                    <li key={i} className="flex items-start gap-2 font-body font-light text-sm text-quase-preto/80">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-verde-raiz" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={`mt-8 w-full ${
                    p.destaque
                      ? "bg-dourado text-marrom-raiz hover:bg-dourado/90"
                      : "bg-verde-raiz text-linho hover:bg-verde-musgo"
                  }`}
                >
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">{p.cta}</a>
                </Button>
              </article>
            ))}
          </div>

          <p className="mt-8 text-center font-body font-light text-sm text-muted-foreground">
            Os valores variam conforme o porte e a complexidade da clínica.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- CALCULADORA ---------- */
const BENCH_CONV = 60;
const BENCH_RET = 65;

function Calculadora() {
  const [fat, setFat] = useState(40000);
  const [conv, setConv] = useState(30);
  const [ticket, setTicket] = useState(450);
  const [ret, setRet] = useState(35);

  const pacientesMes = ticket > 0 ? fat / ticket : 0;

  let perdaConv = 0;
  if (conv < BENCH_CONV && conv > 0) {
    const leadsTotal = pacientesMes / (conv / 100);
    const fatBench = leadsTotal * (BENCH_CONV / 100) * ticket;
    perdaConv = Math.max(0, Math.min(fatBench - fat, fat * 2));
  }
  const ganhoTicket = fat * 0.2;

  let perdaRet = 0;
  if (ret < BENCH_RET) {
    const pacientesPerdidos = pacientesMes * ((BENCH_RET - ret) / 100);
    perdaRet = Math.min(pacientesPerdidos * ticket * 0.5, fat * 0.6);
  }

  const totalMensal = perdaConv + ganhoTicket + perdaRet;
  const totalAnual = totalMensal * 12;

  let gaps = 0;
  if (conv < 40) gaps += 2; else if (conv < 60) gaps += 1;
  if (ret < 45) gaps += 2; else if (ret < 65) gaps += 1;
  if (ticket < 350) gaps += 1;

  const scoreLabel = gaps >= 4 ? "Alto potencial de melhoria" : gaps >= 2 ? "Em desenvolvimento" : "Acima da média";
  const scoreClass =
    gaps >= 4 ? "bg-red-100 text-red-800" : gaps >= 2 ? "bg-amber-100 text-amber-800" : "bg-verde-menta text-verde-raiz";

  return (
    <section id="calculadora" className="bg-[#0D2218] py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="font-display text-4xl text-dourado md:text-5xl">Calculadora de Receita Invisível</h2>
          <p className="mt-3 font-body font-light italic text-lg text-linho/70">
            Descubra quanto você pode estar deixando na mesa
          </p>
          <p className="mt-3 max-w-3xl font-body font-light text-base text-linho/60">
            Ajuste os valores para refletir a realidade da sua clínica. Os resultados aparecem em tempo real.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Sliders */}
            <div className="space-y-8 rounded-xl border border-dourado/20 bg-[#1a3a26] p-8">
              <SliderField label="Faturamento mensal atual" value={fmtBRL(fat)} min={15000} max={200000} step={2000} v={fat} onChange={setFat} />
              <SliderField label="Taxa de conversão de orçamentos" value={`${conv}%`} min={10} max={80} step={5} v={conv} onChange={setConv} progress={{ now: conv, target: 60, label: "Meta: 60%" }} />
              <SliderField label="Ticket médio por procedimento" value={fmtBRL(ticket)} min={150} max={8000} step={50} v={ticket} onChange={setTicket} />
              <SliderField label="Pacientes que retornam em 6 meses" value={`${ret}%`} min={10} max={80} step={5} v={ret} onChange={setRet} progress={{ now: ret, target: 65, label: "Meta: 65%" }} />
            </div>

            {/* Resultados */}
            <div className="rounded-xl border border-dourado/30 bg-[#1a3a26] p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-2xl text-linho">Diagnóstico da sua clínica</h3>
                <span className={`rounded-full px-3 py-1 font-body text-xs font-semibold ${scoreClass}`}>{scoreLabel}</span>
              </div>

              <div className="mt-6 space-y-4">
                <MetricCard
                  Icon={TrendingUp}
                  title="Perda por conversão abaixo da meta"
                  value={
                    conv >= BENCH_CONV ? (
                      <span className="text-verde-menta">Acima da meta ✓</span>
                    ) : (
                      <span className="text-red-400">{fmtBRL(perdaConv)}/mês</span>
                    )
                  }
                />
                <MetricCard
                  Icon={Target}
                  title="Potencial com ticket 20% maior"
                  value={<span className="text-verde-menta">{fmtBRL(ganhoTicket)}/mês</span>}
                />
                <MetricCard
                  Icon={RefreshCw}
                  title="Perda por baixa retenção de pacientes"
                  value={
                    ret >= BENCH_RET ? (
                      <span className="text-verde-menta">Acima da meta ✓</span>
                    ) : (
                      <span className="text-red-400">{fmtBRL(perdaRet)}/mês</span>
                    )
                  }
                />

                <div className="relative overflow-hidden rounded-lg border border-dourado/40 bg-[#0D2218] p-6">
                  <Sparkles className="pointer-events-none absolute -right-4 -bottom-4 h-32 w-32 text-dourado/10" aria-hidden />
                  <div className="relative flex items-center gap-2 font-body text-sm text-linho/70">
                    <span>🎯</span> Receita invisível total
                  </div>
                  <div
                    className="relative mt-3 font-display leading-none text-dourado"
                    style={{ fontSize: "clamp(2.25rem, 5vw, 3rem)" }}
                  >
                    {fmtBRL(totalMensal)}
                    <span className="font-body text-base font-light text-linho/60">/mês</span>
                  </div>
                  <div className="relative mt-2 font-display text-xl text-linho/85">
                    {fmtBRL(totalAnual)}<span className="font-body text-sm font-light text-linho/60">/ano</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <p className="mt-8 font-body font-light text-sm text-linho/40">
          * Dados baseados em clínicas odontológicas estruturadas: 60% de conversão e 65% de retenção. Resultados individuais variam.
        </p>
      </div>
    </section>
  );
}

function SliderField({
  label, value, min, max, step, v, onChange, progress,
}: {
  label: string; value: string; min: number; max: number; step: number; v: number;
  onChange: (n: number) => void;
  progress?: { now: number; target: number; label: string };
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="font-body text-sm text-linho/80">{label}</label>
        <span className="font-display text-xl text-dourado">{value}</span>
      </div>
      <Slider
        value={[v]}
        min={min}
        max={max}
        step={step}
        onValueChange={(vals) => onChange(vals[0])}
        className="[&_[role=slider]]:border-dourado [&_[role=slider]]:bg-dourado [&_[role=slider]]:shadow-md [&>span:first-child]:bg-linho/15 [&>span:first-child>span]:bg-dourado"
      />
      {progress && (
        <div className="mt-3">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-linho/10">
            <div className="h-full bg-dourado transition-all" style={{ width: `${Math.min(100, (progress.now / progress.target) * 100)}%` }} />
            <div className="absolute top-0 h-full w-0.5 bg-verde-menta" style={{ left: `${(progress.target / max) * 100}%` }} />
          </div>
          <div className="mt-1 font-body text-xs text-linho/50">{progress.label}</div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ Icon, title, value }: { Icon: React.ElementType; title: string; value: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-linho/10 bg-[#0D2218]/60 p-4">
      <Icon className="pointer-events-none absolute -right-3 -bottom-3 h-20 w-20 text-dourado/10" aria-hidden />
      <div className="relative flex items-center gap-2 font-body text-sm text-linho/70">
        <Icon className="h-4 w-4 text-dourado/70" />
        <span>{title}</span>
      </div>
      <div className="relative mt-2 font-display text-xl">{value}</div>
    </div>
  );
}

/* ---------- FAQ ---------- */
function Faq() {
  return (
    <section className="bg-off-white py-20 md:py-28">
      <div className="container mx-auto max-w-3xl px-6">
        <Reveal>
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
            Perguntas frequentes
          </span>
          <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
            O que você precisa saber antes de começar
          </h2>

          <Accordion type="single" collapsible className="mt-10">
            {FAQ.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left font-display text-xl text-verde-raiz hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="font-body font-light text-base leading-relaxed text-quase-preto/75">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- CTA FINAL ---------- */
function CtaFinal() {
  return (
    <section className="bg-verde-raiz py-20 md:py-28">
      <div className="container mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <span className="inline-block rounded-full bg-dourado/20 px-4 py-1.5 font-body text-xs uppercase tracking-[0.22em] text-dourado">
            O próximo passo é simples
          </span>
          <h2 className="mt-6 font-display text-4xl text-linho md:text-5xl">
            Chega de crescer no improviso. <em className="text-dourado not-italic">A Raiz entra na sua clínica com você.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-body font-light text-lg text-linho/75">
            Agende seu Diagnóstico 360°: uma sessão estruturada, sem compromisso de contratação. Você sai sabendo exatamente onde estão os gargalos e o que fazer nos próximos 90 dias.
          </p>
          <div className="mt-10">
            <Button asChild className="h-auto bg-dourado px-10 py-4 text-lg text-marrom-raiz hover:bg-dourado/90">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Agendar Diagnóstico 360°</a>
            </Button>
          </div>
          <p className="mt-6 font-body font-light text-sm text-linho/50">
            Sem compromisso de contratação · Vagas limitadas · Resposta em até 24h
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- FOOTER ---------- */
function HomeFooter() {
  return (
    <footer className="bg-quase-preto py-16">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <div className="font-display text-2xl text-linho">Raiz Consultoria Estratégica</div>
            <p className="mt-4 max-w-sm font-body font-light text-sm leading-relaxed text-linho/50">
              Consultoria estratégica especializada em clínicas odontológicas e profissionais de saúde. Estruturada, direta e focada em resultado mensurável.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a href="https://instagram.com/consult.raiz" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-linho/60 transition-colors hover:text-dourado">
                <Instagram className="h-5 w-5" />
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-linho/60 transition-colors hover:text-dourado">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-linho/60 transition-colors hover:text-dourado">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <div className="font-body text-xs font-semibold uppercase tracking-[0.22em] text-dourado">Navegação</div>
            <ul className="mt-4 space-y-2 font-body font-light text-sm text-linho/60">
              <li><a href="#problema" className="hover:text-linho">O Diagnóstico</a></li>
              <li><a href="#founder" className="hover:text-linho">Quem é Patrick</a></li>
              <li><a href="#metodo" className="hover:text-linho">O Método</a></li>
              <li><a href="#diagnostico" className="hover:text-linho">Diagnóstico 360°</a></li>
              <li><a href="#planos" className="hover:text-linho">Planos</a></li>
              <li><a href="#faq" className="hover:text-linho">Perguntas frequentes</a></li>
            </ul>
          </div>

          <div>
            <div className="font-body text-xs font-semibold uppercase tracking-[0.22em] text-dourado">Contato</div>
            <p className="mt-4 font-body font-light text-sm leading-relaxed text-linho/60">
              (44) 99999-3334<br />@consult.raiz<br />Maringá, Paraná — Atendimento em todo o Brasil
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-linho/10 pt-6 font-body text-xs text-linho/40 md:flex-row md:items-center">
          <div>© 2026 Raiz Consultoria Estratégica. Todos os direitos reservados.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-linho">Política de Privacidade</a>
            <a href="#" className="hover:text-linho">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FloatingWhats() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Fale no WhatsApp"
      aria-label="Fale no WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}

export default function Home() {
  return (
    <div className="bg-off-white">
      <Nav />
      <main>
        <Hero />
        <StatsBar />
        <Problema />
        <Dados />
        <Diferencial />
        <Founder />
        <Metodo />
        <SeteP />
        <Resultados />
        <Qualificacao />
        <Planos />
        <Calculadora />
        <Faq />
        <CtaFinal />
      </main>
      <HomeFooter />
      <FloatingWhats />
    </div>
  );
}
