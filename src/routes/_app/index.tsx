import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/crm/KpiCard";
import { PageHeader } from "@/components/crm/PageHeader";
import { SkeletonGrid, SkeletonCard } from "@/components/crm/SkeletonCard";
import { Card } from "@/components/ui/card";
import { AlertCard } from "@/components/crm/AlertCard";
import { EmptyState } from "@/components/crm/EmptyState";
import {
  Building2, CheckSquare, DollarSign, Receipt, Wallet, TrendingUp, TrendingDown,
  AlertTriangle, Repeat, CalendarClock, FileBarChart, Users,
} from "lucide-react";
import { brl } from "@/lib/format";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ComposedChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import { format, parseISO, isPast, isToday, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    clients: any[]; invoices: any[]; tasks: any[]; costs: any[];
    cash: any[]; closings: any[];
  } | null>(null);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("erp-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "client_invoices" as any }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "costs" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function load() {
    setLoading(true);
    const [clients, invoices, tasks, costs, cash, closings] = await Promise.all([
      supabase.from("clients").select("id,company_name,status,monthly_recurring_revenue,contract_value,contract_start_date").limit(1000),
      (supabase as any).from("client_invoices").select("*").order("due_date", { ascending: false }).limit(1000),
      supabase.from("tasks").select("*").limit(500),
      supabase.from("costs" as any).select("amount, cost_type, category, incurred_at").limit(1000),
      supabase.from("cash_entries" as any).select("*").order("entry_date", { ascending: false }).limit(500),
      supabase.from("monthly_closings" as any).select("*").order("reference_month", { ascending: false }).limit(12),
    ]);
    setData({
      clients: clients.data ?? [], invoices: invoices.data ?? [], tasks: tasks.data ?? [],
      costs: costs.data ?? [], cash: cash.data ?? [], closings: closings.data ?? [],
    });
    setLoading(false);
  }

  const c = useMemo(() => {
    if (!data) return null;
    const activeClients = data.clients.filter((x) => x.status === "ativo");
    const mrr = activeClients.reduce((a, x) => a + Number(x.monthly_recurring_revenue || x.contract_value || 0), 0);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);
    const in7Str = in7.toISOString().slice(0, 10);

    const pendentes = data.invoices.filter((i) => i.status === "pendente_nfe");
    const pagas = data.invoices.filter((i) => i.status === "pago");
    const overdueInv = pendentes.filter((i) => i.due_date < todayStr);
    const upcomingInv = pendentes.filter((i) => i.due_date >= todayStr && i.due_date <= in7Str);

    const totalPendente = pendentes.reduce((a, i) => a + Number(i.amount), 0);
    const totalOverdue = overdueInv.reduce((a, i) => a + Number(i.amount), 0);
    const totalUpcoming = upcomingInv.reduce((a, i) => a + Number(i.amount), 0);

    const currentMonth = today.toISOString().slice(0, 7);
    const paidThisMonth = pagas.filter((i) => (i.paid_at ?? "").startsWith(currentMonth))
      .reduce((a, i) => a + Number(i.amount), 0);

    const overdueTasks = data.tasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada" && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
    const todayTasks = data.tasks.filter((t) => t.status !== "concluida" && t.due_date && isToday(new Date(t.due_date)));

    // 12-month P&L from closings + cash
    const months: { key: string; label: string; entradas: number; saidas: number; liquido: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(startOfMonth(today), i);
      months.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM/yy", { locale: ptBR }), entradas: 0, saidas: 0, liquido: 0 });
    }
    (data.closings ?? []).forEach((cl: any) => {
      const k = (cl.reference_month as string).slice(0, 7);
      const m = months.find((x) => x.key === k);
      if (m) { m.entradas = Number(cl.total_in); m.saidas = Number(cl.total_out); m.liquido = Number(cl.net_result); }
    });

    // Costs breakdown current month
    const costsFixed = data.costs.filter((c: any) => c.cost_type === "fixo").reduce((a: number, c: any) => a + Number(c.amount), 0);
    const costsPunctual = data.costs.filter((c: any) => c.cost_type === "pontual" && (c.incurred_at ?? "").startsWith(currentMonth))
      .reduce((a: number, c: any) => a + Number(c.amount), 0);

    return {
      activeClients: activeClients.length,
      totalClients: data.clients.length,
      mrr,
      arr: mrr * 12,
      pendentes: pendentes.length,
      totalPendente,
      overdueInv: overdueInv.length,
      totalOverdue,
      upcomingInv: upcomingInv.length,
      totalUpcoming,
      pagasMes: pagas.filter((i) => (i.paid_at ?? "").startsWith(currentMonth)).length,
      paidThisMonth,
      overdueTasks,
      todayTasks,
      months,
      costsFixed,
      costsPunctual,
      upcomingList: upcomingInv.slice(0, 8).map((i) => ({
        ...i,
        client: data.clients.find((c) => c.id === i.client_id),
      })),
      overdueList: overdueInv.slice(0, 5).map((i) => ({
        ...i,
        client: data.clients.find((c) => c.id === i.client_id),
      })),
    };
  }, [data]);

  if (loading || !c) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="SCL · Central financeira da Lupus Assessoria" />
        <SkeletonGrid count={8} />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="SCL · Central financeira da Lupus Assessoria — visão em tempo real" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <KpiCard label="Clientes ativos" value={c.activeClients} icon={Building2} accent="success" />
        <KpiCard label="Total clientes" value={c.totalClients} icon={Users} accent="info" />
        <KpiCard label="MRR" value={brl(c.mrr)} icon={Repeat} accent="success" />
        <KpiCard label="ARR" value={brl(c.arr)} icon={TrendingUp} accent="success" />
        <KpiCard label="Pago no mês" value={brl(c.paidThisMonth)} icon={DollarSign} accent="success" />
        <KpiCard label="Faturas pagas (mês)" value={c.pagasMes} icon={Receipt} accent="info" />
        <KpiCard label="Pendentes NFE" value={c.pendentes} icon={AlertTriangle} accent="warning" />
        <KpiCard label="Valor pendente" value={brl(c.totalPendente)} icon={Wallet} accent="warning" />
        <KpiCard label="Vencidas" value={c.overdueInv} icon={TrendingDown} accent="primary" />
        <KpiCard label="Valor vencido" value={brl(c.totalOverdue)} icon={DollarSign} accent="primary" />
        <KpiCard label="Vence em 7 dias" value={brl(c.totalUpcoming)} icon={CalendarClock} accent="info" />
        <KpiCard label="Tarefas atrasadas" value={c.overdueTasks.length} icon={CheckSquare} accent="primary" />
      </div>

      {/* Alertas */}
      {(c.overdueInv > 0 || c.overdueTasks.length > 0 || c.upcomingInv > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {c.overdueInv > 0 && (
            <AlertCard variant="critical" title="Faturas vencidas" count={c.overdueInv}
              description={`${brl(c.totalOverdue)} em faturas com vencimento passado, aguardando NFE`} to="/clientes" />
          )}
          {c.upcomingInv > 0 && (
            <AlertCard variant="warning" title="Vencem em 7 dias" count={c.upcomingInv}
              description={`${brl(c.totalUpcoming)} em faturas pendentes de NFE`} to="/clientes" />
          )}
          {c.overdueTasks.length > 0 && (
            <AlertCard variant="warning" title="Tarefas atrasadas" count={c.overdueTasks.length}
              description="Tarefas operacionais com prazo vencido" to="/tarefas" />
          )}
        </div>
      )}

      {/* P&L 12 meses */}
      <Card className="p-5 glass">
        <div className="flex items-center gap-2 mb-4">
          <FileBarChart className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Fechamento mensal — Entradas × Saídas (12 meses)</h3>
        </div>
        {c.months.every((m) => m.entradas === 0 && m.saidas === 0) ? (
          <EmptyState title="Sem fechamentos" description="Gere os fechamentos mensais em Fechamento & Caixa." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={c.months}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
              <XAxis dataKey="label" stroke="oklch(0.65 0 0)" fontSize={11} />
              <YAxis stroke="oklch(0.65 0 0)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }}
                formatter={(v: any) => brl(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="entradas" name="Entradas" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#E10600" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="liquido" name="Líquido" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Faturas pendentes + Custos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-2 glass">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Faturas próximas & vencidas</h3>
          </div>
          {c.overdueList.length === 0 && c.upcomingList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma fatura pendente próxima do vencimento.</p>
          ) : (
            <ul className="space-y-2">
              {[...c.overdueList, ...c.upcomingList].map((inv) => (
                <li key={inv.id} className={`flex items-center gap-3 p-3 rounded-lg border ${inv.due_date < new Date().toISOString().slice(0, 10) ? "border-primary/40 bg-primary/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {inv.client ? (
                        <Link to="/clientes/$id" params={{ id: inv.client.id }} className="hover:text-primary">
                          {inv.client.company_name}
                        </Link>
                      ) : "Cliente removido"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Ref. {format(parseISO(inv.reference_month), "MMM/yyyy", { locale: ptBR })} · Vence {format(parseISO(inv.due_date), "dd/MM/yyyy")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold tabular-nums">{brl(inv.amount)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">Pendente NFE</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 glass">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Custos do mês</h3>
          </div>
          {c.costsFixed === 0 && c.costsPunctual === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem custos cadastrados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={[{ name: "Fixos", value: c.costsFixed }, { name: "Pontuais (mês)", value: c.costsPunctual }]}
                  dataKey="value" nameKey="name" outerRadius={80} label={(e: any) => brl(e.value)}>
                  <Cell fill="#3B82F6" /><Cell fill="#F59E0B" />
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.18 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }}
                  formatter={(v: any) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
