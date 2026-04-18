import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DetailHeader, DetailField } from "@/components/crm/DetailHeader";
import { DetailTabs } from "@/components/crm/DetailTabs";
import { Timeline } from "@/components/crm/Timeline";
import { NotesPanel } from "@/components/crm/NotesPanel";
import { TasksPanel } from "@/components/crm/TasksPanel";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { EmptyState } from "@/components/crm/EmptyState";
import {
  Calendar, Activity as ActIcon, FileText, CheckSquare, Trophy, X,
  Pencil, Save, Building2, User, TrendingUp, Clock,
} from "lucide-react";
import { brl } from "@/lib/format";
import { logActivity } from "@/lib/crm";
import { opportunityHealth, formatRelative } from "@/lib/health";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/oportunidades/$id")({ component: OppDetail });

function OppDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [opp, setOpp] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const [o, s, a, t, n] = await Promise.all([
      supabase.from("opportunities").select("*, pipeline_stages(name,color), leads(id,name), clients(id,company_name)").eq("id", id).maybeSingle(),
      supabase.from("pipeline_stages").select("*").eq("is_active", true).order("order_index"),
      supabase.from("activities").select("*, profiles(name)").eq("opportunity_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("tasks").select("*").eq("related_opportunity_id", id).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("notes").select("*, profiles(name)").eq("opportunity_id", id).order("created_at", { ascending: false }),
    ]);
    setOpp(o.data); setStages(s.data ?? []); setActivities(a.data ?? []);
    setTasks(t.data ?? []); setNotes(n.data ?? []);
    setDraft(o.data ?? {});
    setLoading(false);
  }

  const health = useMemo(() => opp ? opportunityHealth(opp) : null, [opp]);
  const ageInDays = useMemo(() => {
    if (!opp?.created_at) return 0;
    return Math.floor((Date.now() - new Date(opp.created_at).getTime()) / 86_400_000);
  }, [opp]);

  async function moveStage(stageId: string) {
    if (!opp || opp.stage_id === stageId) return;
    const { error } = await supabase.from("opportunities")
      .update({ stage_id: stageId, last_moved_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    const stage = stages.find((s) => s.id === stageId);
    await logActivity(supabase, "etapa_alterada", `Movida para: ${stage?.name}`, { opportunity_id: id, lead_id: opp.lead_id });
    toast.success("Etapa atualizada");
    load();
  }

  async function markWon() {
    const { error } = await supabase.from("opportunities")
      .update({ status: "ganha", won_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    await logActivity(supabase, "oportunidade_ganha", `Oportunidade ganha: ${opp.title}`, { opportunity_id: id, lead_id: opp.lead_id });
    toast.success("Oportunidade marcada como ganha 🏆");
    load();
  }

  async function markLost() {
    const reason = prompt("Motivo da perda?") ?? "";
    const { error } = await supabase.from("opportunities")
      .update({ status: "perdida", lost_at: new Date().toISOString(), lost_reason: reason || null }).eq("id", id);
    if (error) return toast.error(error.message);
    await logActivity(supabase, "oportunidade_perdida", `Oportunidade perdida${reason ? `: ${reason}` : ""}`, { opportunity_id: id, lead_id: opp.lead_id });
    toast.success("Oportunidade marcada como perdida");
    load();
  }

  async function reopen() {
    const { error } = await supabase.from("opportunities")
      .update({ status: "aberta", won_at: null, lost_at: null, lost_reason: null }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Oportunidade reaberta");
    load();
  }

  async function saveEdit() {
    setSaving(true);
    const updates = {
      title: draft.title, description: draft.description,
      value: Number(draft.value) || 0, probability: Number(draft.probability) || 0,
      expected_close_date: draft.expected_close_date || null,
    };
    const { error } = await supabase.from("opportunities").update(updates).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await logActivity(supabase, "lead_editado", "Oportunidade editada", { opportunity_id: id });
    toast.success("Oportunidade atualizada");
    setEditing(false); load();
  }

  if (loading) return <PageLoader />;
  if (!opp) return <EmptyState title="Oportunidade não encontrada" />;

  const isClosed = opp.status === "ganha" || opp.status === "perdida";

  return (
    <div className="space-y-6">
      <DetailHeader
        backTo="/oportunidades"
        backLabel="Voltar para oportunidades"
        title={opp.title}
        subtitle={opp.clients?.company_name ?? opp.leads?.name ?? "Sem cliente vinculado"}
        health={health!}
        badges={
          <>
            <StatusBadge status={opp.status} size="sm" />
            {opp.pipeline_stages?.name && (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
                style={{ background: `${opp.pipeline_stages.color}1f`, borderColor: `${opp.pipeline_stages.color}55`, color: opp.pipeline_stages.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: opp.pipeline_stages.color }} />
                {opp.pipeline_stages.name}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {ageInDays}d em aberto · Movida {formatRelative(opp.last_moved_at)}
            </span>
          </>
        }
        metrics={[
          { label: "Valor", value: brl(opp.value), accent: "text-primary" },
          { label: "Probabilidade", value: `${opp.probability}%`, accent: "gradient-text-subtle" },
          { label: "Esperado", value: opp.value * (opp.probability / 100) ? brl(opp.value * (opp.probability / 100)) : "—" },
        ]}
        actions={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {opp.leads && (
                <Link to="/leads/$id" params={{ id: opp.leads.id }} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition">
                  <User className="h-3 w-3" /> Lead: {opp.leads.name}
                </Link>
              )}
              {opp.clients && (
                <Link to="/clientes/$id" params={{ id: opp.clients.id }} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition">
                  <Building2 className="h-3 w-3" /> Cliente: {opp.clients.company_name}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isClosed ? (
                <>
                  <Button onClick={markWon} size="sm" className="bg-[oklch(0.72_0.18_150)] hover:bg-[oklch(0.65_0.18_150)] text-background">
                    <Trophy className="h-3.5 w-3.5 mr-1.5" /> Ganhar
                  </Button>
                  <Button onClick={markLost} size="sm" variant="outline">
                    <X className="h-3.5 w-3.5 mr-1.5" /> Perder
                  </Button>
                </>
              ) : (
                <Button onClick={reopen} size="sm" variant="outline">Reabrir</Button>
              )}
              <Button onClick={() => { setEditing(!editing); setDraft(opp); }} size="sm" variant={editing ? "secondary" : "default"}>
                {editing ? <><X className="h-3.5 w-3.5 mr-1.5" />Cancelar</> : <><Pencil className="h-3.5 w-3.5 mr-1.5" />Editar</>}
              </Button>
            </div>
          </div>
        }
      />

      <DetailTabs
        tabs={[
          {
            id: "overview", label: "Visão geral", icon: ActIcon,
            content: editing ? (
              <Card className="p-6 glass space-y-4">
                <Field label="Título"><Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
                <Field label="Descrição">
                  <textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    rows={3} className="w-full bg-input/50 border border-border rounded-lg p-3 text-sm" />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Valor (R$)"><Input type="number" value={draft.value ?? 0} onChange={(e) => setDraft({ ...draft, value: e.target.value })} /></Field>
                  <Field label="Probabilidade (%)"><Input type="number" min={0} max={100} value={draft.probability ?? 50} onChange={(e) => setDraft({ ...draft, probability: e.target.value })} /></Field>
                  <Field label="Previsão de fechamento"><Input type="date" value={draft.expected_close_date ?? ""} onChange={(e) => setDraft({ ...draft, expected_close_date: e.target.value })} /></Field>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="outline" onClick={() => { setEditing(false); setDraft(opp); }}>Cancelar</Button>
                  <Button onClick={saveEdit} disabled={saving} className="gradient-primary text-primary-foreground">
                    <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="p-6 glass lg:col-span-2 space-y-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">Detalhes comerciais</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailField label="Valor" value={<span className="text-primary font-bold">{brl(opp.value)}</span>} />
                      <DetailField label="Probabilidade" value={`${opp.probability}%`} />
                      <DetailField label="Valor esperado" value={brl(opp.value * (opp.probability / 100))} />
                      <DetailField label="Previsão de fechamento" icon={Calendar}
                        value={opp.expected_close_date ? format(new Date(opp.expected_close_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : null} />
                      <DetailField label="Idade" icon={Clock} value={`${ageInDays} dias`} />
                      <DetailField label="Última movimentação" value={formatRelative(opp.last_moved_at)} />
                    </div>
                  </div>
                  {opp.description && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Descrição</div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{opp.description}</p>
                    </div>
                  )}
                  {opp.lost_reason && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-[10px] uppercase tracking-widest font-semibold text-primary mb-2">Motivo da perda</div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{opp.lost_reason}</p>
                    </div>
                  )}
                </Card>

                <Card className="p-6 glass space-y-4">
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Etapa do pipeline</div>
                  <Select value={opp.stage_id ?? ""} onValueChange={moveStage} disabled={isClosed}>
                    <SelectTrigger><SelectValue placeholder="Sem etapa" /></SelectTrigger>
                    <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>

                  <div className="space-y-2 pt-3 border-t border-border">
                    <DetailField label="Criada" icon={Calendar} value={format(new Date(opp.created_at), "dd/MM/yyyy")} />
                    {opp.won_at && <DetailField label="Ganha em" value={format(new Date(opp.won_at), "dd/MM/yyyy")} />}
                    {opp.lost_at && <DetailField label="Perdida em" value={format(new Date(opp.lost_at), "dd/MM/yyyy")} />}
                  </div>

                  {health!.reasons.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">Sinais de saúde</div>
                      <ul className="space-y-1 text-xs">
                        {health!.reasons.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <TrendingUp className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                            <span className="text-foreground/80">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              </div>
            ),
          },
          {
            id: "timeline", label: "Timeline", icon: ActIcon, count: activities.length,
            content: <Card className="p-6 glass"><Timeline activities={activities} /></Card>,
          },
          {
            id: "tasks", label: "Tarefas", icon: CheckSquare, count: tasks.length,
            content: <TasksPanel tasks={tasks} relatedKey="related_opportunity_id" relatedId={id} refs={{ opportunity_id: id, lead_id: opp.lead_id, client_id: opp.client_id }} onChanged={load} />,
          },
          {
            id: "notes", label: "Notas", icon: FileText, count: notes.length,
            content: <NotesPanel notes={notes} refs={{ opportunity_id: id, lead_id: opp.lead_id, client_id: opp.client_id }} onAdded={load} />,
          },
        ]}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
