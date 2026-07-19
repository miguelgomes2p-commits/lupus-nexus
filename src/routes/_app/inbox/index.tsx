import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageLoader } from "@/components/crm/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/crm/EmptyState";
import { Inbox as InboxIcon, Mail, CheckCircle2, Clock, AlertTriangle, Ban } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/inbox/")({
  component: InboxPage,
});

interface LogRow {
  id: string;
  message_id: string | null;
  template_name: string | null;
  recipient_email: string | null;
  status: string | null;
  error_message: string | null;
  created_at: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
  welcome_client: "Boas-vindas",
  payment_reminder_5d: "Lembrete (5 dias)",
  payment_reminder_due: "Lembrete (vencimento)",
  invoice_nfe: "NFE anexada",
};

function templateLabel(k: string | null) {
  if (!k) return "—";
  return TEMPLATE_LABELS[k] ?? k;
}

function statusMeta(s: string | null) {
  switch (s) {
    case "sent":
      return { label: "Enviado", icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    case "pending":
      return { label: "Na fila", icon: Clock, cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    case "failed":
    case "dlq":
    case "bounced":
    case "complained":
      return { label: s === "bounced" ? "Devolvido" : s === "complained" ? "Reclamação" : "Falha", icon: AlertTriangle, cls: "text-red-400 bg-red-500/10 border-red-500/30" };
    case "suppressed":
      return { label: "Suprimido", icon: Ban, cls: "text-muted-foreground bg-muted border-border" };
    default:
      return { label: s ?? "—", icon: Mail, cls: "text-muted-foreground bg-muted border-border" };
  }
}

function InboxPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [template, setTemplate] = useState<string>("__all");
  const [status, setStatus] = useState<string>("__all");
  const [selected, setSelected] = useState<LogRow | null>(null);
  const [scripts, setScripts] = useState<Record<string, { subject: string; body_html: string }>>({});

  useEffect(() => {
    supabase.from("email_scripts").select("key,subject,body_html").then(({ data }) => {
      const map: Record<string, { subject: string; body_html: string }> = {};
      (data ?? []).forEach((s: any) => { map[s.key] = { subject: s.subject, body_html: s.body_html }; });
      setScripts(map);
    });
  }, []);

  function renderTemplate(tpl: string, recipient: string | null) {
    // Substitui placeholders {{var}} por marcador visual quando não temos dados salvos
    return tpl
      .replace(/\{\{\s*recipient_email\s*\}\}/gi, recipient ?? "")
      .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => `<span style="background:#fff3cd;color:#7a5b00;padding:0 4px;border-radius:3px;font-size:11px">${k}</span>`);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("email-log")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_send_log" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("email_send_log")
      .select("id,message_id,template_name,recipient_email,status,error_message,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    // Dedupe by message_id — keep latest per email (list is already desc)
    const seen = new Set<string>();
    const dedup: LogRow[] = [];
    for (const r of (data as LogRow[]) ?? []) {
      const key = r.message_id ?? r.id;
      if (seen.has(key)) continue;
      seen.add(key);
      dedup.push(r);
    }
    setRows(dedup);
    setLoading(false);
  }

  const templates = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.template_name && s.add(r.template_name));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (template !== "__all" && r.template_name !== template) return false;
    if (status !== "__all" && r.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(r.recipient_email ?? "").toLowerCase().includes(q) && !(r.template_name ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = useMemo(() => {
    const total = rows.length;
    const sent = rows.filter((r) => r.status === "sent").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const failed = rows.filter((r) => ["failed", "dlq", "bounced"].includes(r.status ?? "")).length;
    return { total, sent, pending, failed };
  }, [rows]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader title="Inbox" description="Todos os e-mails automáticos enviados pelo sistema" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Enviados" value={stats.sent} tone="emerald" />
        <StatCard label="Na fila" value={stats.pending} tone="amber" />
        <StatCard label="Falhas" value={stats.failed} tone="red" />
      </div>

      <Card className="p-3 sm:p-4 glass mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input placeholder="Buscar por destinatário ou template…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os templates</SelectItem>
              {templates.map((t) => <SelectItem key={t} value={t}>{templateLabel(t)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os status</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="pending">Na fila</SelectItem>
              <SelectItem value="failed">Falha</SelectItem>
              <SelectItem value="bounced">Devolvido</SelectItem>
              <SelectItem value="suppressed">Suprimido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={InboxIcon} title="Inbox vazia" description="Nenhum e-mail encontrado com os filtros atuais." />
      ) : (
        <Card className="glass overflow-hidden">
          <ul className="divide-y divide-border">
            {filtered.map((r) => {
              const meta = statusMeta(r.status);
              const Icon = meta.icon;
              return (
                <li
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-primary/5 cursor-pointer transition-colors"
                >
                  <div className={`h-9 w-9 rounded-full grid place-items-center border ${meta.cls}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{templateLabel(r.template_name)}</span>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">Para: {r.recipient_email ?? "—"}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0 text-right">
                    {formatDistanceToNow(new Date(r.created_at), { locale: ptBR, addSuffix: true })}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Sheet open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Detalhes do envio</SheetTitle></SheetHeader>
          {selected && (
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Template" value={templateLabel(selected.template_name)} />
              <Row label="Destinatário" value={selected.recipient_email ?? "—"} />
              <Row label="Status" value={statusMeta(selected.status).label} />
              <Row label="Enviado em" value={format(new Date(selected.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
              <Row label="ID da mensagem" value={selected.message_id ?? "—"} mono />
              {selected.error_message && (
                <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  <strong>Erro:</strong> {selected.error_message}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "amber" | "red" }) {
  const cls =
    tone === "emerald" ? "text-emerald-400" :
    tone === "amber" ? "text-amber-400" :
    tone === "red" ? "text-red-400" : "text-foreground";
  return (
    <Card className="p-3 sm:p-4 glass">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div>
    </Card>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border pb-2">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-xs" : ""} break-all`}>{value}</span>
    </div>
  );
}
