import { cn } from "@/lib/utils";
import type { HealthResult } from "@/lib/health";
import { Activity, AlertTriangle, CheckCircle2, Zap } from "lucide-react";

interface Props {
  health: HealthResult;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showScore?: boolean;
  className?: string;
}

const iconMap = {
  excelente: CheckCircle2,
  saudavel: Activity,
  atencao: Zap,
  critico: AlertTriangle,
};

export function HealthIndicator({
  health,
  size = "md",
  showLabel = true,
  showScore = true,
  className,
}: Props) {
  const Icon = iconMap[health.level];
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };
  const iconSize = { sm: "h-3 w-3", md: "h-3.5 w-3.5", lg: "h-4 w-4" };

  return (
    <span
      title={health.reasons.join(" · ") || health.label}
      className={cn(
        "inline-flex items-center rounded-full border font-semibold tabular-nums",
        health.bgColor,
        health.textColor,
        health.borderColor,
        sizeClasses[size],
        className,
      )}
    >
      <Icon className={iconSize[size]} />
      {showScore && <span>{health.score}</span>}
      {showLabel && <span className="uppercase tracking-wider">{health.label}</span>}
    </span>
  );
}

export function HealthBar({ health, className }: { health: HealthResult; className?: string }) {
  return (
    <div className={cn("w-full h-1.5 bg-muted/50 rounded-full overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${health.score}%`,
          background: health.color,
          boxShadow: `0 0 8px ${health.color}`,
        }}
      />
    </div>
  );
}
