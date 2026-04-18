import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  UserPlus, Pencil, ArrowRightLeft, Target, Trophy, X, CheckSquare,
  CheckCircle2, FileText, Building2, UserCog, RefreshCw, Move, Phone,
  Activity as ActIcon,
} from "lucide-react";
import type { ComponentType } from "react";

interface Activity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  metadata?: any;
  profiles?: { name?: string | null } | null;
}

const typeMap: Record<string, { icon: ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  lead_criado: { icon: UserPlus, color: "text-[oklch(0.78_0.16_240)]", bg: "bg-[oklch(0.68_0.16_240)/0.15]", label: "Lead criado" },
  lead_editado: { icon: Pencil, color: "text-muted-foreground", bg: "bg-muted", label: "Lead editado" },
  lead_convertido: { icon: Building2, color: "text-[oklch(0.8_0.18_150)]", bg: "bg-[oklch(0.72_0.18_150)/0.15]", label: "Lead convertido" },
  oportunidade_criada: { icon: Target, color: "text-[oklch(0.84_0.16_75)]", bg: "bg-[oklch(0.78_0.16_75)/0.15]", label: "Oportunidade criada" },
  oportunidade_movida: { icon: ArrowRightLeft, color: "text-[oklch(0.78_0.16_240)]", bg: "bg-[oklch(0.68_0.16_240)/0.15]", label: "Oportunidade movida" },
  oportunidade_ganha: { icon: Trophy, color: "text-[oklch(0.8_0.18_150)]", bg: "bg-[oklch(0.72_0.18_150)/0.15]", label: "Oportunidade ganha" },
  oportunidade_perdida: { icon: X, color: "text-primary", bg: "bg-primary/15", label: "Oportunidade perdida" },
  tarefa_criada: { icon: CheckSquare, color: "text-[oklch(0.78_0.16_240)]", bg: "bg-[oklch(0.68_0.16_240)/0.15]", label: "Tarefa criada" },
  tarefa_concluida: { icon: CheckCircle2, color: "text-[oklch(0.8_0.18_150)]", bg: "bg-[oklch(0.72_0.18_150)/0.15]", label: "Tarefa concluída" },
  nota_criada: { icon: FileText, color: "text-muted-foreground", bg: "bg-muted", label: "Nota adicionada" },
  cliente_criado: { icon: Building2, color: "text-[oklch(0.8_0.18_150)]", bg: "bg-[oklch(0.72_0.18_150)/0.15]", label: "Cliente criado" },
  responsavel_alterado: { icon: UserCog, color: "text-[oklch(0.84_0.16_75)]", bg: "bg-[oklch(0.78_0.16_75)/0.15]", label: "Responsável alterado" },
  status_alterado: { icon: RefreshCw, color: "text-[oklch(0.84_0.16_75)]", bg: "bg-[oklch(0.78_0.16_75)/0.15]", label: "Status alterado" },
  etapa_alterada: { icon: Move, color: "text-[oklch(0.78_0.16_240)]", bg: "bg-[oklch(0.68_0.16_240)/0.15]", label: "Etapa alterada" },
  contato_registrado: { icon: Phone, color: "text-[oklch(0.74_0.2_300)]", bg: "bg-[oklch(0.62_0.2_300)/0.15]", label: "Contato registrado" },
};

interface Props {
  activities: Activity[];
  className?: string;
  emptyMessage?: string;
}

function groupByDay(activities: Activity[]): Map<string, Activity[]> {
  const groups = new Map<string, Activity[]>();
  for (const a of activities) {
    const d = new Date(a.created_at);
    const key = format(d, "yyyy-MM-dd");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  return groups;
}

function dayLabel(key: string): string {
  const date = new Date(key + "T12:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(date); target.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff < 7) return format(date, "EEEE", { locale: ptBR });
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function Timeline({ activities, className, emptyMessage = "Nenhuma atividade registrada ainda." }: Props) {
  if (activities.length === 0) {
    return (
      <div className={cn("text-center py-8 text-sm text-muted-foreground", className)}>
        <ActIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
        {emptyMessage}
      </div>
    );
  }

  const groups = groupByDay(activities);

  return (
    <div className={cn("space-y-6", className)}>
      {Array.from(groups.entries()).map(([day, items]) => (
        <div key={day}>
          <div className="sticky top-0 z-10 mb-3 -mx-1 px-1 py-1 bg-card/80 backdrop-blur-sm">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              {dayLabel(day)}
            </span>
          </div>
          <ul className="relative space-y-3 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
            {items.map((a) => {
              const t = typeMap[a.type] ?? { icon: ActIcon, color: "text-muted-foreground", bg: "bg-muted", label: a.type };
              const Icon = t.icon;
              return (
                <li key={a.id} className="relative flex gap-3 group">
                  <div className={cn(
                    "relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-card transition-transform group-hover:scale-110",
                    t.bg,
                  )}>
                    <Icon className={cn("h-3.5 w-3.5", t.color)} />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-sm leading-snug text-foreground">{a.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="font-medium">{t.label}</span>
                      <span>·</span>
                      <span className="tabular-nums">{format(new Date(a.created_at), "HH:mm")}</span>
                      {a.profiles?.name && (<><span>·</span><span>{a.profiles.name}</span></>)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
