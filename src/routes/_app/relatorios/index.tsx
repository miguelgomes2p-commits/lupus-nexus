import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/crm/KpiCard";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, Legend, LineChart, Line, ComposedChart,
} from "recharts";
import { brl } from "@/lib/format";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Users, Repeat } from "lucide-react";

export const Route = createFileRoute("/_app/relatorios/")({ component: ReportsPage });

function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [bySrc, setBySrc] = useState<any[]>([]);
  const [byOwner, setByOwner] = useState<any[]>([]);
  const [byStage, setByStage] = useState<any[]>([]);
  const [winLoss, setWinLoss] = useState<{ name: string; value: number }[]>([]);
  const [lostReasons, setLostReasons] = useState<any[]>([]);
  const [leadsByStatus, setLeadsByStatus] = useState<any[]>([]);
  const [leadsByTemp, setLeadsByTemp] = useState<any[]>([]);
  const [pnl, setPnl] = useState<any[]>([]);
  const [costsByCat, setCostsByCat] = useState<any[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, costs: 0, fixed: 0, punctual: 0 });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [leads, opps, profiles, stages, clients, costs] = await Promise.all([
      supabase.from("leads").select("source_id, sources(name), owner_id, status, temperature, created_at, estimated_value"),
      supabase.from("opportunities").select("status, value, stage_id, lost_reason, owner_id, won_at, created_at"),
      supabase.from("profiles").select("id,name"),
      supabase.from("pipeline_stages").select("id,name,color"),
      supabase.from("clients").select("id, contract_value, monthly_recurring_revenue, started_at, status, created_at"),
      supabase.from("costs" as any).select("amount, cost_type, category, incurred_at"),
    ]);
    const profMap = new Map((profiles.data ?? []).map((p: any) => [p.id, p.name]));
    const stageMap = new Map((stages.data ?? []).map((s: any) => [s.id, s]));

    // Origem
    const srcMap = new Map<string, number>();
    (leads.data ?? []).forEach((l: any) => {
      const n = l.sources?.name ?? "Sem origem";
      srcMap.set(n, (srcMap.get(n) ?? 0) + 1);
    });
    setBySrc(Array.from(srcMap, ([name, value]) => ({ name, value })));

    // Status / Temperatura dos leads
    const stMap = new Map<string, number>();
    const tempMap = new Map<string, number>();
    (leads.data ?? []).forEach((l: any) => {
      stMap.set(l.status, (stMap.get(l.status) ?? 0) + 1);
      tempMap.set(l.temperature, (tempMap.get(l.temperature) ?? 0) + 1);
    });
    setLeadsByStatus(Array.from(stMap, ([name, value]) => ({ name, value })));
    setLeadsByTemp(Array.from(tempMap, ([name, value]) => ({ name, value })));

    // Ranking
    const ownerMap = new Map<string, number>();
    (opps.data ?? []).filter((o: any) => o.status === "ganha").forEach((o: any) => {
      const n = profMap.get(o.owner_id) ?? "Sem responsável";
      ownerMap.set(n as string, (ownerMap.get(n as string) ?? 0) + Number(o.value));
    });
    setByOwner(Array.from(ownerMap, ([name, value]) => ({ name, value })));

    // Pipeline por etapa
    const stgMap = new Map<string, { name: string; count: number; value: number; color: string }>();
    (opps.data ?? []).forEach((o: any) => {
      const st: any = stageMap.get(o.stage_id);
      if (!st) return;
      const cur = stgMap.get(st.id) ?? { name: st.name, count: 0, value: 0, color: st.color };
      cur.count += 1; cur.value += Number(o.value);
      stgMap.set(st.id, cur);
    });
    setByStage(Array.from(stgMap.values()));

    const won = (opps.data ?? []).filter((o: any) => o.status === "ganha").length;
    const lost = (opps.data ?? []).filter((o: any) => o.status === "perdida").length;
    setWinLoss([{ name: "Ganhas", value: won }, { name: "Perdidas", value: lost }]);

    const reasons = new Map<string, number>();
    (opps.data ?? []).filter((o: any) => o.status === "perdida" && o.lost_reason).forEach((o: any) => {
      reasons.set(o.lost_reason, (reasons.get(o.lost_reason) ?? 0) + 1);
    });
    setLostReasons(Array.from(reasons, ([name, value]) => ({ name, value })));

    // === ENTRADAS x SAÍDAS (P&L mensal últimos 12 meses) ===
    const months: { key: string; label: string; revenue: number; costs: number; profit: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(startOfMonth(new Date()), i);
      months.push({ key: format(d, "yyyy-MM"), label: format(d, "MMM/yy", { locale: ptBR }), revenue: 0, costs: 0, profit: 0 });
    }
    // Receita: oportunidades ganhas pelo won_at + MRR de clientes ativos
    (opps.data ?? []).filter((o: any) => o.status === "ganha" && o.won_at).forEach((o: any) => {
      const k = format(parseISO(o.won_at), "yyyy-MM");
      const m = months.find((mo) => mo.key === k);
      if (m) m.revenue += Number(o.value);
    });
    // MRR de clientes ativos espalhado por todos os meses ativos
    const totalMrr = (clients.data ?? []).filter((c: any) => c.status === "ativo")
      .reduce((a: number, c: any) => a + Number(c.monthly_recurring_revenue ?? 0), 0);
    months.forEach((m) => { m.revenue += totalMrr; });

    // Custos: pontuais somam no mês incurred_at; fixos somam em todos os meses
    const fixedTotal = (costs.data ?? []).filter((c: any) => c.cost_type === "fixo")
      .reduce((a: number, c: any) => a + Number(c.amount), 0);
    months.forEach((m) => { m.costs += fixedTotal; });
    (costs.data ?? []).filter((c: any) => c.cost_type === "pontual").forEach((c: any) => {
      const k = format(parseISO(c.incurred_at), "yyyy-MM");
      const m = months.find((mo) => mo.key === k);
      if (m) m.costs += Number(c.amount);
    });
    months.forEach((m) => { m.profit = m.revenue - m.costs; });
    setPnl(months);

    // Custos por categoria
    const catMap = new Map<string, number>();
    (costs.data ?? []).forEach((c: any) => {
      const k = c.category ?? "Sem categoria";
      catMap.set(k, (catMap.get(k) ?? 0) + Number(c.amount));
    });
    setCostsByCat(Array.from(catMap, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

    const totalRevenue = (opps.data ?? []).filter((o: any) => o.status === "ganha").reduce((a: number, o: any) => a + Number(o.value), 0);
    const totalCosts = (costs.data ?? []).reduce((a: number, c: any) => a + Number(c.amount), 0);
    const fixed = (costs.data ?? []).filter((c: any) => c.cost_type === "fixo").reduce((a: number, c: any) => a + Number(c.amount), 0);
    const punctual = totalCosts - fixed;
    setTotals({ revenue: totalRevenue, costs: totalCosts, fixed, punctual });

    setLoading(false);
  }

  const margin = useMemo(() => {
    if (totals.revenue === 0) return 0;
    return Math.round(((totals.revenue - totals.costs) / totals.revenue) * 100);
  }, [totals]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader title="Relatórios" description="Análises estratégicas — performance comercial e financeira" />

      {/* P&L KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Receita acumulada" value={brl(totals.revenue)} icon={TrendingUp} accent="success" />
        <KpiCard label="Custos acumulados" value={brl(totals.costs)} icon={TrendingDown} accent="primary" />
        <KpiCard label="Resultado" value={brl(totals.revenue - totals.costs)} icon={DollarSign}
          accent={totals.revenue - totals.costs >= 0 ? "success" : "primary"} />
        <KpiCard label="Margem" value={`${margin}%`} icon={Wallet} accent={margin >= 0 ? "success" : "primary"} />
      </div>

      {/* P&L mensal */}
      <Card className="p-5 glass mb-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Entradas × Saídas (12 meses) — receita de clientes/oportunidades vs. custos
        </h3>
        {pnl.every((p) => p.revenue === 0 && p.costs === 0) ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Sem dados financeiros suficientes.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={pnl}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
              <XAxis dataKey="label" stroke="oklch(0.65 0 0)" fontSize={11} />
              <YAxis stroke="oklch(0.65 0 0)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} formatter={(v: any) => brl(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Entradas" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="costs" name="Saídas" fill="#E10600" radius={[6, 6, 0, 0]} />
              <Line type="monotone" dataKey="profit" name="Resultado" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custos por categoria */}
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Custos por Categoria</h3>
          {costsByCat.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> :
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={costsByCat} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
                <XAxis type="number" stroke="oklch(0.65 0 0)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="oklch(0.65 0 0)" fontSize={11} width={110} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} formatter={(v: any) => brl(Number(v))} />
                <Bar dataKey="value" fill="#E10600" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>}
        </Card>

        {/* Fixos vs Pontuais */}
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Custos: Fixos vs Pontuais</h3>
          {totals.fixed === 0 && totals.punctual === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> :
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={[{ name: "Fixos", value: totals.fixed }, { name: "Pontuais", value: totals.punctual }]}
                  dataKey="value" nameKey="name" outerRadius={90} label={(e: any) => brl(e.value)}>
                  <Cell fill="#3B82F6" /><Cell fill="#F59E0B" />
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} formatter={(v: any) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>}
        </Card>

        {/* Leads por origem */}
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Leads por Origem</h3>
          {bySrc.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> :
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bySrc}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
                <XAxis dataKey="name" stroke="oklch(0.65 0 0)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0 0)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#E10600" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>}
        </Card>

        {/* Leads por status */}
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Leads por Status</h3>
          {leadsByStatus.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> :
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={leadsByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
                <XAxis dataKey="name" stroke="oklch(0.65 0 0)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0 0)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>}
        </Card>

        {/* Leads por temperatura */}
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Leads por Temperatura</h3>
          {leadsByTemp.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> :
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={leadsByTemp} dataKey="value" nameKey="name" outerRadius={90} label>
                  {leadsByTemp.map((t, i) => (
                    <Cell key={i} fill={t.name === "quente" ? "#E10600" : t.name === "morno" ? "#F59E0B" : "#3B82F6"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>}
        </Card>

        {/* Ranking */}
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Ranking — Vendas por Responsável</h3>
          {byOwner.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> :
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byOwner} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
                <XAxis type="number" stroke="oklch(0.65 0 0)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="oklch(0.65 0 0)" fontSize={11} width={80} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} formatter={(v: any) => brl(Number(v))} />
                <Bar dataKey="value" fill="#10B981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>}
        </Card>

        {/* Pipeline por etapa */}
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Pipeline por Etapa (valor)</h3>
          {byStage.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> :
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
                <XAxis dataKey="name" stroke="oklch(0.65 0 0)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0 0)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} formatter={(v: any) => brl(Number(v))} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {byStage.map((s, i) => <Cell key={i} fill={s.color || "#E10600"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>}
        </Card>

        {/* Win/Loss */}
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Ganhas vs Perdidas</h3>
          {winLoss[0]?.value === 0 && winLoss[1]?.value === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> :
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={winLoss} dataKey="value" nameKey="name" outerRadius={90}>
                  <Cell fill="#10B981" /><Cell fill="#E10600" />
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>}
        </Card>

        <Card className="p-5 glass lg:col-span-2">
          <h3 className="font-semibold mb-4">Motivos de Perda</h3>
          {lostReasons.length === 0 ? <p className="text-sm text-muted-foreground">Sem registros.</p> :
            <ul className="divide-y divide-border">
              {lostReasons.sort((a, b) => b.value - a.value).map((r) => (
                <li key={r.name} className="flex justify-between py-2 text-sm">
                  <span>{r.name}</span><span className="font-semibold text-primary">{r.value}</span>
                </li>
              ))}
            </ul>}
        </Card>
      </div>
    </div>
  );
}
