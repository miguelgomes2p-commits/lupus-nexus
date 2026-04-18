import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, Plus, Search, Star, Copy, Pencil, Trash2, Loader2,
  Phone, MessageCircle, Mail, Users, Linkedin, Handshake, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/crm/EmptyState";
import { SkeletonCard } from "@/components/crm/SkeletonCard";

export const Route = createFileRoute("/_app/scripts/")({
  component: ScriptsPage,
});

type Category = "prospeccao" | "qualificacao" | "apresentacao" | "objecoes" | "fechamento" | "follow_up" | "reativacao";
type Approach = "cold_call" | "whatsapp" | "email" | "reuniao" | "linkedin" | "indicacao";

interface Script {
  id: string;
  title: string;
  category: Category;
  approach: Approach;
  content: string;
  description: string | null;
  tags: string[];
  is_favorite: boolean;
  is_active: boolean;
  usage_count: number;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: "prospeccao", label: "Prospecção", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { value: "qualificacao", label: "Qualificação", color: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  { value: "apresentacao", label: "Apresentação", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  { value: "objecoes", label: "Objeções", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { value: "fechamento", label: "Fechamento", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { value: "follow_up", label: "Follow-up", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { value: "reativacao", label: "Reativação", color: "bg-primary/15 text-primary border-primary/30" },
];

const APPROACHES: { value: Approach; label: string; icon: any }[] = [
  { value: "cold_call", label: "Cold Call", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "reuniao", label: "Reunião", icon: Users },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "indicacao", label: "Indicação", icon: Handshake },
];

const catLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.label ?? c;
const catColor = (c: Category) => CATEGORIES.find((x) => x.value === c)?.color ?? "";
const appLabel = (a: Approach) => APPROACHES.find((x) => x.value === a)?.label ?? a;
const appIcon = (a: Approach) => APPROACHES.find((x) => x.value === a)?.icon ?? Phone;

function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [filterApp, setFilterApp] = useState<Approach | "all">("all");
  const [onlyFavs, setOnlyFavs] = useState(false);

  const [editing, setEditing] = useState<Script | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_scripts")
      .select("*")
      .eq("is_active", true)
      .order("is_favorite", { ascending: false })
      .order("updated_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setScripts((data ?? []) as Script[]);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return scripts.filter((s) => {
      if (filterCat !== "all" && s.category !== filterCat) return false;
      if (filterApp !== "all" && s.approach !== filterApp) return false;
      if (onlyFavs && !s.is_favorite) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const blob = `${s.title} ${s.description ?? ""} ${s.content} ${s.tags.join(" ")}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [scripts, search, filterCat, filterApp, onlyFavs]);

  const grouped = useMemo(() => {
    const map = new Map<Category, Script[]>();
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    }
    return map;
  }, [filtered]);

  async function toggleFav(s: Script) {
    const { error } = await supabase
      .from("sales_scripts")
      .update({ is_favorite: !s.is_favorite })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    setScripts((prev) => prev.map((x) => x.id === s.id ? { ...x, is_favorite: !x.is_favorite } : x));
  }

  async function copyContent(s: Script) {
    await navigator.clipboard.writeText(s.content);
    await supabase.from("sales_scripts").update({ usage_count: s.usage_count + 1 }).eq("id", s.id);
    setScripts((prev) => prev.map((x) => x.id === s.id ? { ...x, usage_count: x.usage_count + 1 } : x));
    toast.success("Script copiado para a área de transferência");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("sales_scripts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setScripts((prev) => prev.filter((x) => x.id !== id));
    toast.success("Script removido");
    setDeleteId(null);
  }

  function openNew() {
    setEditing({
      id: "", title: "", category: "prospeccao", approach: "cold_call",
      content: "", description: "", tags: [], is_favorite: false, is_active: true,
      usage_count: 0, author_id: null, created_at: "", updated_at: "",
    });
    setOpen(true);
  }

  function openEdit(s: Script) {
    setEditing({ ...s });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scripts de Vendas"
        description="Biblioteca de modelos para abordagens, qualificação, objeções e fechamento"
        action={
          <Button onClick={openNew} className="gradient-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-1.5" /> Novo script
          </Button>
        }
      />

      {/* Filtros */}
      <Card className="p-4 glass border-border/50">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, conteúdo ou tag..."
              className="pl-9"
            />
          </div>
          <Select value={filterCat} onValueChange={(v) => setFilterCat(v as any)}>
            <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterApp} onValueChange={(v) => setFilterApp(v as any)}>
            <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Abordagem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas abordagens</SelectItem>
              {APPROACHES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant={onlyFavs ? "default" : "outline"}
            onClick={() => setOnlyFavs((v) => !v)}
            className={onlyFavs ? "gradient-primary text-primary-foreground" : ""}
          >
            <Star className={cn("h-4 w-4 mr-1.5", onlyFavs && "fill-current")} />
            Favoritos
          </Button>
        </div>
      </Card>

      {/* Grid de scripts */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum script encontrado"
          description={scripts.length === 0
            ? "Comece criando seu primeiro modelo de script de vendas."
            : "Ajuste os filtros ou crie um novo script."}
          action={<Button onClick={openNew} className="gradient-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-1.5" /> Criar script
          </Button>}
        />
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <div key={cat} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {catLabel(cat)}
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {items.length}
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((s) => {
                  const Icon = appIcon(s.approach);
                  return (
                    <Card key={s.id} className="p-5 glass border-border/50 hover:border-primary/40 transition-all hover:shadow-elegant group flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{s.title}</h3>
                            <p className="text-[11px] text-muted-foreground">{appLabel(s.approach)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleFav(s)}
                          className="p-1 rounded hover:bg-accent transition-colors shrink-0"
                          title={s.is_favorite ? "Remover dos favoritos" : "Favoritar"}
                        >
                          <Star className={cn("h-4 w-4 transition-colors",
                            s.is_favorite ? "text-amber-400 fill-current" : "text-muted-foreground")} />
                        </button>
                      </div>

                      {s.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{s.description}</p>
                      )}

                      <div className="bg-muted/30 rounded-lg p-3 mb-3 flex-1 min-h-[80px]">
                        <p className="text-xs text-foreground/80 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                          {s.content}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3 min-h-[20px]">
                        <Badge variant="outline" className={cn("text-[10px]", catColor(s.category))}>
                          {catLabel(s.category)}
                        </Badge>
                        {s.tags.slice(0, 3).map((t) => (
                          <Badge key={t} variant="outline" className="text-[10px] border-border/60">
                            {t}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
                        <span className="text-[10px] text-muted-foreground tabular-nums flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> {s.usage_count} usos
                        </span>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => copyContent(s)} className="h-7 px-2">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(s)} className="h-7 px-2">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(s.id)} className="h-7 px-2 text-muted-foreground hover:text-primary">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ScriptDialog
        open={open}
        onOpenChange={setOpen}
        script={editing}
        onSaved={() => { setOpen(false); load(); }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover script?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove(deleteId)} className="bg-primary hover:bg-primary/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScriptDialog({
  open, onOpenChange, script, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  script: Script | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Script | null>(script);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(script); setTagInput(""); }, [script]);

  if (!form) return null;

  function update<K extends keyof Script>(k: K, v: Script[K]) {
    setForm((f) => f ? { ...f, [k]: v } : f);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || !form) return;
    if (form.tags.includes(t)) return setTagInput("");
    update("tags", [...form.tags, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    if (!form) return;
    update("tags", form.tags.filter((x) => x !== t));
  }

  async function save() {
    if (!form) return;
    if (!form.title.trim()) return toast.error("Informe um título");
    if (!form.content.trim()) return toast.error("O conteúdo do script é obrigatório");
    setSaving(true);
    const user = (await supabase.auth.getUser()).data.user;
    const payload = {
      title: form.title.trim(),
      category: form.category,
      approach: form.approach,
      content: form.content,
      description: form.description?.trim() || null,
      tags: form.tags,
      is_favorite: form.is_favorite,
    };
    const { error } = form.id
      ? await supabase.from("sales_scripts").update(payload).eq("id", form.id)
      : await supabase.from("sales_scripts").insert({ ...payload, author_id: user?.id ?? null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Script atualizado" : "Script criado");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar script" : "Novo script de vendas"}</DialogTitle>
          <DialogDescription>
            Crie modelos reutilizáveis para diferentes etapas da abordagem comercial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Ex: Abordagem inicial WhatsApp - novo lead"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Abordagem *</Label>
              <Select value={form.approach} onValueChange={(v) => update("approach", v as Approach)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APPROACHES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Quando e como usar este script"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Conteúdo do script *</Label>
            <Textarea
              value={form.content}
              onChange={(e) => update("content", e.target.value)}
              placeholder={`Olá {{nome}}, tudo bem?\n\nMeu nome é [...] e estou entrando em contato porque...`}
              rows={10}
              className="font-mono text-sm leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground">
              Dica: use variáveis como <code className="bg-muted px-1 rounded">{"{{nome}}"}</code>, <code className="bg-muted px-1 rounded">{"{{empresa}}"}</code> para personalização.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Digite e pressione Enter"
              />
              <Button type="button" variant="outline" onClick={addTag}>Adicionar</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((t) => (
                  <Badge key={t} variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => removeTag(t)}>
                    {t} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground">
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {form.id ? "Salvar alterações" : "Criar script"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
