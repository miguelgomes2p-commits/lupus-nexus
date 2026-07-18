import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { DetailTabs } from "@/components/crm/DetailTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/crm/EmptyState";
import { KpiCard } from "@/components/crm/KpiCard";
import {
  Plus, Trash2, Pencil, RefreshCw, TrendingUp, TrendingDown, DollarSign,
  CalendarCheck, Wallet, ArrowDownCircle, ArrowUpCircle, FileBarChart,
} from "lucide-react";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/fechamento/")({ component: FechamentoPage });

interface Closing {
  id: string;
  reference_month: string;
  period_start: string;
  period_end: string;
  total_in: number;
  total_out: number;
  net_result: number;
  clients_in: number;
  cash_in: number;
  costs_out: number;
  cash_out: number;
  auto_generated: boolean;
  notes: string | null;
  created_at: string;
}

interface CashEntry {
  id: string;
  entry_date: string;
  description: string;
  amount: number;
  direction: "in" | "out";
  category: string | null;
  notes: string | null;
}

const CATEGORIES = ["Receita", "Reembolso", "Investimento", "Retirada", "Ajuste", "Outros"];

function FechamentoPage() {
  return (
    <div>
      <PageHeader
        title="Fechamento & Caixa"
        description="Fechamento mensal automático (dia 16 → dia 15) e movimentações de caixa"
      />
      <DetailTabs
        tabs={[
          { id: "fechamento", label: "Fechamento", icon: FileBarChart, content: <FechamentoTab /> },
          { id: "caixa", label: "Caixa", icon: Wallet, content: <CaixaTab /> },
        ]}
      />
    </div>
  );
}

