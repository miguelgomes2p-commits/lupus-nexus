import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { HealthIndicator, HealthBar } from "./HealthIndicator";
import type { HealthResult } from "@/lib/health";

interface Props {
  backTo: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  metrics?: { label: string; value: ReactNode; accent?: string }[];
  actions?: ReactNode;
  health?: HealthResult;
  className?: string;
}

export function DetailHeader({
  backTo, backLabel, title, subtitle, badges, metrics, actions, health, className,
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

      <Card className="p-6 glass border-border/50 relative overflow-hidden">
        {health && (
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: `linear-gradient(90deg, ${health.color}, transparent)` }}
          />
        )}

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 border border-primary/20 flex items-center justify-center text-lg font-bold font-display text-primary shrink-0">
              {initials(title)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
              {badges && <div className="flex flex-wrap items-center gap-2 mt-3">{badges}</div>}
            </div>
          </div>

          {(health || metrics?.length) && (
            <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
              {health && (
                <div className="flex flex-col items-start lg:items-end gap-2">
                  <HealthIndicator health={health} size="lg" />
                  <HealthBar health={health} className="w-40" />
                </div>
              )}
              {metrics && metrics.length > 0 && (
                <div className="flex items-center gap-5">
                  {metrics.map((m, i) => (
                    <div key={i} className="text-right">
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
