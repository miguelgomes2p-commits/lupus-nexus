import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Kanban as KanbanIcon, GripVertical } from "lucide-react";
import { brl } from "@/lib/format";
import { logActivity } from "@/lib/crm";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/EmptyState";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/pipeline/")({
  component: PipelinePage,
});

interface Stage { id: string; name: string; color: string; order_index: number; }
interface Opp {
  id: string; title: string; value: number; probability: number; stage_id: string | null;
  status: string; lead_id: string | null;
}

function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOpp, setActiveOpp] = useState<Opp | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [s, o] = await Promise.all([
      supabase.from("pipeline_stages").select("*").eq("is_active", true).order("order_index"),
      supabase.from("opportunities").select("*").eq("status", "aberta"),
    ]);
    setStages((s.data ?? []) as Stage[]);
    setOpps((o.data ?? []) as Opp[]);
    setLoading(false);
  }

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

    // Optimistic
    setOpps((prev) => prev.map((o) => o.id === oppId ? { ...o, stage_id: newStageId } : o));

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
    await logActivity(supabase, "oportunidade_movida", `Oportunidade movida para "${stageName}"`, { opportunity_id: oppId, lead_id: opp.lead_id ?? undefined });
    toast.success(`Movido para ${stageName}`);
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Pipeline Comercial"
        description="Arraste oportunidades entre etapas. Mudanças são salvas automaticamente."
        action={
          <Link to="/oportunidades" search={{ create: 1 } as any}>
            <Button className="gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> Nova oportunidade</Button>
          </Link>
        }
      />

      {stages.length === 0 ? (
        <EmptyState icon={KanbanIcon} title="Sem etapas configuradas" description="Configure as etapas em Configurações." />
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
            {stages.map((stage) => {
              const stageOpps = opps.filter((o) => o.stage_id === stage.id);
              const total = stageOpps.reduce((a, o) => a + Number(o.value), 0);
              return <KanbanColumn key={stage.id} stage={stage} opps={stageOpps} total={total} />;
            })}
          </div>
          <DragOverlay>
            {activeOpp && (
              <Card className="p-3 w-72 glass shadow-elegant rotate-2 cursor-grabbing">
                <div className="font-medium text-sm">{activeOpp.title}</div>
                <div className="text-primary font-semibold text-sm mt-1">{brl(activeOpp.value)}</div>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function KanbanColumn({ stage, opps, total }: { stage: Stage; opps: Opp[]; total: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div ref={setNodeRef} className={`shrink-0 w-80 flex flex-col rounded-xl border transition-all ${isOver ? "border-primary bg-primary/5" : "border-border bg-card/30"}`}>
      <div className="p-3 border-b border-border" style={{ borderTopColor: stage.color, borderTopWidth: 3 }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wider">{stage.name}</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-muted">{opps.length}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{brl(total)}</div>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto">
        {opps.map((opp) => <KanbanCard key={opp.id} opp={opp} />)}
        {opps.length === 0 && <div className="text-center text-xs text-muted-foreground py-8">Solte uma oportunidade aqui</div>}
      </div>
    </div>
  );
}

function KanbanCard({ opp }: { opp: Opp }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opp.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <Card
      ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`p-3 cursor-grab active:cursor-grabbing hover-lift transition-all ${isDragging ? "opacity-30" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm flex-1 min-w-0 truncate">{opp.title}</div>
        <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-primary font-semibold text-sm">{brl(opp.value)}</span>
        <span className="text-xs text-muted-foreground">{opp.probability}%</span>
      </div>
    </Card>
  );
}
