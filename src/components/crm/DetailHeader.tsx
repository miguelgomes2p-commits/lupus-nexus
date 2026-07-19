import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

interface Props {
  backTo: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  metrics?: { label: string; value: ReactNode; accent?: string }[];
  actions?: ReactNode;
  className?: string;
}

export function DetailHeader({
  backTo, backLabel, title, subtitle, badges, metrics, actions, className,
}: Props) {
  return (
    <div className={cn("animate-fade-in", className)}>
      <Link
        to={backTo as any}
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {backLabel}
      </Link>

      <Card className="p-4 sm:p-6 glass border-border/50 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/20 flex items-center justify-center text-sm sm:text-lg font-bold font-display text-primary shrink-0">
              {initials(title)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-display tracking-tight break-words">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5 break-words">{subtitle}</p>}
              {badges && <div className="flex flex-wrap items-center gap-2 mt-3">{badges}</div>}
            </div>
          </div>

          {metrics && metrics.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 sm:gap-5 lg:justify-end shrink-0">
              {metrics.map((m, i) => (
                <div key={i} className="text-left lg:text-right">
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                    {m.label}
                  </div>
                  <div className={cn("text-xl font-bold font-display tabular-nums", m.accent)}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {actions && <div className="mt-5 pt-5 border-t border-border/50">{actions}</div>}
      </Card>
    </div>
  );
}

export function DetailField({
  label, value, icon: Icon, className,
}: {
  label: string;
  value: ReactNode;
  icon?: any;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="text-sm text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}
