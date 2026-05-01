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
import { AlertTriangle, Plus, CheckCircle2 } from "lucide-react";

interface Contrato { id: string; cliente_nome: string; valor_mensal: number }
interface Pagamento {
  id: string;
  contrato_id: string | null;
  cliente_nome: string;
  mes_referencia: string;
  valor: number;
  vencimento: string;
  status: string;
  data_pagamento: string | null;
}

const fmtBRL = (n: number) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

const statusBadge = (s: string) => {
  if (s === "pago") return <Badge className="bg-verde-raiz text-linho hover:bg-verde-raiz">Pago</Badge>;
  if (s === "atrasado") return <Badge className="bg-red-600 text-white hover:bg-red-600">Atrasado</Badge>;
  return <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">Pendente</Badge>;
};

export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [filterMes, setFilterMes] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    contrato_id: "",
    cliente_nome: "",
    mes_referencia: "",
    valor: "",
    vencimento: "",
    status: "pendente",
    data_pagamento: "",
  });

  const load = async () => {
    const { data } = await (supabase as any)
      .from("pagamentos_raiz")
      .select("*")
      .order("vencimento", { ascending: false });
    setPagamentos(data ?? []);
  };

  useEffect(() => {
    load();
    (supabase as any).from("contratos_raiz").select("id,cliente_nome,valor_mensal").then(({ data }: any) => setContratos(data ?? []));
  }, []);

  const filtered = useMemo(() => {
    return pagamentos.filter((p) => {
      if (filterMes && p.mes_referencia !== filterMes) return false;
      if (filterStatus !== "todos" && p.status !== filterStatus) return false;
      return true;
    });
  }, [pagamentos, filterMes, filterStatus]);

  const atrasados = pagamentos.filter((p) => p.status === "atrasado").length;

  const save = async () => {
    if (!form.cliente_nome || !form.mes_referencia || !form.vencimento) {
      toast({ title: "Preencha cliente, mês e vencimento.", variant: "destructive" });
      return;
    }
    const payload: any = {
      contrato_id: form.contrato_id || null,
      cliente_nome: form.cliente_nome,
      mes_referencia: form.mes_referencia,
      valor: Number(form.valor || 0),
      vencimento: form.vencimento,
      status: form.status,
      data_pagamento: form.data_pagamento || null,
    };
    const { error } = await (supabase as any).from("pagamentos_raiz").insert(payload);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Pagamento registrado" });
    setOpen(false);
    setForm({ contrato_id: "", cliente_nome: "", mes_referencia: "", valor: "", vencimento: "", status: "pendente", data_pagamento: "" });
    load();
  };

  const marcarPago = async (p: Pagamento) => {
    const { error } = await (supabase as any).from("pagamentos_raiz").update({
      status: "pago",
      data_pagamento: new Date().toISOString().slice(0, 10),
    }).eq("id", p.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Pagamento marcado como pago" });
    load();
  };

  return (
    <div className="space-y-4">
      {atrasados > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{atrasados} pagamento(s) em atraso.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div>
            <Label className="text-xs">Mês (YYYY-MM)</Label>
            <Input className="w-40" placeholder="2026-05" value={filterMes} onChange={(e) => setFilterMes(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-verde-raiz hover:bg-verde-raiz/90"><Plus className="mr-2 h-4 w-4" /> Registrar pagamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>Contrato</Label>
                <Select
                  value={form.contrato_id || "__livre__"}
                  onValueChange={(v) => {
                    if (v === "__livre__") setForm({ ...form, contrato_id: "" });
                    else {
                      const c = contratos.find((x) => x.id === v);
                      setForm({ ...form, contrato_id: v, cliente_nome: c?.cliente_nome ?? form.cliente_nome, valor: c ? String(c.valor_mensal) : form.valor });
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__livre__">— Avulso —</SelectItem>
                    {contratos.map((c) => (<SelectItem key={c.id} value={c.id}>{c.cliente_nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente</Label>
                <Input value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mês referência (YYYY-MM)</Label>
                  <Input placeholder="2026-05" value={form.mes_referencia} onChange={(e) => setForm({ ...form, mes_referencia: e.target.value })} />
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
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.status === "pago" && (
                <div>
                  <Label>Data de pagamento</Label>
                  <Input type="date" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} />
                </div>
              )}
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
                <TableHead>Mês ref.</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pago em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nenhum pagamento.</TableCell></TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id} className={p.status === "atrasado" ? "bg-red-50" : ""}>
                  <TableCell className="font-medium">{p.cliente_nome}</TableCell>
                  <TableCell>{p.mes_referencia}</TableCell>
                  <TableCell>{fmtBRL(p.valor)}</TableCell>
                  <TableCell>{fmtDate(p.vencimento)}</TableCell>
                  <TableCell>{statusBadge(p.status)}</TableCell>
                  <TableCell>{fmtDate(p.data_pagamento)}</TableCell>
                  <TableCell className="text-right">
                    {p.status !== "pago" && (
                      <Button variant="ghost" size="sm" onClick={() => marcarPago(p)}>
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
