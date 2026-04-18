import { Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageLoader({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 animate-fade-in">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumbs?: Crumb[];
  badge?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, breadcrumbs, badge, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 animate-fade-in", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {c.to ? (
                <Link to={c.to as any} className="hover:text-foreground transition-colors">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground/80">{c.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold font-display tracking-tight gradient-text-subtle">{title}</h1>
            {badge}
          </div>
          {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{description}</p>}
        </div>
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: any;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-4", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-sm">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
