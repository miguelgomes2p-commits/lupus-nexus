import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// TEST MODE — send to fixed recipients while validating.
const TEST_RECIPIENTS = [
  "miguelgomes2p@gmail.com",
  "thiago.multi01@gmail.com",
  "lucasmonteiromurta@gmail.com",
];
const SITE_NAME = "Lupus Assessoria";
const SENDER_DOMAIN = "notify.lupusassessoria.com";
const FROM_DOMAIN = "lupusassessoria.com";

function interpolate(str: string, data: Record<string, any>): string {
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = data?.[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function enqueue(
  supabase: any,
  templateKey: string,
  recipient: string,
  data: Record<string, any>,
  idempotencyKey: string
) {
  const { data: script } = await supabase
    .from("email_scripts")
    .select("subject, body_html, active")
    .eq("key", templateKey)
    .maybeSingle();
  if (!script || !script.active) return { skipped: true, reason: "template_missing_or_inactive" };

  const normalized = recipient.toLowerCase();
  const { data: suppressed } = await supabase
    .from("suppressed_emails").select("id").eq("email", normalized).maybeSingle();
  if (suppressed) return { skipped: true, reason: "suppressed" };

  let unsubscribeToken: string;
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens").select("token, used_at").eq("email", normalized).maybeSingle();
  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token as string;
  } else {
    unsubscribeToken = generateToken();
    await supabase.from("email_unsubscribe_tokens").upsert(
      { token: unsubscribeToken, email: normalized },
      { onConflict: "email", ignoreDuplicates: true }
    );
    const { data: stored } = await supabase
      .from("email_unsubscribe_tokens").select("token").eq("email", normalized).maybeSingle();
    if (stored) unsubscribeToken = stored.token as string;
  }

  const messageId = crypto.randomUUID();
  const subject = interpolate(script.subject as string, data);
  const html = interpolate(script.body_html as string, data);
  const text = htmlToText(html);

  await supabase.from("email_send_log").insert({
    message_id: messageId, template_name: templateKey, recipient_email: recipient, status: "pending",
  });

  const { error } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject, html, text,
      purpose: "transactional",
      label: templateKey,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });
  if (error) return { skipped: true, reason: "enqueue_failed", error: error.message };
  return { queued: true, messageId };
}

export const Route = createFileRoute("/api/public/hooks/payment-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return Response.json({ error: "config" }, { status: 500 });
        const supabase = createClient(url, key);

        // Optional body:
        //   { invoiceId?: string, template?: "payment_reminder_5d" | "payment_reminder_due" }
        let body: any = {};
        try { body = await request.json(); } catch {}
        const forceInvoiceId: string | undefined = body?.invoiceId;
        const forceTemplate: string | undefined = body?.template;

        // Load invoices to remind about (only pending NFE)
        let query = supabase
          .from("client_invoices")
          .select("id, client_id, reference_month, due_date, amount, status, clients:client_id(id, company_name, contact_name, email)")
          .eq("status", "pendente_nfe");
        if (forceInvoiceId) query = query.eq("id", forceInvoiceId);
        const { data: invoices, error } = await query;
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayKey = today.toISOString().slice(0, 10);
        const nowKey = new Date().toISOString().replace(/[:.]/g, "-");
        const results: any[] = [];

        for (const inv of invoices ?? []) {
          const client = (inv as any).clients;
          const due = new Date(`${inv.due_date}T00:00:00`);
          const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
          let templateKey: string | null = null;
          if (forceInvoiceId) {
            templateKey = forceTemplate || (diff <= 0 ? "payment_reminder_due" : "payment_reminder_5d");
          } else {
            if (diff === 5) templateKey = "payment_reminder_5d";
            else if (diff === 0) templateKey = "payment_reminder_due";
          }
          if (!templateKey) continue;

          const data = {
            contact_name: client?.contact_name || client?.company_name || "",
            company_name: client?.company_name || "",
            due_date: due.toLocaleDateString("pt-BR"),
            amount: brl(Number(inv.amount)),
            reference_month: inv.reference_month,
          };

          for (const recipient of TEST_RECIPIENTS) {
            const idempotencyKey = forceInvoiceId
              ? `${templateKey}-${inv.id}-${recipient}-force-${nowKey}`
              : `${templateKey}-${inv.id}-${recipient}-${todayKey}`;
            const res = await enqueue(supabase, templateKey, recipient, data, idempotencyKey);
            results.push({ invoice: inv.id, client: client?.company_name, recipient, template: templateKey, ...res });
          }
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to trigger" }),
    },
  },
});
