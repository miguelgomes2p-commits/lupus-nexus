import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DetailHeader, DetailField } from "@/components/crm/DetailHeader";
import { DetailTabs } from "@/components/crm/DetailTabs";
import { NotesPanel } from "@/components/crm/NotesPanel";
import { TasksPanel } from "@/components/crm/TasksPanel";
import { ClientDocumentsPanel } from "@/components/crm/ClientDocumentsPanel";
import { InvoicesPanel } from "@/components/erp/InvoicesPanel";
import { QuickActions, contactActions } from "@/components/crm/QuickActions";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { EmptyState } from "@/components/crm/EmptyState";
import {
  Mail, Phone, Building2, Calendar, Activity as ActIcon, FileText,
  CheckSquare, Pencil, Save, X, Briefcase, MapPin, Paperclip, Trash2, Receipt,
} from "lucide-react";
import { brl, formatPhone } from "@/lib/format";
import { CLIENT_STATUSES } from "@/lib/crm";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/clientes/$id")({ component: ClientDetail });

function ClientDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const [c, t, n, d] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle(),
      supabase.from("tasks").select("*").eq("related_client_id", id).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("notes").select("*, profiles(name)").eq("client_id", id).order("created_at", { ascending: false }),
      (supabase as any).from("client_documents").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    ]);
    setClient(c.data); setTasks(t.data ?? []); setNotes(n.data ?? []); setDocuments(d.data ?? []);
    setDraft(c.data ?? {});
    setLoading(false);
  }

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
            {client.contract_start_date && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Contrato desde {format(new Date(client.contract_start_date), "MMM yyyy", { locale: ptBR })}
              </span>
            )}
          </>
        }
        metrics={[
          { label: "Contrato", value: brl(client.contract_value), accent: "text-primary" },
          { label: "MRR", value: brl(client.monthly_recurring_revenue), accent: "text-emerald-400" },
        ]}
        actions={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <QuickActions actions={contactActions({ phone: client.phone, whatsapp: client.whatsapp, email: client.email })} />
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
                      <DetailField label="Setor/indústria" value={client.industry} />
                      <DetailField label="Responsável legal" value={client.legal_representative} />
                      <DetailField label="Porte" value={client.company_size} />
                      <DetailField label="Regime tributário" value={client.tax_regime} />
                      <DetailField label="Endereço" icon={MapPin} value={[client.address, client.city, client.state, client.zip_code].filter(Boolean).join(" · ") || null} />
                      <DetailField label="Receita mensal" value={brl(client.monthly_recurring_revenue)} />
                    </div>
                  </div>
                  {client.notes && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Observações</div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
                    </div>
                  )}
                  {client.document_notes && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Documentação</div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{client.document_notes}</p>
                    </div>
                  )}
                </Card>

                <Card className="p-6 glass space-y-3">
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Contrato</div>
                  <DetailField label="Início" icon={Calendar} value={client.contract_start_date ? format(new Date(client.contract_start_date), "dd/MM/yyyy") : "—"} />
                  <DetailField label="Fim/renovação" value={client.contract_end_date ? format(new Date(client.contract_end_date), "dd/MM/yyyy") : "—"} />
                  <DetailField label="Onboarding" value={client.onboarding_status} />
                  <DetailField label="Tarefas abertas" value={tasks.filter((t) => t.status !== "concluida").length} />
                </Card>
              </div>
            ),
          },
          {
            id: "invoices", label: "Faturas & NFE", icon: Receipt,
            content: <InvoicesPanel client={client} />,
          },
          {
            id: "documents", label: "Documentos", icon: Paperclip, count: documents.length,
            content: <ClientDocumentsPanel clientId={id} documents={documents} onChanged={load} />,
          },
          {
            id: "tasks", label: "Tarefas", icon: CheckSquare, count: tasks.length,
            content: <TasksPanel tasks={tasks} clientId={id} onChanged={load} />,
          },
          {
            id: "notes", label: "Notas", icon: FileText, count: notes.length,
            content: <NotesPanel notes={notes} clientId={id} onAdded={load} />,
          },
        ]}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
