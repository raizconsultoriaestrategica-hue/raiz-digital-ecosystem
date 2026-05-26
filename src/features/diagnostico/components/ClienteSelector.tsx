import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export interface ClienteRow {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  especialidade?: string | null;
  especialidade_clinica?: string | null;
}

interface ClienteSelectorProps {
  value: string | null;
  onChange: (id: string | null, cliente?: ClienteRow) => void;
}

export function ClienteSelector({ value, onChange }: ClienteSelectorProps) {
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome_cliente, nome_clinica, cidade, especialidade, especialidade_clinica")
      .order("nome_cliente");
    if (error) toast.error("Erro ao carregar clientes: " + error.message);
    setClientes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Label className="text-xs font-semibold text-quase-preto">Cliente vinculado</Label>
        <Select
          value={value ?? ""}
          onValueChange={(v) => {
            const c = clientes.find((x) => x.id === v);
            onChange(v || null, c);
          }}
        >
          <SelectTrigger className="mt-1.5 h-10">
            <SelectValue placeholder={loading ? "Carregando…" : "Selecione um cliente"} />
          </SelectTrigger>
          <SelectContent>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome_cliente}
                {c.nome_clinica ? ` · ${c.nome_clinica}` : ""}
              </SelectItem>
            ))}
            {clientes.length === 0 && !loading && (
              <div className="px-2 py-3 text-xs text-muted-foreground">Nenhum cliente cadastrado.</div>
            )}
          </SelectContent>
        </Select>
      </div>
      <Button asChild variant="outline" size="icon" className="mb-0.5" title="Cadastrar novo lead">
        <Link to="/dashboard?novo=1">
          <Plus className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
