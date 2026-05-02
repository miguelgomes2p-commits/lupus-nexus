import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/crm/EmptyState";
import { KpiCard } from "@/components/crm/KpiCard";
import { Plus, Search, Wallet, Trash2, Pencil, CheckCircle2, Repeat, Zap, DollarSign, TrendingDown, Calendar } from "lucide-react";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/custos/")({ component: CostsPage });

interface Cost {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  cost_type: "fixo" | "pontual";
  recurrence: string | null;
  incurred_at: string;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
  vendor: string | null;
  payment_method: string | null;
  notes: string | null;
}

const CATEGORIES = ["Marketing", "Operacional", "Folha", "Software", "Infraestrutura", "Comercial", "Impostos", "Outros"];

function CostsPage() {
  const { user } = useAuth();
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cost | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("costs" as any).select("*").order("incurred_at", { ascending: false });
    if (error) toast.error(error.message);
    setCosts((data ?? []) as unknown as Cost[]);
    setLoading(false);
  }

  const filtered = costs.filter((c) => {
    const matchSearch = !search ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      (c.vendor ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.category ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || c.cost_type === typeFilter;
    return matchSearch && matchType;
  });

  const kpis = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const fixed = costs.filter((c) => c.cost_type === "fixo");
    const punctual = costs.filter((c) => c.cost_type === "pontual");
    const monthCosts = costs.filter((c) => parseISO(c.incurred_at) >= monthStart);
    const totalMonth = monthCosts.reduce((a, c) => a + Number(c.amount), 0);
    const fixedMonthly = fixed.reduce((a, c) => a + Number(c.amount), 0);
    const unpaid = costs.filter((c) => !c.paid).reduce((a, c) => a + Number(c.amount), 0);
    return {
      total: costs.reduce((a, c) => a + Number(c.amount), 0),
      totalMonth, fixedMonthly,
      countFixed: fixed.length, countPunctual: punctual.length,
      unpaid,
    };
  }, [costs]);

  async function save(form: FormData) {
    const cost_type = String(form.get("cost_type"));
    const payload: any = {
      description: form.get("description"),
      category: form.get("category") || null,
      amount: Number(form.get("amount") || 0),
      cost_type,
      recurrence: cost_type === "fixo" ? (form.get("recurrence") || "mensal") : null,
      incurred_at: form.get("incurred_at"),
      due_date: form.get("due_date") || null,
      paid: form.get("paid") === "on",
      paid_at: form.get("paid") === "on" ? (form.get("paid_at") || new Date().toISOString().slice(0, 10)) : null,
      vendor: form.get("vendor") || null,
      payment_method: form.get("payment_method") || null,
      notes: form.get("notes") || null,
      created_by: editing ? undefined : user?.id ?? null,
    };
    if (editing) {
      const { error } = await supabase.from("costs" as any).update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Custo atualizado");
    } else {
      const { error } = await supabase.from("costs" as any).insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Custo registrado");
    }
    setOpen(false); setEditing(null); load();
  }

  async function remove(id: string, description: string) {
    const { error } = await supabase.from("costs" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`"${description}" excluído`);
    load();
  }

  async function togglePaid(c: Cost) {
    const { error } = await supabase.from("costs" as any).update({
      paid: !c.paid,
      paid_at: !c.paid ? new Date().toISOString().slice(0, 10) : null,
    }).eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Custos"
        description="Gestão financeira de saídas — custos fixos e pontuais"
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4 mr-1" /> Novo Custo
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <KpiCard label="Total acumulado" value={brl(kpis.total)} icon={DollarSign} accent="primary" />
        <KpiCard label="Mês atual" value={brl(kpis.totalMonth)} icon={Calendar} accent="warning" />
        <KpiCard label="Fixos (recorrentes)" value={brl(kpis.fixedMonthly)} icon={Repeat} accent="info" />
        <KpiCard label="Custos pontuais" value={kpis.countPunctual} icon={Zap} accent="warning" />
        <KpiCard label="Em aberto" value={brl(kpis.unpaid)} icon={TrendingDown} accent="primary" />
      </div>

      <Card className="p-4 mb-4 glass">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por descrição, fornecedor ou categoria…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="fixo">Fixo (recorrente)</SelectItem>
              <SelectItem value="pontual">Pontual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhum custo registrado"
          description="Comece registrando seus custos para acompanhar a saúde financeira."
          action={<Button onClick={() => setOpen(true)} className="gradient-primary"><Plus className="h-4 w-4 mr-1" /> Registrar custo</Button>}
        />
      ) : (
        <Card className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium">Descrição</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Categoria</th>
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Fornecedor</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Data</th>
                  <th className="text-right p-3 font-medium">Valor</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="w-32 p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-accent/40 transition-colors">
                    <td className="p-3 font-medium">{c.description}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{c.category ?? "—"}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded ${
                        c.cost_type === "fixo" ? "bg-blue-500/15 text-blue-400" : "bg-amber-500/15 text-amber-400"
                      }`}>
                        {c.cost_type === "fixo" ? <Repeat className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                        {c.cost_type}
                        {c.cost_type === "fixo" && c.recurrence && ` · ${c.recurrence}`}
                      </span>
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{c.vendor ?? "—"}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {format(parseISO(c.incurred_at), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-primary">{brl(c.amount)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => togglePaid(c)} title={c.paid ? "Marcar como pendente" : "Marcar como pago"}>
                        {c.paid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/15 text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Pago
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-amber-500/15 text-amber-400">
                            Pendente
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-primary hover:text-primary"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir custo?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita. "{c.description}" será removido.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(c.id, c.description)} className="bg-primary text-primary-foreground">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar custo" : "Novo custo"}</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }}
            className="space-y-3 mt-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Descrição *</Label>
                <Input name="description" required defaultValue={editing?.description} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select name="cost_type" defaultValue={editing?.cost_type ?? "pontual"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Fixo (recorrente)</SelectItem>
                    <SelectItem value="pontual">Pontual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Recorrência (se fixo)</Label>
                <Select name="recurrence" defaultValue={editing?.recurrence ?? "mensal"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select name="category" defaultValue={editing?.category ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input name="amount" type="number" step="0.01" required defaultValue={editing?.amount ?? 0} />
              </div>
              <div className="space-y-1.5">
                <Label>Data do custo *</Label>
                <Input name="incurred_at" type="date" required defaultValue={editing?.incurred_at ?? new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input name="due_date" type="date" defaultValue={editing?.due_date ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Fornecedor</Label>
                <Input name="vendor" defaultValue={editing?.vendor ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Input name="payment_method" defaultValue={editing?.payment_method ?? ""} placeholder="PIX, Boleto, Cartão…" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="paid" defaultChecked={editing?.paid ?? false} className="h-4 w-4 accent-primary" />
                  Pago
                </Label>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Data do pagamento</Label>
                <Input name="paid_at" type="date" defaultValue={editing?.paid_at ?? ""} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Anotações</Label>
                <textarea name="notes" rows={3} defaultValue={editing?.notes ?? ""} className="w-full bg-input border border-border rounded-md p-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">
              {editing ? "Salvar alterações" : "Registrar custo"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
