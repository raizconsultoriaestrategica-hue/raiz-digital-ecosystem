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
import patrickEstrategico from "@/assets/patrick-estrategico.webp";
import patrickLifestyle from "@/assets/patrick-lifestyle.webp";
import BrandLogo from "@/components/brand/BrandLogo";

const WHATSAPP_URL = "https://wa.me/5544999993334?text=Vim%20pelo%20site%20e%20quero%20agendar%20meu%20Diagn%C3%B3stico%20360%C2%B0";

const NAV_LINKS = [
  { label: "O Protocolo", href: "#protocolo" },
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
  { n: "57%", d: "das clínicas investem em redes sociais sem conseguir medir retorno real" },
  { n: "15%", d: "das consultas são perdidas por faltas, um dinheiro que desaparece todo mês sem ser percebido" },
];

const STATS = [
  { n: "14+", d: "anos em marketing, vendas e operações" },
  { n: "7", d: "pilares estratégicos mapeados e trabalhados" },
  { n: "4", d: "fases do Protocolo Raiz" },
  { n: "100%", d: "dedicado a clínicas de saúde" },
];

const FASES_PROTOCOLO = [
  { n: "0", t: "Diagnóstico 360°", prazo: "Semanas 1-2", d: "35 perguntas, 7 pilares, pontuação em tempo real. Você enxerga os gargalos antes de qualquer proposta." },
  { n: "1", t: "Estancar", prazo: "Dias 1-30", d: "Script de atendimento, follow-up, confirmação e preço. A conversão para de vazar antes de investir em anúncio." },
  { n: "2", t: "Acelerar", prazo: "Dias 30-90", d: "Campanhas de Meta e Google criadas e geridas pela equipe Raiz, funil e reativação da sua base de contatos." },
  { n: "3", t: "Sustentar", prazo: "Dia 90+", d: "Retenção, recall, indicações e processos. A clínica roda com menos dependência de você." },
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
  "Fatura de R$ 15 mil a R$ 90 mil/mês e quer crescer com previsibilidade",
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
  { nome: "RAIZ DE BASE", sub: "Para quem está estruturando", itens: ["Fases Diagnóstico e Estancar", "Posicionamento, preço e processos de conversão", "Tráfego: auditoria e plano de mídia, sem execução"], ritmo: "Reuniões quinzenais · a partir de 3 meses", cta: "Falar sobre o Raiz de Base", destaque: false },
  { nome: "RAIZ DE CRESCIMENTO", sub: "O mais contratado", itens: ["Protocolo até a fase Acelerar", "Campanhas de Meta Ads criadas e geridas pela equipe Raiz", "Conversão, financeiro e gestão", "Google Ads opcional"], ritmo: "Reuniões semanais · 4 a 6 meses", cta: "Falar sobre o Raiz de Crescimento", destaque: true },
  { nome: "RAIZ DE EXPANSÃO", sub: "Para quem vai escalar", itens: ["Protocolo completo: Meta + Google inclusos", "IA aplicada à clínica", "Preparação de expansão"], ritmo: "Semanal + sessão estratégica · a partir de 6 meses", cta: "Falar sobre o Raiz de Expansão", destaque: false },
];

