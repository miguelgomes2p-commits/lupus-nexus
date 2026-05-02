import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/crm/EmptyState";
import { LEAD_STATUSES, TEMPERATURES, PRIORITIES, statusColor, tempColor, logActivity, type LeadStatus, type Temperature, type Priority } from "@/lib/crm";
import { brl } from "@/lib/format";
import { Plus, Search, Users, Trash2, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/leads/")({
  component: LeadsPage,
});

interface Lead {
  id: string; name: string; company_name: string | null; email: string | null;
  phone: string | null; status: LeadStatus; temperature: Temperature;
  priority: Priority; estimated_value: number | null; owner_id: string | null;
  source_id: string | null; created_at: string;
}

function LeadsPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => { load(); supabase.from("sources").select("id,name").then(({ data }) => setSources(data ?? [])); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setLeads((data ?? []) as Lead[]);
    setLoading(false);
  }

  const filtered = leads.filter((l) => {
    const matchSearch = !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.company_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function save(form: FormData) {
    const payload: any = {
      name: form.get("name"),
      company_name: form.get("company_name") || null,
      email: form.get("email") || null,
      phone: form.get("phone") || null,
      whatsapp: form.get("whatsapp") || null,
      cnpj: form.get("cnpj") || null,
      city: form.get("city") || null,
      state: form.get("state") || null,
      instagram: form.get("instagram") || null,
      website: form.get("website") || null,
      status: form.get("status"),
      temperature: form.get("temperature"),
      priority: form.get("priority"),
      estimated_value: Number(form.get("estimated_value") || 0),
      source_id: form.get("source_id") || null,
      notes: form.get("notes") || null,
      owner_id: editing?.owner_id ?? user?.id ?? null,
    };
    if (editing) {
      const { error } = await supabase.from("leads").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      await logActivity(supabase, "lead_editado", `Lead "${payload.name}" foi editado`, { lead_id: editing.id });
      toast.success("Lead atualizado");
    } else {
      const { data, error } = await supabase.from("leads").insert(payload).select().single();
      if (error) return toast.error(error.message);
      await logActivity(supabase, "lead_criado", `Lead "${payload.name}" foi criado`, { lead_id: data.id });

      // Auto-cria oportunidade vinculada na primeira etapa do pipeline
      const { data: firstStage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("is_active", true)
        .order("order_index")
        .limit(1)
        .maybeSingle();

      if (firstStage?.id) {
        const probMap: Record<string, number> = { frio: 20, morno: 50, quente: 75 };
        const { data: opp, error: oppErr } = await supabase.from("opportunities").insert({
          title: payload.company_name ? `${payload.company_name} — ${payload.name}` : payload.name,
          value: payload.estimated_value || 0,
          probability: probMap[payload.temperature as string] ?? 50,
          stage_id: firstStage.id,
          lead_id: data.id,
          owner_id: payload.owner_id,
          status: "aberta",
        }).select().single();
        if (!oppErr && opp) {
          await logActivity(supabase, "oportunidade_criada", `Oportunidade criada automaticamente a partir do lead "${payload.name}"`, { lead_id: data.id, opportunity_id: opp.id });
          toast.success("Lead criado · oportunidade adicionada ao pipeline");
        } else {
          toast.success("Lead criado");
        }
      } else {
        toast.success("Lead criado (configure as etapas do pipeline para auto-gerar oportunidade)");
      }
    }
    setOpen(false); setEditing(null); load();
  }

  async function remove(id: string, name: string) {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`"${name}" excluído`);
    load();
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Gestão completa dos seus leads comerciais"
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4 mr-1" /> Novo Lead
          </Button>
        }
      />

      <Card className="p-4 mb-4 glass">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, empresa ou email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum lead encontrado"
          description="Comece criando seu primeiro lead para alimentar o pipeline."
          action={<Button onClick={() => setOpen(true)} className="gradient-primary"><Plus className="h-4 w-4 mr-1" /> Criar lead</Button>}
        />
      ) : (
        <Card className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium">Lead</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Empresa</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Contato</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Temp.</th>
                  <th className="text-right p-3 font-medium hidden md:table-cell">Valor</th>
                  <th className="w-32 p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-accent/40 transition-colors">
                    <td className="p-3 font-medium">{l.name}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{l.company_name ?? "—"}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{l.email ?? l.phone ?? "—"}</td>
                    <td className="p-3"><span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded ${statusColor[l.status]}`}>{l.status}</span></td>
                    <td className="p-3 hidden md:table-cell"><span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${tempColor[l.temperature]}`}>{l.temperature}</span></td>
                    <td className="p-3 hidden md:table-cell text-right font-medium">{brl(l.estimated_value)}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => nav({ to: "/leads/$id", params: { id: l.id } })}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(l); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-primary hover:text-primary"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita. "{l.name}" será removido.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(l.id, l.name)} className="bg-primary text-primary-foreground">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar Lead" : "Novo Lead"}</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }}
            className="space-y-3 mt-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome *</Label>
                <Input name="name" required defaultValue={editing?.name} />
              </div>
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Input name="company_name" defaultValue={editing?.company_name ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input name="cnpj" defaultValue={(editing as any)?.cnpj ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input name="email" type="email" defaultValue={editing?.email ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input name="phone" defaultValue={editing?.phone ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input name="whatsapp" defaultValue={(editing as any)?.whatsapp ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram</Label>
                <Input name="instagram" defaultValue={(editing as any)?.instagram ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input name="city" defaultValue={(editing as any)?.city ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Input name="state" maxLength={2} defaultValue={(editing as any)?.state ?? ""} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Website</Label>
                <Input name="website" defaultValue={(editing as any)?.website ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status ?? "novo"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Temperatura</Label>
                <Select name="temperature" defaultValue={editing?.temperature ?? "frio"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TEMPERATURES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select name="priority" defaultValue={editing?.priority ?? "media"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select name="source_id" defaultValue={editing?.source_id ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Valor estimado (R$)</Label>
                <Input name="estimated_value" type="number" step="0.01" defaultValue={editing?.estimated_value ?? 0} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Anotações</Label>
                <textarea name="notes" rows={3} defaultValue={(editing as any)?.notes ?? ""} className="w-full bg-input border border-border rounded-md p-2 text-sm" />
              </div>
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">
              {editing ? "Salvar alterações" : "Criar lead"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
