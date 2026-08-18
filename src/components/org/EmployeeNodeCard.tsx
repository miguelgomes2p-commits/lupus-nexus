import { MoreVertical, Pencil, UserPlus, ArrowUpDown, Power, ArrowLeft, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { initialsOf, type OrgArea, type OrgEmployee } from "@/lib/org";

interface Props {
  employee: OrgEmployee;
  area?: OrgArea;
  canManage: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  isDropTarget?: boolean;
  showJobTitle?: boolean;
  onOpen: (e: OrgEmployee) => void;
  onEdit: (e: OrgEmployee) => void;
  onAddSubordinate: (e: OrgEmployee) => void;
  onChangeManager: (e: OrgEmployee) => void;
  onToggleActive: (e: OrgEmployee) => void;
  onMoveSibling: (e: OrgEmployee, dir: -1 | 1) => void;
  onDragStartEmployee?: (e: OrgEmployee) => void;
  onDropOnEmployee?: (target: OrgEmployee) => void;
  onDragOverEmployee?: (target: OrgEmployee | null) => void;
}

export function EmployeeNodeCard({
  employee,
  area,
  canManage,
  highlighted,
  dimmed,
  isDropTarget,
  showJobTitle,
  onOpen,
  onEdit,
  onAddSubordinate,
  onChangeManager,
  onToggleActive,
  onMoveSibling,
  onDragStartEmployee,
  onDropOnEmployee,
  onDragOverEmployee,
}: Props) {
  const color = area?.color ?? undefined;

  return (
    <Card
      draggable={canManage}
      onDragStart={() => onDragStartEmployee?.(employee)}
      onDragEnd={() => onDragOverEmployee?.(null)}
      onDragOver={(ev) => {
        if (!canManage) return;
        ev.preventDefault();
        onDragOverEmployee?.(employee);
      }}
      onDragLeave={() => onDragOverEmployee?.(null)}
      onDrop={(ev) => {
        ev.preventDefault();
        onDropOnEmployee?.(employee);
      }}
      onClick={() => onOpen(employee)}
      className={cn(
        "relative w-[210px] select-none overflow-hidden rounded-xl border bg-card p-4 pt-5 text-center shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5",
        highlighted && "ring-2 ring-primary",
        isDropTarget && "ring-2 ring-primary/70 border-primary/50",
        dimmed && "opacity-35",
        !employee.is_active && "opacity-60 border-dashed",
      )}
    >
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: color ?? "hsl(var(--primary))" }}
      />

      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(ev) => ev.stopPropagation()}
              aria-label="Opções do funcionário"
              className="absolute right-1.5 top-2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(ev) => ev.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onEdit(employee)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAddSubordinate(employee)}>
              <UserPlus className="mr-2 h-4 w-4" /> Adicionar subordinado
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onChangeManager(employee)}>
              <ArrowUpDown className="mr-2 h-4 w-4" /> Alterar superior
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onMoveSibling(employee, -1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Mover para esquerda
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMoveSibling(employee, 1)}>
              <ArrowRight className="mr-2 h-4 w-4" /> Mover para direita
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onToggleActive(employee)}>
              <Power className="mr-2 h-4 w-4" /> {employee.is_active ? "Desativar" : "Reativar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {employee.avatar_path ? (
          <img src={employee.avatar_path} alt={employee.name} className="h-full w-full object-cover" />
        ) : (
          initialsOf(employee.name)
        )}
      </div>

      <div className="truncate text-sm font-semibold leading-tight" title={employee.name}>
        {employee.name}
      </div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{area?.name ?? "Sem área"}</div>
      {showJobTitle && employee.job_title && (
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground/80">{employee.job_title}</div>
      )}
      {!employee.is_active && (
        <div className="mt-2 inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
          Inativo
        </div>
      )}
    </Card>
  );
}
