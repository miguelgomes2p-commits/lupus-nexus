import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from "recharts";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_app/relatorios/")({ component: ReportsPage });

function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [bySrc, setBySrc] = useState<any[]>([]);
  const [byOwner, setByOwner] = useState<any[]>([]);
  const [byStage, setByStage] = useState<any[]>([]);
  const [winLoss, setWinLoss] = useState<{ name: string; value: number }[]>([]);
  const [lostReasons, setLostReasons] = useState<any[]>([]);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [leads, opps, profiles, stages] = await Promise.all([
      supabase.from("leads").select("source_id, sources(name), owner_id"),
      supabase.from("opportunities").select("status, value, stage_id, lost_reason, owner_id"),
      supabase.from("profiles").select("id,name"),
      supabase.from("pipeline_stages").select("id,name,color"),
    ]);
    const profMap = new Map((profiles.data ?? []).map((p: any) => [p.id, p.name]));
    const stageMap = new Map((stages.data ?? []).map((s: any) => [s.id, s]));

    const srcMap = new Map<string, number>();
    (leads.data ?? []).forEach((l: any) => {
      const n = l.sources?.name ?? "Sem origem";
      srcMap.set(n, (srcMap.get(n) ?? 0) + 1);
    });
    setBySrc(Array.from(srcMap, ([name, value]) => ({ name, value })));

    const ownerMap = new Map<string, number>();
    (opps.data ?? []).filter((o: any) => o.status === "ganha").forEach((o: any) => {
      const n = profMap.get(o.owner_id) ?? "Sem responsável";
      ownerMap.set(n as string, (ownerMap.get(n as string) ?? 0) + Number(o.value));
    });
    setByOwner(Array.from(ownerMap, ([name, value]) => ({ name, value })));

    const stMap = new Map<string, { name: string; count: number; value: number; color: string }>();
    (opps.data ?? []).forEach((o: any) => {
      const st: any = stageMap.get(o.stage_id);
      if (!st) return;
      const cur = stMap.get(st.id) ?? { name: st.name, count: 0, value: 0, color: st.color };
      cur.count += 1; cur.value += Number(o.value);
      stMap.set(st.id, cur);
    });
    setByStage(Array.from(stMap.values()));

    const won = (opps.data ?? []).filter((o: any) => o.status === "ganha").length;
    const lost = (opps.data ?? []).filter((o: any) => o.status === "perdida").length;
    setWinLoss([{ name: "Ganhas", value: won }, { name: "Perdidas", value: lost }]);

    const reasons = new Map<string, number>();
    (opps.data ?? []).filter((o: any) => o.status === "perdida" && o.lost_reason).forEach((o: any) => {
      reasons.set(o.lost_reason, (reasons.get(o.lost_reason) ?? 0) + 1);
    });
    setLostReasons(Array.from(reasons, ([name, value]) => ({ name, value })));

    setLoading(false);
  }
  if (loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Relatórios" description="Análises estratégicas da operação comercial" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Leads por Origem</h3>
          {bySrc.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> :
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bySrc}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
                <XAxis dataKey="name" stroke="oklch(0.65 0 0)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0 0)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#E10600" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>}
        </Card>

        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Ranking — Vendas por Responsável</h3>
          {byOwner.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> :
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byOwner} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
                <XAxis type="number" stroke="oklch(0.65 0 0)" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="oklch(0.65 0 0)" fontSize={11} width={80} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} formatter={(v: any) => brl(Number(v))} />
                <Bar dataKey="value" fill="#E10600" radius={[0,8,8,0]} />
              </BarChart>
            </ResponsiveContainer>}
        </Card>

        <Card className="p-5 glass">
          <h3 className="font-semibold mb-4">Pipeline por Etapa (valor)</h3>
          {byStage.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados.</p> :
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 0)" />
                <XAxis dataKey="name" stroke="oklch(0.65 0 0)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0 0)" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.005 0)", border: "1px solid oklch(0.3 0.005 0)", borderRadius: 8 }} formatter={(v: any) => brl(Number(v))} />
                <Bar dataKey="value" radius={[8,8,0,0]}>
                  {byStage.map((s, i) => <Cell key={i} fill={s.color || "#E10600"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>}
        </Card>

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
              {lostReasons.sort((a,b) => b.value - a.value).map((r) => (
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
