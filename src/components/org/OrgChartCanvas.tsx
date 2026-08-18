import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeNodeCard } from "./EmployeeNodeCard";
import type { OrgArea, OrgEmployee, OrgNode } from "@/lib/org";

interface CanvasProps {
  nodes: OrgNode[];
  areas: OrgArea[];
  canManage: boolean;
  highlightId?: string | null;
  dimmedIds?: Set<string>;
  showJobTitle?: boolean;
  onOpen: (e: OrgEmployee) => void;
  onEdit: (e: OrgEmployee) => void;
  onAddSubordinate: (e: OrgEmployee) => void;
  onChangeManager: (e: OrgEmployee) => void;
  onToggleActive: (e: OrgEmployee) => void;
  onMoveSibling: (e: OrgEmployee, dir: -1 | 1) => void;
  onRequestReparent?: (dragged: OrgEmployee, target: OrgEmployee) => void;
}

export function OrgChartCanvas(props: CanvasProps) {
  const { nodes } = props;
  const [zoom, setZoom] = useState(1);
  const [dragged, setDragged] = useState<OrgEmployee | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panning = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const areaById = new Map(props.areas.map((a) => [a.id, a]));

  const startPan = (ev: ReactMouseEvent) => {
    const el = scrollRef.current;
    if (!el || ev.button !== 0) return;
    if ((ev.target as HTMLElement).closest("[data-org-card]")) return;
    panning.current = { x: ev.clientX, y: ev.clientY, left: el.scrollLeft, top: el.scrollTop };
  };

  const doPan = (ev: ReactMouseEvent) => {
    const el = scrollRef.current;
    if (!el || !panning.current) return;
    el.scrollLeft = panning.current.left - (ev.clientX - panning.current.x);
    el.scrollTop = panning.current.top - (ev.clientY - panning.current.y);
  };

  const endPan = () => {
    panning.current = null;
  };

  const renderNode = (node: OrgNode) => {
    const { employee, children } = node;
    return (
      <div key={employee.id} className="flex flex-col items-center">
        <div data-org-card>
          <EmployeeNodeCard
            employee={employee}
            area={employee.area_id ? areaById.get(employee.area_id) : undefined}
            canManage={props.canManage}
            highlighted={props.highlightId === employee.id}
            dimmed={props.dimmedIds?.has(employee.id)}
            isDropTarget={dropTarget === employee.id && dragged?.id !== employee.id}
            showJobTitle={props.showJobTitle}
            onOpen={props.onOpen}
            onEdit={props.onEdit}
            onAddSubordinate={props.onAddSubordinate}
            onChangeManager={props.onChangeManager}
            onToggleActive={props.onToggleActive}
            onMoveSibling={props.onMoveSibling}
            onDragStartEmployee={setDragged}
            onDragOverEmployee={(t) => setDropTarget(t?.id ?? null)}
            onDropOnEmployee={(target) => {
              setDropTarget(null);
              if (dragged && dragged.id !== target.id) props.onRequestReparent?.(dragged, target);
              setDragged(null);
            }}
          />
        </div>

        {children.length > 0 && (
          <>
            <div className="h-6 w-px bg-border" />
            <div className="relative flex items-start justify-center gap-8">
              {children.length > 1 && (
                <span className="absolute left-0 right-0 top-0 mx-[105px] h-px bg-border" />
              )}
              {children.map((child) => (
                <div key={child.employee.id} className="flex flex-col items-center pt-0">
                  <div className="h-6 w-px bg-border" />
                  {renderNode(child)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="relative rounded-xl border bg-muted/20">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border bg-card/95 p-1 shadow-sm backdrop-blur">
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Diminuir zoom" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Aumentar zoom" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setZoom(1)}>
          <Maximize2 className="h-3.5 w-3.5" /> Ajustar
        </Button>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={startPan}
        onMouseMove={doPan}
        onMouseUp={endPan}
        onMouseLeave={endPan}
        className="h-[640px] cursor-grab overflow-auto p-8 active:cursor-grabbing"
      >
        <div
          className="flex min-w-max items-start justify-center gap-12 transition-transform duration-300"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          {nodes.map(renderNode)}
        </div>
      </div>
    </div>
  );
}