const FAQ = [
  { q: "Quanto tempo leva para ver os primeiros resultados?", a: "Os primeiros resultados aparecem entre 30 e 60 dias. Ajustes de precificação e conversão tendem a gerar retorno mais rápido. Resultados estruturais levam de 3 a 6 meses." },
  { q: "Preciso abrir o financeiro da clínica?", a: "Sim. Sem os números reais da clínica, como faturamento, ticket médio e inadimplência, não tem como identificar onde o dinheiro está vazando. Tudo o que você compartilhar fica restrito à consultoria." },
  { q: "O Diagnóstico 360° tem compromisso de contratação?", a: "Não. É uma sessão de análise sem compromisso nenhum. Você recebe o relatório completo e o plano de ação. Depois, você decide se quer a Raiz do seu lado ou prefere tocar por conta própria." },
  { q: "Já contratei consultoria antes e não funcionou. Por que seria diferente?", a: "A maioria das consultorias entrega um relatório e some. A Raiz fica. Acompanhamos a execução ao lado do seu time, com reuniões periódicas, metas documentadas e portal com KPIs em tempo real. O resultado é rastreado, não prometido." },
  { q: "Quanto custa?", a: "O investimento é definido depois do Diagnóstico 360°, com base no porte da clínica e nos objetivos mapeados. O Diagnóstico em si não tem custo e não tem compromisso de contratação." },
  { q: "Funciona para médicos estéticos e dermatologistas também?", a: "Sim. A metodologia Raiz foi desenvolvida para clínicas de saúde: dentistas, médicos estéticos e dermatologistas. Os 7 pilares e os 22 módulos são adaptados ao perfil e ao momento de cada clínica." },
  { q: "Vocês fazem os anúncios ou eu preciso contratar uma agência?", a: "Fazemos. A partir do plano Crescimento, as campanhas de Meta e Google Ads são criadas, geridas e otimizadas pela equipe de tráfego da Raiz, dentro do Protocolo. Você tem um contrato e um responsável, sem precisar coordenar consultor e agência separados. A verba de mídia é paga por você direto às plataformas." },
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
        <a href="#topo" className="inline-flex items-center" aria-label="Raiz Consultoria Estratégica">
          <BrandLogo onDark className="h-9" />
        </a>
        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="font-body text-sm text-linho/80 transition-colors hover:text-dourado">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
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
        <div className="grid items-stretch gap-x-12 gap-y-6 lg:grid-cols-5 lg:grid-rows-[1fr_auto]">
          {/* Coluna esquerda 60%. Conteúdo principal */}
          <div className="lg:col-span-3 lg:row-start-1">
            <span className="inline-block rounded-full bg-dourado/20 px-4 py-1.5 font-body text-xs uppercase tracking-[0.22em] text-dourado">
              Consultoria Estratégica para Profissionais de Saúde
            </span>
            <h1
              className="mt-8 font-display font-medium leading-[1.1] text-linho"
              style={{ fontSize: "clamp(1.75rem, 3.6vw, 2.75rem)" }}
            >
              Sua agenda está cheia.<br />
              Seu faturamento está travado.<br />
              <em className="text-dourado not-italic">A gente sabe exatamente por quê.</em>
            </h1>
            <p className="mt-8 max-w-2xl font-body font-light text-lg leading-relaxed text-linho/75 md:text-xl">
              O problema quase nunca é falta de dedicação. Dentistas, médicos estéticos e dermatologistas que faturam de R$ 15 mil a R$ 90 mil/mês geralmente trabalham muito, mas acabam colocando energia no lugar errado.
            </p>
            <p className="mt-6 max-w-2xl font-body font-light text-lg leading-relaxed text-linho/75 md:text-xl">
              A Raiz entra para olhar o todo, identificar exatamente onde o crescimento está travado e construir, junto com você, um caminho claro para destravar esse resultado.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="bg-dourado px-8 py-6 text-marrom-raiz hover:bg-dourado/90">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Quero meu Diagnóstico 360°</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-linho/30 bg-transparent px-8 py-6 text-linho hover:bg-linho/10 hover:text-linho">
                <a href="#protocolo">Ver o Protocolo</a>
              </Button>
            </div>
            <p className="mt-8 font-body font-light text-sm text-linho/60">
              14+ anos em marketing, vendas, tecnologia e operações em múltiplos mercados e segmentos, com visão estratégica aplicada ao crescimento de negócios de saúde
            </p>
            <div className="mt-6">
              <div className="inline-block rounded-md border border-linho/20 bg-linho/10 px-4 py-2 font-body text-sm text-linho/80">
                Atendemos um número limitado de clínicas por vez, para manter o acompanhamento semanal próximo.
              </div>
            </div>
          </div>

          {/* Coluna direita 40%. Imagem */}
          <div className="flex justify-center lg:col-span-2 lg:row-start-1 lg:row-span-2 lg:justify-end">
            <div className="relative h-full w-full max-w-md">
              <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-2xl border-2 border-dourado/60 shadow-editorial">
                <img
                  src={patrickEstrategico}
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
          <h2 className="mt-4 max-w-[22ch] font-display text-3xl text-verde-raiz md:text-4xl">
            Você está no limite.<br />
            E a clínica ainda depende de você para tudo.
          </h2>
          <p className="mt-6 max-w-[680px] font-body font-light text-lg text-quase-preto/70">
            Não é falta de dedicação. É falta de estrutura. Todo gargalo tem uma causa raiz: ela é identificável, mapeável e corrigível.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PROBLEMAS.map((p) => (
              <article
                key={p.n}
                className="group relative overflow-hidden rounded-xl border border-black/[0.08] bg-off-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-soft"
              >
                <h3 className="font-display text-xl font-semibold text-verde-raiz">{p.t}</h3>
                <p className="mt-3 max-w-[42ch] font-body text-sm leading-relaxed text-muted-foreground">{p.d}</p>
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-2 right-3 select-none font-display leading-none text-dourado/20"
                  style={{ fontSize: "64px" }}
                >
                  {p.n}
                </span>
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
            O que os números dizem sobre a sua clínica
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
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
          <p className="mt-4 text-center font-body text-linho/60" style={{ fontSize: "0.75rem" }}>
            Fontes: SEBRAE, CFO, CRO-BR e pesquisas internas Raiz Consultoria (2024–2025).
          </p>
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
            Quem lidera a sua consultoria
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
              14+ anos de atuação em marketing, vendas, tecnologia e operações. Especializado em diagnosticar e estruturar clínicas de saúde — odontologia, estética e dermatologia — que querem crescer com consistência, não com sorte.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {["14+ anos em marketing, vendas e operações", "100% dedicado a clínicas de saúde"].map((p) => (
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
                src={patrickLifestyle}
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

/* ---------- PROTOCOLO ---------- */
function Protocolo() {
  return (
    <section id="protocolo" className="bg-linho py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
            Como funciona
          </span>
          <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">O Protocolo Raiz</h2>
          <p className="mt-6 max-w-3xl font-body font-light text-lg text-quase-preto/70">
            Cuidamos da sua clínica como você cuida de um paciente: diagnóstico, tratamento em fases e manutenção.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-14 grid gap-6 md:grid-cols-4">
            <div className="absolute left-0 right-0 top-12 hidden h-px bg-dourado/30 md:block" />
            {FASES_PROTOCOLO.map((e) => (
              <article key={e.n} className="relative rounded-xl border border-border bg-off-white p-6 shadow-soft">
                <div className="relative z-10 mx-auto -mt-12 flex h-14 w-14 items-center justify-center rounded-full bg-verde-raiz font-display text-xl text-dourado shadow-editorial">
                  {e.n}
                </div>
                <h3 className="mt-4 text-center font-display text-xl text-verde-raiz">{e.t}</h3>
                <div className="mt-1 text-center font-body text-xs font-semibold uppercase tracking-wider text-dourado">
                  {e.prazo}
                </div>
                <p className="mt-3 text-center font-body font-light text-sm leading-relaxed text-quase-preto/70">{e.d}</p>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className="mt-12 rounded-xl border-l-4 border-dourado bg-verde-raiz p-8 shadow-editorial md:p-10">
            <p className="font-display text-xl leading-snug text-linho md:text-2xl">
              Anúncio só entra com o atendimento medido e convertendo. Rodar tráfego para uma clínica sem processo é pagar para perder lead.{" "}
              <em className="text-dourado not-italic">Primeiro estancamos. Depois aceleramos.</em>
            </p>
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
      <div className="container mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Coluna esquerda. 40% */}
          <Reveal className="lg:col-span-2">
            <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-dourado">Diagnóstico 360°</span>
            <h2 className="mt-4 max-w-[20ch] font-display text-3xl text-linho md:text-[40px] md:leading-[1.1]">
              Os 7 pilares que determinam o crescimento da sua clínica
            </h2>
            <p className="mt-6 max-w-[42ch] font-body font-light text-base leading-relaxed text-linho/75">
              Ignorar qualquer um desses pilares é como tentar encher um balde furado. O Diagnóstico 360° avalia todos com profundidade.
            </p>

            <ul className="mt-8 grid gap-3">
              {[
                "35 perguntas estruturadas nos 7 pilares",
                "Sessão de 2 a 3 horas, online ou presencial",
                "Relatório com pontuação por pilar e semáforo de risco",
                "Plano de ação personalizado de 90 dias",
                "Sem compromisso de contratação",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 font-body font-light text-sm text-linho/85">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-dourado" />
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

          {/* Coluna direita. 60% */}
          <Reveal delay={150} className="lg:col-span-3">
            <div className="grid gap-4 sm:grid-cols-2">
              {PILARES.map((p) => (
                <article
                  key={p.n}
                  className="rounded-[10px] border border-linho/[0.12] bg-linho/[0.08] px-5 py-4 transition-colors duration-300 hover:border-dourado/40 hover:bg-linho/[0.12]"
                >
                  <div className="font-body text-[11px] font-semibold uppercase tracking-[0.22em] text-dourado">
                    Pilar {p.n}
                  </div>
                  <h3 className="mt-1.5 font-display text-lg leading-tight text-linho">{p.t}</h3>
                  <p className="mt-2 font-body font-light text-[13px] leading-relaxed text-linho/60">{p.d}</p>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- ORIGEM ---------- */
function Origem() {
  return (
    <section className="bg-off-white py-20 md:py-28">
      <div className="container mx-auto max-w-6xl px-6">
        <Reveal>
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
            Como a Raiz nasceu
          </span>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative mt-8 overflow-hidden rounded-xl border-l-4 border-dourado bg-marrom-raiz p-10 shadow-editorial md:p-12">
            <span className="absolute -left-2 top-2 font-display leading-none text-dourado/15 select-none" style={{ fontSize: "10rem" }} aria-hidden>
              "
            </span>
            <p className="relative max-w-4xl font-display text-2xl leading-snug text-linho md:text-3xl">
              A Raiz nasceu de um favor a uma amiga dentista: agenda cheia, faturamento travado. Três meses de ajustes em preço, atendimento e processo, e o faturamento destravou. A demanda sempre esteve lá. O que faltava era estrutura.
            </p>
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
            A Raiz não é para todo mundo. Veja se é para você.
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
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Verificar se tenho perfil</a>
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
          <div className="rounded-xl border border-verde-raiz/20 bg-verde-menta/40 p-5 text-verde-raiz">
            <p className="font-body text-sm md:text-base">
              Atendemos um número limitado de clínicas por vez, para manter o acompanhamento semanal próximo.
            </p>
          </div>

          <div className="mt-12">
            <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
              Planos de consultoria
            </span>
            <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
              Três formatos de atuação. Um método. Resultado documentado nos três.
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
                    O mais contratado
                  </span>
                )}
                <div className="font-body text-xs font-semibold uppercase tracking-[0.22em] text-verde-raiz">
                  {p.nome}
                </div>
                <div className="mt-4 font-display text-2xl text-verde-raiz">{p.sub}</div>
                <div className="mt-1 font-body text-sm text-quase-preto/60">{p.ritmo}</div>

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
            Investimento a partir de R$ 2.000/mês. Escopo e valor definidos após o Diagnóstico 360°. Execução de tráfego inclusa a partir do plano Crescimento (verba de mídia à parte).
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
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-dourado">
            Calculadora de receita invisível
          </span>
          <h2 className="mt-4 font-display text-4xl text-dourado md:text-5xl">Calculadora de Receita Invisível</h2>
          <p className="mt-3 font-body font-light italic text-lg text-linho/70">
            Quanto sua clínica está perdendo todo mês sem saber
          </p>
          <p className="mt-3 max-w-3xl font-body font-light text-base text-linho/60">
            Coloque os dados reais da sua clínica. Em segundos, você vê onde está o vazamento e quanto ele custa por mês.
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

          <div className="mt-10 rounded-xl border border-dourado/30 bg-[#1a3a26] p-6 text-center">
            <p className="font-body font-light text-base text-linho/85">
              Seu diagnóstico mostra potencial. Quer entender o próximo passo?
            </p>
            <div className="mt-4">
              <Button asChild className="bg-dourado px-8 py-5 text-marrom-raiz hover:bg-dourado/90">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Quero meu Diagnóstico 360°</a>
              </Button>
            </div>
          </div>
        </Reveal>

        <p className="mt-8 font-body font-light text-sm text-linho/40">
          * Dados baseados em clínicas de saúde estruturadas: 60% de conversão e 65% de retenção. Resultados individuais variam.
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
    <section id="faq" className="bg-off-white py-20 md:py-28">
      <div className="container mx-auto max-w-3xl px-6">
        <Reveal>
          <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
            Perguntas frequentes
          </span>
          <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
            Perguntas que a gente recebe bastante
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
          <span className="inline-block rounded-full bg-dourado/20 px-8 py-2.5 font-body text-sm uppercase tracking-[0.22em] text-dourado">
            O próximo passo é simples
          </span>
          <h2 className="mt-6 font-display text-4xl text-linho md:text-5xl">
            <span className="block">Você já sabe que algo precisa mudar.</span>
            <span className="block text-dourado">O primeiro passo é entender exatamente o quê.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-body font-light text-lg text-linho/75">
            O Diagnóstico 360° não tem custo, dura até 60 minutos e não tem compromisso de contratação. Você sai com um raio-x real da clínica, independente de qualquer decisão.
          </p>
          <div className="mt-10">
            <Button asChild className="h-auto bg-dourado px-10 py-4 text-lg text-marrom-raiz hover:bg-dourado/90">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Quero meu Diagnóstico 360°</a>
            </Button>
          </div>
          <p className="mt-6 font-body font-light text-sm text-linho/50">
            Sem compromisso. Resposta em até 24h.
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
            <p className="mt-4 font-body font-light text-sm leading-relaxed text-linho/50" style={{ hyphens: "none", WebkitHyphens: "none", wordBreak: "normal", overflowWrap: "normal" }}>
              Consultoria estratégica para dentistas, médicos estéticos e dermatologistas. Metodologia própria. Resultado documentado. Sem pacote genérico.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a href="https://instagram.com/consult.raiz" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-linho/60 transition-colors hover:text-dourado">
                <Instagram className="h-5 w-5" />
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-linho/60 transition-colors hover:text-dourado">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/in/patrick-ferreira05/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-linho/60 transition-colors hover:text-dourado">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <div className="font-body text-xs font-semibold uppercase tracking-[0.22em] text-dourado">Navegação</div>
            <ul className="mt-4 space-y-2 font-body font-light text-sm text-linho/60">
              <li><a href="#problema" className="hover:text-linho">Por que a Raiz?</a></li>
              <li><a href="#founder" className="hover:text-linho">Quem é Patrick</a></li>
              <li><a href="#protocolo" className="hover:text-linho">O Protocolo</a></li>
              <li><a href="#diagnostico" className="hover:text-linho">Diagnóstico 360°</a></li>
              <li><a href="#planos" className="hover:text-linho">Planos</a></li>
              <li><a href="#faq" className="hover:text-linho">Perguntas frequentes</a></li>
            </ul>
          </div>

          <div>
            <div className="font-body text-xs font-semibold uppercase tracking-[0.22em] text-dourado">Contato</div>
            <p className="mt-4 font-body font-light text-sm leading-relaxed text-linho/60">
              <a href="mailto:raizconsultoriaestrategica@gmail.com" className="hover:text-linho transition-colors">
                raizconsultoriaestrategica@gmail.com
              </a><br />
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-linho transition-colors">
                (44) 99999-3334
              </a><br />
              <a href="https://instagram.com/consult.raiz" target="_blank" rel="noopener noreferrer" className="hover:text-linho transition-colors">
                @consult.raiz
              </a><br />
              <span>Maringá, Paraná. Atendimento em todo o Brasil</span>
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
        <Protocolo />
        <SeteP />
        <Origem />
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
