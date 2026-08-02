import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Receipt, Upload, Download, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { brl } from "@/lib/format";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { sendTransactionalEmail } from "@/lib/email/send";
import { sendWhatsAppNfe } from "@/lib/whatsapp.functions";

interface Invoice {
  id: string;
  client_id: string;
  reference_month: string;
  due_date: string;
  amount: number;
  status: "pendente_nfe" | "pago" | "cancelado";
  nfe_file_path: string | null;
  nfe_file_name: string | null;
  nfe_uploaded_at: string | null;
  paid_at: string | null;
  email_sent_at: string | null;
}

interface Client {
  id: string;
  company_name: string;
  email: string | null;
  contact_name: string | null;
}

interface Props { client: Client }

export function InvoicesPanel({ client }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => { load(); }, [client.id]);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("client_invoices")
      .select("*")
      .eq("client_id", client.id)
      .order("reference_month", { ascending: false });
    if (error) toast.error(error.message);
    setInvoices(data ?? []);
    setLoading(false);
  }

  async function attachNfe(invoice: Invoice, file: File) {
    setUploading(invoice.id);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${client.id}/nfe/${invoice.id}-${Date.now()}-${safe}`;
      const upload = await supabase.storage.from("client-documents").upload(path, file, { upsert: false });
      if (upload.error) throw upload.error;

      const nowIso = new Date().toISOString();
      const { error: upErr } = await (supabase as any).from("client_invoices").update({
        status: "pago",
        nfe_file_path: path,
        nfe_file_name: file.name,
        nfe_uploaded_at: nowIso,
        paid_at: nowIso.slice(0, 10),
      }).eq("id", invoice.id);
      if (upErr) throw upErr;

      // Signed URL for email (30 days)
      const signed = await supabase.storage.from("client-documents").createSignedUrl(path, 60 * 60 * 24 * 30);
      const nfeUrl = signed.data?.signedUrl ?? "";

      // TEMP: envia somente para miguelgomes2p@gmail.com para validação
      try {
        await sendTransactionalEmail({
          templateName: "nfe_attached",
          recipientEmail: "miguelgomes2p@gmail.com",
          templateData: {
            contact_name: client.contact_name || client.company_name,
            company_name: client.company_name,
            reference_month: format(parseISO(invoice.reference_month), "MMMM 'de' yyyy", { locale: ptBR }),
            due_date: format(parseISO(invoice.due_date), "dd/MM/yyyy"),
            amount: brl(Number(invoice.amount)),
            nfe_url: nfeUrl,
            nfe_file_name: file.name,
          },
          idempotencyKey: `nfe_attached-${invoice.id}`,
        });
        await (supabase as any).from("client_invoices").update({ email_sent_at: nowIso }).eq("id", invoice.id);
        toast.success("NFE anexada e e-mail enviado (teste: miguelgomes2p@gmail.com)");
      } catch (e: any) {
        toast.warning(`NFE anexada, mas falhou envio de e-mail: ${e?.message ?? "erro"}`);
      }
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao anexar NFE");
    } finally {
      setUploading(null);
    }
  }

  async function downloadNfe(inv: Invoice) {
    if (!inv.nfe_file_path) return;
    const { data, error } = await supabase.storage.from("client-documents").createSignedUrl(inv.nfe_file_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function markPending(inv: Invoice) {
    if (!confirm("Reverter para pendente NFE?")) return;
    const { error } = await (supabase as any).from("client_invoices").update({
      status: "pendente_nfe",
      paid_at: null,
      email_sent_at: null,
    }).eq("id", inv.id);
    if (error) return toast.error(error.message);
    toast.success("Fatura marcada como pendente");
    load();
  }

  if (loading) return <Card className="p-6 glass"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></Card>;

  const totals = invoices.reduce((a, i) => {
    if (i.status === "pago") a.pago += Number(i.amount);
    if (i.status === "pendente_nfe") a.pendente += Number(i.amount);
    return a;
  }, { pago: 0, pendente: 0 });

  return (
    <Card className="p-4 sm:p-5 glass border-border/50">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Receipt className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Faturas & NFE</h3>
        <span className="text-xs text-muted-foreground tabular-nums ml-auto">{invoices.length} faturas</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">Pago</div>
          <div className="font-bold tabular-nums text-emerald-400">{brl(totals.pago)}</div>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">Pendente NFE</div>
          <div className="font-bold tabular-nums text-amber-400">{brl(totals.pendente)}</div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">Nenhuma fatura gerada ainda.</p>
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => {
            const isPending = inv.status === "pendente_nfe";
            return (
              <li key={inv.id} className={`p-3 rounded-lg border ${isPending ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold capitalize flex items-center gap-2">
                      {isPending ? <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                      {format(parseISO(inv.reference_month), "MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Vencimento {format(parseISO(inv.due_date), "dd/MM/yyyy")}
                      {inv.paid_at && ` · Pago em ${format(parseISO(inv.paid_at), "dd/MM/yyyy")}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="font-bold tabular-nums">{brl(inv.amount)}</div>
                      <StatusBadge status={inv.status} size="xs" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {inv.nfe_file_path && (
                    <Button size="sm" variant="outline" onClick={() => downloadNfe(inv)}>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar NFE
                    </Button>
                  )}
                  {isPending ? (
                    <label className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold h-8 px-3 rounded-md gradient-primary text-primary-foreground shadow-glow">
                      {uploading === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Anexar NFE (marca como pago)
                      <input type="file" className="hidden" accept=".pdf,.xml,image/*"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) attachNfe(inv, f); e.currentTarget.value = ""; }}
                        disabled={uploading === inv.id} />
                    </label>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => markPending(inv)}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reverter para pendente
                    </Button>
                  )}
                  {inv.email_sent_at && (
                    <span className="text-[10px] text-muted-foreground">
                      E-mail enviado {format(parseISO(inv.email_sent_at), "dd/MM HH:mm")}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
