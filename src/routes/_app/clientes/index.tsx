import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Eye, Pencil, Trash2 } from "lucide-react";
import { CLIENT_STATUSES } from "@/lib/crm";
import { brl } from "@/lib/format";
import { EmptyState } from "@/components/crm/EmptyState";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/crm";

export const Route = createFileRoute("/_app/clientes/")({
  component: ClientsPage,
});

function ClientsPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setItems(data ?? []); setLoading(false);
  }

  const filtered = items.filter((c) => !search || c.company_name.toLowerCase().includes(search.toLowerCase()));

  async function save(form: FormData) {
    const payload: any = {
      company_name: form.get("company_name"),
      trade_name: form.get("trade_name") || null,
      contact_name: form.get("contact_name") || null,
      email: form.get("email") || null,
      phone: form.get("phone") || null,
      cnpj: form.get("cnpj") || null,
      segment: form.get("segment") || null,
      contract_value: Number(form.get("contract_value") || 0),
      status: form.get("status"),
      notes: form.get("notes") || null,
      owner_id: editing?.owner_id ?? user?.id,
    };
    if (editing) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Atualizado");
    } else {
      const { data, error } = await supabase.from("clients").insert(payload).select().single();
      if (error) return toast.error(error.message);
      await logActivity(supabase, "cliente_criado", `Cliente "${payload.company_name}" cadastrado`, { client_id: data.id });
      toast.success("Cliente criado");
    }
    setOpen(false); setEditing(null); load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Carteira ativa de clientes"
        action={<Button onClick={() => { setEditing(null); setOpen(true); }} className="gradient-primary text-primary-foreground shadow-glow"><Plus className="h-4 w-4 mr-1" /> Novo</Button>}
      />

      <Input placeholder="Buscar cliente…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-md" />

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Sem clientes" description="Cadastre clientes ou converta leads em clientes." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="p-5 glass hover-lift">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{c.company_name}</h3>
                  {c.trade_name && <p className="text-xs text-muted-foreground">{c.trade_name}</p>}
                </div>
                <span className="text-[10px] uppercase px-2 py-1 rounded bg-emerald-500/15 text-emerald-400">{c.status}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-3 space-y-0.5">
                {c.contact_name && <div>Contato: {c.contact_name}</div>}
                {c.email && <div>{c.email}</div>}
                {c.phone && <div>{c.phone}</div>}
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Contrato</div>
                  <div className="font-semibold text-primary">{brl(c.contract_value)}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => nav({ to: "/clientes/$id", params: { id: c.id } })}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) remove(c.id); }}><Trash2 className="h-4 w-4 text-primary" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Editar" : "Novo"} cliente</SheetTitle></SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); save(new FormData(e.currentTarget)); }} className="space-y-3 mt-4">
            <div className="space-y-1.5"><Label>Razão social *</Label><Input name="company_name" required defaultValue={editing?.company_name} /></div>
            <div className="space-y-1.5"><Label>Nome fantasia</Label><Input name="trade_name" defaultValue={editing?.trade_name ?? ""} /></div>
            <div className="space-y-1.5"><Label>Contato principal</Label><Input name="contact_name" defaultValue={editing?.contact_name ?? ""} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>E-mail</Label><Input name="email" type="email" defaultValue={editing?.email ?? ""} /></div>
              <div className="space-y-1.5"><Label>Telefone</Label><Input name="phone" defaultValue={editing?.phone ?? ""} /></div>
              <div className="space-y-1.5"><Label>CNPJ</Label><Input name="cnpj" defaultValue={editing?.cnpj ?? ""} /></div>
              <div className="space-y-1.5"><Label>Segmento</Label><Input name="segment" defaultValue={editing?.segment ?? ""} /></div>
              <div className="space-y-1.5"><Label>Contrato (R$)</Label><Input name="contract_value" type="number" step="0.01" defaultValue={editing?.contract_value ?? 0} /></div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status ?? "ativo"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLIENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Notas</Label><textarea name="notes" rows={3} defaultValue={editing?.notes ?? ""} className="w-full bg-input border border-border rounded-md p-2 text-sm" /></div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground">{editing ? "Salvar" : "Criar"}</Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
