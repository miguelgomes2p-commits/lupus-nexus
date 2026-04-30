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
import { ClientDocumentsPanel } from "@/components/crm/ClientDocumentsPanel";
import { QuickActions, contactActions } from "@/components/crm/QuickActions";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { EmptyState } from "@/components/crm/EmptyState";
import {
  Mail, Phone, Building2, Calendar, Activity as ActIcon, FileText,
  CheckSquare, Target, Pencil, Save, X, Briefcase, DollarSign,
  MapPin, Paperclip, Trash2,
} from "lucide-react";
import { brl, formatPhone } from "@/lib/format";
import { logActivity, CLIENT_STATUSES } from "@/lib/crm";
import { formatRelative } from "@/lib/health";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/clientes/$id")({ component: ClientDetail });

function ClientDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [opps, setOpps] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const [c, a, t, o, n, ct, d] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase.from("activities").select("*, profiles(name)").eq("client_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("tasks").select("*").eq("related_client_id", id).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("opportunities").select("*, pipeline_stages(name,color)").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("notes").select("*, profiles(name)").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").eq("client_id", id).order("is_primary", { ascending: false }),
      (supabase as any).from("client_documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    ]);
    setClient(c.data); setActivities(a.data ?? []); setTasks(t.data ?? []);
    setOpps(o.data ?? []); setNotes(n.data ?? []); setContacts(ct.data ?? []);
    setDocuments(d.data ?? []);
    setDraft(c.data ?? {});
    setLoading(false);
  }

  const totals = useMemo(() => {
    const won = opps.filter((o) => o.status === "ganha");
    const open = opps.filter((o) => o.status === "aberta");
    return {
      lifetime: won.reduce((a, o) => a + Number(o.value), 0) + Number(client?.contract_value ?? 0),
      pipeline: open.reduce((a, o) => a + Number(o.value), 0),
      wonCount: won.length,
      openCount: open.length,
    };
  }, [opps, client]);

  async function saveEdit() {
    setSaving(true);
    const updates = {
      company_name: draft.company_name, trade_name: draft.trade_name,
      contact_name: draft.contact_name, email: draft.email, phone: draft.phone,
      whatsapp: draft.whatsapp, cnpj: draft.cnpj, segment: draft.segment,
      contract_value: Number(draft.contract_value) || 0, status: draft.status,
      notes: draft.notes, legal_representative: draft.legal_representative,
      company_size: draft.company_size, tax_regime: draft.tax_regime,
      address: draft.address, city: draft.city, state: draft.state,
      zip_code: draft.zip_code, industry: draft.industry,
      monthly_recurring_revenue: Number(draft.monthly_recurring_revenue) || 0,
      contract_start_date: draft.contract_start_date || null,
      contract_end_date: draft.contract_end_date || null,
      onboarding_status: draft.onboarding_status || "em_andamento",
      document_notes: draft.document_notes,
    };
    const { error } = await supabase.from("clients").update(updates).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await logActivity(supabase, "lead_editado", "Cliente atualizado", { client_id: id });
    toast.success("Cliente atualizado");
    setEditing(false); load();
  }

  async function removeClient() {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cliente excluído");
    nav({ to: "/clientes" });
  }

  if (loading) return <PageLoader />;
  if (!client) return <EmptyState title="Cliente não encontrado" />;

  return (
    <div className="space-y-6">
      <DetailHeader
        backTo="/clientes"
        backLabel="Voltar para clientes"
        title={client.company_name}
        subtitle={client.trade_name ?? client.contact_name ?? "Cliente ativo"}
        badges={
          <>
            <StatusBadge status={client.status} size="sm" />
            {client.segment && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border">
                <Briefcase className="h-2.5 w-2.5" />{client.segment}
              </span>
            )}
            {client.started_at && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Cliente desde {format(new Date(client.started_at), "MMM yyyy", { locale: ptBR })}
              </span>
            )}
          </>
        }
        metrics={[
          { label: "Contrato", value: brl(client.contract_value), accent: "text-primary" },
          { label: "Lifetime", value: brl(totals.lifetime), accent: "gradient-text-subtle" },
        ]}
        actions={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <QuickActions
              actions={contactActions({
                phone: client.phone, whatsapp: client.whatsapp, email: client.email,
              })}
            />
            <div className="flex w-full sm:w-auto items-center gap-2">
              <Button onClick={() => { setEditing(!editing); setDraft(client); }} size="sm" variant={editing ? "secondary" : "default"} className="flex-1 sm:flex-none">
                {editing ? <><X className="h-3.5 w-3.5 mr-1.5" />Cancelar</> : <><Pencil className="h-3.5 w-3.5 mr-1.5" />Editar</>}
              </Button>
              <Button onClick={() => { if (confirm("Excluir cliente?")) removeClient(); }} size="sm" variant="outline" className="flex-1 sm:flex-none">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />Excluir
              </Button>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <MetricMini label="Pipeline ativo" value={brl(totals.pipeline)} icon={Target} />
        <MetricMini label="Oportunidades abertas" value={totals.openCount} icon={ActIcon} />
        <MetricMini label="Negócios fechados" value={totals.wonCount} icon={DollarSign} />
        <MetricMini label="Tarefas abertas" value={tasks.filter((t) => t.status !== "concluida").length} icon={CheckSquare} />
      </div>

      <DetailTabs
        tabs={[
          {
            id: "overview", label: "Visão geral", icon: ActIcon,
            content: editing ? (
              <Card className="p-6 glass space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Razão social"><Input value={draft.company_name ?? ""} onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} /></Field>
                  <Field label="Nome fantasia"><Input value={draft.trade_name ?? ""} onChange={(e) => setDraft({ ...draft, trade_name: e.target.value })} /></Field>
                  <Field label="Contato principal"><Input value={draft.contact_name ?? ""} onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })} /></Field>
                  <Field label="CNPJ"><Input value={draft.cnpj ?? ""} onChange={(e) => setDraft({ ...draft, cnpj: e.target.value })} /></Field>
                  <Field label="E-mail"><Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
                  <Field label="Telefone"><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: formatPhone(e.target.value) })} /></Field>
                  <Field label="WhatsApp"><Input value={draft.whatsapp ?? ""} onChange={(e) => setDraft({ ...draft, whatsapp: formatPhone(e.target.value) })} /></Field>
                  <Field label="Segmento"><Input value={draft.segment ?? ""} onChange={(e) => setDraft({ ...draft, segment: e.target.value })} /></Field>
                  <Field label="Setor/indústria"><Input value={draft.industry ?? ""} onChange={(e) => setDraft({ ...draft, industry: e.target.value })} /></Field>
                  <Field label="Responsável legal"><Input value={draft.legal_representative ?? ""} onChange={(e) => setDraft({ ...draft, legal_representative: e.target.value })} /></Field>
                  <Field label="Porte"><Input value={draft.company_size ?? ""} onChange={(e) => setDraft({ ...draft, company_size: e.target.value })} /></Field>
                  <Field label="Regime tributário"><Input value={draft.tax_regime ?? ""} onChange={(e) => setDraft({ ...draft, tax_regime: e.target.value })} /></Field>
                  <Field label="Endereço"><Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
                  <Field label="Cidade"><Input value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></Field>
                  <Field label="Estado"><Input value={draft.state ?? ""} maxLength={2} onChange={(e) => setDraft({ ...draft, state: e.target.value })} /></Field>
                  <Field label="CEP"><Input value={draft.zip_code ?? ""} onChange={(e) => setDraft({ ...draft, zip_code: e.target.value })} /></Field>
                  <Field label="Valor do contrato"><Input type="number" value={draft.contract_value ?? 0} onChange={(e) => setDraft({ ...draft, contract_value: e.target.value })} /></Field>
                  <Field label="Receita mensal"><Input type="number" value={draft.monthly_recurring_revenue ?? 0} onChange={(e) => setDraft({ ...draft, monthly_recurring_revenue: e.target.value })} /></Field>
                  <Field label="Início do contrato"><Input type="date" value={draft.contract_start_date ?? ""} onChange={(e) => setDraft({ ...draft, contract_start_date: e.target.value })} /></Field>
                  <Field label="Fim/renovação"><Input type="date" value={draft.contract_end_date ?? ""} onChange={(e) => setDraft({ ...draft, contract_end_date: e.target.value })} /></Field>
                  <Field label="Onboarding"><Input value={draft.onboarding_status ?? ""} onChange={(e) => setDraft({ ...draft, onboarding_status: e.target.value })} /></Field>
                  <Field label="Status">
                    <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Observações estratégicas">
                  <textarea value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    rows={3} className="w-full bg-input/50 border border-border rounded-lg p-3 text-sm" />
                </Field>
                <Field label="Observações de documentos">
                  <textarea value={draft.document_notes ?? ""} onChange={(e) => setDraft({ ...draft, document_notes: e.target.value })}
                    rows={3} className="w-full bg-input/50 border border-border rounded-lg p-3 text-sm" />
                </Field>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="outline" onClick={() => { setEditing(false); setDraft(client); }}>Cancelar</Button>
                  <Button onClick={saveEdit} disabled={saving} className="gradient-primary text-primary-foreground">
                    <Save className="h-3.5 w-3.5 mr-1.5" />{saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="p-6 glass lg:col-span-2 space-y-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">Identificação</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailField label="Razão social" icon={Building2} value={client.company_name} />
                      <DetailField label="Nome fantasia" value={client.trade_name} />
                      <DetailField label="Contato principal" value={client.contact_name} />
                      <DetailField label="CNPJ" value={client.cnpj} />
                      <DetailField label="E-mail" icon={Mail} value={client.email && <a href={`mailto:${client.email}`} className="hover:text-primary">{client.email}</a>} />
                      <DetailField label="Telefone" icon={Phone} value={client.phone} />
                      <DetailField label="WhatsApp" value={client.whatsapp} />
                      <DetailField label="Segmento" icon={Briefcase} value={client.segment} />
                    </div>
                  </div>
                  {client.notes && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Observações</div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
                    </div>
                  )}
                </Card>

                <Card className="p-6 glass space-y-4">
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Contatos secundários</div>
                  {contacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum contato adicional cadastrado.</p>
                  ) : (
                    <ul className="space-y-3">
                      {contacts.map((c) => (
                        <li key={c.id} className="text-sm border-l-2 border-primary/30 pl-3">
                          <div className="font-medium flex items-center gap-2">
                            {c.name}
                            {c.is_primary && <span className="text-[9px] uppercase bg-primary/15 text-primary px-1.5 py-0.5 rounded">Principal</span>}
                          </div>
                          {c.role && <div className="text-xs text-muted-foreground">{c.role}</div>}
                          <div className="text-xs text-muted-foreground mt-0.5">{[c.email, c.phone].filter(Boolean).join(" · ")}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="pt-3 border-t border-border space-y-2">
                    <DetailField label="Cliente desde" icon={Calendar} value={client.started_at ? format(new Date(client.started_at), "dd/MM/yyyy") : "—"} />
                    <DetailField label="Última atividade" value={activities[0] ? formatRelative(activities[0].created_at) : "Nunca"} />
                  </div>
                </Card>
              </div>
            ),
          },
          {
            id: "timeline", label: "Timeline", icon: ActIcon, count: activities.length,
            content: <Card className="p-6 glass"><Timeline activities={activities} /></Card>,
          },
          {
            id: "opps", label: "Oportunidades", icon: Target, count: opps.length,
            content: opps.length === 0 ? (
              <EmptyState title="Nenhuma oportunidade" description="Este cliente ainda não tem oportunidades registradas." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opps.map((o) => (
                  <Card key={o.id} className="p-5 glass hover-lift">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h4 className="font-semibold text-sm">{o.title}</h4>
                      <StatusBadge status={o.status} size="xs" />
                    </div>
                    <div className="text-2xl font-bold gradient-text-subtle">{brl(o.value)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {o.pipeline_stages?.name ?? "Sem etapa"} · {o.probability}% prob.
                    </div>
                  </Card>
                ))}
              </div>
            ),
          },
          {
            id: "tasks", label: "Tarefas", icon: CheckSquare, count: tasks.length,
            content: <TasksPanel tasks={tasks} relatedKey="related_client_id" relatedId={id} refs={{ client_id: id }} onChanged={load} />,
          },
          {
            id: "notes", label: "Notas", icon: FileText, count: notes.length,
            content: <NotesPanel notes={notes} refs={{ client_id: id }} onAdded={load} />,
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

function MetricMini({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <Card className="p-4 glass border-border/50 hover-lift">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground truncate">{label}</div>
          <div className="text-lg font-bold font-display tabular-nums">{value}</div>
        </div>
      </div>
    </Card>
  );
}
