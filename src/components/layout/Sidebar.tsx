import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, CheckSquare, Calendar, BarChart3, Settings,
  UserCog, LogOut, ChevronLeft, FileText, Wallet, Mail, FileBarChart, Receipt, Users, Inbox, Network,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import logo from "@/assets/lupus-logo.png";
import { initials } from "@/lib/format";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Building2 },
  { to: "/nfes", label: "NFEs", icon: Receipt },
  { to: "/inbox", label: "Inbox", icon: Inbox },

  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/scripts", label: "Scripts", icon: FileText },
  { to: "/custos", label: "Custos", icon: Wallet },
  { to: "/rh", label: "RH", icon: Users },
  { to: "/organograma", label: "Organograma", icon: Network },
  { to: "/fechamento", label: "Fechamento", icon: FileBarChart },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

const adminItems = [
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/emails-config", label: "Scripts de E-mail", icon: Mail },
  { to: "/usuarios", label: "Usuários", icon: UserCog },
];

export function SidebarNavItems({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const loc = useLocation();
  const { profile, signOut, isManager } = useAuth();

  const handleClick = () => { onNavigate?.(); };

  return (
    <div className="flex h-full flex-col gap-4">
      <nav className="space-y-1">
        {navItems.map((it) => {
          const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={handleClick}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-primary" : ""}`} />
              <span className="truncate">{it.label}</span>
            </Link>
          );
        })}

        {isManager && (
          <div className="pt-3">
            <div className="mb-2 px-3 text-[10px] uppercase tracking-widest text-muted-foreground">Administração</div>
            {adminItems.map((it) => {
              const active = loc.pathname.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={handleClick}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                    active ? "bg-primary/15 text-primary border-l-2 border-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{it.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {mobile && (
        <div className="mt-auto border-t border-sidebar-border pt-4">
          <Link to="/perfil" onClick={handleClick} className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
            <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground shrink-0">
              {initials(profile?.name)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{profile?.name ?? "—"}</div>
              <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
            </div>
          </Link>
          <button onClick={signOut} className="mt-2 flex w-full items-center gap-3 px-3 py-3 text-sm rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors">
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const loc = useLocation();
  const { profile, signOut, isManager } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${collapsed ? "w-[72px]" : "w-[240px]"} shrink-0 hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300`}
    >
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 overflow-hidden">
          <img src={logo} alt="Lupus" className="h-9 w-9 shrink-0" />
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-bold text-base tracking-tight">SCL</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Sistema · Controle · Lupus</div>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground"
          aria-label="Alternar menu"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((it) => {
          const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
              title={collapsed ? it.label : undefined}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-primary" : ""}`} />
              {!collapsed && <span className="truncate">{it.label}</span>}
            </Link>
          );
        })}

        {isManager && (
          <>
            <div className={`mt-4 mb-2 px-3 text-[10px] uppercase tracking-widest text-muted-foreground ${collapsed ? "text-center" : ""}`}>
              {collapsed ? "·" : "Administração"}
            </div>
            {adminItems.map((it) => {
              const active = loc.pathname.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active ? "bg-primary/15 text-primary border-l-2 border-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                  }`}
                  title={collapsed ? it.label : undefined}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span>{it.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Link to="/perfil" className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
          <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground shrink-0">
            {initials(profile?.name)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{profile?.name ?? "—"}</div>
              <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
            </div>
          )}
        </Link>
        <button
          onClick={signOut}
          className={`mt-2 flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
