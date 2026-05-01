import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function EmBreve({ titulo }: { titulo: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Construction className="h-6 w-6 text-dourado" />
            <CardTitle className="font-display text-2xl text-verde-raiz">{titulo}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="font-body text-sm text-quase-preto/70">
            Esta ferramenta está em desenvolvimento e estará disponível em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
