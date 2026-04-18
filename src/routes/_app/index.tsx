import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/crm/KpiCard";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Users, Target, TrendingUp, CheckSquare, AlertTriangle, DollarSign, Trophy, Activity as ActIcon } from "lucide-react";
import { brl } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

interface Stats {
  totalLeads: number;
  newLeads: number;
  openOpps: number;
  pipelineValue: number;
  wonOpps: number;
  lostOpps: number;
  conversion: number;
  overdueTasks: number;
  todayTasks: number;
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [s, setS] = useState<Stats | null>(null);
  const [byStage, setByStage] = useState<{ name: string; value: number; count: number; color: string }[]>([]);
  const [bySource, setBySource] = useState<{ name: string; value: number }[]>([]);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [hotOpps, setHotOpps] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const last30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const [
      leadsAll, leadsNew, opps, tasksOverdue, tasksToday, stages, sources, recent, hot
    ] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", last30),
      supabase.from("opportunities").select("id, value, status, stage_id, title, owner_id, last_moved_at"),
      supabase.from("tasks").select("id", { count: "exact", head: true }).lt("due_date", new Date().toISOString()).neq("status", "concluida"),
      supabase.from("tasks").select("id", { count: "exact", head: true }).gte("due_date", todayStart.toISOString()).lte("due_date", todayEnd.toISOString()).neq("status", "concluida"),
      supabase.from("pipeline_stages").select("id, name, color, order_index").eq("is_active", true).order("order_index"),
      supabase.from("leads").select("source_id, sources(name)"),
      supabase.from("leads").select("id, name, company_name, status, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("opportunities").select("id, title, value, probability, last_moved_at").eq("status", "aberta").order("value", { ascending: false }).limit(5),
    ]);

    const allOpps = opps.data ?? [];
    const open = allOpps.filter((o: any) => o.status === "aberta");
    const won = allOpps.filter((o: any) => o.status === "ganha");
    const lost = allOpps.filter((o: any) => o.status === "perdida");
    const pipelineValue = open.reduce((acc: number, o: any) => acc + Number(o.value), 0);
    const closed = won.length + lost.length;

    setS({
      totalLeads: leadsAll.count ?? 0,
      newLeads: leadsNew.count ?? 0,
      openOpps: open.length,
      pipelineValue,
      wonOpps: won.length,
      lostOpps: lost.length,
      conversion: closed > 0 ? Math.round((won.length / closed) * 100) : 0,
      overdueTasks: tasksOverdue.count ?? 0,
      todayTasks: tasksToday.count ?? 0,
    });

    setByStage(
      (stages.data ?? []).map((st: any) => {
        const stOpps = open.filter((o: any) => o.stage_id === st.id);
        return {
          name: st.name,
          count: stOpps.length,
          value: stOpps.reduce((a: number, o: any) => a + Number(o.value), 0),
          color: st.color,
        };
      })
    );

    const srcMap = new Map<string, number>();
    (sources.data ?? []).forEach((l: any) => {
      const n = l.sources?.name ?? "Sem origem";
      srcMap.set(n, (srcMap.get(n) ?? 0) + 1);
    });
    setBySource(Array.from(srcMap.entries()).map(([name, value]) => ({ name, value })));

    setRecentLeads(recent.data ?? []);
    setHotOpps(hot.data ?? []);
    setLoading(false);
  }

  if (loading || !s) return <PageLoader />;

  const COLORS = ["#E10600", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão executiva da operação comercial Lupus" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total de Leads" value={s.totalLeads} icon={Users} accent="primary" />
        <KpiCard label="Novos (30d)" value={s.newLeads} icon={ActIcon} accent="info" />
        <KpiCard label="Oportunidades Abertas" value={s.openOpps} icon={Target} accent="warning" />
        <KpiCard label="Pipeline" value={brl(s.pipelineValue)} icon={DollarSign} accent="primary" />
        <KpiCard label="Ganhas" value={s.wonOpps} icon={Trophy} accent="success" />
        <KpiCard label="Perdidas" value={s.lostOpps} icon={TrendingUp} accent="primary" />
        <KpiCard label="Conversão" value={`${s.conversion}%`} icon={TrendingUp} accent="success" />
        <KpiCard label="Tarefas Vencidas" value={s.overdueTasks} icon={AlertTriangle} accent="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="p-5 lg:col-span-2 glass">
          <h3 className="font-semibold mb-4">Pipeline por Etapa</h3>
          {byStage.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
                <XAxis dataKey="name" stroke="oklch(0.65 0 0)" fontSize={12} />
                <YAxis stroke="oklch(0.65 0 0)" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }}
                  formatter={(v: any) => brl(Number(v))}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {byStage.map((s, i) => (<Cell key={i} fill={s.color || "#E10600"} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Leads por Origem</h3>
          {bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={bySource} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {bySource.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Leads Recentes</h3>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lead ainda. <Link to="/leads" className="text-primary">Criar agora →</Link></p>
          ) : (
            <ul className="space-y-2">
              {recentLeads.map((l) => (
                <li key={l.id}>
                  <Link to="/leads/$id" params={{ id: l.id }} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                    <div>
                      <div className="font-medium text-sm">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.company_name ?? "—"}</div>
                    </div>
                    <span className="text-[10px] uppercase px-2 py-1 rounded bg-primary/15 text-primary">{l.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Oportunidades Quentes</h3>
          {hotOpps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma oportunidade aberta.</p>
          ) : (
            <ul className="space-y-2">
              {hotOpps.map((o) => (
                <li key={o.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                  <div>
                    <div className="font-medium text-sm">{o.title}</div>
                    <div className="text-xs text-muted-foreground">{o.probability}% prob.</div>
                  </div>
                  <div className="font-semibold text-primary">{brl(o.value)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
