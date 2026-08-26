import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { previewBillingReminder, sendBillingReminderNow } from "@/lib/billing.functions";

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  skipped: "bg-muted text-muted-foreground border-border",
  processing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pending: "bg-muted text-muted-foreground border-border",
};

const TYPE_LABEL = (t: string) =>
  t === "DUE" ? "No vencimento"
  : t.startsWith("BEFORE_") ? `${t.split("_")[1]}d antes`
  : t.startsWith("AFTER_") ? `${t.split("_")[1]}d depois`
  : t === "MANUAL" ? "Manual"
  : t === "MANUAL_RESEND" ? "Reenvio manual"
  : t;

export function BillingPanel({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => { load(); }, [clientId]);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("billing_reminders")
      .select("*, billing_entities(name)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows(data ?? []);
    setLoading(false);
  }

  async function openConfirm() {
    try {
      const p = await previewBillingReminder({ data: { clientId } });
      setPreview(p);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao preparar cobrança");
    }
  }

  async function confirmSend(allowDuplicate = false) {
    if (sending) return;
    setSending(true);
    try {
      const r: any = await sendBillingReminderNow({ data: { clientId, allowDuplicate } });
      if (r.status === "sent") toast.success("Lembrete enviado pela Luna");
      else if (r.status === "duplicate") toast.warning("Já existe um envio para esta cobrança — use reenvio manual");
      else if (r.status === "skipped") toast.error(`Não enviado: ${r.reason}`);
      else toast.error(`Falha: ${r.reason ?? "erro"}`);
      setPreview(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro no envio");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="p-5 glass space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Histórico de cobranças</h3>
          <p className="text-xs text-muted-foreground">Lembretes enviados pela Luna (WhatsApp)</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load} className="gap-1"><RefreshCw className="h-3.5 w-3.5" /> Atualizar</Button>
          <Button size="sm" onClick={openConfirm} className="gap-1"><Send className="h-3.5 w-3.5" /> Enviar lembrete agora</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma cobrança registrada para este cliente.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground text-left">
                <th className="py-2">Data</th><th>Tipo</th><th>Vencimento</th><th>Valor</th><th>WhatsApp</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setDetail(r)} className="border-t border-border cursor-pointer hover:bg-muted/40">
                  <td className="py-2">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                  <td>{TYPE_LABEL(r.reminder_type)}{r.is_test ? " · teste" : ""}</td>
                  <td>{r.due_date.split("-").reverse().join("/")}</td>
                  <td>{Number(r.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{r.whatsapp ?? "—"}</td>
                  <td><Badge variant="outline" className={STATUS_STYLE[r.status] ?? ""}>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhe da cobrança</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">CNPJ: <span className="text-foreground">{detail.cnpj ?? "—"}</span></p>
              <p className="text-muted-foreground">PIX: <span className="text-foreground break-all">{detail.pix_key ?? "—"}</span></p>
              <p className="text-muted-foreground">Entidade: <span className="text-foreground">{detail.billing_entities?.name ?? "—"}</span></p>
              <p className="text-muted-foreground">Tentativas: <span className="text-foreground">{detail.attempts}</span></p>
              <p className="text-muted-foreground">ID WhatsApp: <span className="text-foreground break-all">{detail.provider_message_id ?? "—"}</span></p>
              <p className="text-muted-foreground">Diretoria: <span className="text-foreground">{detail.director_notified ? "notificada" : "não notificada"}</span></p>
              {detail.skip_reason && <p className="text-muted-foreground">Motivo: <span className="text-foreground">{detail.skip_reason}</span></p>}
              {detail.error_message && <p className="text-destructive break-all">{detail.error_message}</p>}
              {detail.message && (
                <pre className="whitespace-pre-wrap bg-muted/40 border border-border rounded-lg p-3 text-xs">{detail.message}</pre>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirmar envio pela Luna</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Cliente: <span className="text-foreground">{preview.clientName}</span></p>
              <p className="text-muted-foreground">WhatsApp: <span className="text-foreground">{preview.whatsapp ?? "—"}</span></p>
              <p className="text-muted-foreground">Valor: <span className="text-foreground">{Number(preview.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></p>
              <p className="text-muted-foreground">Vencimento: <span className="text-foreground">{String(preview.dueDate).split("-").reverse().join("/")}</span></p>
              <p className="text-muted-foreground">CNPJ: <span className="text-foreground">{preview.cnpj ?? "—"}</span></p>
              <p className="text-muted-foreground">PIX: <span className="text-foreground break-all">{preview.pix ?? "—"}</span></p>
              {preview.testMode && (
                <p className="text-amber-400">Modo de teste ativo — a mensagem irá para {preview.testNumber ?? "o número de teste"}.</p>
              )}
              {!preview.ok && <p className="text-destructive">Bloqueado: {preview.skip}</p>}
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPreview(null)}>Cancelar</Button>
                <Button variant="outline" disabled={sending || !preview.ok} onClick={() => confirmSend(true)}>Reenviar (forçar)</Button>
                <Button disabled={sending || !preview.ok} onClick={() => confirmSend(false)}>
                  {sending ? "Enviando..." : "Enviar pela Luna"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
