import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/crm/EmptyState";
import { Calendar as CalIcon } from "lucide-react";
import { format, isToday, isPast, isThisWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/agenda/")({ component: AgendaPage });

function AgendaPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("tasks").select("*, clients:related_client_id(company_name)").neq("status", "concluida").not("due_date", "is", null).order("due_date")
      .then(({ data }) => { setTasks(data ?? []); setLoading(false); });
  }, []);
  if (loading) return <PageLoader />;

  const overdue = tasks.filter((t) => isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));
  const today = tasks.filter((t) => isToday(new Date(t.due_date)));
  const week = tasks.filter((t) => isThisWeek(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && new Date(t.due_date) > new Date());
  const later = tasks.filter((t) => new Date(t.due_date) > addDays(new Date(), 7));

  const Section = ({ title, items, color }: { title: string; items: any[]; color: string }) => (
    <Card className="p-5 glass">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${color}`} />{title} <span className="text-xs text-muted-foreground">({items.length})</span></h3>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma.</p> : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id} className="p-3 bg-muted/30 rounded-lg text-sm">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(t.due_date), "EEE dd/MM HH:mm", { locale: ptBR })}{t.clients && ` · ${t.clients.company_name}`}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <div>
      <PageHeader title="Agenda" description="Próximas ações organizadas por urgência" />
      {tasks.length === 0 ? <EmptyState icon={CalIcon} title="Sem ações agendadas" description="Crie tarefas com vencimento para vê-las aqui." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Atrasadas" items={overdue} color="bg-primary" />
          <Section title="Hoje" items={today} color="bg-amber-400" />
          <Section title="Esta semana" items={week} color="bg-blue-400" />
          <Section title="Próximas" items={later} color="bg-emerald-400" />
        </div>
      )}
    </div>
  );
}
