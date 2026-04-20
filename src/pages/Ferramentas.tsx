import { Link } from "react-router-dom";
import { Stethoscope, Calculator, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tools = [
  {
    to: "/ferramentas/diagnostico",
    icon: Stethoscope,
    title: "Diagnóstico 360°",
    desc: "Aplique o diagnóstico Raiz em uma nova clínica e gere o mapa estratégico.",
  },
  {
    to: "/ferramentas/orcamentos",
    icon: Calculator,
    title: "Máquina de Orçamentos",
    desc: "Monte propostas comerciais com base nos planos Base, Crescimento e Expansão.",
  },
];

export default function Ferramentas() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <span className="eyebrow">Painel interno</span>
        <h1 className="mt-2 font-display text-4xl text-verde-raiz md:text-5xl">Ferramentas do consultor</h1>
        <p className="mt-2 font-body text-sm text-quase-preto/70">
          Instrumentos internos da Raiz. Acesso restrito ao time.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {tools.map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full border-border/60 shadow-soft transition-all group-hover:-translate-y-1 group-hover:shadow-editorial">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-verde-menta text-verde-raiz">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="font-display text-2xl text-verde-raiz">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm text-quase-preto/75">{desc}</p>
                <div className="mt-6 inline-flex items-center font-body text-sm text-caramelo">
                  Abrir ferramenta
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
