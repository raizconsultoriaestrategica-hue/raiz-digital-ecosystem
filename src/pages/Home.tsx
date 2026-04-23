import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, MessageCircle, Check, X, Instagram, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const WHATSAPP_URL = "https://wa.me/5544999993334";

const NAV_LINKS = [
  { label: "O Método", href: "#metodo" },
  { label: "Os 7 Pilares", href: "#diagnostico" },
  { label: "Planos", href: "#planos" },
  { label: "Calculadora", href: "#calculadora" },
];

const PROBLEMAS = [
  {
    n: "01",
    t: "Agenda cheia, caixa vazio",
    d: "Atendimentos acima da capacidade, mas o lucro no final do mês não reflete o esforço. O problema está na precificação e no mix de serviços.",
  },
  {
    n: "02",
    t: "Marketing sem retorno mensurável",
    d: "Você investe em tráfego, em agência, em posts. Mas não consegue rastrear quantos pacientes pagantes isso está gerando. Dinheiro saindo sem métrica.",
  },
  {
    n: "03",
    t: "A clínica depende de você para tudo",
    d: "Você é o dentista, o gerente, o atendente e o financeiro. Sem processos, sem equipe autônoma. A operação para quando você para.",
  },
  {
    n: "04",
    t: "Conversão baixa no atendimento",
    d: "Pacientes chegam, fazem avaliação e somem. A taxa de conversão de orçamentos em tratamentos revela uma falha crítica no processo comercial.",
  },
  {
    n: "05",
    t: "Sem previsibilidade financeira",
    d: "O faturamento oscila mês a mês sem que você saiba exatamente por quê. Sem indicadores, impossível planejar crescimento ou segurança.",
  },
  {
    n: "06",
    t: "Crescimento emperrado há meses",
    d: "Você sabe que a clínica poderia faturar mais, mas não sabe por onde começar. Cada tentativa sozinho gera mais sobrecarga e menos resultado.",
  },
];

const ETAPAS = [
  {
    n: "01",
    t: "Diagnóstico 360°",
    d: "Mapeamento completo dos 7 pilares da clínica. Você sai com um raio-x real do negócio.",
  },
  {
    n: "02",
    t: "Planejamento Estratégico",
    d: "Plano de ação com prioridades, prazos, metas financeiras e responsáveis. Sem achismo, com dados.",
  },
  {
    n: "03",
    t: "Execução Guiada",
    d: "Acompanhamos cada etapa da implementação ao lado do seu time. Não entregamos um documento e sumimos.",
  },
  {
    n: "04",
    t: "Resultado Mensurável",
    d: "Cada ação gera uma métrica. O crescimento é rastreado mês a mês. Você vê o resultado em números.",
  },
];

const PILARES = [
  { n: "01", t: "Marketing Digital", d: "Presença, posicionamento e autoridade online. Do Google ao Instagram." },
  { n: "02", t: "Captação & Tráfego", d: "Funil de aquisição de pacientes e custo por lead qualificado." },
  { n: "03", t: "Atendimento & Conversão", d: "Processos de recepção, orçamento e conversão de tratamentos." },
  { n: "04", t: "Financeiro & Precificação", d: "Margens reais, ponto de equilíbrio e precificação estratégica." },
  { n: "05", t: "Gestão Operacional", d: "Processos, indicadores e autonomia da equipe sem depender do dono." },
  { n: "06", t: "Relacionamento & Retenção", d: "LTV do paciente, reativação, NPS e fidelização ativa." },
  {
    n: "07",
    t: "Crescimento & Expansão",
    d: "Estratégia de escala: novas especialidades, segunda unidade, franquia ou sociedade. Crescimento com estrutura.",
  },
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
  {
    nome: "PLANO RAIZ",
    preco: "R$ 2.500–R$ 3.500/mês",
    contrato: "Contrato trimestral mínimo",
    sub: "Para clínicas em estruturação (R$15k–R$30k/mês)",
    itens: [
      "Diagnóstico 360° completo",
      "Plano de ação 90 dias",
      "2 reuniões mensais",
      "Dashboards de KPI",
      "Suporte WhatsApp dias úteis",
    ],
    cta: "Quero o Plano Raiz",
    destaque: false,
  },
  {
    nome: "PLANO CRESCIMENTO",
    preco: "R$ 3.500–R$ 5.000/mês",
    contrato: "Contrato semestral",
    sub: "Para clínicas em aceleração (R$30k–R$60k/mês)",
    itens: [
      "Tudo do Plano Raiz + 4 reuniões + visita presencial trimestral",
      "Marketing, comercial e financeiro em paralelo",
      "Treinamento de equipe (recepção e vendas)",
      "Reestruturação de precificação e mix",
      "Suporte prioritário",
    ],
    cta: "Quero o Plano Crescimento",
    destaque: true,
  },
  {
    nome: "PLANO EXPANSÃO",
    preco: "R$ 5.000–R$ 7.500/mês",
    contrato: "Contrato anual",
    sub: "Para clínicas prontas para escalar (acima de R$60k/mês)",
    itens: [
      "Tudo do Plano Crescimento + Atuação semanal com Patrick como sócio estratégico",
      "Estratégia de escala e expansão de unidades",
      "Estruturação societária",
      "Rede de parceiros da Raiz",
      "Consultoria presencial sob demanda",
    ],
    cta: "Quero o Plano Expansão",
    destaque: false,
  },
];

