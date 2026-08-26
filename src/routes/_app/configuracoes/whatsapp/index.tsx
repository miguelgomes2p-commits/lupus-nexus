import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Save, Plug } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getEvolutionSettings, saveEvolutionSettings, testEvolutionConnection } from "@/lib/evolution.functions";
import { getBillingSettings, saveBillingSettings, listWhatsAppGroups } from "@/lib/billing.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_app/configuracoes/whatsapp/")({
  component: WhatsAppConfigPage,
  head: () => ({
    meta: [
      { title: "Configurar WhatsApp (Evolution) · SCL" },
      { name: "description", content: "Configure manualmente a instância da Evolution API que envia as automações de WhatsApp do SCL." },
      { property: "og:title", content: "Configurar WhatsApp (Evolution) · SCL" },
      { property: "og:description", content: "Configure a instância da Evolution API usada nas automações de WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Status = Awaited<ReturnType<typeof testEvolutionConnection>> | null;

function WhatsAppConfigPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [instance, setInstance] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [keyPreview, setKeyPreview] = useState<string | null>(null);
  const [source, setSource] = useState<"manual" | "env">("env");
  const [status, setStatus] = useState<Status>(null);
  const [billing, setBilling] = useState<any>(null);
  const [groups, setGroups] = useState<{ id: string; subject: string }[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [manualJid, setManualJid] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Apenas administradores");
      nav({ to: "/" });
    }
  }, [authLoading, isAdmin, nav]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const s = await getEvolutionSettings();
        setBaseUrl(s.baseUrl);
        setInstance(s.instance);
        setKeyPreview(s.apiKeyPreview ?? (s.hasApiKey ? "•••• (configurada)" : null));
        setSource(s.source);
        const b = await getBillingSettings().catch(() => null);
        if (b) setBilling(b.config);
      } catch (e: any) {
        toast.error(e?.message ?? "Erro ao carregar configuração");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveEvolutionSettings({ data: { baseUrl, instance, apiKey: apiKey || null } });
      toast.success("Configuração salva");
      setApiKey("");
      setSource("manual");
      const s = await getEvolutionSettings();
      setKeyPreview(s.apiKeyPreview);
      await handleTest();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const r = await testEvolutionConnection();
      setStatus(r);
      if (r.ok) toast.success(`Instância ${r.instance} conectada`);
      else toast.error(`Falha: ${r.reason ?? "desconhecida"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao testar");
    } finally {
      setTesting(false);
    }
  }

  async function syncGroups() {
    setSyncing(true);
    try {
      const r = await listWhatsAppGroups();
      if (!r.ok) toast.error(`Não foi possível listar os grupos: ${r.reason}. Informe o JID manualmente.`);
      else if (!r.groups.length) toast.warning("Nenhum grupo retornado pela instância.");
      else toast.success(`${r.groups.length} grupo(s) encontrados`);
      setGroups(r.groups);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao sincronizar grupos");
    } finally {
      setSyncing(false);
    }
  }

  async function saveGroup(jid: string, name: string | null) {
    if (!jid.endsWith("@g.us")) return toast.error("Informe um JID de grupo válido (…@g.us)");
    setSavingGroup(true);
    try {
      const v = await saveBillingSettings({ data: { director_group_jid: jid, director_group_name: name } });
      setBilling(v);
      toast.success("Grupo da diretoria salvo");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar grupo");
    } finally {
      setSavingGroup(false);
    }
  }

  if (authLoading || loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="WhatsApp · Evolution API"
        description="Configure manualmente o aplicativo/instância que dispara as automações de WhatsApp (lembretes, boas-vindas e NFE)."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 glass lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Credenciais da instância</h3>
              <p className="text-xs text-muted-foreground">
                Origem atual: {source === "manual" ? "configuração manual" : "variáveis de ambiente"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">URL da Evolution API</Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://evolution.seudominio.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instance">Nome da instância</Label>
            <Input
              id="instance"
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              placeholder="luna_9nkvir"
            />
            <p className="text-xs text-muted-foreground">
              É o nome exato criado na Evolution ao ler o QR Code (ex.: a instância da Luna).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keyPreview ? `Salva: ${keyPreview} — deixe em branco para manter` : "Cole a API Key da Evolution"}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar configuração"}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
              <Plug className="h-4 w-4" /> {testing ? "Testando..." : "Testar conexão"}
            </Button>
          </div>
        </Card>

        <Card className="p-5 glass space-y-3">
          <h3 className="font-semibold">Status</h3>
          {!status ? (
            <p className="text-sm text-muted-foreground">Clique em "Testar conexão" para verificar a instância.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={status.ok ? "default" : "destructive"}>
                  {status.ok ? "Conectada" : "Indisponível"}
                </Badge>
                {status.state ? <span className="text-muted-foreground">estado: {status.state}</span> : null}
              </div>
              {status.instance ? (
                <p className="text-muted-foreground">Instância: <span className="text-foreground">{status.instance}</span></p>
              ) : null}
              {status.reason ? <p className="text-muted-foreground">Motivo: {status.reason}</p> : null}
              {status.available?.length ? (
                <p className="text-muted-foreground">
                  Instâncias disponíveis: {status.available.join(", ")}
                </p>
              ) : null}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Todas as automações (lembretes 5 dias antes e no vencimento, boas-vindas e envio de NFE) usam esta instância.
          </p>
        </Card>
      </div>

      <Card className="p-5 glass space-y-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Grupo para notificações financeiras</h3>
            <p className="text-xs text-muted-foreground">
              Instância: {instance || "—"} · {status?.ok ? "conectada" : "status desconhecido — teste a conexão"}
            </p>
          </div>
        </div>

        <div className="text-sm">
          <p className="text-muted-foreground">
            Grupo configurado:{" "}
            <span className="text-foreground">{billing?.director_group_name ?? "—"}</span>
          </p>
          <p className="text-muted-foreground break-all">
            JID: <span className="text-foreground">{billing?.director_group_jid ?? "não configurado"}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={syncGroups} disabled={syncing} className="gap-2">
            <Users className="h-4 w-4" /> {syncing ? "Sincronizando..." : "Sincronizar grupos"}
          </Button>
        </div>

        {groups.length > 0 && (
          <div className="space-y-2">
            <Label>Selecione o Grupo Lupus Diretoria</Label>
            <Select onValueChange={(v) => saveGroup(v, groups.find((g) => g.id === v)?.subject ?? null)}>
              <SelectTrigger><SelectValue placeholder="Escolha um grupo" /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.subject}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-border">
          <Label htmlFor="jid">Cadastrar JID manualmente (fallback)</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input id="jid" value={manualJid} onChange={(e) => setManualJid(e.target.value)} placeholder="120363XXXXXXXXXX@g.us" />
            <Button onClick={() => saveGroup(manualJid.trim(), "Grupo Lupus Diretoria")} disabled={savingGroup || !manualJid.trim()}>
              Salvar JID
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Após salvar, os envios usam sempre o JID — renomear o grupo não afeta as notificações.
          </p>
        </div>
      </Card>
    </div>
  );
}
