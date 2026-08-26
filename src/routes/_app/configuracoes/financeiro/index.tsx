import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2, Save, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getBillingSettings, saveBillingSettings, sendBillingTestMessage } from "@/lib/billing.functions";

export const Route = createFileRoute("/_app/configuracoes/financeiro/")({
  component: FinanceSettingsPage,
  head: () => ({
    meta: [
      { title: "Entidades de cobrança e lembretes · SCL" },
      { name: "description", content: "Cadastre os CNPJs e chaves PIX da Lupus e configure os lembretes automáticos de cobrança pelo WhatsApp." },
      { property: "og:title", content: "Entidades de cobrança e lembretes · SCL" },
      { property: "og:description", content: "CNPJs, chaves PIX e agenda de lembretes automáticos de cobrança." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const PIX_TYPES = [
  { v: "cnpj", l: "CNPJ" },
  { v: "cpf", l: "CPF" },
  { v: "email", l: "E-mail" },
  { v: "telefone", l: "Telefone" },
  { v: "aleatoria", l: "Chave aleatória" },
];

type Entity = {
  id: string;
  name: string;
  legal_name: string | null;
  cnpj: string | null;
  pix_key_type: string;
  pix_key: string | null;
  is_active: boolean;
};

function FinanceSettingsPage() {
  const { isManager, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entity | null>(null);
  const [saving, setSaving] = useState(false);

  const [cfg, setCfg] = useState<any>(null);
  const [instance, setInstance] = useState<any>(null);
  const [savingCfg, setSavingCfg] = useState(false);

  useEffect(() => {
    if (!authLoading && !isManager) {
      toast.error("Apenas administradores ou gestores");
      nav({ to: "/" });
    }
  }, [authLoading, isManager, nav]);

  useEffect(() => {
    if (!isManager) return;
    load();
  }, [isManager]);

  async function load() {
    setLoading(true);
    const [{ data }, s] = await Promise.all([
      (supabase as any).from("billing_entities").select("*").order("created_at"),
      getBillingSettings().catch(() => null),
    ]);
    setEntities(data ?? []);
    if (s) { setCfg(s.config); setInstance(s.instance); }
    setLoading(false);
  }

  async function saveEntity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") ?? "").trim(),
      legal_name: (f.get("legal_name") as string) || null,
      cnpj: (f.get("cnpj") as string) || null,
      pix_key_type: String(f.get("pix_key_type") ?? "cnpj"),
      pix_key: (f.get("pix_key") as string) || null,
      is_active: f.get("is_active") === "on",
    };
    const q = editing
      ? (supabase as any).from("billing_entities").update(payload).eq("id", editing.id)
      : (supabase as any).from("billing_entities").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Entidade atualizada" : "Entidade cadastrada");
    setOpen(false); setEditing(null); load();
  }

  async function removeEntity(id: string) {
    if (!confirm("Excluir esta entidade de cobrança?")) return;
    const { error } = await (supabase as any).from("billing_entities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Entidade excluída"); load();
  }

  async function persistCfg(patch: any) {
    setSavingCfg(true);
    try {
      const v = await saveBillingSettings({ data: patch });
      setCfg(v);
      toast.success("Configuração salva");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar");
    } finally {
      setSavingCfg(false);
    }
  }

  function setRule(kind: "before" | "after", days: number | null) {
    const rules = (cfg?.rules ?? []).filter((r: any) => r.kind !== kind);
    if (days && days > 0) rules.push({ kind, days });
    setCfg({ ...cfg, rules });
  }

  const before = cfg?.rules?.find((r: any) => r.kind === "before");
  const after = cfg?.rules?.find((r: any) => r.kind === "after");
  const hasDue = Boolean(cfg?.rules?.some((r: any) => r.kind === "due"));

  if (authLoading || loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro · Cobranças"
        description="Entidades de cobrança (CNPJ + PIX) e automação de lembretes pelo WhatsApp da Luna."
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nova entidade
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {entities.length === 0 && (
          <Card className="p-6 glass text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            Nenhuma entidade cadastrada. Cadastre os CNPJs da Lupus e suas chaves PIX.
          </Card>
        )}
        {entities.map((e) => (
          <Card key={e.id} className="p-5 glass space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.legal_name ?? "—"}</div>
                </div>
              </div>
              <Badge variant={e.is_active ? "default" : "destructive"}>{e.is_active ? "Ativa" : "Inativa"}</Badge>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">CNPJ: <span className="text-foreground">{e.cnpj ?? "—"}</span></p>
              <p className="text-muted-foreground">PIX ({e.pix_key_type}): <span className="text-foreground break-all">{e.pix_key ?? "—"}</span></p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => { setEditing(e); setOpen(true); }} className="gap-1">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button size="sm" variant="outline" onClick={() => removeEntity(e.id)} className="gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {cfg && (
        <Card className="p-5 glass space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold">Automação de lembretes</h3>
              <p className="text-xs text-muted-foreground">
                Instância: {instance?.name ?? "—"} · {instance?.ok ? "conectada" : `indisponível (${instance?.reason ?? "?"})`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Dias antes do vencimento</Label>
              <Input type="number" min={0} value={before?.days ?? ""} placeholder="ex.: 3"
                onChange={(ev) => setRule("before", ev.target.value ? Number(ev.target.value) : null)} />
            </div>
            <div className="space-y-2">
              <Label>No dia do vencimento</Label>
              <label className="flex items-center gap-2 text-sm h-10">
                <input type="checkbox" checked={hasDue} className="h-4 w-4 accent-primary cursor-pointer"
                  onChange={(ev) => {
                    const rules = (cfg.rules ?? []).filter((r: any) => r.kind !== "due");
                    if (ev.target.checked) rules.push({ kind: "due" });
                    setCfg({ ...cfg, rules });
                  }} />
                Enviar no vencimento
              </label>
            </div>
            <div className="space-y-2">
              <Label>Dias após o vencimento</Label>
              <Input type="number" min={0} value={after?.days ?? ""} placeholder="ex.: 3"
                onChange={(ev) => setRule("after", ev.target.value ? Number(ev.target.value) : null)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cfg.test_mode} className="h-4 w-4 accent-primary cursor-pointer"
                onChange={(ev) => setCfg({ ...cfg, test_mode: ev.target.checked })} />
              Modo de teste (não envia para clientes reais)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cfg.enabled} className="h-4 w-4 accent-primary cursor-pointer"
                onChange={(ev) => setCfg({ ...cfg, enabled: ev.target.checked })} />
              Automação diária habilitada (produção)
            </label>
            <div className="space-y-2">
              <Label>Número de teste (WhatsApp)</Label>
              <Input value={cfg.test_number ?? ""} placeholder="5567999999999"
                onChange={(ev) => setCfg({ ...cfg, test_number: ev.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cfg.notify_directors} className="h-4 w-4 accent-primary cursor-pointer"
                onChange={(ev) => setCfg({ ...cfg, notify_directors: ev.target.checked })} />
              Notificar o grupo Lupus Diretoria
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Grupo da diretoria: {cfg.director_group_name ?? cfg.director_group_jid ?? "não configurado"} — configure em Configurações → WhatsApp.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => persistCfg(cfg)} disabled={savingCfg} className="gap-2">
              <Save className="h-4 w-4" /> {savingCfg ? "Salvando..." : "Salvar automação"}
            </Button>
            <Button variant="outline" className="gap-2"
              onClick={async () => {
                try { const r: any = await sendBillingTestMessage({ data: { target: "number" } });
                  r?.ok ? toast.success("Mensagem de teste enviada") : toast.error(r?.error ?? r?.skipped ?? "Falha no teste");
                } catch (e: any) { toast.error(e?.message ?? "Erro"); }
              }}>
              <Send className="h-4 w-4" /> Testar número
            </Button>
            <Button variant="outline" className="gap-2"
              onClick={async () => {
                try { const r: any = await sendBillingTestMessage({ data: { target: "group" } });
                  r?.ok ? toast.success("Mensagem enviada ao grupo") : toast.error(r?.error ?? r?.skipped ?? "Falha no teste");
                } catch (e: any) { toast.error(e?.message ?? "Erro"); }
              }}>
              <Send className="h-4 w-4" /> Testar grupo
            </Button>
          </div>
        </Card>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar entidade" : "Nova entidade de cobrança"}</DialogTitle></DialogHeader>
          <form onSubmit={saveEntity} className="space-y-3">
            <div className="space-y-2">
              <Label>Nome de identificação *</Label>
              <Input name="name" required defaultValue={editing?.name ?? ""} placeholder="Lupus Empresa 01" />
            </div>
            <div className="space-y-2">
              <Label>Razão social</Label>
              <Input name="legal_name" defaultValue={editing?.legal_name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input name="cnpj" defaultValue={editing?.cnpj ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Tipo da chave PIX</Label>
              <Select name="pix_key_type" defaultValue={editing?.pix_key_type ?? "cnpj"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PIX_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input name="pix_key" defaultValue={editing?.pix_key ?? ""} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_active" defaultChecked={editing ? editing.is_active : true} className="h-4 w-4 accent-primary cursor-pointer" />
              Ativa
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
