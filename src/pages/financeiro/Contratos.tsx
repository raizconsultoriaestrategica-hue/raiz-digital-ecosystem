import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Pencil, Plus, X } from "lucide-react";

interface Cliente { id: string; nome_cliente: string }
interface Contrato {
  id: string;
  cliente_id: string | null;
  cliente_nome: string;
  plano: string;
  valor_mensal: number;
  data_inicio: string;
  data_fim: string | null;
  status: string;
}

const STATUS_OPTS = [
  { value: "ativo", label: "Ativo" },
  { value: "renovacao_pendente", label: "Renovação pendente" },
  { value: "encerrado", label: "Encerrado" },
];

const statusBadge = (s: string) => {
  if (s === "ativo") return <Badge className="bg-verde-raiz text-linho hover:bg-verde-raiz">Ativo</Badge>;
  if (s === "renovacao_pendente") return <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">Renovação pendente</Badge>;
  return <Badge variant="secondary">Encerrado</Badge>;
};

const fmtBRL = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [form, setForm] = useState({
    cliente_id: "",
    cliente_nome: "",
    plano: "",
    valor_mensal: "",
    data_inicio: "",
    data_fim: "",
    status: "ativo",
  });

  const load = async () => {
    const { data } = await (supabase as any)
      .from("contratos_raiz")
      .select("*")
      .order("created_at", { ascending: false });
    setContratos(data ?? []);
  };

  useEffect(() => {
    load();
    supabase.from("clientes").select("id,nome_cliente").order("nome_cliente").then(({ data }) => {
      setClientes((data as Cliente[]) ?? []);
    });
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ cliente_id: "", cliente_nome: "", plano: "", valor_mensal: "", data_inicio: "", data_fim: "", status: "ativo" });
    setOpen(true);
  };

  const openEdit = (c: Contrato) => {
    setEditing(c);
    setForm({
      cliente_id: c.cliente_id ?? "",
      cliente_nome: c.cliente_nome,
      plano: c.plano,
      valor_mensal: String(c.valor_mensal),
      data_inicio: c.data_inicio,
      data_fim: c.data_fim ?? "",
      status: c.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.cliente_nome || !form.plano || !form.data_inicio) {
      toast({ title: "Preencha cliente, plano e data de início.", variant: "destructive" });
      return;
    }
    const payload: any = {
      cliente_id: form.cliente_id || null,
      cliente_nome: form.cliente_nome,
      plano: form.plano,
      valor_mensal: Number(form.valor_mensal || 0),
      data_inicio: form.data_inicio,
      data_fim: form.data_fim || null,
      status: form.status,
    };
    const q = editing
      ? (supabase as any).from("contratos_raiz").update(payload).eq("id", editing.id)
      : (supabase as any).from("contratos_raiz").insert(payload);
    const { error } = await q;
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Contrato atualizado" : "Contrato criado" });
    setOpen(false);
    load();
  };

  const encerrar = async (c: Contrato) => {
    const { error } = await (supabase as any).from("contratos_raiz").update({ status: "encerrado", data_fim: new Date().toISOString().slice(0, 10) }).eq("id", c.id);
    if (error) {
      toast({ title: "Erro ao encerrar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contrato encerrado" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-verde-raiz hover:bg-verde-raiz/90">
              <Plus className="mr-2 h-4 w-4" /> Novo contrato
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar contrato" : "Novo contrato"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Cliente</Label>
                <Select
                  value={form.cliente_id || "__livre__"}
                  onValueChange={(v) => {
                    if (v === "__livre__") {
                      setForm({ ...form, cliente_id: "" });
                    } else {
                      const c = clientes.find((x) => x.id === v);
                      setForm({ ...form, cliente_id: v, cliente_nome: c?.nome_cliente ?? form.cliente_nome });
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__livre__">— Digitar nome livremente —</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome do cliente (registro)</Label>
                <Input value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Plano</Label>
                  <Input value={form.plano} onChange={(e) => setForm({ ...form, plano: e.target.value })} placeholder="Crescimento, Expansão…" />
                </div>
                <div>
                  <Label>Valor mensal</Label>
                  <Input type="number" step="0.01" value={form.valor_mensal} onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data início</Label>
                  <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
                </div>
                <div>
                  <Label>Data fim</Label>
                  <Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} className="bg-verde-raiz hover:bg-verde-raiz/90">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor mensal</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contratos.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum contrato cadastrado.</TableCell></TableRow>
              )}
              {contratos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.cliente_nome}</TableCell>
                  <TableCell>{c.plano}</TableCell>
                  <TableCell>{fmtBRL(c.valor_mensal)}</TableCell>
                  <TableCell>{fmtDate(c.data_inicio)}</TableCell>
                  <TableCell>{fmtDate(c.data_fim)}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    {c.status !== "encerrado" && (
                      <Button variant="ghost" size="sm" onClick={() => encerrar(c)}><X className="h-4 w-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
