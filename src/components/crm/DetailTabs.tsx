import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  content: ReactNode;
}

export function DetailTabs({ tabs, defaultTab, className }: { tabs: Tab[]; defaultTab?: string; className?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto scrollbar-hide">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              type="button"
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {t.label}
              {typeof t.count === "number" && t.count > 0 && (
                <span className={cn(
                  "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full font-semibold",
                  isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {t.count}
                </span>
              )}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      <div key={current?.id} className="animate-fade-in">{current?.content}</div>
    </div>
  );
}
