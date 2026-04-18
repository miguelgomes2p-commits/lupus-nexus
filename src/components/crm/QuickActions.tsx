import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Mail, CheckSquare, Calendar, ArrowRightCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "primary" | "ghost";
  disabled?: boolean;
}

const variantClasses = {
  default: "bg-card hover:bg-accent border-border text-foreground",
  primary: "bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary",
  ghost: "bg-transparent hover:bg-accent border-transparent text-muted-foreground hover:text-foreground",
};

export function QuickActions({ actions, className }: { actions: QuickAction[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {actions.map((a) => {
        const Icon = a.icon;
        const inner = (
          <>
            <Icon className="h-3.5 w-3.5" />
            <span>{a.label}</span>
          </>
        );
        const cls = cn(
          "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
          variantClasses[a.variant ?? "default"],
        );
        if (a.href) {
          return (
            <a key={a.label} href={a.href} target={a.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cls}>
              {inner}
            </a>
          );
        }
        return (
          <button key={a.label} onClick={a.onClick} disabled={a.disabled} className={cls} type="button">
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export const contactActions = (opts: {
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  onTask?: () => void;
  onFollowUp?: () => void;
  onConvert?: () => void;
  convertLabel?: string;
}): QuickAction[] => {
  const list: QuickAction[] = [];
  if (opts.phone) list.push({ label: "Ligar", icon: Phone, href: `tel:${opts.phone}`, variant: "default" });
  if (opts.whatsapp) {
    const num = opts.whatsapp.replace(/\D/g, "");
    list.push({ label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/55${num}`, variant: "default" });
  }
  if (opts.email) list.push({ label: "E-mail", icon: Mail, href: `mailto:${opts.email}`, variant: "default" });
  if (opts.onTask) list.push({ label: "Nova tarefa", icon: CheckSquare, onClick: opts.onTask, variant: "default" });
  if (opts.onFollowUp) list.push({ label: "Agendar follow-up", icon: Calendar, onClick: opts.onFollowUp, variant: "default" });
  if (opts.onConvert) list.push({ label: opts.convertLabel ?? "Converter", icon: ArrowRightCircle, onClick: opts.onConvert, variant: "primary" });
  return list;
};
