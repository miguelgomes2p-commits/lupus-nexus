import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/crm";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trophy, X, Trash2, Save, Calendar, Target, Loader2 } from "lucide-react";
import { HealthIndicator } from "./HealthIndicator";
import { opportunityHealth, formatRelative } from "@/lib/health";
import { StatusBadge } from "./StatusBadge";

interface Stage { id: string; name: string; color: string; }
interface Lead { id: string; name: string; }
interface Opp {
  id: string;
  title: string;
  description: string | null;
  value: number;
  probability: number;
  stage_id: string | null;
  lead_id: string | null;
  status: string;
  expected_close_date: string | null;
  last_moved_at: string;
  created_at: string;
  lost_reason?: string | null;
  pipeline_stages?: { name: string; color: string } | null;
  leads?: { name: string } | null;
}

interface Props {
  oppId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  stages: Stage[];
  leads: Lead[];
}

export function OpportunityDrawer({ oppId, open, onOpenChange, onSaved, stages, leads }: Props) {
  const [opp, setOpp] = useState<Opp | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !oppId) { setOpp(null); return; }
    setLoading(true);
    supabase
      .from("opportunities")
      .select("*, pipeline_stages(name,color), leads(name)")
      .eq("id", oppId)
      .maybeSingle()
      .then(({ data }) => {
        setOpp(data as Opp | null);
        setLoading(false);
      });
  }, [oppId, open]);

  async function save(form: FormData) {
    if (!opp) return;
    setSaving(true);
    const payload: any = {
      title: form.get("title"),
      description: form.get("description") || null,
      value: Number(form.get("value") || 0),
      probability: Number(form.get("probability") || 50),
      stage_id: form.get("stage_id") || null,
      lead_id: form.get("lead_id") || null,
      expected_close_date: form.get("expected_close_date") || null,
    };
    if (payload.stage_id !== opp.stage_id) {
      payload.last_moved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("opportunities").update(payload).eq("id", opp.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Oportunidade atualizada");
    onSaved?.();
    onOpenChange(false);
  }

  async function setStatus(status: "ganha" | "perdida") {
    if (!opp) return;
    let lost_reason: string | null = null;
    if (status === "perdida") {
      lost_reason = window.prompt("Motivo da perda:") ?? null;
    }
    const update: any = { status };
    if (status === "ganha") update.won_at = new Date().toISOString();
    if (status === "perdida") { update.lost_at = new Date().toISOString(); update.lost_reason = lost_reason; }
    const { error } = await supabase.from("opportunities").update(update).eq("id", opp.id);
    if (error) return toast.error(error.message);
    await logActivity(
      supabase,
      status === "ganha" ? "oportunidade_ganha" : "oportunidade_perdida",
      `Oportunidade "${opp.title}" marcada como ${status}`,
      { opportunity_id: opp.id, lead_id: opp.lead_id ?? undefined },
    );
    toast.success(`Marcada como ${status}`);
    onSaved?.();
    onOpenChange(false);
  }

  async function remove() {
    if (!opp) return;
    if (!window.confirm("Excluir esta oportunidade?")) return;
    const { error } = await supabase.from("opportunities").delete().eq("id", opp.id);
    if (error) return toast.error(error.message);
    toast.success("Oportunidade excluída");
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto p-0">
        {loading || !opp ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
              <SheetHeader className="text-left">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-glow">
                    <Target className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-xl font-bold leading-tight">{opp.title}</SheetTitle>
                    <SheetDescription className="text-xs mt-1">
                      {opp.leads?.name ?? "Sem lead vinculado"} · criada {formatRelative(opp.created_at)}
                    </SheetDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <StatusBadge status={opp.status} size="sm" />
                  <HealthIndicator health={opportunityHealth(opp)} size="sm" />
                  <div className="ml-auto text-right">
                    <div className="text-2xl font-bold gradient-text tabular-nums">{brl(opp.value)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{opp.probability}% prob.</div>
                  </div>
                </div>
              </SheetHeader>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input name="title" required defaultValue={opp.title} />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={opp.description ?? ""}
                  className="w-full bg-input border border-border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor (R$)</Label>
                  <Input name="value" type="number" step="0.01" defaultValue={opp.value} />
                </div>
                <div className="space-y-1.5">
                  <Label>Probabilidade (%)</Label>
                  <Input name="probability" type="number" min={0} max={100} defaultValue={opp.probability} />
                </div>
                <div className="space-y-1.5">
                  <Label>Etapa</Label>
                  <Select name="stage_id" defaultValue={opp.stage_id ?? stages[0]?.id}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Lead</Label>
                  <Select name="lead_id" defaultValue={opp.lead_id ?? ""}>
                    <SelectTrigger><SelectValue placeholder="Sem lead" /></SelectTrigger>
                    <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Previsão de fechamento</Label>
                  <Input name="expected_close_date" type="date" defaultValue={opp.expected_close_date ?? ""} />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between"><span>Criada em</span><span className="text-foreground tabular-nums">{format(new Date(opp.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span></div>
                <div className="flex justify-between"><span>Última movimentação</span><span className="text-foreground tabular-nums">{format(new Date(opp.last_moved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span></div>
                {opp.lost_reason && <div className="pt-1 mt-1 border-t border-border"><span className="text-primary font-medium">Motivo da perda:</span> {opp.lost_reason}</div>}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground shadow-glow">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar alterações
                </Button>
                {opp.status === "aberta" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" onClick={() => setStatus("ganha")} className="border-[oklch(0.72_0.18_150)/0.4] text-[oklch(0.8_0.18_150)] hover:bg-[oklch(0.72_0.18_150)/0.1]">
                      <Trophy className="h-4 w-4 mr-1.5" /> Ganhar
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setStatus("perdida")} className="border-primary/40 text-primary hover:bg-primary/10">
                      <X className="h-4 w-4 mr-1.5" /> Perder
                    </Button>
                  </div>
                )}
                <Button type="button" variant="ghost" onClick={remove} className="text-muted-foreground hover:text-primary">
                  <Trash2 className="h-4 w-4 mr-1.5" /> Excluir oportunidade
                </Button>
              </div>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
