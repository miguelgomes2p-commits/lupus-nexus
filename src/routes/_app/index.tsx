import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/crm/KpiCard";
import { PageHeader } from "@/components/crm/PageHeader";
import { SkeletonGrid, SkeletonCard } from "@/components/crm/SkeletonCard";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { AlertCard } from "@/components/crm/AlertCard";
import { HealthIndicator } from "@/components/crm/HealthIndicator";
import { EmptyState } from "@/components/crm/EmptyState";
import {
  Users, Target, TrendingUp, CheckSquare, AlertTriangle, DollarSign, Trophy,
  Activity as ActIcon, Clock, Flame, Award, Calendar as CalIcon, UserCheck,
  Layers, ArrowDownRight,
} from "lucide-react";
import { brl, initials } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import { leadHealth, opportunityHealth } from "@/lib/health";
import { format, isPast, isToday, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "365", label: "Último ano" },
];

const COLORS = ["#E10600", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"];

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const [data, setData] = useState<{
    leads: any[]; opps: any[]; tasks: any[]; stages: any[];
    sources: any[]; profiles: any[]; agenda: any[];
  } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const [leads, opps, tasks, stages, sources, profiles, agenda] = await Promise.all([
      supabase.from("leads").select("*, sources(name), profiles!leads_owner_id_fkey(name)").limit(500),
      supabase.from("opportunities").select("*, pipeline_stages(name,color)").limit(500),
      supabase.from("tasks").select("*, profiles(name)").limit(500),
      supabase.from("pipeline_stages").select("*").eq("is_active", true).order("order_index"),
      supabase.from("sources").select("id,name").order("name"),
      supabase.from("profiles").select("id,name,avatar_url").eq("is_active", true),
      supabase.from("tasks").select("*, profiles(name)")
        .gte("due_date", todayStart).lte("due_date", todayEnd.toISOString())
        .neq("status", "concluida").order("due_date").limit(10),
    ]);
    setData({
      leads: leads.data ?? [], opps: opps.data ?? [], tasks: tasks.data ?? [],
      stages: stages.data ?? [], sources: sources.data ?? [], profiles: profiles.data ?? [],
      agenda: agenda.data ?? [],
    });
    setLoading(false);
  }

  const computed = useMemo(() => {
    if (!data) return null;
    const days = Number(period);
    const cutoff = subDays(new Date(), days);
    const prevCutoff = subDays(new Date(), days * 2);

    let leads = data.leads;
    let opps = data.opps;
    let tasks = data.tasks;
    if (ownerFilter !== "all") {
      leads = leads.filter((l) => l.owner_id === ownerFilter);
      opps = opps.filter((o) => o.owner_id === ownerFilter);
      tasks = tasks.filter((t) => t.assigned_to === ownerFilter);
    }
    if (sourceFilter !== "all") {
      leads = leads.filter((l) => l.source_id === sourceFilter);
    }

    const newLeads = leads.filter((l) => new Date(l.created_at) >= cutoff);
    const prevNewLeads = leads.filter((l) => new Date(l.created_at) >= prevCutoff && new Date(l.created_at) < cutoff);
    const trendLeads = prevNewLeads.length > 0 ? Math.round(((newLeads.length - prevNewLeads.length) / prevNewLeads.length) * 100) : 0;

    const openOpps = opps.filter((o) => o.status === "aberta");
    const wonOpps = opps.filter((o) => o.status === "ganha");
    const lostOpps = opps.filter((o) => o.status === "perdida");
    const wonInPeriod = wonOpps.filter((o) => o.won_at && new Date(o.won_at) >= cutoff);
    const closedInPeriod = wonInPeriod.length + lostOpps.filter((o) => o.lost_at && new Date(o.lost_at) >= cutoff).length;

    const pipelineValue = openOpps.reduce((a, o) => a + Number(o.value), 0);
    const expectedValue = openOpps.reduce((a, o) => a + Number(o.value) * (o.probability / 100), 0);
    const wonValue = wonOpps.reduce((a, o) => a + Number(o.value), 0);
    const ticket = wonOpps.length > 0 ? wonValue / wonOpps.length : 0;
    const conversion = closedInPeriod > 0 ? Math.round((wonInPeriod.length / closedInPeriod) * 100) : 0;

    // Tempo médio fechamento (won)
    const closeDays = wonOpps
      .filter((o) => o.won_at && o.created_at)
      .map((o) => Math.floor((new Date(o.won_at).getTime() - new Date(o.created_at).getTime()) / 86_400_000));
    const avgCloseDays = closeDays.length > 0 ? Math.round(closeDays.reduce((a, b) => a + b, 0) / closeDays.length) : 0;

    // Tempo médio por etapa (em aberto): age desde last_moved_at
    const stageDwellMap = new Map<string, number[]>();
    openOpps.forEach((o) => {
      if (!o.stage_id || !o.last_moved_at) return;
      const dwell = Math.floor((Date.now() - new Date(o.last_moved_at).getTime()) / 86_400_000);
      const arr = stageDwellMap.get(o.stage_id) ?? [];
      arr.push(dwell);
      stageDwellMap.set(o.stage_id, arr);
    });
    const avgStageDwell = (() => {
      const all = Array.from(stageDwellMap.values()).flat();
      if (all.length === 0) return 0;
      return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
    })();

    // Leads sem follow-up (>7d)
    const leadsNoFollowup = leads.filter((l) => {
      if (l.status === "ganho" || l.status === "perdido" || l.status === "descartado") return false;
      const last = l.last_interaction_at ?? l.created_at;
      return last && new Date(last) < subDays(new Date(), 7);
    });

    // Oportunidades estagnadas (>14d sem mover)
    const stagnantOpps = openOpps.filter((o) => {
      const ref = o.last_moved_at ?? o.created_at;
      return ref && new Date(ref) < subDays(new Date(), 14);
    });

    // Tarefas vencidas
    const overdueTasks = tasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada" && t.due_date && isPast(new Date(t.due_date)));
    const todayTasksList = tasks.filter((t) => t.status !== "concluida" && t.due_date && isToday(new Date(t.due_date)));

    // Pipeline por etapa
    const byStage = data.stages.map((st) => {
      const stOpps = openOpps.filter((o) => o.stage_id === st.id);
      const dwell = stageDwellMap.get(st.id) ?? [];
      const avgDwell = dwell.length > 0 ? Math.round(dwell.reduce((a, b) => a + b, 0) / dwell.length) : 0;
      return {
        name: st.name, color: st.color, count: stOpps.length,
        value: stOpps.reduce((a, o) => a + Number(o.value), 0),
        avgDwell,
      };
    });

    // Gargalos: etapas com mais oportunidades estagnadas
    const bottlenecks = byStage
      .map((s) => ({ ...s, stagnantCount: data.stages.length > 0 ? openOpps.filter((o) => {
        const sid = data.stages.find((st) => st.name === s.name)?.id;
        if (o.stage_id !== sid) return false;
        const ref = o.last_moved_at ?? o.created_at;
        return ref && new Date(ref) < subDays(new Date(), 14);
      }).length : 0 }))
      .filter((s) => s.stagnantCount > 0)
      .sort((a, b) => b.stagnantCount - a.stagnantCount)
      .slice(0, 3);

    // Por origem
    const srcMap = new Map<string, { count: number; won: number }>();
    leads.forEach((l) => {
      const n = l.sources?.name ?? "Sem origem";
      const cur = srcMap.get(n) ?? { count: 0, won: 0 };
      cur.count += 1;
      if (l.status === "ganho") cur.won += 1;
      srcMap.set(n, cur);
    });
    const bySource = Array.from(srcMap.entries()).map(([name, v]) => ({
      name, value: v.count,
      conversion: v.count > 0 ? Math.round((v.won / v.count) * 100) : 0,
    })).sort((a, b) => b.value - a.value);

    // Ranking responsáveis
    const ranking = data.profiles.map((p) => {
      const myLeads = data.leads.filter((l) => l.owner_id === p.id);
      const myOpps = data.opps.filter((o) => o.owner_id === p.id);
      const myWon = myOpps.filter((o) => o.status === "ganha");
      const myValue = myWon.reduce((a, o) => a + Number(o.value), 0);
      return {
        id: p.id, name: p.name,
        leads: myLeads.length, opps: myOpps.length,
        won: myWon.length, value: myValue,
      };
    }).sort((a, b) => b.value - a.value).slice(0, 5);

    // Oportunidades quentes (saudáveis + alta probabilidade)
    const hotOpps = openOpps
      .map((o) => ({ ...o, _h: opportunityHealth(o) }))
      .filter((o) => o._h.score >= 70 || o.probability >= 75)
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, 5);

    // Evolução temporal (leads/opps por dia últimos N dias)
    const evolution = Array.from({ length: Math.min(days, 30) }).map((_, i) => {
      const d = subDays(new Date(), days - 1 - i);
      const day = format(d, "dd/MM");
      const leadsDay = leads.filter((l) => format(new Date(l.created_at), "dd/MM") === day).length;
      const oppsDay = opps.filter((o) => format(new Date(o.created_at), "dd/MM") === day).length;
      return { day, leads: leadsDay, opps: oppsDay };
    });

    return {
      newLeads, trendLeads, openOpps, wonOpps, lostOpps, wonInPeriod,
      pipelineValue, expectedValue, ticket, conversion, avgCloseDays, avgStageDwell,
      leadsNoFollowup, stagnantOpps, overdueTasks, todayTasksList,
      byStage, bottlenecks, bySource, ranking, hotOpps, evolution,
      totalLeads: leads.length,
      activeClients: 0,
    };
  }, [data, period, ownerFilter, sourceFilter]);

  if (loading || !data || !computed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Visão executiva da operação comercial Lupus" />
        <SkeletonGrid count={8} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SkeletonCard className="lg:col-span-2" />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const c = computed;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Central executiva — performance comercial em tempo real"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9 w-[170px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{PERIOD_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="h-9 w-[170px] text-sm"><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os responsáveis</SelectItem>
                {data.profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 w-[150px] text-sm"><SelectValue placeholder="Origem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                {data.sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* 14 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard label="Total Leads" value={c.totalLeads} icon={Users} accent="info" />
        <KpiCard label="Novos no período" value={c.newLeads.length} icon={ActIcon} accent="info"
          trend={c.trendLeads !== 0 ? { value: c.trendLeads, positive: c.trendLeads > 0 } : undefined} />
        <KpiCard label="Opps abertas" value={c.openOpps.length} icon={Target} accent="warning" />
        <KpiCard label="Pipeline" value={brl(c.pipelineValue)} icon={DollarSign} accent="primary" />
        <KpiCard label="Esperado" value={brl(c.expectedValue)} icon={TrendingUp} accent="info" />
        <KpiCard label="Ganhas" value={c.wonOpps.length} icon={Trophy} accent="success" />
        <KpiCard label="Perdidas" value={c.lostOpps.length} icon={ArrowDownRight} accent="primary" />
        <KpiCard label="Conversão" value={`${c.conversion}%`} icon={Award} accent="success" />
        <KpiCard label="Ticket médio" value={brl(c.ticket)} icon={DollarSign} accent="success" />
        <KpiCard label="T. médio fechamento" value={`${c.avgCloseDays}d`} icon={Clock} accent="info" />
        <KpiCard label="T. médio por etapa" value={`${c.avgStageDwell}d`} icon={Layers} accent="warning" />
        <KpiCard label="Sem follow-up" value={c.leadsNoFollowup.length} icon={UserCheck} accent="warning" />
        <KpiCard label="Estagnadas (14d+)" value={c.stagnantOpps.length} icon={AlertTriangle} accent="primary" />
        <KpiCard label="Tarefas vencidas" value={c.overdueTasks.length} icon={CheckSquare} accent="primary" />
      </div>

      {/* Alertas críticos */}
      {(c.overdueTasks.length > 0 || c.leadsNoFollowup.length > 0 || c.stagnantOpps.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {c.overdueTasks.length > 0 && (
            <AlertCard variant="critical" title="Tarefas atrasadas" count={c.overdueTasks.length}
              description={`${c.overdueTasks.length} tarefa${c.overdueTasks.length !== 1 ? "s" : ""} passou${c.overdueTasks.length !== 1 ? "ram" : ""} do prazo`}
              to="/tarefas" />
          )}
          {c.leadsNoFollowup.length > 0 && (
            <AlertCard variant="warning" title="Leads sem follow-up" count={c.leadsNoFollowup.length}
              description="Leads sem interação há mais de 7 dias precisam de atenção"
              to="/leads" />
          )}
          {c.stagnantOpps.length > 0 && (
            <AlertCard variant="warning" title="Oportunidades estagnadas" count={c.stagnantOpps.length}
              description="Oportunidades sem movimentação há mais de 14 dias"
              to="/pipeline" />
          )}
        </div>
      )}

      {/* Pipeline por etapa + Origem */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-2 glass">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Layers className="h-4 w-4 text-primary" />Pipeline por Etapa</h3>
            <span className="text-xs text-muted-foreground">{brl(c.pipelineValue)} em aberto</span>
          </div>
          {c.byStage.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Configure as etapas do pipeline.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={c.byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
                <XAxis dataKey="name" stroke="oklch(0.65 0 0)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0 0)" fontSize={11} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.18 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }}
                  formatter={(v: any, _n, p: any) => [brl(Number(v)), `${p.payload.count} opps · ${p.payload.avgDwell}d médio`]}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {c.byStage.map((s, i) => (<Cell key={i} fill={s.color || "#E10600"} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Leads por Origem</h3>
          {c.bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Sem dados de origem.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={c.bySource} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {c.bySource.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "oklch(0.18 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }}
                  formatter={(v: any, n: any, p: any) => [`${v} leads · ${p.payload.conversion}% conversão`, n]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Evolução + Gargalos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-2 glass">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Evolução de leads e oportunidades</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={c.evolution}>
              <defs>
                <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E10600" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#E10600" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOpps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
              <XAxis dataKey="day" stroke="oklch(0.65 0 0)" fontSize={10} />
              <YAxis stroke="oklch(0.65 0 0)" fontSize={10} />
              <Tooltip contentStyle={{ background: "oklch(0.18 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} />
              <Area type="monotone" dataKey="leads" stroke="#E10600" fill="url(#gLeads)" strokeWidth={2} />
              <Area type="monotone" dataKey="opps" stroke="#3B82F6" fill="url(#gOpps)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" />Gargalos do Pipeline</h3>
          {c.bottlenecks.length === 0 ? (
            <div className="py-8 text-center">
              <Trophy className="h-8 w-8 mx-auto text-[oklch(0.72_0.18_150)] opacity-60 mb-2" />
              <p className="text-sm text-muted-foreground">Pipeline saudável!</p>
              <p className="text-xs text-muted-foreground/70">Nenhuma etapa com gargalo.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {c.bottlenecks.map((b, i) => (
                <li key={i} className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{b.stagnantCount}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{b.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {b.count} opps · {b.avgDwell}d médio · {brl(b.value)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Ranking + Agenda + Hot Opps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Award className="h-4 w-4 text-primary" />Ranking de responsáveis</h3>
          {c.ranking.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Sem dados de equipe.</p>
          ) : (
            <ul className="space-y-2">
              {c.ranking.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-[oklch(0.78_0.16_75)/0.2] text-[oklch(0.84_0.16_75)] ring-2 ring-[oklch(0.78_0.16_75)/0.4]" :
                      i === 1 ? "bg-muted text-foreground" : "bg-muted/50 text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.leads} leads · {r.won} ganhas</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold gradient-text-subtle tabular-nums">{brl(r.value)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><CalIcon className="h-4 w-4 text-primary" />Agenda de hoje</h3>
          {data.agenda.length === 0 && c.todayTasksList.length === 0 ? (
            <div className="py-8 text-center">
              <CalIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Dia tranquilo — sem compromissos.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {data.agenda.map((t) => (
                <li key={t.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent transition">
                  <div className="text-xs tabular-nums font-bold text-primary mt-0.5 w-12 shrink-0">
                    {t.due_date ? format(new Date(t.due_date), "HH:mm") : "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.profiles?.name ?? "—"} · <StatusBadge status={t.priority} size="xs" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Flame className="h-4 w-4 text-primary" />Oportunidades quentes</h3>
          {c.hotOpps.length === 0 ? (
            <div className="py-8 text-center">
              <Flame className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma quente no momento.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {c.hotOpps.map((o: any) => (
                <li key={o.id}>
                  <Link to="/oportunidades/$id" params={{ id: o.id }} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent transition">
                    <HealthIndicator health={o._h} size="sm" showLabel={false} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{o.title}</div>
                      <div className="text-[11px] text-muted-foreground">{o.probability}% prob.</div>
                    </div>
                    <div className="text-sm font-bold text-primary tabular-nums">{brl(o.value)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Leads parados */}
      {c.leadsNoFollowup.length > 0 && (
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><UserCheck className="h-4 w-4 text-primary" />Leads parados — precisam de follow-up</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {c.leadsNoFollowup.slice(0, 6).map((l) => {
              const h = leadHealth(l);
              return (
                <li key={l.id}>
                  <Link to="/leads/$id" params={{ id: l.id }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-accent transition">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                      {initials(l.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{l.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {l.company_name ?? "—"} · {l.profiles?.name ?? "Sem responsável"}
                      </div>
                    </div>
                    <HealthIndicator health={h} size="sm" showLabel={false} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {data.leads.length === 0 && (
        <EmptyState
          title="Comece a usar o CRM"
          description="Cadastre seu primeiro lead para ver os indicadores ganharem vida."
        />
      )}
    </div>
  );
}
