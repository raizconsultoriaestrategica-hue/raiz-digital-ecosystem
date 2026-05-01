import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";

interface Conta {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  vencimento: string;
  recorrencia: string;
  status: string;
  data_pagamento: string | null;
}

const fmtBRL = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

const CATEGORIAS = [
  { value: "ferramenta", label: "Ferramenta" },
  { value: "freelancer", label: "Freelancer" },
  { value: "fixo", label: "Fixo" },
  { value: "avulso", label: "Avulso" },
];
const RECORRENCIAS = [
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
  { value: "unico", label: "Único" },
];

const statusBadge = (s: string) =>
  s === "pago"
    ? <Badge className="bg-verde-raiz text-linho hover:bg-verde-raiz">Pago</Badge>
    : <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">Pendente</Badge>;

export default function ContasPagar() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [filterCat, setFilterCat] = useState("todas");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    descricao: "",
    categoria: "avulso",
    valor: "",
    vencimento: "",
    recorrencia: "unico",
    status: "pendente",
  });

  const load = async () => {
    const { data } = await (supabase as any).from("contas_pagar_raiz").select("*").order("vencimento", { ascending: true });
    setContas(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => contas.filter((c) => {
    if (filterCat !== "todas" && c.categoria !== filterCat) return false;
    if (filterStatus !== "todos" && c.status !== filterStatus) return false;
    return true;
  }), [contas, filterCat, filterStatus]);

  const proximas = useMemo(() => {
    const now = new Date();
    const limit = new Date();
    limit.setDate(now.getDate() + 7);
    return contas.filter((c) => {
      if (c.status === "pago") return false;
      const v = new Date(c.vencimento + "T00:00:00");
      return v >= now && v <= limit;
    });
  }, [contas]);

  const save = async () => {
    if (!form.descricao || !form.vencimento) {
      toast({ title: "Preencha descrição e vencimento.", variant: "destructive" });
      return;
    }
    const payload: any = {
      descricao: form.descricao,
      categoria: form.categoria,
      valor: Number(form.valor || 0),
      vencimento: form.vencimento,
      recorrencia: form.recorrencia,
      status: form.status,
    };
    const { error } = await (supabase as any).from("contas_pagar_raiz").insert(payload);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Conta cadastrada" });
    setOpen(false);
    setForm({ descricao: "", categoria: "avulso", valor: "", vencimento: "", recorrencia: "unico", status: "pendente" });
    load();
  };

  const marcarPago = async (c: Conta) => {
    const { error } = await (supabase as any).from("contas_pagar_raiz").update({
      status: "pago",
      data_pagamento: new Date().toISOString().slice(0, 10),
    }).eq("id", c.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    load();
  };

  return (
    <div className="space-y-4">
      {proximas.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{proximas.length} conta(s) vencem nos próximos 7 dias.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {CATEGORIAS.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-verde-raiz hover:bg-verde-raiz/90"><Plus className="mr-2 h-4 w-4" /> Nova conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova conta a pagar</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Descrição</Label>
                <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Vencimento</Label>
                  <Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
                </div>
                <div>
                  <Label>Recorrência</Label>
                  <Select value={form.recorrencia} onValueChange={(v) => setForm({ ...form, recorrencia: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RECORRENCIAS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
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
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Recorrência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhuma conta.</TableCell></TableRow>
              )}
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.descricao}</TableCell>
                  <TableCell className="capitalize">{c.categoria}</TableCell>
                  <TableCell>{fmtBRL(c.valor)}</TableCell>
                  <TableCell>{fmtDate(c.vencimento)}</TableCell>
                  <TableCell className="capitalize">{c.recorrencia}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell className="text-right">
                    {c.status !== "pago" && (
                      <Button variant="ghost" size="sm" onClick={() => marcarPago(c)}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
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
