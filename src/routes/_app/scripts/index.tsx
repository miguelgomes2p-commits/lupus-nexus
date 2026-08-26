import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Plus, Mail, Pencil, Trash2, Send, Eye } from "lucide-react";
import { EmptyState } from "@/components/crm/EmptyState";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { sendTransactionalEmail } from "@/lib/email/send";

export const Route = createFileRoute("/_app/scripts/")({
  component: EmailScriptsPage,
});

interface EmailScript {
  id: string;
  key: string;
  name: string;
  category: string;
  subject: string;
  body_html: string;
  variables_desc: string | null;
  active: boolean;
}

function EmailScriptsPage() {
  const { isAdmin, user, profile, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<EmailScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmailScript | null>(null);
  const [preview, setPreview] = useState<EmailScript | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    key: "", name: "", category: "transactional", subject: "",
    body_html: "", variables_desc: "", active: true,
  };
  const [form, setForm] = useState(emptyForm);

  function openEditor(script: EmailScript | null) {
    setEditing(script);
    setForm(script
      ? {
          key: script.key ?? "",
          name: script.name ?? "",
          category: script.category ?? "transactional",
          subject: script.subject ?? "",
          body_html: script.body_html ?? "",
          variables_desc: script.variables_desc ?? "",
          active: script.active ?? true,
        }
      : emptyForm);
    setOpen(true);
  }


  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Apenas administradores");
      nav({ to: "/" });
    }
  }, [authLoading, isAdmin, nav]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("email_scripts").select("*").order("category").order("name");
    setItems((data as EmailScript[]) ?? []);
    setLoading(false);
  }

  async function save() {
    const payload = {
      key: (form.key || editing?.key || "").trim(),
      name: form.name.trim(),
      category: (form.category || "transactional").trim(),
      subject: form.subject.trim(),
      body_html: form.body_html,
      variables_desc: form.variables_desc.trim() || null,
      active: form.active,
    };
    if (!payload.key || !payload.name || !payload.subject || !payload.body_html.trim()) {
      return toast.error("Preencha chave, nome, assunto e corpo");
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("email_scripts").update(payload).eq("id", editing.id);
        if (error) return toast.error(error.message);
        toast.success("Script atualizado");
      } else {
        const { error } = await supabase.from("email_scripts").insert(payload);
        if (error) return toast.error(error.message);
        toast.success("Script criado");
      }
      setOpen(false);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  }


  async function remove(id: string) {
    const { error } = await supabase.from("email_scripts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  }

  async function sendTest(script: EmailScript) {
    const recipient = profile?.email || user?.email;
    if (!recipient) return toast.error("Sem e-mail para envio de teste");
    try {
      await sendTransactionalEmail({
        templateName: script.key,
        recipientEmail: recipient,
        templateData: {
          contact_name: profile?.name || "Fulano",
          company_name: "Empresa Teste",
          due_date: new Date().toLocaleDateString("pt-BR"),
          amount: "1.000,00",
          contract_value: "10.000,00",
          contract_start_date: new Date().toLocaleDateString("pt-BR"),
        },
      });
      toast.success(`E-mail de teste enviado para ${recipient}`);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar");
    }
  }

  if (authLoading || loading) return <PageLoader />;
  if (!isAdmin) return null;

  return (
    <div>
      <PageHeader
        title="Scripts de E-mails Automáticos"
        description="Modelos editáveis (boas-vindas, lembretes, faturas, etc). Variáveis suportadas: {{variavel}}"
        action={
          <Button onClick={() => openEditor(null)} className="gradient-primary text-primary-foreground shadow-glow">
            <Plus className="h-4 w-4 mr-1" /> Novo script
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={Mail} title="Sem scripts" description="Crie modelos de e-mail para uso em disparos automáticos." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((s) => (
            <Card key={s.id} className="p-4 sm:p-5 glass hover-lift">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{s.name}</h3>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-primary/15 text-primary">{s.category}</span>
                    {!s.active && (
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">inativo</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    chave: <code className="text-foreground">{s.key}</code>
                  </p>
                  <p className="text-sm mt-2 line-clamp-2"><strong>Assunto:</strong> {s.subject}</p>
                  {s.variables_desc && (
                    <p className="text-[11px] text-muted-foreground mt-1">Variáveis: {s.variables_desc}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="icon" variant="ghost" title="Pré-visualizar" onClick={() => setPreview(s)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Enviar teste para mim" onClick={() => sendTest(s)}>
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Editar" onClick={() => openEditor(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Excluir" onClick={() => { if (confirm(`Excluir "${s.name}"?`)) remove(s.id); }}>
                    <Trash2 className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{editing ? "Editar" : "Novo"} script</SheetTitle></SheetHeader>
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Chave (única, sem espaços) *</Label>
                <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} readOnly={!!editing} placeholder="ex: welcome_client" className={editing ? "opacity-70" : undefined} />
              </div>

              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nome exibido *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Assunto *</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Olá {{contact_name}}" />
            </div>
            <div className="space-y-1.5">
              <Label>Corpo HTML *</Label>
              <textarea
                rows={14}
                value={form.body_html}
                onChange={(e) => setForm({ ...form, body_html: e.target.value })}
                className="w-full bg-input border border-border rounded-md p-2 text-xs font-mono"
                placeholder="<p>Olá {{contact_name}}...</p>"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição de variáveis</Label>
              <Input value={form.variables_desc} onChange={(e) => setForm({ ...form, variables_desc: e.target.value })} placeholder="contact_name, company_name, due_date, amount" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label htmlFor="active">Ativo</Label>
            </div>
            <Button type="button" disabled={saving} onClick={() => save()} className="w-full gradient-primary text-primary-foreground">
              {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </Button>
          </div>
        </SheetContent>

        </SheetContent>
      </Sheet>

      <Sheet open={!!preview} onOpenChange={(v) => { if (!v) setPreview(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>Pré-visualização</SheetTitle></SheetHeader>
          {preview && (
            <div className="mt-4 space-y-3">
              <div className="text-sm"><strong>Assunto:</strong> {preview.subject}</div>
              <div className="border border-border rounded-lg overflow-hidden bg-white text-black">
                <iframe
                  title="preview"
                  srcDoc={preview.body_html}
                  className="w-full h-[500px] bg-white"
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
