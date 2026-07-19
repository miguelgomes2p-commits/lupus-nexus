import { createFileRoute } from "@tanstack/react-router";
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
import { Plus, CheckSquare, Trash2, Check } from "lucide-react";
import { TASK_STATUSES, PRIORITIES, priorityColor } from "@/lib/crm";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/tarefas/")({ component: TasksPage });

function TasksPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"todas" | "hoje" | "atrasadas" | "futuras" | "concluidas">("todas");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [t, c] = await Promise.all([
      supabase.from("tasks").select("*, clients:related_client_id(company_name)").order("due_date", { nullsFirst: false }),
      supabase.from("clients").select("id,company_name").order("company_name"),
    ]);
    setItems(t.data ?? []); setClients(c.data ?? []);
    setLoading(false);
  }
  const filtered = items.filter((t) => {
    if (filter === "concluidas") return t.status === "concluida";
    if (t.status === "concluida") return false;
    if (filter === "todas") return true;
    if (!t.due_date) return filter === "futuras";
    const d = new Date(t.due_date);
    if (filter === "hoje") return isToday(d);
    if (filter === "atrasadas") return isPast(d) && !isToday(d);
    if (filter === "futuras") return d > new Date();
    return true;
  });
  async function save(form: FormData) {
    const payload: any = {
      title: form.get("title"),
      description: form.get("description") || null,
      priority: form.get("priority"),
      status: "pendente",
      due_date: form.get("due_date") ? new Date(String(form.get("due_date"))).toISOString() : null,
      related_client_id: form.get("related_client_id") || null,
      assigned_to: user?.id,
    };
    const { error } = await supabase.from("tasks").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Tarefa criada"); setOpen(false); load();
  }
  async function complete(t: any) {
    const { error } = await supabase.from("tasks").update({ status: "concluida", completed_at: new Date().toISOString() }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Concluída"); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluída"); load();
  }
  if (loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Tarefas" description="Acompanhe suas próximas ações e prazos operacionais"
        action={<Button onClick={() => setOpen(true)} className="gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> Nova</Button>} />
      <div className="flex flex-wrap gap-2 mb-4">
        {(["todas","hoje","atrasadas","futuras","concluidas"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {f}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState icon={CheckSquare} title="Sem tarefas" /> : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const overdue = t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== "concluida";
            return (
              <Card key={t.id} className={`p-4 glass flex items-center gap-3 ${overdue ? "border-primary/40" : ""}`}>
                <button onClick={() => complete(t)} className={`h-6 w-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${t.status === "concluida" ? "bg-emerald-500 border-emerald-500" : "border-border hover:border-primary"}`}>
                  {t.status === "concluida" && <Check className="h-4 w-4 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.due_date && <span className={overdue ? "text-primary font-medium" : ""}>{format(new Date(t.due_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>}
                    {t.clients && <span> · {t.clients.company_name}</span>}
                  </div>
                </div>
                <span className={`text-[10px] uppercase px-2 py-1 rounded ${priorityColor[t.priority as keyof typeof priorityColor]}`}>{t.priority}</span>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) remove(t.id); }}><Trash2 className="h-4 w-4 text-primary" /></Button>
              </Card>
            );
          })}
        </div>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>Nova tarefa</SheetTitle></SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3 mt-4">
            <div className="space-y-1.5"><Label>Título *</Label><Input name="title" required /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><textarea name="description" rows={3} className="w-full bg-input border border-border rounded-md p-2 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Vencimento</Label><Input name="due_date" type="datetime-local" /></div>
              <div className="space-y-1.5"><Label>Prioridade</Label>
                <Select name="priority" defaultValue="media"><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Cliente relacionado</Label>
              <Select name="related_client_id"><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">Criar</Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
// Reference to suppress unused import warning
void TASK_STATUSES;
