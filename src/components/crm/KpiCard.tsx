import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; positive?: boolean };
  accent?: "primary" | "success" | "warning" | "info";
  className?: string;
}

const accents = {
  primary: "bg-primary/15 text-primary",
  success: "bg-[oklch(0.7_0.18_145)/0.15] text-[oklch(0.75_0.18_145)]",
  warning: "bg-[oklch(0.78_0.16_75)/0.15] text-[oklch(0.78_0.16_75)]",
  info: "bg-[oklch(0.65_0.16_240)/0.15] text-[oklch(0.7_0.16_240)]",
};

export function KpiCard({ label, value, icon: Icon, trend, accent = "primary", className }: KpiProps) {
  return (
    <Card className={cn("p-5 hover-lift glass border-border/50 group", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-3xl font-bold font-display tracking-tight">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-medium", trend.positive ? "text-[oklch(0.75_0.18_145)]" : "text-primary")}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% vs período anterior
            </p>
          )}
        </div>
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
