import { cn } from "@/lib/utils";
import { AlertTriangle, Info, CheckCircle2, Zap, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Variant = "critical" | "warning" | "info" | "success";

const variants: Record<Variant, { bg: string; border: string; icon: LucideIcon; iconColor: string; text: string }> = {
  critical: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    icon: AlertTriangle,
    iconColor: "text-primary",
    text: "text-primary",
  },
  warning: {
    bg: "bg-[oklch(0.78_0.16_75)/0.1]",
    border: "border-[oklch(0.78_0.16_75)/0.3]",
    icon: Zap,
    iconColor: "text-[oklch(0.84_0.16_75)]",
    text: "text-[oklch(0.84_0.16_75)]",
  },
  info: {
    bg: "bg-[oklch(0.68_0.16_240)/0.1]",
    border: "border-[oklch(0.68_0.16_240)/0.3]",
    icon: Info,
    iconColor: "text-[oklch(0.78_0.16_240)]",
    text: "text-[oklch(0.78_0.16_240)]",
  },
  success: {
    bg: "bg-[oklch(0.72_0.18_150)/0.1]",
    border: "border-[oklch(0.72_0.18_150)/0.3]",
    icon: CheckCircle2,
    iconColor: "text-[oklch(0.8_0.18_150)]",
    text: "text-[oklch(0.8_0.18_150)]",
  },
};

interface Props {
  variant?: Variant;
  title: string;
  description?: string;
  count?: number;
  to?: string;
  search?: any;
  action?: ReactNode;
  className?: string;
}

export function AlertCard({
  variant = "info", title, description, count, to, search, action, className,
}: Props) {
  const v = variants[variant];
  const Icon = v.icon;

  const content = (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-xl border transition-all",
      v.bg, v.border,
      to && "hover:scale-[1.01] hover:shadow-md cursor-pointer",
      className,
    )}>
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", v.bg)}>
        <Icon className={cn("h-4 w-4", v.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className={cn("font-semibold text-sm", v.text)}>{title}</h4>
          {typeof count === "number" && (
            <span className={cn("text-xs font-bold tabular-nums px-2 py-0.5 rounded-full", v.bg, v.text)}>
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );

  if (to) {
    return <Link to={to as any} search={search}>{content}</Link>;
  }
  return content;
}