const FAQ = [
  {
    q: "Quanto tempo leva para ver os primeiros resultados?",
    a: "Os primeiros resultados aparecem entre 30 e 60 dias. Ajustes de precificação e conversão tendem a gerar retorno mais rápido. Resultados estruturais levam de 3 a 6 meses.",
  },
  {
    q: "Preciso abrir o financeiro da clínica?",
    a: "Sim. Sem os números reais da clínica, como faturamento, ticket médio e inadimplência, não tem como identificar onde o dinheiro está vazando. Tudo o que você compartilhar fica restrito à consultoria.",
  },
  {
    q: "O Diagnóstico 360° tem compromisso de contratação?",
    a: "Não. É uma sessão de análise sem compromisso nenhum. Você recebe o relatório completo e o plano de ação. Depois, você decide se quer a Raiz do seu lado ou prefere tocar por conta própria.",
  },
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

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
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-verde-raiz/95 backdrop-blur shadow-soft" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <a href="#topo" className="font-display text-xl text-linho md:text-2xl">
          Raiz <span className="font-body text-xs uppercase tracking-[0.22em] text-linho/60">Consultoria Estratégica</span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-body text-sm text-linho/80 transition-colors hover:text-dourado"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            asChild
            className="hidden bg-dourado text-marrom-raiz hover:bg-dourado/90 md:inline-flex"
          >
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
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="font-display text-2xl text-linho hover:text-dourado"
                  >
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

function Hero() {
  return (
    <section id="topo" className="relative bg-verde-raiz pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="max-w-4xl">
          <span className="inline-block rounded-full bg-dourado/20 px-4 py-1.5 font-body text-xs uppercase tracking-[0.22em] text-dourado">
            Consultoria Estratégica para Odontologia
          </span>

          <h1
            className="mt-8 font-display font-medium leading-[1.05] text-linho"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
          >
            Sua agenda está cheia. Seu faturamento está travado.{" "}
            <em className="text-dourado not-italic">A gente sabe exatamente por quê.</em>
          </h1>

          <p className="mt-8 max-w-2xl font-body font-light text-lg leading-relaxed text-linho/75 md:text-xl">
            Diagnóstico personalizado, plano sob medida, execução guiada. Resultado mensurável. Transforme sua clínica
            num negócio lucrativo e previsível.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="bg-dourado px-8 py-6 text-marrom-raiz hover:bg-dourado/90">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Agendar Diagnóstico 360°
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-linho/30 bg-transparent px-8 py-6 text-linho hover:bg-linho/10 hover:text-linho"
            >
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
      </div>
    </section>
  );
}

function Problema() {
  return (
    <section id="problema" className="bg-off-white py-24">
      <div className="container mx-auto max-w-6xl px-6">
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

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {PROBLEMAS.map((p) => (
            <article
              key={p.n}
              className="group relative rounded-xl border border-border bg-linho p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-editorial"
            >
              <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 rounded-t-xl bg-dourado transition-transform duration-300 group-hover:scale-x-100" />
              <div className="font-display text-3xl text-dourado">{p.n}</div>
              <h3 className="mt-3 font-display text-2xl text-verde-raiz">{p.t}</h3>
              <p className="mt-3 font-body font-light text-base leading-relaxed text-quase-preto/75">{p.d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Diferencial() {
  return (
    <section className="bg-verde-raiz py-24">
      <div className="container mx-auto max-w-6xl px-6">
        <h2 className="max-w-4xl font-display text-3xl text-linho md:text-5xl">
          Agência te vende post. Curso te vende método.{" "}
          <em className="text-dourado not-italic">A Raiz senta do seu lado e constrói junto.</em>
        </h2>

        <div className="mt-14 overflow-hidden rounded-xl border border-linho/15">
          <div className="grid grid-cols-4 bg-verde-raiz/80">
            <div className="p-5 font-body text-xs uppercase tracking-wider text-linho/50">Critério</div>
            <div className="p-5 font-body text-xs uppercase tracking-wider text-linho/50">Agência ❌</div>
            <div className="p-5 font-body text-xs uppercase tracking-wider text-linho/50">Curso ❌</div>
            <div className="border-l-2 border-dourado bg-verde-raiz/50 p-5 font-body text-xs uppercase tracking-wider text-dourado">
              Raiz ✅
            </div>

            {[
              ["Entrega", "Material e relatório", "Conteúdo e método", "Execução guiada junto com você"],
              ["Presença", "Gestão remota", "Assíncrona, gravada", "Na operação, todo mês"],
              ["Resultado", "Relatório de alcance", "Certificado de conclusão", "Meta rastreada mês a mês"],
            ].map((row, i) => (
              <div key={i} className="contents">
                <div className="border-t border-linho/10 p-5 font-body text-sm font-semibold text-linho">{row[0]}</div>
                <div className="border-t border-linho/10 p-5 font-body font-light text-sm text-linho/70">{row[1]}</div>
                <div className="border-t border-linho/10 p-5 font-body font-light text-sm text-linho/70">{row[2]}</div>
                <div className="border-l-2 border-t border-dourado border-t-linho/10 bg-verde-raiz/50 p-5 font-body text-sm text-linho">
                  {row[3]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Founder() {
  return (
    <section id="founder" className="bg-off-white py-24">
      <div className="container mx-auto max-w-6xl px-6">
        <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
          Quem está do seu lado
        </span>

        <div className="mt-6 grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-4xl text-verde-raiz md:text-5xl">
              Patrick Ferreira: o estrategista que entende de negócio tanto quanto você entende de clínica.
            </h2>
            <p className="mt-6 font-body font-light text-lg leading-relaxed text-quase-preto/75">
              14+ anos de atuação em marketing, vendas, tecnologia e operações. Especializado em diagnosticar e
              estruturar clínicas odontológicas que querem crescer com consistência, não com sorte.
            </p>
          </div>

          <div className="flex justify-center md:justify-end">
            <div
              className="relative flex h-72 w-72 items-center justify-center rounded-full border-4 border-dourado shadow-editorial"
              style={{ background: "linear-gradient(135deg, #1C3D2E 0%, #3D1F0D 100%)" }}
            >
              <span className="font-display text-[10rem] leading-none text-dourado">P</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metodo() {
  return (
    <section id="metodo" className="bg-linho py-24">
      <div className="container mx-auto max-w-6xl px-6">
        <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
          Como funciona
        </span>
        <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
          O Método Raiz em 4 etapas
        </h2>
        <p className="mt-6 max-w-3xl font-body font-light text-lg text-quase-preto/70">
          Cada etapa tem uma entrega clara, um responsável definido e uma métrica para acompanhar o avanço.
        </p>

        <div className="relative mt-14 grid gap-6 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-12 hidden h-px bg-dourado/30 md:block" />
          {ETAPAS.map((e) => (
            <article
              key={e.n}
              className="relative rounded-xl border border-border bg-off-white p-6 shadow-soft"
            >
              <div className="relative z-10 mx-auto -mt-12 flex h-14 w-14 items-center justify-center rounded-full bg-verde-raiz font-display text-xl text-dourado shadow-editorial">
                {e.n}
              </div>
              <h3 className="mt-4 text-center font-display text-xl text-verde-raiz">{e.t}</h3>
              <p className="mt-3 text-center font-body font-light text-sm leading-relaxed text-quase-preto/70">
                {e.d}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SeteP() {
  return (
    <section id="diagnostico" className="bg-verde-raiz py-24">
      <div className="container mx-auto max-w-6xl px-6">
        <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-dourado">
          Diagnóstico 360°
        </span>
        <h2 className="mt-4 font-display text-4xl text-linho md:text-5xl">
          Os 7 pilares que determinam o crescimento da sua clínica
        </h2>
        <p className="mt-6 max-w-3xl font-body font-light text-lg text-linho/75">
          Ignorar qualquer um desses pilares é como tentar encher um balde furado. O Diagnóstico 360° avalia todos com
          profundidade. Você recebe um plano de ação para cada um.
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
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              Agendar meu Diagnóstico
            </a>
          </Button>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PILARES.map((p) => (
            <article
              key={p.n}
              className="group rounded-xl border border-dourado/20 bg-verde-raiz p-6 transition-all duration-300 hover:-translate-y-1 hover:border-dourado hover:shadow-editorial"
            >
              <div className="font-display text-2xl text-dourado">{p.n}</div>
              <h3 className="mt-2 font-display text-xl text-linho">{p.t}</h3>
              <p className="mt-2 font-body font-light text-sm leading-relaxed text-linho/70">{p.d}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Resultados() {
  return (
    <section className="bg-off-white py-24">
      <div className="container mx-auto max-w-6xl px-6">
        <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
          Resultados reais
        </span>
        <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
          O que muda quando a estrutura está certa
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-red-900/20 bg-red-900/10 p-8">
            <div className="font-body text-xs font-semibold uppercase tracking-wider text-red-900/80">Antes</div>
            <ul className="mt-5 space-y-3 font-body font-light text-quase-preto/80">
              <li>• Faturamento R$18k–R$22k/mês</li>
              <li>• Conversão menor que 30%</li>
              <li>• Dono em 100% das decisões</li>
              <li>• Marketing sem ROI</li>
              <li>• Equipe sem autonomia</li>
            </ul>
          </div>

          <div className="rounded-xl border border-verde-raiz/30 bg-verde-raiz/10 p-8">
            <div className="font-body text-xs font-semibold uppercase tracking-wider text-verde-raiz">
              Após 6 meses
            </div>
            <ul className="mt-5 space-y-3 font-body font-light text-quase-preto/80">
              <li>• Faturamento escalado para R$52k/mês</li>
              <li>• Conversão 68% com script novo</li>
              <li>• Equipe autônoma com KPIs</li>
              <li>• CAC rastreado, custo caiu 40%</li>
              <li>• Dentista-dono com 2 dias livres por semana</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-xl border-l-4 border-dourado bg-marrom-raiz p-10 shadow-editorial">
          <div className="font-display text-5xl text-dourado md:text-6xl">3× faturamento</div>
          <p className="mt-6 max-w-3xl font-display text-2xl italic leading-snug text-linho">
            “Em 4 meses, a Raiz identificou onde eu estava perdendo dinheiro sem saber. Reestruturamos o atendimento,
            ajustamos a precificação e o faturamento cresceu 3 vezes com a mesma quantidade de pacientes.”
          </p>
          <div className="mt-6 font-body text-sm text-linho/70">
            Dra. Anna Krause · Especialista em Facetas de Resina · Sinop, MT
          </div>
        </div>
      </div>
    </section>
  );
}

function Qualificacao() {
  return (
    <section className="bg-verde-menta py-24">
      <div className="container mx-auto max-w-6xl px-6">
        <span className="font-body font-semibold uppercase tracking-[0.22em] text-xs text-verde-raiz">
          A Raiz é para você?
        </span>
        <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
          Trabalhamos com quem está pronto para sair do lugar
        </h2>
        <p className="mt-6 max-w-3xl font-body font-light text-lg text-quase-preto/75">
          Não atendemos todo mundo. Isso é intencional.
        </p>

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
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              Falar com Especialista
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Planos() {
  return (
    <section id="planos" className="bg-off-white py-24">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/15 p-5 text-amber-800">
          <p className="font-body text-sm md:text-base">
            ⏰ <strong>Vagas limitadas para novas clínicas em Abril/2026</strong> — Apenas 4 vagas disponíveis neste
            ciclo.{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-amber-900"
            >
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

        <div className="mt-14 grid gap-6 md:grid-cols-3 md:items-stretch">
          {PLANOS.map((p) => (
            <article
              key={p.nome}
              className={`relative flex flex-col rounded-xl border bg-linho p-8 transition-all ${
                p.destaque
                  ? "border-2 border-dourado shadow-editorial md:-translate-y-2"
                  : "border-border shadow-soft"
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
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  {p.cta}
                </a>
              </Button>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center font-body font-light text-sm text-muted-foreground">
          Os valores variam conforme o porte e a complexidade da clínica.
        </p>
      </div>
    </section>
  );
}

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
  if (conv < 40) gaps += 2;
  else if (conv < 60) gaps += 1;
  if (ret < 45) gaps += 2;
  else if (ret < 65) gaps += 1;
  if (ticket < 350) gaps += 1;

  const scoreLabel =
    gaps >= 4 ? "Alto potencial de melhoria" : gaps >= 2 ? "Em desenvolvimento" : "Acima da média";
  const scoreClass =
    gaps >= 4
      ? "bg-red-100 text-red-800"
      : gaps >= 2
      ? "bg-amber-100 text-amber-800"
      : "bg-verde-menta text-verde-raiz";

  return (
    <section id="calculadora" className="bg-[#0D2218] py-24">
      <div className="container mx-auto max-w-6xl px-6">
        <h2 className="font-display text-4xl text-dourado md:text-5xl">Calculadora de Receita Invisível</h2>
        <p className="mt-3 font-body font-light italic text-lg text-linho/70">
          Descubra quanto você pode estar deixando na mesa
        </p>
        <p className="mt-3 max-w-3xl font-body font-light text-base text-linho/60">
          Ajuste os valores para refletir a realidade da sua clínica. Os resultados aparecem em tempo real.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {/* SLIDERS */}
          <div className="space-y-8 rounded-xl border border-dourado/20 bg-[#1a3a26] p-8">
            <SliderField
              label="Faturamento mensal atual"
              value={fmtBRL(fat)}
              min={15000}
              max={200000}
              step={2000}
              v={fat}
              onChange={setFat}
            />
            <SliderField
              label="Taxa de conversão de orçamentos"
              value={`${conv}%`}
              min={10}
              max={80}
              step={5}
              v={conv}
              onChange={setConv}
              progress={{ now: conv, target: 60, label: "Meta: 60%" }}
            />
            <SliderField
              label="Ticket médio por procedimento"
              value={fmtBRL(ticket)}
              min={150}
              max={8000}
              step={50}
              v={ticket}
              onChange={setTicket}
            />
            <SliderField
              label="Pacientes que retornam em 6 meses"
              value={`${ret}%`}
              min={10}
              max={80}
              step={5}
              v={ret}
              onChange={setRet}
              progress={{ now: ret, target: 65, label: "Meta: 65%" }}
            />
          </div>

          {/* RESULTADOS */}
          <div className="rounded-xl border border-dourado/30 bg-[#1a3a26] p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-2xl text-linho">Diagnóstico da sua clínica</h3>
              <span className={`rounded-full px-3 py-1 font-body text-xs font-semibold ${scoreClass}`}>
                {scoreLabel}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <MetricCard
                icon="💸"
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
                icon="📈"
                title="Potencial com ticket 20% maior"
                value={<span className="text-verde-menta">{fmtBRL(ganhoTicket)}/mês</span>}
              />
              <MetricCard
                icon="🔁"
                title="Perda por baixa retenção de pacientes"
                value={
                  ret >= BENCH_RET ? (
                    <span className="text-verde-menta">Acima da meta ✓</span>
                  ) : (
                    <span className="text-red-400">{fmtBRL(perdaRet)}/mês</span>
                  )
                }
              />

              <div className="rounded-lg border border-dourado/40 bg-[#0D2218] p-6">
                <div className="flex items-center gap-2 font-body text-sm text-linho/70">
                  <span>🎯</span> Receita invisível total
                </div>
                <div className="mt-3 font-display text-3xl text-dourado md:text-4xl">
                  {fmtBRL(totalMensal)}/mês
                </div>
                <div className="mt-1 font-display text-xl text-linho/85">{fmtBRL(totalAnual)}/ano</div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 font-body font-light text-sm text-linho/40">
          * Dados baseados em clínicas odontológicas estruturadas: 60% de conversão e 65% de retenção. Resultados
          individuais variam.
        </p>
      </div>
    </section>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  v,
  onChange,
  progress,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  v: number;
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
        className="[&_[role=slider]]:bg-dourado [&_[role=slider]]:border-dourado"
      />
      {progress && (
        <div className="mt-3">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-linho/10">
            <div
              className="h-full bg-dourado transition-all"
              style={{ width: `${Math.min(100, (progress.now / progress.target) * 100)}%` }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-verde-menta"
              style={{ left: `${(progress.target / max) * 100}%` }}
            />
          </div>
          <div className="mt-1 font-body text-xs text-linho/50">{progress.label}</div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, title, value }: { icon: string; title: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-linho/10 bg-[#0D2218]/60 p-4">
      <div className="flex items-center gap-2 font-body text-sm text-linho/70">
        <span>{icon}</span> {title}
      </div>
      <div className="mt-2 font-display text-xl">{value}</div>
    </div>
  );
}

function Faq() {
  return (
    <section className="bg-off-white py-24">
      <div className="container mx-auto max-w-3xl px-6">
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
      </div>
    </section>
  );
}

function CtaFinal() {
  return (
    <section className="bg-verde-raiz py-24">
      <div className="container mx-auto max-w-4xl px-6 text-center">
        <span className="inline-block rounded-full bg-dourado/20 px-4 py-1.5 font-body text-xs uppercase tracking-[0.22em] text-dourado">
          O próximo passo é simples
        </span>
        <h2 className="mt-6 font-display text-4xl text-linho md:text-5xl">
          Chega de crescer no improviso. <em className="text-dourado not-italic">A Raiz entra na sua clínica com você.</em>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl font-body font-light text-lg text-linho/75">
          Agende seu Diagnóstico 360°: uma sessão estruturada, sem compromisso de contratação. Você sai sabendo
          exatamente onde estão os gargalos e o que fazer nos próximos 90 dias.
        </p>

        <div className="mt-10">
          <Button asChild className="h-auto bg-dourado px-10 py-4 text-lg text-marrom-raiz hover:bg-dourado/90">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              Agendar Diagnóstico 360°
            </a>
          </Button>
        </div>

        <p className="mt-6 font-body font-light text-sm text-linho/50">
          Sem compromisso de contratação · Vagas limitadas · Resposta em até 24h
        </p>
      </div>
    </section>
  );
}

function HomeFooter() {
  return (
    <footer className="bg-quase-preto py-16">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <div className="font-display text-2xl text-linho">Raiz Consultoria Estratégica</div>
            <p className="mt-4 max-w-sm font-body font-light text-sm leading-relaxed text-linho/50">
              Consultoria estratégica especializada em clínicas odontológicas e profissionais de saúde. Estruturada,
              direta e focada em resultado mensurável.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://instagram.com/consult.raiz"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-linho/60 transition-colors hover:text-dourado"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="text-linho/60 transition-colors hover:text-dourado"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-linho/60 transition-colors hover:text-dourado"
              >
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
              (44) 99999-3334
              <br />
              @consult.raiz
              <br />
              Maringá, Paraná — Atendimento em todo o Brasil
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
        <Problema />
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
