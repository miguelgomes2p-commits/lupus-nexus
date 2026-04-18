import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_app/perfil/")({ component: ProfilePage });

function ProfilePage() {
  const { profile, roles } = useAuth();
  const [name, setName] = useState(profile?.name ?? "");
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name }).eq("id", profile.id);
    if (error) toast.error(error.message); else toast.success("Perfil atualizado");
    setSaving(false);
  }
  return (
    <div>
      <PageHeader title="Meu Perfil" description="Suas preferências e dados de conta" />
      <Card className="p-6 glass max-w-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-xl font-bold shadow-glow">{initials(profile?.name)}</div>
          <div>
            <h3 className="font-semibold">{profile?.name}</h3>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="flex gap-1 mt-1">
              {roles.map((r) => <span key={r} className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary">{r}</span>)}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>E-mail</Label><Input value={profile?.email ?? ""} disabled /></div>
          <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground">Salvar alterações</Button>
        </div>
      </Card>
    </div>
  );
}
