import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Kanban as KanbanIcon, GripVertical, Search, AlertTriangle, Clock, Filter, Flame, Target } from "lucide-react";
import { brl } from "@/lib/format";
import { logActivity } from "@/lib/crm";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/EmptyState";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { OpportunityDrawer } from "@/components/crm/OpportunityDrawer";
import { opportunityHealth, isStagnant, formatRelative } from "@/lib/health";
import { HealthIndicator } from "@/components/crm/HealthIndicator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/pipeline/")({
  component: PipelinePage,
});

interface Stage { id: string; name: string; color: string; order_index: number; }
interface Opp {
  id: string;
  title: string;
  value: number;
  probability: number;
  stage_id: string | null;
  status: string;
  lead_id: string | null;
  last_moved_at: string;
  created_at: string;
  expected_close_date: string | null;
  leads?: { name: string | null } | null;
}

type FilterValue = number | "all";

function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [opps, setOpps] = useState<Opp[]>([]);
  const [leads, setLeads] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOpp, setActiveOpp] = useState<Opp | null>(null);
  const [drawerOpp, setDrawerOpp] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [minValue, setMinValue] = useState<FilterValue>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [s, o, l] = await Promise.all([
      supabase.from("pipeline_stages").select("*").eq("is_active", true).order("order_index"),
      supabase.from("opportunities").select("*, leads(name)").eq("status", "aberta"),
      supabase.from("leads").select("id,name"),
    ]);
    setStages((s.data ?? []) as Stage[]);
    setOpps((o.data ?? []) as Opp[]);
    setLeads(l.data ?? []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return opps.filter((o) => {
      if (search && !o.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (minValue !== "all" && Number(o.value) < minValue) return false;
      if (healthFilter !== "all") {
        const h = opportunityHealth(o);
        if (h.level !== healthFilter) return false;
      }
      return true;
    });
  }, [opps, search, minValue, healthFilter]);

  function onDragStart(e: DragStartEvent) {
    const o = opps.find((x) => x.id === e.active.id);
    if (o) setActiveOpp(o);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveOpp(null);
    if (!e.over) return;
    const oppId = String(e.active.id);
    const newStageId = String(e.over.id);
    const opp = opps.find((o) => o.id === oppId);
    if (!opp || opp.stage_id === newStageId) return;

    setOpps((prev) => prev.map((o) => o.id === oppId ? { ...o, stage_id: newStageId, last_moved_at: new Date().toISOString() } : o));

    const { error } = await supabase
      .from("opportunities")
      .update({ stage_id: newStageId, last_moved_at: new Date().toISOString() })
      .eq("id", oppId);
    if (error) {
      toast.error("Falha ao mover");
      load();
      return;
    }
    const stageName = stages.find((s) => s.id === newStageId)?.name ?? "—";
    await logActivity(supabase, "oportunidade_movida", `Oportunidade movida para "${stageName}"`, {
      opportunity_id: oppId, lead_id: opp.lead_id ?? undefined,
    });
    toast.success(`Movido para ${stageName}`);
  }

  if (loading) return <PageLoader label="Carregando pipeline..." />;

  const totalPipeline = filtered.reduce((acc, o) => acc + Number(o.value), 0);
  const stagnantCount = filtered.filter((o) => isStagnant(o.last_moved_at)).length;
  const hotCount = filtered.filter((o) => opportunityHealth(o).level === "excelente").length;

  return (
    <div>
      <PageHeader
        title="Pipeline Comercial"
        description="Centro de operação · arraste cards entre etapas, abra para detalhes"
        badge={
          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold tabular-nums">
            {filtered.length} ativas · {brl(totalPipeline)}
          </span>
        }
        action={
          <Link to="/oportunidades" search={{ create: 1 } as any}>
            <Button className="gradient-primary text-primary-foreground shadow-glow">
              <Plus className="h-4 w-4 mr-1" /> Nova oportunidade
            </Button>
          </Link>
        }
      />

      {/* KPIs do pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="p-4 glass">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider"><Target className="h-3.5 w-3.5" /> Em pipeline</div>
          <div className="text-2xl font-bold gradient-text mt-1 tabular-nums">{brl(totalPipeline)}</div>
        </Card>
        <Card className="p-4 glass">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider"><Flame className="h-3.5 w-3.5 text-[oklch(0.78_0.18_150)]" /> Quentes</div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-[oklch(0.78_0.18_150)]">{hotCount}</div>
        </Card>
        <Card className="p-4 glass">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider"><Clock className="h-3.5 w-3.5 text-[oklch(0.84_0.16_75)]" /> Estagnadas</div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-[oklch(0.84_0.16_75)]">{stagnantCount}</div>
        </Card>
        <Card className="p-4 glass">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider"><AlertTriangle className="h-3.5 w-3.5 text-primary" /> Em risco</div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-primary">
            {filtered.filter((o) => opportunityHealth(o).level === "critico").length}
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-3 mb-5 glass flex flex-col md:flex-row gap-2 items-stretch md:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar oportunidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={String(minValue)} onValueChange={(v) => setMinValue(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue placeholder="Valor mínimo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer valor</SelectItem>
              <SelectItem value="10000">R$ 10k+</SelectItem>
              <SelectItem value="50000">R$ 50k+</SelectItem>
              <SelectItem value="100000">R$ 100k+</SelectItem>
              <SelectItem value="500000">R$ 500k+</SelectItem>
            </SelectContent>
          </Select>
          <Select value={healthFilter} onValueChange={setHealthFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Saúde" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda saúde</SelectItem>
              <SelectItem value="excelente">Excelente</SelectItem>
              <SelectItem value="saudavel">Saudável</SelectItem>
              <SelectItem value="atencao">Atenção</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {stages.length === 0 ? (
        <EmptyState icon={KanbanIcon} title="Sem etapas configuradas" description="Configure as etapas em Configurações para começar." />
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
            {stages.map((stage) => {
              const stageOpps = filtered.filter((o) => o.stage_id === stage.id);
              const total = stageOpps.reduce((a, o) => a + Number(o.value), 0);
              const avg = stageOpps.length > 0 ? total / stageOpps.length : 0;
              const stagnant = stageOpps.filter((o) => isStagnant(o.last_moved_at)).length;
              return (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  opps={stageOpps}
                  total={total}
                  avg={avg}
                  stagnant={stagnant}
                  onOpenOpp={setDrawerOpp}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeOpp && (
              <Card className="p-3 w-72 glass-strong shadow-elegant rotate-2 cursor-grabbing border-primary/40">
                <div className="font-medium text-sm">{activeOpp.title}</div>
                <div className="text-primary font-semibold text-sm mt-1 tabular-nums">{brl(activeOpp.value)}</div>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <OpportunityDrawer
        oppId={drawerOpp}
        open={!!drawerOpp}
        onOpenChange={(v) => { if (!v) setDrawerOpp(null); }}
        onSaved={load}
        stages={stages}
        leads={leads}
      />
    </div>
  );
}

function KanbanColumn({
  stage, opps, total, avg, stagnant, onOpenOpp,
}: {
  stage: Stage; opps: Opp[]; total: number; avg: number; stagnant: number;
  onOpenOpp: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "shrink-0 w-[300px] flex flex-col rounded-xl border transition-all",
        isOver ? "border-primary/60 bg-primary/5 shadow-glow" : "border-border bg-card/40",
      )}
    >
      <div className="p-3 border-b border-border" style={{ borderTopColor: stage.color, borderTopWidth: 3, borderTopLeftRadius: 11, borderTopRightRadius: 11 }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wider">{stage.name}</h3>
          <span className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-muted text-foreground">{opps.length}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold tabular-nums">{brl(total)}</span>
        </div>
        {opps.length > 0 && (
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Média · {brl(avg)}</span>
            {stagnant > 0 && (
              <span className="text-[oklch(0.84_0.16_75)] flex items-center gap-1 font-medium">
                <Clock className="h-3 w-3" /> {stagnant}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[240px] max-h-[calc(100vh-360px)] overflow-y-auto">
        {opps.map((opp) => <KanbanCard key={opp.id} opp={opp} onOpen={onOpenOpp} />)}
        {opps.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-12 border border-dashed border-border/60 rounded-lg">
            Solte uma oportunidade aqui
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ opp, onOpen }: { opp: Opp; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opp.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const health = opportunityHealth(opp);
  const stagnant = isStagnant(opp.last_moved_at);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-3 hover-lift transition-all border-border/70 group relative overflow-hidden",
        isDragging ? "opacity-30" : "",
        stagnant && "border-l-2 border-l-[oklch(0.84_0.16_75)]",
        health.level === "critico" && "border-l-2 border-l-primary",
        health.level === "excelente" && "border-l-2 border-l-[oklch(0.78_0.18_150)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => onOpen(opp.id)}
          className="font-medium text-sm flex-1 min-w-0 text-left hover:text-primary transition-colors line-clamp-2"
        >
          {opp.title}
        </button>
        <button
          {...listeners}
          {...attributes}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0 p-0.5"
          aria-label="Arrastar"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {opp.leads?.name && (
        <div className="text-[11px] text-muted-foreground mt-1 truncate">{opp.leads.name}</div>
      )}

      <div className="flex items-center justify-between mt-2.5">
        <span className="text-primary font-bold text-sm tabular-nums">{brl(opp.value)}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{opp.probability}%</span>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <HealthIndicator health={health} size="sm" showLabel={false} />
        <span className="text-[10px] text-muted-foreground tabular-nums" title={`Última movimentação: ${formatRelative(opp.last_moved_at)}`}>
          <Clock className="h-2.5 w-2.5 inline mr-0.5" />
          {formatRelative(opp.last_moved_at)}
        </span>
      </div>
    </Card>
  );
}
