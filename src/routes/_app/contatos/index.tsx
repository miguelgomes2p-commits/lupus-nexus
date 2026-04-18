import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/crm/EmptyState";
import { Plus, Contact as ContactIcon, Trash2, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/contatos/")({ component: ContactsPage });

function ContactsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [c, l, cl] = await Promise.all([
      supabase.from("contacts").select("*, leads(name), clients(company_name)").order("created_at", { ascending: false }),
      supabase.from("leads").select("id,name"),
      supabase.from("clients").select("id,company_name"),
    ]);
    setItems(c.data ?? []); setLeads(l.data ?? []); setClients(cl.data ?? []);
    setLoading(false);
  }
  async function save(form: FormData) {
    const payload: any = {
      name: form.get("name"),
      email: form.get("email") || null,
      phone: form.get("phone") || null,
      role: form.get("role") || null,
      lead_id: form.get("lead_id") || null,
      client_id: form.get("client_id") || null,
      is_primary: form.get("is_primary") === "on",
    };
    const { error } = await supabase.from("contacts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Contato adicionado"); setOpen(false); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  }

  if (loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Contatos" description="Pessoas vinculadas a leads e clientes"
        action={<Button onClick={() => setOpen(true)} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Novo</Button>} />

      {items.length === 0 ? <EmptyState icon={ContactIcon} title="Sem contatos" /> : (
        <Card className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr><th className="text-left p-3">Nome</th><th className="text-left p-3 hidden md:table-cell">Cargo</th><th className="text-left p-3 hidden lg:table-cell">Contato</th><th className="text-left p-3">Vínculo</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-accent/40">
                  <td className="p-3 font-medium flex items-center gap-2">{c.is_primary && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}{c.name}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{c.role ?? "—"}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground">{c.email ?? c.phone ?? "—"}</td>
                  <td className="p-3 text-xs">{c.leads?.name || c.clients?.company_name || "—"}</td>
                  <td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) remove(c.id); }}><Trash2 className="h-4 w-4 text-primary" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>Novo contato</SheetTitle></SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3 mt-4">
            <div className="space-y-1.5"><Label>Nome *</Label><Input name="name" required /></div>
            <div className="space-y-1.5"><Label>Cargo / função</Label><Input name="role" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>E-mail</Label><Input name="email" type="email" /></div>
              <div className="space-y-1.5"><Label>Telefone</Label><Input name="phone" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Lead</Label>
              <Select name="lead_id"><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select name="client_id"><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_primary" /> Contato principal</label>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">Adicionar</Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
