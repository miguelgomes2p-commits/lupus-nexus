import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/crm/KpiCard";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, Legend, ComposedChart, Line,
} from "recharts";
import { brl } from "@/lib/format";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Users, Repeat, Receipt } from "lucide-react";

export const Route = createFileRoute("/_app/relatorios/")({ component: ReportsPage });

function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [pnl, setPnl] = useState<any[]>([]);
  const [costsByCat, setCostsByCat] = useState<any[]>([]);
  const [invoiceStatus, setInvoiceStatus] = useState<any[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, costs: 0, fixed: 0, punctual: 0, pending: 0, overdue: 0 });
  const [mrr, setMrr] = useState({ total: 0, activeClients: 0, avgTicket: 0, annualized: 0 });
  const [mrrByClient, setMrrByClient] = useState<any[]>([]);

  useEffect(() => {
    load();
    const ch = supabase.channel("relatorios-erp")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "costs" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "client_invoices" as any }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function load() {
    setLoading(true);
    const [clients, costs, invoices, closings] = await Promise.all([
      supabase.from("clients").select("id, company_name, trade_name, contract_value, monthly_recurring_revenue, status"),
      supabase.from("costs" as any).select("amount, cost_type, category, incurred_at"),
      (supabase as any).from("client_invoices").select("amount, status, due_date, paid_at, reference_month"),
      (supabase as any).from("monthly_closings").select("reference_month, total_in, total_out, net_result").order("reference_month", { ascending: true }).limit(24),
    ]);

    // P&L: use monthly_closings (fonte oficial)
    const months: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(startOfMonth(new Date()), i);
      months.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM/yy", { locale: ptBR }), entradas: 0, saidas: 0, liquido: 0 });
    }
    (closings.data ?? []).forEach((cl: any) => {
      const k = (cl.reference_month as string).slice(0, 7);
      const m = months.find((x) => x.key === k);
      if (m) { m.entradas = Number(cl.total_in); m.saidas = Number(cl.total_out); m.liquido = Number(cl.net_result); }
    });
    setPnl(months);

    // Custos por categoria
    const catMap = new Map<string, number>();
    (costs.data ?? []).forEach((c: any) => {
      const k = c.category ?? "Sem categoria";
      catMap.set(k, (catMap.get(k) ?? 0) + Number(c.amount));
    });
    setCostsByCat(Array.from(catMap, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

    // Totais gerais
    const totalRevenue = (invoices.data ?? []).filter((i: any) => i.status === "pago").reduce((a: number, i: any) => a + Number(i.amount), 0);
    const totalCosts = (costs.data ?? []).reduce((a: number, c: any) => a + Number(c.amount), 0);
    const fixed = (costs.data ?? []).filter((c: any) => c.cost_type === "fixo").reduce((a: number, c: any) => a + Number(c.amount), 0);
    const punctual = totalCosts - fixed;
    const todayStr = new Date().toISOString().slice(0, 10);
    const pending = (invoices.data ?? []).filter((i: any) => i.status === "pendente_nfe").reduce((a: number, i: any) => a + Number(i.amount), 0);
    const overdue = (invoices.data ?? []).filter((i: any) => i.status === "pendente_nfe" && i.due_date < todayStr).reduce((a: number, i: any) => a + Number(i.amount), 0);
    setTotals({ revenue: totalRevenue, costs: totalCosts, fixed, punctual, pending, overdue });

    // Status de faturas
    const statusMap = new Map<string, number>();
    (invoices.data ?? []).forEach((i: any) => {
      statusMap.set(i.status, (statusMap.get(i.status) ?? 0) + 1);
    });
    setInvoiceStatus(Array.from(statusMap, ([name, value]) => ({ name, value })));

    // MRR
    const mrrOf = (c: any) => {
      const m = Number(c.monthly_recurring_revenue ?? 0);
      if (m > 0) return m;
      return Number(c.contract_value ?? 0);
    };
    const activeClients = (clients.data ?? []).filter((c: any) => c.status === "ativo");
    const mrrTotal = activeClients.reduce((a: number, c: any) => a + mrrOf(c), 0);
    setMrr({
      total: mrrTotal,
      activeClients: activeClients.length,
      avgTicket: activeClients.length > 0 ? mrrTotal / activeClients.length : 0,
      annualized: mrrTotal * 12,
    });
    setMrrByClient(activeClients.map((c: any) => ({
      name: c.trade_name || c.company_name || "Sem nome",
      value: mrrOf(c),
      fallback: !(Number(c.monthly_recurring_revenue ?? 0) > 0) && Number(c.contract_value ?? 0) > 0,
    })).sort((a: any, b: any) => b.value - a.value));

    setLoading(false);
  }

  const margin = useMemo(() => {
    if (totals.revenue === 0) return 0;
    return Math.round(((totals.revenue - totals.costs) / totals.revenue) * 100);
  }, [totals]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader title="Relatórios" description="SCL · Análise financeira Lupus Assessoria — MRR, P&L e faturas" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Receita paga (acum.)" value={brl(totals.revenue)} icon={TrendingUp} accent="success" />
        <KpiCard label="Custos acumulados" value={brl(totals.costs)} icon={TrendingDown} accent="primary" />
        <KpiCard label="Resultado" value={brl(totals.revenue - totals.costs)} icon={DollarSign}
          accent={totals.revenue - totals.costs >= 0 ? "success" : "primary"} />
        <KpiCard label="Margem" value={`${margin}%`} icon={Wallet} accent={margin >= 0 ? "success" : "primary"} />
      </div>

      <Card className="p-5 glass mb-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Entradas × Saídas (12 meses) — baseado nos fechamentos mensais
        </h3>
        {pnl.every((p) => p.entradas === 0 && p.saidas === 0) ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Sem fechamentos gerados ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={pnl}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
              <XAxis dataKey="label" stroke="oklch(0.65 0 0)" fontSize={11} />
              <YAxis stroke="oklch(0.65 0 0)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} formatter={(v: any) => brl(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="entradas" name="Entradas" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#E10600" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="liquido" name="Líquido" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-5 glass mb-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" />
          Faturamento mensal recorrente — Clientes ativos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <KpiCard label="MRR total" value={brl(mrr.total)} icon={Repeat} accent="success" />
          <KpiCard label="Clientes ativos" value={String(mrr.activeClients)} icon={Users} accent="primary" />
          <KpiCard label="Ticket médio" value={brl(mrr.avgTicket)} icon={Wallet} accent="primary" />
          <KpiCard label="Projeção anual (ARR)" value={brl(mrr.annualized)} icon={TrendingUp} accent="success" />
        </div>
        {mrrByClient.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum cliente ativo com MRR cadastrado.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, mrrByClient.length * 30)}>
            <BarChart data={mrrByClient.map((c: any) => ({ ...c, name: c.fallback ? `${c.name} *` : c.name }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
              <XAxis type="number" stroke="oklch(0.65 0 0)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
              <YAxis type="category" dataKey="name" stroke="oklch(0.65 0 0)" fontSize={11} width={160} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} formatter={(v: any) => brl(Number(v))} />
              <Bar dataKey="value" fill="#10B981" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" />Faturas por status</h3>
          {invoiceStatus.length === 0 ? <p className="text-sm text-muted-foreground">Sem faturas.</p> : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <KpiCard label="Total pendente" value={brl(totals.pending)} icon={Wallet} accent="warning" />
                <KpiCard label="Vencido" value={brl(totals.overdue)} icon={TrendingDown} accent="primary" />
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={invoiceStatus} dataKey="value" nameKey="name" outerRadius={80} label>
                    {invoiceStatus.map((s, i) => (
                      <Cell key={i} fill={s.name === "pago" ? "#10B981" : s.name === "pendente_nfe" ? "#F59E0B" : "#6B7280"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </>
          )}
        </Card>

        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Custos por categoria</h3>
          {costsByCat.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={costsByCat} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
                <XAxis type="number" stroke="oklch(0.65 0 0)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="oklch(0.65 0 0)" fontSize={11} width={110} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} formatter={(v: any) => brl(Number(v))} />
                <Bar dataKey="value" fill="#E10600" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 glass lg:col-span-2">
          <h3 className="font-semibold mb-4">Custos: Fixos vs Pontuais</h3>
          {totals.fixed === 0 && totals.punctual === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={[{ name: "Fixos", value: totals.fixed }, { name: "Pontuais", value: totals.punctual }]}
                  dataKey="value" nameKey="name" outerRadius={90} label={(e: any) => brl(e.value)}>
                  <Cell fill="#3B82F6" /><Cell fill="#F59E0B" />
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} formatter={(v: any) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
