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
import { Plus, Target, Trash2, Pencil, Trophy, X } from "lucide-react";
import { brl } from "@/lib/format";
import { toast } from "sonner";
import { logActivity } from "@/lib/crm";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/oportunidades/")({
  component: OppsPage,
});

function OppsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todas" | "aberta" | "ganha" | "perdida">("aberta");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [o, s, l] = await Promise.all([
      supabase.from("opportunities").select("*, pipeline_stages(name,color), leads(name)").order("created_at", { ascending: false }),
      supabase.from("pipeline_stages").select("*").eq("is_active", true).order("order_index"),
      supabase.from("leads").select("id,name"),
    ]);
    setItems(o.data ?? []); setStages(s.data ?? []); setLeads(l.data ?? []);
    setLoading(false);
  }

  const filtered = items.filter((o) => filter === "todas" || o.status === filter);

  async function save(form: FormData) {
    const payload: any = {
      title: form.get("title"),
      description: form.get("description") || null,
      value: Number(form.get("value") || 0),
      probability: Number(form.get("probability") || 50),
      stage_id: form.get("stage_id") || null,
      lead_id: form.get("lead_id") || null,
      expected_close_date: form.get("expected_close_date") || null,
      owner_id: editing?.owner_id ?? user?.id,
    };
    if (editing) {
      const { error } = await supabase.from("opportunities").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Oportunidade atualizada");
    } else {
      const { data, error } = await supabase.from("opportunities").insert(payload).select().single();
      if (error) return toast.error(error.message);
      await logActivity(supabase, "oportunidade_criada", `Oportunidade "${payload.title}" criada`, { opportunity_id: data.id, lead_id: payload.lead_id });
      toast.success("Oportunidade criada");
    }
    setOpen(false); setEditing(null); load();
  }

  async function setStatus(o: any, status: "ganha" | "perdida", reason?: string) {
    const update: any = { status };
    if (status === "ganha") update.won_at = new Date().toISOString();
    if (status === "perdida") { update.lost_at = new Date().toISOString(); update.lost_reason = reason ?? null; }
    const { error } = await supabase.from("opportunities").update(update).eq("id", o.id);
    if (error) return toast.error(error.message);
    await logActivity(supabase, status === "ganha" ? "oportunidade_ganha" : "oportunidade_perdida", `Oportunidade "${o.title}" marcada como ${status}`, { opportunity_id: o.id, lead_id: o.lead_id });
    toast.success(`Marcada como ${status}`);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluída"); load();
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Oportunidades"
        description="Gerencie todo o ciclo comercial das oportunidades"
        action={<Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> Nova</Button>}
      />

      <div className="flex gap-2 mb-4">
        {(["todas","aberta","ganha","perdida"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Target} title="Sem oportunidades" />
      ) : (
        <div className="grid gap-3">
          {filtered.map((o) => (
            <Card key={o.id} className="p-4 glass hover-lift">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{o.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {o.leads?.name ?? "Sem lead"} · {o.pipeline_stages?.name ?? "Sem etapa"} · {o.probability}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold gradient-text">{brl(o.value)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{o.status}</div>
                </div>
                <div className="flex gap-1">
                  {o.status === "aberta" && (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => setStatus(o, "ganha")} title="Marcar como ganha"><Trophy className="h-4 w-4 text-emerald-400" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { const r = prompt("Motivo da perda:") ?? undefined; setStatus(o, "perdida", r); }} title="Marcar como perdida"><X className="h-4 w-4 text-primary" /></Button>
                    </>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(o); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) remove(o.id); }}><Trash2 className="h-4 w-4 text-primary" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Editar" : "Nova"} oportunidade</SheetTitle></SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input name="title" required defaultValue={editing?.title} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <textarea name="description" rows={2} defaultValue={editing?.description ?? ""} className="w-full bg-input border border-border rounded-md p-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input name="value" type="number" step="0.01" defaultValue={editing?.value ?? 0} />
              </div>
              <div className="space-y-1.5">
                <Label>Probabilidade (%)</Label>
                <Input name="probability" type="number" min={0} max={100} defaultValue={editing?.probability ?? 50} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Etapa</Label>
              <Select name="stage_id" defaultValue={editing?.stage_id ?? stages[0]?.id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lead vinculado</Label>
              <Select name="lead_id" defaultValue={editing?.lead_id ?? ""}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data esperada de fechamento</Label>
              <Input name="expected_close_date" type="date" defaultValue={editing?.expected_close_date ?? ""} />
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">{editing ? "Salvar" : "Criar"}</Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
