import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { QuickActions, contactActions } from "@/components/crm/QuickActions";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { EmptyState } from "@/components/crm/EmptyState";
import {
  Mail, Phone, Building2, MapPin, Calendar, Tag, Globe, Instagram,
  Activity as ActIcon, FileText, CheckSquare, Target, Pencil, Save, X, AlertCircle,
} from "lucide-react";
import { brl, formatPhone } from "@/lib/format";
import { logActivity, LEAD_STATUSES, TEMPERATURES, PRIORITIES } from "@/lib/crm";
import { leadHealth, suggestNextAction, formatRelative } from "@/lib/health";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/leads/$id")({ component: LeadDetail });

function LeadDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [opps, setOpps] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const [l, a, t, o, n, s] = await Promise.all([
      supabase.from("leads").select("*, sources(name)").eq("id", id).maybeSingle(),
      supabase.from("activities").select("*, profiles(name)").eq("lead_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("tasks").select("*").eq("related_lead_id", id).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("opportunities").select("*, pipeline_stages(name,color)").eq("lead_id", id).order("created_at", { ascending: false }),
      supabase.from("notes").select("*, profiles(name)").eq("lead_id", id).order("created_at", { ascending: false }),
      supabase.from("sources").select("id,name").order("name"),
    ]);
    setLead(l.data); setActivities(a.data ?? []); setTasks(t.data ?? []);
    setOpps(o.data ?? []); setNotes(n.data ?? []); setSources(s.data ?? []);
    setDraft(l.data ?? {});
    setLoading(false);
  }

  const health = useMemo(() => lead ? leadHealth(lead) : null, [lead]);
  const nextAction = useMemo(() => lead ? suggestNextAction(lead) : null, [lead]);

  async function saveEdit() {
    setSaving(true);
    const updates = {
      name: draft.name, company_name: draft.company_name, email: draft.email,
      phone: draft.phone, whatsapp: draft.whatsapp, city: draft.city, state: draft.state,
      cnpj: draft.cnpj, website: draft.website, instagram: draft.instagram,
      status: draft.status, temperature: draft.temperature, priority: draft.priority,
      estimated_value: Number(draft.estimated_value) || 0,
      source_id: draft.source_id || null, notes: draft.notes,
    };
    const { error } = await supabase.from("leads").update(updates).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await logActivity(supabase, "lead_editado", `Lead atualizado`, { lead_id: id });
    toast.success("Lead atualizado");
    setEditing(false); load();
  }

  async function quickStatusChange(newStatus: string) {
    if (!lead || lead.status === newStatus) return;
    const { error } = await supabase.from("leads")
      .update({ status: newStatus as any, last_interaction_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    await logActivity(supabase, "status_alterado", `Status alterado: ${lead.status} → ${newStatus}`, { lead_id: id });
    toast.success("Status atualizado");
    load();
  }

  async function registerInteraction() {
    const { error } = await supabase.from("leads")
      .update({ last_interaction_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    await logActivity(supabase, "contato_registrado", `Interação registrada`, { lead_id: id });
    toast.success("Interação registrada");
    load();
  }

  async function convertToClient() {
    if (!lead) return;
    const { data, error } = await supabase.from("clients").insert({
      lead_id: lead.id, company_name: lead.company_name ?? lead.name,
      contact_name: lead.name, email: lead.email, phone: lead.phone,
      whatsapp: lead.whatsapp, cnpj: lead.cnpj, owner_id: lead.owner_id,
    }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("leads").update({ status: "ganho" }).eq("id", lead.id);
    await logActivity(supabase, "lead_convertido", `Lead convertido em cliente`, { lead_id: lead.id, client_id: data.id });
    toast.success("Lead convertido em cliente");
    nav({ to: "/clientes/$id", params: { id: data.id } });
  }

  async function convertToOpportunity() {
    if (!lead) return;
    const stages = await supabase.from("pipeline_stages").select("id").eq("is_active", true).order("order_index").limit(1).maybeSingle();
    const { data, error } = await supabase.from("opportunities").insert({
      title: `Oportunidade — ${lead.name}`, lead_id: lead.id, owner_id: lead.owner_id,
      value: lead.estimated_value ?? 0, stage_id: stages.data?.id ?? null, status: "aberta",
    }).select().single();
    if (error) return toast.error(error.message);
    await logActivity(supabase, "oportunidade_criada", `Oportunidade criada a partir do lead`, { lead_id: lead.id, opportunity_id: data.id });
    toast.success("Oportunidade criada");
    load();
  }

  if (loading) return <PageLoader />;
  if (!lead) return <EmptyState title="Lead não encontrado" description="Este lead pode ter sido removido." />;

  const overdueTasks = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "concluida").length;
  const openOpps = opps.filter((o) => o.status === "aberta").length;

  return (
    <div className="space-y-6">
      <DetailHeader
        backTo="/leads"
        backLabel="Voltar para leads"
        title={lead.name}
        subtitle={lead.company_name ?? "Sem empresa associada"}
        health={health!}
        badges={
          <>
            <StatusBadge status={lead.status} size="sm" />
            <StatusBadge status={lead.temperature} size="sm" />
            <StatusBadge status={lead.priority} size="sm" />
            {lead.sources?.name && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border">
                <Tag className="h-2.5 w-2.5" />{lead.sources.name}
              </span>
            )}
            {lead.last_interaction_at && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Últ. interação: {formatRelative(lead.last_interaction_at)}
              </span>
            )}
          </>
        }
        metrics={[
          { label: "Valor estimado", value: brl(lead.estimated_value), accent: "text-primary" },
        ]}
        actions={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <QuickActions
              actions={contactActions({
                phone: lead.phone, whatsapp: lead.whatsapp, email: lead.email,
                onConvert: convertToClient, convertLabel: "Converter em cliente",
              })}
            />
            <div className="flex items-center gap-2">
              <Button onClick={registerInteraction} size="sm" variant="outline">
                <ActIcon className="h-3.5 w-3.5 mr-1.5" /> Registrar interação
              </Button>
              <Button onClick={convertToOpportunity} size="sm" variant="outline">
                <Target className="h-3.5 w-3.5 mr-1.5" /> Criar oportunidade
              </Button>
              <Button onClick={() => { setEditing(!editing); setDraft(lead); }} size="sm" variant={editing ? "secondary" : "default"}>
                {editing ? <><X className="h-3.5 w-3.5 mr-1.5" />Cancelar</> : <><Pencil className="h-3.5 w-3.5 mr-1.5" />Editar</>}
              </Button>
            </div>
          </div>
        }
      />

      {nextAction && nextAction.urgent && (
        <Card className="p-4 glass border-primary/30 bg-primary/5 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-primary">Ação sugerida</div>
            <div className="text-xs text-muted-foreground">{nextAction.label} — este lead precisa de atenção</div>
          </div>
        </Card>
      )}

      <DetailTabs
        tabs={[
          {
            id: "overview", label: "Visão geral", icon: ActIcon,
            content: editing ? (
              <Card className="p-6 glass space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nome"><Input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
                  <Field label="Empresa"><Input value={draft.company_name ?? ""} onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} /></Field>
                  <Field label="E-mail"><Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
                  <Field label="Telefone"><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: formatPhone(e.target.value) })} /></Field>
                  <Field label="WhatsApp"><Input value={draft.whatsapp ?? ""} onChange={(e) => setDraft({ ...draft, whatsapp: formatPhone(e.target.value) })} /></Field>
                  <Field label="CNPJ"><Input value={draft.cnpj ?? ""} onChange={(e) => setDraft({ ...draft, cnpj: e.target.value })} /></Field>
                  <Field label="Cidade"><Input value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></Field>
                  <Field label="Estado"><Input value={draft.state ?? ""} onChange={(e) => setDraft({ ...draft, state: e.target.value })} /></Field>
                  <Field label="Website"><Input value={draft.website ?? ""} onChange={(e) => setDraft({ ...draft, website: e.target.value })} /></Field>
                  <Field label="Instagram"><Input value={draft.instagram ?? ""} onChange={(e) => setDraft({ ...draft, instagram: e.target.value })} /></Field>
                  <Field label="Valor estimado"><Input type="number" value={draft.estimated_value ?? 0} onChange={(e) => setDraft({ ...draft, estimated_value: e.target.value })} /></Field>
                  <Field label="Origem">
                    <Select value={draft.source_id ?? ""} onValueChange={(v) => setDraft({ ...draft, source_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Temperatura">
                    <Select value={draft.temperature} onValueChange={(v) => setDraft({ ...draft, temperature: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TEMPERATURES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Prioridade">
                    <Select value={draft.priority} onValueChange={(v) => setDraft({ ...draft, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Observações">
                  <textarea value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    rows={3} className="w-full bg-input/50 border border-border rounded-lg p-3 text-sm" />
                </Field>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="outline" onClick={() => { setEditing(false); setDraft(lead); }}>Cancelar</Button>
                  <Button onClick={saveEdit} disabled={saving} className="gradient-primary text-primary-foreground">
                    <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="p-6 glass lg:col-span-2 space-y-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">Identificação</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailField label="Empresa" value={lead.company_name} icon={Building2} />
                      <DetailField label="CNPJ" value={lead.cnpj} />
                      <DetailField label="E-mail" icon={Mail} value={lead.email && <a href={`mailto:${lead.email}`} className="hover:text-primary">{lead.email}</a>} />
                      <DetailField label="Telefone" icon={Phone} value={lead.phone} />
                      <DetailField label="WhatsApp" value={lead.whatsapp} />
                      <DetailField label="Localização" icon={MapPin} value={[lead.city, lead.state].filter(Boolean).join(", ") || null} />
                      <DetailField label="Website" icon={Globe} value={lead.website && <a href={lead.website} target="_blank" rel="noreferrer" className="hover:text-primary truncate">{lead.website}</a>} />
                      <DetailField label="Instagram" icon={Instagram} value={lead.instagram} />
                    </div>
                  </div>
                  {lead.notes && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Observações</div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                    </div>
                  )}
                </Card>

                <Card className="p-6 glass space-y-4">
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Status comercial</div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1.5">Mover status</div>
                    <Select value={lead.status} onValueChange={quickStatusChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-border">
                    <DetailField label="Criado" icon={Calendar} value={format(new Date(lead.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })} />
                    <DetailField label="Última interação" value={lead.last_interaction_at ? formatRelative(lead.last_interaction_at) : "Nunca"} />
                    <DetailField label="Próxima ação" value={lead.next_action_at ? format(new Date(lead.next_action_at), "dd/MM 'às' HH:mm") : "Não agendada"} />
                  </div>
                  {nextAction && (
                    <div className="pt-3 border-t border-border">
                      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">Sugestão</div>
                      <p className="text-sm font-medium">{nextAction.label}</p>
                    </div>
                  )}
                  {health!.reasons.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">Sinais de saúde</div>
                      <ul className="space-y-1 text-xs">
                        {health!.reasons.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-muted-foreground">•</span>
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
            content: <TasksPanel tasks={tasks} relatedKey="related_lead_id" relatedId={id} refs={{ lead_id: id }} onChanged={load} />,
          },
          {
            id: "notes", label: "Notas", icon: FileText, count: notes.length,
            content: <NotesPanel notes={notes} refs={{ lead_id: id }} onAdded={load} />,
          },
          {
            id: "opps", label: "Oportunidades", icon: Target, count: opps.length,
            content: opps.length === 0 ? (
              <EmptyState
                title="Nenhuma oportunidade"
                description="Converta este lead em uma oportunidade para acompanhar no pipeline."
                action={<Button onClick={convertToOpportunity} className="gradient-primary text-primary-foreground">
                  <Target className="h-4 w-4 mr-1.5" /> Criar oportunidade
                </Button>}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opps.map((o) => (
                  <Card key={o.id} className="p-5 glass hover-lift cursor-pointer" onClick={() => nav({ to: "/oportunidades/$id" as any, params: { id: o.id } as any })}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h4 className="font-semibold text-sm">{o.title}</h4>
                      <StatusBadge status={o.status} size="xs" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-bold gradient-text-subtle">{brl(o.value)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {o.pipeline_stages?.name ?? "Sem etapa"} · {o.probability}% prob.
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ),
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
