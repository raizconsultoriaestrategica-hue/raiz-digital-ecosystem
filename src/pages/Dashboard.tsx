import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <span className="eyebrow">Área do cliente</span>
        <h1 className="mt-2 font-display text-4xl text-verde-raiz md:text-5xl">
          Seu painel Raiz
        </h1>
        <p className="mt-2 font-body text-sm text-quase-preto/70">
          Em breve: KPIs, pilares, módulos e insights da sua clínica em tempo real.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {["Faturamento", "NPS", "Ocupação"].map((k) => (
          <Card key={k} className="border-border/60 shadow-soft">
            <CardHeader>
              <CardTitle className="font-display text-xl text-verde-raiz">{k}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-display text-4xl text-caramelo">—</div>
              <div className="mt-1 font-body text-xs text-quase-preto/60">Aguardando dados</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
