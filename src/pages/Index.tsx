import { Link } from "react-router-dom";
import { ArrowRight, Compass, LineChart, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";

const pilares = [
  {
    icon: Compass,
    title: "Diagnóstico 360°",
    desc: "Mapeamos a clínica em 8 dimensões — gestão, marketing, operação e cultura — com profundidade incomum.",
  },
  {
    icon: LineChart,
    title: "Gestão por evidência",
    desc: "Indicadores vivos, benchmarks setoriais e rituais de decisão que tiram a operação do achismo.",
  },
  {
    icon: Sprout,
    title: "Crescimento com raiz",
    desc: "Expansão sustentável: novos serviços, unidades e receitas construídos sobre base sólida, não sobre pressa.",
  },
];

export default function Index() {
  return (
    <>
      {/* HERO */}
      <section id="topo" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-off-white via-bege-terroso/40 to-verde-menta/30" />
        <div className="container-editorial relative grid gap-12 py-24 md:grid-cols-12 md:py-32">
          <div className="md:col-span-7 animate-fade-up">
            <span className="eyebrow">Consultoria estratégica · Saúde</span>
            <h1 className="mt-6 font-display text-5xl leading-[1.05] text-verde-raiz md:text-7xl">
              Crescer com <em className="text-caramelo">profundidade</em>,<br />
              não com pressa.
            </h1>
            <p className="mt-8 max-w-xl font-body text-lg leading-relaxed text-quase-preto/80">
              A Raiz é a consultoria que estrutura clínicas para crescerem como árvores: com método,
              indicadores vivos e decisões enraizadas em evidência.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-verde-raiz px-8 text-linho hover:bg-verde-musgo"
              >
                <a href="#servicos">
                  Conheça o método
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-verde-raiz text-verde-raiz hover:bg-verde-raiz hover:text-linho"
              >
                <Link to="/login">Área do Cliente</Link>
              </Button>
            </div>
          </div>

          <div className="md:col-span-5 md:pl-8">
            <div className="relative h-full min-h-[320px] rounded-2xl bg-gradient-raiz p-10 text-linho shadow-editorial animate-fade-up">
              <div className="font-display text-6xl leading-none text-dourado">“</div>
              <p className="mt-2 font-display text-2xl italic leading-snug">
                A clínica que conhece seus números pára de improvisar — e começa a decidir.
              </p>
              <div className="mt-10 border-t border-linho/20 pt-6 font-body text-sm text-linho/80">
                Manifesto Raiz · 2025
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILARES / SERVIÇOS */}
      <section id="servicos" className="border-y border-border/60 bg-linho/40 py-24">
        <div className="container-editorial">
          <div className="max-w-2xl">
            <span className="eyebrow">O método Raiz</span>
            <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
              Três pilares. Uma consultoria inteira.
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {pilares.map(({ icon: Icon, title, desc }) => (
              <article
                key={title}
                className="group rounded-xl border border-border/70 bg-card p-8 shadow-soft transition-all hover:-translate-y-1 hover:shadow-editorial"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-verde-menta text-verde-raiz">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 font-display text-2xl text-verde-raiz">{title}</h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-quase-preto/75">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="py-24">
        <div className="container-editorial grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <span className="eyebrow">Sobre a Raiz</span>
            <h2 className="mt-4 font-display text-4xl text-verde-raiz md:text-5xl">
              Estratégia com mãos na terra.
            </h2>
          </div>
          <div className="space-y-6 font-body text-base leading-relaxed text-quase-preto/80 md:col-span-7">
            <p>
              Trabalhamos lado a lado com gestores de clínicas que sentem que cresceram demais
              para o improviso — e ainda pequenos para uma consultoria genérica.
            </p>
            <p>
              Combinamos diagnóstico profundo, painéis vivos de indicadores e rituais de decisão
              para transformar dados em escolhas, e escolhas em resultado.
            </p>
            <Button
              asChild
              variant="link"
              className="px-0 text-caramelo hover:text-marrom-raiz"
            >
              <Link to="/login">
                Já é cliente? Acesse sua área
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
