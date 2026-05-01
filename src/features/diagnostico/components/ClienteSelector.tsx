import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export interface ClienteRow {
  id: string;
  nome_cliente: string;
  nome_clinica: string | null;
  cidade: string | null;
  especialidade?: string | null;
}

interface ClienteSelectorProps {
  value: string | null;
  onChange: (id: string | null, cliente?: ClienteRow) => void;
}

export function ClienteSelector({ value, onChange }: ClienteSelectorProps) {
  const { role } = useAuth();
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState({ email: "", nome_cliente: "", nome_clinica: "", cidade: "" });
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome_cliente, nome_clinica, cidade, especialidade")
      .order("nome_cliente");
    if (error) toast.error("Erro ao carregar clientes: " + error.message);
    setClientes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!novo.nome_cliente.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    if (!novo.email.trim() || !/^\S+@\S+\.\S+$/.test(novo.email.trim())) {
      toast.error("Informe um email válido");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("create-cliente", {
      body: {
        email: novo.email.trim(),
        nome_cliente: novo.nome_cliente.trim(),
        nome_clinica: novo.nome_clinica.trim() || null,
        cidade: novo.cidade.trim() || null,
      },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      let msg = (data as any)?.error ?? "";
      if (!msg) {
        try {
          const parsed = await (error as any)?.context?.json?.();
          msg = parsed?.error ?? error?.message ?? "Erro ao criar cliente";
        } catch {
          msg = error?.message ?? "Erro ao criar cliente";
        }
      }
      toast.error(msg);
      return;
    }
    const cliente = (data as any)?.cliente as ClienteRow | undefined;
    const email = (data as any)?.email as string | undefined;
    const senha = (data as any)?.senha_provisoria as string | undefined;
    if (cliente) {
      toast.success(`Cliente criado. Acesso: ${email} · Senha: ${senha}`, { duration: 8000 });
      setClientes((prev) => [...prev, cliente].sort((a, b) => a.nome_cliente.localeCompare(b.nome_cliente)));
      onChange(cliente.id, cliente);
      setOpen(false);
      setNovo({ email: "", nome_cliente: "", nome_clinica: "", cidade: "" });
    }
  };

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
      {role === "admin" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="mb-0.5">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
              <DialogDescription>Cadastra um cliente que será vinculado ao diagnóstico.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Email de acesso *</Label>
                <Input
                  type="email"
                  value={novo.email}
                  onChange={(e) => setNovo({ ...novo, email: e.target.value })}
                  placeholder="cliente@exemplo.com"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Senha provisória: <span className="font-mono">Raiz@2026</span>
                </p>
              </div>
              <div>
                <Label>Nome do responsável *</Label>
                <Input value={novo.nome_cliente} onChange={(e) => setNovo({ ...novo, nome_cliente: e.target.value })} />
              </div>
              <div>
                <Label>Nome da clínica</Label>
                <Input value={novo.nome_clinica} onChange={(e) => setNovo({ ...novo, nome_clinica: e.target.value })} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={novo.cidade} onChange={(e) => setNovo({ ...novo, cidade: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Salvando…" : "Criar cliente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
