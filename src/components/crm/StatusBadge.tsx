import { cn } from "@/lib/utils";
import type { LeadStatus, Temperature, Priority, OppStatus, TaskStatus, ClientStatus } from "@/lib/crm";

const statusStyles: Record<string, string> = {
  // Leads
  novo: "bg-[oklch(0.68_0.16_240)/0.15] text-[oklch(0.78_0.16_240)] border-[oklch(0.68_0.16_240)/0.3]",
  contatado: "bg-[oklch(0.7_0.14_220)/0.15] text-[oklch(0.78_0.14_220)] border-[oklch(0.7_0.14_220)/0.3]",
  qualificado: "bg-[oklch(0.62_0.2_300)/0.15] text-[oklch(0.74_0.2_300)] border-[oklch(0.62_0.2_300)/0.3]",
  proposta: "bg-[oklch(0.78_0.16_75)/0.15] text-[oklch(0.84_0.16_75)] border-[oklch(0.78_0.16_75)/0.3]",
  negociacao: "bg-[oklch(0.72_0.18_55)/0.15] text-[oklch(0.82_0.18_55)] border-[oklch(0.72_0.18_55)/0.3]",
  ganho: "bg-[oklch(0.72_0.18_150)/0.15] text-[oklch(0.8_0.18_150)] border-[oklch(0.72_0.18_150)/0.3]",
  perdido: "bg-primary/15 text-primary border-primary/30",
  descartado: "bg-muted text-muted-foreground border-border",
  // Temperature
  frio: "bg-[oklch(0.68_0.16_240)/0.15] text-[oklch(0.78_0.16_240)] border-[oklch(0.68_0.16_240)/0.3]",
  morno: "bg-[oklch(0.78_0.16_75)/0.15] text-[oklch(0.84_0.16_75)] border-[oklch(0.78_0.16_75)/0.3]",
  quente: "bg-primary/15 text-primary border-primary/40 shadow-[0_0_12px_oklch(0.585_0.245_27/0.25)]",
  // Priority
  baixa: "bg-muted text-muted-foreground border-border",
  media: "bg-[oklch(0.68_0.16_240)/0.12] text-[oklch(0.78_0.16_240)] border-[oklch(0.68_0.16_240)/0.25]",
  alta: "bg-[oklch(0.78_0.16_75)/0.15] text-[oklch(0.84_0.16_75)] border-[oklch(0.78_0.16_75)/0.3]",
  urgente: "bg-primary/20 text-primary border-primary/45",
  // Opp
  aberta: "bg-[oklch(0.68_0.16_240)/0.15] text-[oklch(0.78_0.16_240)] border-[oklch(0.68_0.16_240)/0.3]",
  ganha: "bg-[oklch(0.72_0.18_150)/0.15] text-[oklch(0.8_0.18_150)] border-[oklch(0.72_0.18_150)/0.3]",
  perdida: "bg-primary/15 text-primary border-primary/30",
  // Tasks
  pendente: "bg-[oklch(0.78_0.16_75)/0.15] text-[oklch(0.84_0.16_75)] border-[oklch(0.78_0.16_75)/0.3]",
  em_andamento: "bg-[oklch(0.68_0.16_240)/0.15] text-[oklch(0.78_0.16_240)] border-[oklch(0.68_0.16_240)/0.3]",
  concluida: "bg-[oklch(0.72_0.18_150)/0.15] text-[oklch(0.8_0.18_150)] border-[oklch(0.72_0.18_150)/0.3]",
  cancelada: "bg-muted text-muted-foreground border-border",
  // Client
  ativo: "bg-[oklch(0.72_0.18_150)/0.15] text-[oklch(0.8_0.18_150)] border-[oklch(0.72_0.18_150)/0.3]",
  inativo: "bg-muted text-muted-foreground border-border",
  pausado: "bg-[oklch(0.78_0.16_75)/0.15] text-[oklch(0.84_0.16_75)] border-[oklch(0.78_0.16_75)/0.3]",
};

const labels: Record<string, string> = {
  novo: "Novo", contatado: "Contatado", qualificado: "Qualificado",
  proposta: "Proposta", negociacao: "Negociação", ganho: "Ganho",
  perdido: "Perdido", descartado: "Descartado",
  frio: "Frio", morno: "Morno", quente: "Quente",
  baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente",
  aberta: "Aberta", ganha: "Ganha", perdida: "Perdida",
  pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada",
  ativo: "Ativo", inativo: "Inativo", pausado: "Pausado",
};

type Status = LeadStatus | Temperature | Priority | OppStatus | TaskStatus | ClientStatus | string;

interface Props {
  status: Status;
  size?: "xs" | "sm" | "md";
  variant?: "default" | "dot";
  className?: string;
}

export function StatusBadge({ status, size = "sm", variant = "default", className }: Props) {
  const style = statusStyles[status] ?? "bg-muted text-muted-foreground border-border";
  const label = labels[status] ?? status;

  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.5",
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  if (variant === "dot") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
        <span className={cn("status-dot", style.split(" ")[0].replace("/15", "").replace("bg-", "bg-"))} />
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider",
        style,
        sizeClasses[size],
        className,
      )}
    >
      {label}
    </span>
  );
}
