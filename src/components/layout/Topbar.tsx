import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Plus, Bell, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNavItems } from "./Sidebar";

interface SearchResult {
  type: "lead" | "cliente" | "oportunidade" | "tarefa";
  id: string;
  title: string;
  subtitle?: string;
  to: string;
}

export function Topbar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const term = `%${q}%`;
      const [leads, clients, opps, tasks] = await Promise.all([
        supabase.from("leads").select("id,name,company_name").or(`name.ilike.${term},company_name.ilike.${term},email.ilike.${term}`).limit(5),
        supabase.from("clients").select("id,company_name,trade_name").or(`company_name.ilike.${term},trade_name.ilike.${term}`).limit(5),
        supabase.from("opportunities").select("id,title").ilike("title", term).limit(5),
        supabase.from("tasks").select("id,title").ilike("title", term).limit(5),
      ]);
      const r: SearchResult[] = [
        ...(leads.data ?? []).map((l) => ({ type: "lead" as const, id: l.id, title: l.name, subtitle: l.company_name ?? undefined, to: `/leads/${l.id}` })),
        ...(clients.data ?? []).map((c) => ({ type: "cliente" as const, id: c.id, title: c.company_name, subtitle: c.trade_name ?? undefined, to: `/clientes/${c.id}` })),
        ...(opps.data ?? []).map((o) => ({ type: "oportunidade" as const, id: o.id, title: o.title, to: `/oportunidades/${o.id}` })),
        ...(tasks.data ?? []).map((t) => ({ type: "tarefa" as const, id: t.id, title: t.title, to: `/tarefas` })),
      ];
      setResults(r);
      setOpen(true);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <header className="h-16 shrink-0 border-b border-border bg-card/40 backdrop-blur-md flex items-center px-4 md:px-6 gap-4 sticky top-0 z-30">
      <Sheet>
        <SheetTrigger className="md:hidden h-10 w-10 rounded-lg border border-border hover:bg-accent flex items-center justify-center transition-colors" aria-label="Abrir menu">
          <Menu className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[86vw] max-w-[340px] overflow-y-auto">
          <SheetHeader className="mb-4"><SheetTitle>Menu Lupus CRM</SheetTitle></SheetHeader>
          <SidebarNavItems mobile />
        </SheetContent>
      </Sheet>

      <div ref={ref} className="relative flex-1 max-w-2xl min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Buscar no CRM…"
          className="w-full h-10 pl-9 pr-4 bg-input/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        {open && results.length > 0 && (
          <div className="absolute top-full mt-2 w-full glass rounded-lg shadow-elegant overflow-hidden animate-scale-in z-50">
            {results.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                to={r.to as any}
                onClick={() => { setOpen(false); setQ(""); }}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.title}</div>
                  {r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>}
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary shrink-0">{r.type}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold shadow-glow hover:scale-[1.03] transition-transform">
          <Plus className="h-4 w-4" /> Criar
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Ação rápida</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => nav({ to: "/leads", search: { create: 1 } as any })}>Novo lead</DropdownMenuItem>
          <DropdownMenuItem onClick={() => nav({ to: "/oportunidades", search: { create: 1 } as any })}>Nova oportunidade</DropdownMenuItem>
          <DropdownMenuItem onClick={() => nav({ to: "/tarefas", search: { create: 1 } as any })}>Nova tarefa</DropdownMenuItem>
          <DropdownMenuItem onClick={() => nav({ to: "/clientes", search: { create: 1 } as any })}>Novo cliente</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button className="relative h-10 w-10 rounded-lg border border-border hover:bg-accent flex items-center justify-center transition-colors">
        <Bell className="h-4 w-4" />
      </button>
    </header>
  );
}