// ------------------ FECHAMENTO ------------------
function FechamentoTab() {
  const [rows, setRows] = useState<Closing[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("monthly_closings" as any)
      .select("*")
      .order("reference_month", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as Closing[]);
    setLoading(false);
  }

  async function generateNow() {
    setRunning(true);
    const { error } = await supabase.rpc("generate_monthly_closing" as any, { _reference_date: new Date().toISOString().slice(0, 10) });
    setRunning(false);
    if (error) return toast.error(error.message);
    toast.success("Fechamento gerado/atualizado com sucesso");
    load();
  }

  const kpis = useMemo(() => {
    const totalIn = rows.reduce((a, r) => a + Number(r.total_in), 0);
    const totalOut = rows.reduce((a, r) => a + Number(r.total_out), 0);
    return { totalIn, totalOut, net: totalIn - totalOut, count: rows.length };
  }, [rows]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          O fechamento automático roda <b>todo dia 15</b> considerando pagamentos entre <b>dia 16 do mês anterior</b> e <b>dia 15 do mês atual</b>.
        </p>
        <Button onClick={generateNow} disabled={running} className="gradient-primary text-primary-foreground shadow-glow">
          <RefreshCw className={`h-4 w-4 mr-1 ${running ? "animate-spin" : ""}`} />
          {running ? "Gerando..." : "Gerar fechamento agora"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Fechamentos" value={kpis.count} icon={CalendarCheck} accent="info" />
        <KpiCard label="Entradas acumuladas" value={brl(kpis.totalIn)} icon={TrendingUp} accent="success" />
        <KpiCard label="Saídas acumuladas" value={brl(kpis.totalOut)} icon={TrendingDown} accent="warning" />
        <KpiCard label="Resultado líquido" value={brl(kpis.net)} icon={DollarSign} accent={kpis.net >= 0 ? "success" : "primary"} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileBarChart}
          title="Nenhum fechamento gerado"
          description="Clique em 'Gerar fechamento agora' para consolidar o período atual."
        />
      ) : (
        <Card className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium">Mês de referência</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Período</th>
                  <th className="text-right p-3 font-medium">Clientes</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">Caixa (in)</th>
                  <th className="text-right p-3 font-medium">Custos</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">Caixa (out)</th>
                  <th className="text-right p-3 font-medium">Entradas</th>
                  <th className="text-right p-3 font-medium">Saídas</th>
                  <th className="text-right p-3 font-medium">Líquido</th>
                  <th className="text-center p-3 font-medium hidden lg:table-cell">Origem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-accent/40 transition-colors">
                    <td className="p-3 font-medium capitalize">
                      {format(parseISO(r.reference_month), "MMMM 'de' yyyy", { locale: ptBR })}
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {format(parseISO(r.period_start), "dd/MM", { locale: ptBR })} → {format(parseISO(r.period_end), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="p-3 text-right tabular-nums">{brl(r.clients_in)}</td>
                    <td className="p-3 text-right tabular-nums hidden md:table-cell">{brl(r.cash_in)}</td>
                    <td className="p-3 text-right tabular-nums">{brl(r.costs_out)}</td>
                    <td className="p-3 text-right tabular-nums hidden md:table-cell">{brl(r.cash_out)}</td>
                    <td className="p-3 text-right tabular-nums font-semibold text-emerald-400">{brl(r.total_in)}</td>
                    <td className="p-3 text-right tabular-nums font-semibold text-amber-400">{brl(r.total_out)}</td>
                    <td className={`p-3 text-right tabular-nums font-bold ${r.net_result >= 0 ? "text-emerald-400" : "text-primary"}`}>
                      {brl(r.net_result)}
                    </td>
                    <td className="p-3 text-center hidden lg:table-cell">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded ${
                        r.auto_generated ? "bg-blue-500/15 text-blue-400" : "bg-muted text-muted-foreground"
                      }`}>
                        {r.auto_generated ? "Automático" : "Manual"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ------------------ CAIXA ------------------
function CaixaTab() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CashEntry | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cash_entries" as any)
      .select("*")
      .order("entry_date", { ascending: false });
    if (error) toast.error(error.message);
    setEntries((data ?? []) as unknown as CashEntry[]);
    setLoading(false);
  }

  const kpis = useMemo(() => {
    const totalIn = entries.filter((e) => e.direction === "in").reduce((a, e) => a + Number(e.amount), 0);
    const totalOut = entries.filter((e) => e.direction === "out").reduce((a, e) => a + Number(e.amount), 0);
    return { totalIn, totalOut, balance: totalIn - totalOut };
  }, [entries]);

  async function save(form: FormData) {
    const payload: any = {
      entry_date: form.get("entry_date"),
      description: form.get("description"),
      amount: Number(form.get("amount") || 0),
      direction: String(form.get("direction")),
      category: form.get("category") || null,
      notes: form.get("notes") || null,
      created_by: editing ? undefined : user?.id ?? null,
    };
    if (editing) {
      const { error } = await supabase.from("cash_entries" as any).update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Movimentação atualizada");
    } else {
      const { error } = await supabase.from("cash_entries" as any).insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Movimentação registrada");
    }
    setOpen(false); setEditing(null); load();
  }

  async function remove(id: string, description: string) {
    const { error } = await supabase.from("cash_entries" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`"${description}" excluído`);
    load();
  }

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">Preenchimento manual das movimentações de caixa da empresa.</p>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-primary-foreground shadow-glow">
          <Plus className="h-4 w-4 mr-1" /> Nova movimentação
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Entradas" value={brl(kpis.totalIn)} icon={ArrowDownCircle} accent="success" />
        <KpiCard label="Saídas" value={brl(kpis.totalOut)} icon={ArrowUpCircle} accent="warning" />
        <KpiCard label="Saldo em caixa" value={brl(kpis.balance)} icon={Wallet} accent={kpis.balance >= 0 ? "success" : "primary"} />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma movimentação"
          description="Registre entradas e saídas manuais de caixa."
          action={<Button onClick={() => setOpen(true)} className="gradient-primary"><Plus className="h-4 w-4 mr-1" /> Nova movimentação</Button>}
        />
      ) : (
        <Card className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Descrição</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Categoria</th>
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-right p-3 font-medium">Valor</th>
                  <th className="w-32 p-3"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-accent/40 transition-colors">
                    <td className="p-3 text-muted-foreground">{format(parseISO(e.entry_date), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td className="p-3 font-medium">{e.description}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{e.category ?? "—"}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded ${
                        e.direction === "in" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                      }`}>
                        {e.direction === "in" ? <ArrowDownCircle className="h-3 w-3" /> : <ArrowUpCircle className="h-3 w-3" />}
                        {e.direction === "in" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-bold tabular-nums ${e.direction === "in" ? "text-emerald-400" : "text-amber-400"}`}>
                      {e.direction === "in" ? "+" : "−"} {brl(e.amount)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-primary hover:text-primary"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita. "{e.description}" será removida.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(e.id, e.description)} className="bg-primary text-primary-foreground">Excluir</AlertDialogAction>
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
            <SheetTitle>{editing ? "Editar movimentação" : "Nova movimentação"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Descrição *</Label>
                <Input name="description" required defaultValue={editing?.description} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select name="direction" defaultValue={editing?.direction ?? "in"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Entrada</SelectItem>
                    <SelectItem value="out">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input name="amount" type="number" step="0.01" required defaultValue={editing?.amount ?? 0} />
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input name="entry_date" type="date" required defaultValue={editing?.entry_date ?? new Date().toISOString().slice(0, 10)} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select name="category" defaultValue={editing?.category ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Anotações</Label>
                <textarea name="notes" rows={3} defaultValue={editing?.notes ?? ""} className="w-full bg-input border border-border rounded-md p-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">
              {editing ? "Salvar alterações" : "Registrar movimentação"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
