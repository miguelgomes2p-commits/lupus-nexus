import { cn } from "@/lib/utils";
import type { Priority, TaskStatus, ClientStatus } from "@/lib/crm";

const statusStyles: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground border-border",
  media: "bg-info/15 text-info-foreground border-info/30",
  alta: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  urgente: "bg-primary/20 text-primary border-primary/45",
  pendente: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pendente_nfe: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pendente_comprovante: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  parcial: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  em_andamento: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  concluida: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelada: "bg-muted text-muted-foreground border-border",
  ativo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  inativo: "bg-muted text-muted-foreground border-border",
  pausado: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pago: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelado: "bg-muted text-muted-foreground border-border",
};

const labels: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
  pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada",
  ativo: "Ativo", inativo: "Inativo", pausado: "Pausado",
  pendente_nfe: "Pendente NFE", pendente_comprovante: "Pendente comprovante",
  parcial: "Parcial", pago: "Pago", cancelado: "Cancelado",

};

type Status = Priority | TaskStatus | ClientStatus | string;

interface Props { status: Status; size?: "xs" | "sm" | "md"; className?: string }

export function StatusBadge({ status, size = "sm", className }: Props) {
  const style = statusStyles[status] ?? "bg-muted text-muted-foreground border-border";
  const label = labels[status] ?? status;
  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.5",
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider", style, sizeClasses[size], className)}>
      {label}
    </span>
  );
}
