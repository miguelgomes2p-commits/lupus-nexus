import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/configuracoes/")({ component: SettingsPage });

function SettingsPage() {
  return (
    <div>
      <PageHeader title="Configurações" description="Gerencie etapas, tags e origens do seu CRM" />
      <Tabs defaultValue="stages">
        <TabsList>
          <TabsTrigger value="stages">Etapas do Pipeline</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="sources">Origens</TabsTrigger>
        </TabsList>
        <TabsContent value="stages"><StagesManager /></TabsContent>
        <TabsContent value="tags"><TagsManager /></TabsContent>
        <TabsContent value="sources"><SourcesManager /></TabsContent>
      </Tabs>
    </div>
  );
}

function StagesManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(""); const [color, setColor] = useState("#E10600");
  useEffect(() => { load(); }, []);
  async function load() { const { data } = await supabase.from("pipeline_stages").select("*").order("order_index"); setItems(data ?? []); setLoading(false); }
  async function add() {
    if (!name.trim()) return;
    const max = Math.max(0, ...items.map((i) => i.order_index));
    const { error } = await supabase.from("pipeline_stages").insert({ name, color, order_index: max + 1, is_active: true });
    if (error) return toast.error(error.message);
    setName(""); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  async function toggle(it: any) {
    await supabase.from("pipeline_stages").update({ is_active: !it.is_active }).eq("id", it.id); load();
  }
  if (loading) return <PageLoader />;
  return (
    <Card className="p-5 glass mt-4">
      <div className="flex gap-2 mb-4">
        <Input placeholder="Nome da etapa" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16" />
        <Button onClick={add} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4" /></Button>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="h-3 w-3 rounded-full" style={{ background: it.color }} />
            <span className="flex-1 font-medium">{it.name}</span>
            <button onClick={() => toggle(it)} className={`text-xs px-2 py-1 rounded ${it.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>{it.is_active ? "Ativa" : "Inativa"}</button>
            <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) remove(it.id); }}><Trash2 className="h-4 w-4 text-primary" /></Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TagsManager() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState(""); const [color, setColor] = useState("#E10600");
  useEffect(() => { supabase.from("tags").select("*").order("name").then(({ data }) => setItems(data ?? [])); }, []);
  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("tags").insert({ name, color });
    if (error) return toast.error(error.message);
    setName(""); supabase.from("tags").select("*").order("name").then(({ data }) => setItems(data ?? []));
  }
  async function remove(id: string) { await supabase.from("tags").delete().eq("id", id); setItems(items.filter((i) => i.id !== id)); }
  return (
    <Card className="p-5 glass mt-4">
      <div className="flex gap-2 mb-4">
        <Input placeholder="Nome da tag" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16" />
        <Button onClick={add} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <span key={t.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm" style={{ background: `${t.color}25`, color: t.color, border: `1px solid ${t.color}40` }}>
            {t.name}
            <button onClick={() => remove(t.id)}><Trash2 className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
    </Card>
  );
}

function SourcesManager() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  useEffect(() => { supabase.from("sources").select("*").order("name").then(({ data }) => setItems(data ?? [])); }, []);
  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("sources").insert({ name });
    if (error) return toast.error(error.message);
    setName(""); supabase.from("sources").select("*").order("name").then(({ data }) => setItems(data ?? []));
  }
  async function remove(id: string) { await supabase.from("sources").delete().eq("id", id); setItems(items.filter((i) => i.id !== id)); }
  return (
    <Card className="p-5 glass mt-4">
      <div className="flex gap-2 mb-4">
        <Input placeholder="Nome da origem" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={add} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4" /></Button>
      </div>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded">
            <span className="flex-1 font-medium">{s.name}</span>
            <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) remove(s.id); }}><Trash2 className="h-4 w-4 text-primary" /></Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
