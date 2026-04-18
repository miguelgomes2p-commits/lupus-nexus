import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Building2, MapPin, Calendar as CalIcon, Tag, Activity as ActIcon } from "lucide-react";
import { brl } from "@/lib/format";
import { statusColor, tempColor, logActivity } from "@/lib/crm";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/leads/$id")({
  component: LeadDetail,
});

function LeadDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [opps, setOpps] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const [l, a, t, o, n] = await Promise.all([
      supabase.from("leads").select("*, sources(name)").eq("id", id).maybeSingle(),
      supabase.from("activities").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(30),
      supabase.from("tasks").select("*").eq("related_lead_id", id).order("due_date"),
      supabase.from("opportunities").select("*").eq("lead_id", id),
      supabase.from("notes").select("*, profiles(name)").eq("lead_id", id).order("created_at", { ascending: false }),
    ]);
    setLead(l.data); setActivities(a.data ?? []); setTasks(t.data ?? []); setOpps(o.data ?? []); setNotes(n.data ?? []);
    setLoading(false);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("notes").insert({ lead_id: id, content: newNote, user_id: user?.id });
    if (error) return toast.error(error.message);
    await logActivity(supabase, "nota_criada", `Nota adicionada ao lead`, { lead_id: id });
    setNewNote(""); load();
  }

  async function convertToClient() {
    if (!lead) return;
    const { data, error } = await supabase.from("clients").insert({
      lead_id: lead.id,
      company_name: lead.company_name ?? lead.name,
      contact_name: lead.name,
      email: lead.email, phone: lead.phone, whatsapp: lead.whatsapp,
      cnpj: lead.cnpj, owner_id: lead.owner_id,
    }).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("leads").update({ status: "ganho" }).eq("id", lead.id);
    await logActivity(supabase, "lead_convertido", `Lead convertido em cliente`, { lead_id: lead.id, client_id: data.id });
    toast.success("Lead convertido em cliente!");
    nav({ to: "/clientes/$id", params: { id: data.id } });
  }

  if (loading) return <PageLoader />;
  if (!lead) return <div className="text-center py-12">Lead não encontrado.</div>;

  return (
    <div>
      <Link to="/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 glass">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold font-display">{lead.name}</h1>
                {lead.company_name && <p className="text-muted-foreground flex items-center gap-1 mt-1"><Building2 className="h-4 w-4" /> {lead.company_name}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded ${statusColor[lead.status as keyof typeof statusColor]}`}>{lead.status}</span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${tempColor[lead.temperature as keyof typeof tempColor]}`}>{lead.temperature}</span>
                  {lead.sources?.name && <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-muted text-muted-foreground"><Tag className="h-3 w-3 inline mr-1" />{lead.sources.name}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Valor estimado</div>
                <div className="text-2xl font-bold gradient-text">{brl(lead.estimated_value)}</div>
                <Button onClick={convertToClient} className="mt-3 gradient-primary text-primary-foreground" size="sm">Converter em cliente</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 text-sm">
              {lead.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> <a href={`mailto:${lead.email}`} className="hover:text-primary">{lead.email}</a></div>}
              {lead.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {lead.phone}</div>}
              {(lead.city || lead.state) && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {[lead.city, lead.state].filter(Boolean).join(", ")}</div>}
              {lead.created_at && <div className="flex items-center gap-2"><CalIcon className="h-4 w-4 text-muted-foreground" /> Criado {format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}</div>}
            </div>
            {lead.notes && <p className="mt-4 text-sm text-muted-foreground border-t border-border pt-4">{lead.notes}</p>}
          </Card>

          <Card className="p-6 glass">
            <h3 className="font-semibold mb-4">Anotações</h3>
            <div className="space-y-2 mb-4">
              <textarea
                value={newNote} onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escreva uma anotação…"
                rows={3}
                className="w-full bg-input border border-border rounded-md p-2 text-sm"
              />
              <Button onClick={addNote} size="sm" className="gradient-primary text-primary-foreground">Adicionar nota</Button>
            </div>
            <div className="space-y-3">
              {notes.length === 0 ? <p className="text-sm text-muted-foreground">Sem anotações.</p> :
                notes.map((n) => (
                  <div key={n.id} className="p-3 bg-muted/30 rounded-lg text-sm">
                    <p>{n.content}</p>
                    <div className="text-xs text-muted-foreground mt-1">{n.profiles?.name ?? "—"} · {format(new Date(n.created_at), "dd/MM/yy HH:mm")}</div>
                  </div>
                ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 glass">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><ActIcon className="h-4 w-4 text-primary" /> Histórico</h3>
            {activities.length === 0 ? <p className="text-sm text-muted-foreground">Sem atividades.</p> :
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {activities.map((a) => (
                  <li key={a.id} className="text-sm border-l-2 border-primary/40 pl-3">
                    <div>{a.description}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(a.created_at), "dd/MM HH:mm")}</div>
                  </li>
                ))}
              </ul>}
          </Card>

          <Card className="p-5 glass">
            <h3 className="font-semibold mb-3">Oportunidades ({opps.length})</h3>
            {opps.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma.</p> :
              <ul className="space-y-2">
                {opps.map((o) => (
                  <li key={o.id} className="text-sm flex justify-between p-2 bg-muted/30 rounded">
                    <span>{o.title}</span>
                    <span className="font-medium text-primary">{brl(o.value)}</span>
                  </li>
                ))}
              </ul>}
          </Card>

          <Card className="p-5 glass">
            <h3 className="font-semibold mb-3">Tarefas ({tasks.length})</h3>
            {tasks.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma.</p> :
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="text-sm p-2 bg-muted/30 rounded">
                    <div className="font-medium">{t.title}</div>
                    {t.due_date && <div className="text-xs text-muted-foreground">Venc.: {format(new Date(t.due_date), "dd/MM/yyyy")}</div>}
                  </li>
                ))}
              </ul>}
          </Card>
        </div>
      </div>
    </div>
  );
}
