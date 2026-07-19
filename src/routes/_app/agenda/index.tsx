import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Trash2, Repeat, Calendar as CalIcon } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths,
  format, isSameMonth, isSameDay, isBefore, differenceInCalendarDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/agenda/")({ component: AgendaPage });

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_min: number;
  client_id: string | null;
  recurrence: "none" | "weekly";
  recurrence_until: string | null;
  clients?: { company_name: string } | null;
};

type Occurrence = EventRow & { occurrenceDate: Date; isRecurring: boolean };

function expandOccurrences(events: EventRow[], rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const out: Occurrence[] = [];
  for (const ev of events) {
    const base = new Date(ev.starts_at);
    if (ev.recurrence === "weekly") {
      const until = ev.recurrence_until ? new Date(ev.recurrence_until + "T23:59:59") : rangeEnd;
      const hardEnd = isBefore(until, rangeEnd) ? until : rangeEnd;
      // Fast-forward base to first occurrence within range
      let d = new Date(base);
      if (isBefore(d, rangeStart)) {
        const weeks = Math.ceil(differenceInCalendarDays(rangeStart, d) / 7);
        d = addDays(d, weeks * 7);
      }
      while (!isBefore(hardEnd, d)) {
        out.push({ ...ev, occurrenceDate: new Date(d), isRecurring: true });
        d = addDays(d, 7);
      }
    } else {
      if (base >= rangeStart && base <= rangeEnd) {
        out.push({ ...ev, occurrenceDate: base, isRecurring: false });
      }
    }
  }
  return out.sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());
}

function AgendaPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [formDate, setFormDate] = useState<Date | null>(null);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [e, c] = await Promise.all([
      supabase.from("agenda_events").select("*, clients:client_id(company_name)").order("starts_at"),
      supabase.from("clients").select("id,company_name").order("company_name"),
    ]);
    setEvents((e.data as any) ?? []);
    setClients(c.data ?? []);
    setLoading(false);
  }

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = useMemo(() => {
    const arr: Date[] = [];
    let d = gridStart;
    while (!isBefore(gridEnd, d)) { arr.push(d); d = addDays(d, 1); }
    return arr;
  }, [gridStart.getTime(), gridEnd.getTime()]);

  const occurrences = useMemo(
    () => expandOccurrences(events, gridStart, gridEnd),
    [events, gridStart.getTime(), gridEnd.getTime()]
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const o of occurrences) {
      const k = format(o.occurrenceDate, "yyyy-MM-dd");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    return map;
  }, [occurrences]);

  const selectedList = selectedDay ? byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [] : [];

  async function save(form: FormData) {
    const dateStr = String(form.get("date"));
    const timeStr = String(form.get("time") || "09:00");
    const starts_at = new Date(`${dateStr}T${timeStr}`).toISOString();
    const recurrence = String(form.get("recurrence") || "none") as "none" | "weekly";
    const payload = {
      title: String(form.get("title")),
      description: (form.get("description") as string) || null,
      starts_at,
      duration_min: Number(form.get("duration_min") || 60),
      client_id: (form.get("client_id") as string) || null,
      recurrence,
      recurrence_until: recurrence === "weekly" ? (form.get("recurrence_until") as string) || null : null,
      created_by: user?.id ?? null,
    };
    const { error } = await supabase.from("agenda_events").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Evento criado");
    setOpenForm(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este evento e todas as recorrências?")) return;
    const { error } = await supabase.from("agenda_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  }

  function openNew(date?: Date) {
    setFormDate(date ?? selectedDay ?? new Date());
    setOpenForm(true);
  }

  if (loading) return <PageLoader />;

  const weekDayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const today = new Date();

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Calendário de eventos e reuniões recorrentes"
        action={
          <Button onClick={() => openNew()} className="gradient-primary text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4 mr-1" /> Novo evento
          </Button>
        }
      />

      <Card className="p-3 md:p-4 glass mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setCursor(addMonths(cursor, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCursor(new Date())}>Hoje</Button>
            <Button size="icon" variant="ghost" onClick={() => setCursor(addMonths(cursor, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm md:text-base font-semibold capitalize">
            {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <div className="w-[110px]" />
        </div>

        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden text-xs">
          {weekDayLabels.map((w) => (
            <div key={w} className="bg-muted/50 px-2 py-1.5 text-center font-medium text-muted-foreground">{w}</div>
          ))}
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const items = byDay.get(key) ?? [];
            const inMonth = isSameMonth(d, cursor);
            const isToday = isSameDay(d, today);
            const isSelected = selectedDay && isSameDay(d, selectedDay);
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(d)}
                onDoubleClick={() => openNew(d)}
                className={`min-h-[78px] md:min-h-[104px] p-1.5 text-left bg-background hover:bg-accent/40 transition-colors flex flex-col gap-1 ${
                  !inMonth ? "opacity-40" : ""
                } ${isSelected ? "ring-2 ring-primary ring-inset" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] md:text-xs font-medium ${isToday ? "h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center" : ""}`}>
                    {format(d, "d")}
                  </span>
                  {items.length > 0 && <span className="text-[10px] text-muted-foreground">{items.length}</span>}
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {items.slice(0, 3).map((o, i) => (
                    <div
                      key={o.id + i}
                      className="truncate text-[10px] md:text-[11px] leading-tight px-1 py-0.5 rounded bg-primary/15 text-primary flex items-center gap-1"
                    >
                      {o.isRecurring && <Repeat className="h-2.5 w-2.5 shrink-0" />}
                      <span className="truncate">{format(o.occurrenceDate, "HH:mm")} {o.title}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">+ {items.length - 3}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDay && (
        <Card className="p-4 glass">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold capitalize">
              {format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <Button size="sm" variant="outline" onClick={() => openNew(selectedDay)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
          {selectedList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
          ) : (
            <ul className="space-y-2">
              {selectedList.map((o, i) => (
                <li key={o.id + i} className="p-3 bg-muted/30 rounded-lg flex items-start gap-3">
                  <div className="text-xs font-mono text-primary shrink-0 pt-0.5">
                    {format(o.occurrenceDate, "HH:mm")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {o.title}
                      {o.isRecurring && (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Repeat className="h-3 w-3" /> semanal
                        </span>
                      )}
                    </div>
                    {o.clients && <div className="text-xs text-muted-foreground mt-0.5">{o.clients.company_name}</div>}
                    {o.description && <div className="text-xs text-muted-foreground mt-1">{o.description}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{o.duration_min} min</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(o.id)}>
                    <Trash2 className="h-4 w-4 text-primary" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {!selectedDay && events.length === 0 && (
        <Card className="p-8 glass text-center">
          <CalIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum evento cadastrado. Clique em um dia para começar.</p>
        </Card>
      )}

      <Sheet open={openForm} onOpenChange={setOpenForm}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Novo evento</SheetTitle></SheetHeader>
          <EventForm
            defaultDate={formDate ?? new Date()}
            clients={clients}
            onSubmit={save}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EventForm({ defaultDate, clients, onSubmit }: {
  defaultDate: Date; clients: any[]; onSubmit: (fd: FormData) => void;
}) {
  const [recurrence, setRecurrence] = useState<"none" | "weekly">("none");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }} className="space-y-3 mt-4">
      <div className="space-y-1.5"><Label>Título *</Label><Input name="title" required placeholder="Reunião com cliente" /></div>
      <div className="space-y-1.5"><Label>Descrição</Label>
        <textarea name="description" rows={3} className="w-full bg-input border border-border rounded-md p-2 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Data *</Label>
          <Input name="date" type="date" required defaultValue={format(defaultDate, "yyyy-MM-dd")} />
        </div>
        <div className="space-y-1.5"><Label>Hora</Label><Input name="time" type="time" defaultValue="09:00" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Duração (min)</Label>
          <Input name="duration_min" type="number" min={5} step={5} defaultValue={60} />
        </div>
        <div className="space-y-1.5"><Label>Cliente</Label>
          <Select name="client_id"><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Recorrência</Label>
        <Select name="recurrence" defaultValue="none" onValueChange={(v) => setRecurrence(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem recorrência</SelectItem>
            <SelectItem value="weekly">Semanal (mesmo dia da semana)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {recurrence === "weekly" && (
        <div className="space-y-1.5"><Label>Repetir até (opcional)</Label>
          <Input name="recurrence_until" type="date" />
          <p className="text-[11px] text-muted-foreground">Se em branco, repete indefinidamente.</p>
        </div>
      )}
      <Button type="submit" className="w-full gradient-primary text-primary-foreground">Criar evento</Button>
    </form>
  );
}
