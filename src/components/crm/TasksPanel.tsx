import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckSquare, Plus, CheckCircle2, Clock, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  priority: string;
  completed_at: string | null;
}

interface Props {
  tasks: Task[];
  clientId: string;
  onChanged: () => void;
}

export function TasksPanel({ tasks, clientId, onChanged }: Props) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!title.trim()) return;
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const payload: any = {
      title: title.trim(),
      due_date: due ? new Date(due).toISOString() : null,
      assigned_to: user?.id ?? null,
      related_client_id: clientId,
    };
    const { error } = await supabase.from("tasks").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    setTitle(""); setDue("");
    toast.success("Tarefa criada");
    onChanged();
  }

  async function complete(t: Task) {
    const { error } = await supabase.from("tasks")
      .update({ status: "concluida", completed_at: new Date().toISOString() })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Tarefa concluída");
    onChanged();
  }

  async function remove(t: Task) {
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Tarefa excluída");
    onChanged();
  }

  const pending = tasks.filter((t) => t.status !== "concluida" && t.status !== "cancelada");
  const completed = tasks.filter((t) => t.status === "concluida");

  return (
    <Card className="p-5 glass border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Tarefas</h3>
        <span className="text-xs text-muted-foreground tabular-nums ml-auto">
          {pending.length} aberta{pending.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" className="flex-1 h-9 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter") create(); }} />
        <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="h-9 text-sm sm:w-52" />
        <Button onClick={create} disabled={!title.trim() || saving} size="sm" className="gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Nenhuma tarefa ainda.</p>
      ) : (
        <ul className="space-y-2">
          {[...pending, ...completed].map((t) => {
            const overdue = t.due_date && isPast(new Date(t.due_date)) && t.status !== "concluida";
            const today = t.due_date && isToday(new Date(t.due_date));
            const done = t.status === "concluida";
            return (
              <li key={t.id} className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                done ? "bg-muted/20 border-border/30 opacity-60" :
                  overdue ? "bg-primary/5 border-primary/30" :
                    today ? "bg-amber-500/10 border-amber-500/30" :
                      "bg-muted/30 border-border/40",
              )}>
                <button onClick={() => !done && complete(t)} disabled={done}
                  className={cn("h-5 w-5 rounded border-2 flex items-center justify-center shrink-0",
                    done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40 hover:border-primary")}>
                  {done && <CheckCircle2 className="h-3 w-3 text-background" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-medium truncate", done && "line-through text-muted-foreground")}>{t.title}</div>
                  {t.due_date && (
                    <div className={cn("flex items-center gap-1 text-[11px] mt-0.5",
                      overdue ? "text-primary font-semibold" : today ? "text-amber-400" : "text-muted-foreground")}>
                      {overdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {format(new Date(t.due_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <StatusBadge status={t.priority} size="xs" />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if (confirm("Excluir tarefa?")) remove(t); }}>
                    <Trash2 className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
