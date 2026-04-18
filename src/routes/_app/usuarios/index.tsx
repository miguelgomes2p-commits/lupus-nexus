import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/format";
import { toast } from "sonner";
import { EmptyState } from "@/components/crm/EmptyState";
import { UserCog } from "lucide-react";

export const Route = createFileRoute("/_app/usuarios/")({ component: UsersPage });

function UsersPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [profiles, roles] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map<string, string[]>();
    (roles.data ?? []).forEach((r: any) => {
      const arr = map.get(r.user_id) ?? []; arr.push(r.role); map.set(r.user_id, arr);
    });
    setItems((profiles.data ?? []).map((p: any) => ({ ...p, roles: map.get(p.id) ?? [] })));
    setLoading(false);
  }

  async function changeRole(userId: string, newRole: "admin"|"gestor"|"comercial") {
    if (!isAdmin) return toast.error("Apenas admins podem alterar papéis");
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Papel atualizado"); load();
  }

  if (loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Usuários" description="Equipe e permissões" />
      {items.length === 0 ? <EmptyState icon={UserCog} title="Sem usuários" /> : (
        <Card className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr><th className="text-left p-3">Usuário</th><th className="text-left p-3">E-mail</th><th className="text-left p-3">Papel</th></tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold">{initials(u.name)}</div>
                    <span className="font-medium">{u.name}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    {isAdmin ? (
                      <Select value={u.roles[0] ?? "comercial"} onValueChange={(v: any) => changeRole(u.id, v)}>
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">admin</SelectItem>
                          <SelectItem value="gestor">gestor</SelectItem>
                          <SelectItem value="comercial">comercial</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : <span className="text-xs uppercase tracking-wider px-2 py-1 rounded bg-primary/15 text-primary">{u.roles[0] ?? "comercial"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
