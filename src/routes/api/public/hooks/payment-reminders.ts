import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Forced test recipient while validating the flow. Change later to use client.email.
const TEST_RECIPIENT = "miguelgomes2p@gmail.com";
const SITE_NAME = "Lupus Assessoria";
const SENDER_DOMAIN = "notify.lupusassessoria.com";
const FROM_DOMAIN = "notify.lupusassessoria.com";

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

function computeNextPayment(startDateStr: string | null) {
  if (!startDateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDateStr);
  if (!m) return null;
  const startYear = Number(m[1]);
  const startMonth = Number(m[2]) - 1;
  const startDay = Number(m[3]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDay = (y: number, mo: number) => new Date(y, mo + 1, 0).getDate();
  const startDate = new Date(startYear, startMonth, startDay);
  if (startDate > today) {
    const diff = Math.round((startDate.getTime() - today.getTime()) / 86400000);
    return { date: startDate, diffDays: diff };
  }
  let year = today.getFullYear();
  let month = today.getMonth();
  let payDay = Math.min(startDay, lastDay(year, month));
  let next = new Date(year, month, payDay);
  if (next < today) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    payDay = Math.min(startDay, lastDay(year, month));
    next = new Date(year, month, payDay);
  }
  const diff = Math.round((next.getTime() - today.getTime()) / 86400000);
  return { date: next, diffDays: diff };
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
    .from("suppressed_emails")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  if (suppressed) return { skipped: true, reason: "suppressed" };

  let unsubscribeToken: string;
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();
  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token as string;
  } else {
    unsubscribeToken = generateToken();
    await supabase.from("email_unsubscribe_tokens").upsert(
      { token: unsubscribeToken, email: normalized },
      { onConflict: "email", ignoreDuplicates: true }
    );
    const { data: stored } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalized)
      .maybeSingle();
    if (stored) unsubscribeToken = stored.token as string;
  }

  const messageId = crypto.randomUUID();
  const subject = interpolate(script.subject as string, data);
  const html = interpolate(script.body_html as string, data);
  const text = htmlToText(html);

  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: templateKey,
    recipient_email: recipient,
    status: "pending",
  });

  const { error } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
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

        // Optional body: { clientId?: string, template?: "payment_reminder_5d" | "payment_reminder_due" }
        let body: any = {};
        try { body = await request.json(); } catch {}
        const forceClientId: string | undefined = body?.clientId;
        const forceTemplate: string | undefined = body?.template;

        let query = supabase
          .from("clients")
          .select("id, company_name, contact_name, email, contract_start_date, monthly_recurring_revenue, contract_value, status");
        if (forceClientId) query = query.eq("id", forceClientId);
        else query = query.eq("status", "ativo");
        const { data: clients, error } = await query;
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const today = new Date();
        const todayKey = today.toISOString().slice(0, 10);
        const nowKey = today.toISOString().replace(/[:.]/g, "-");
        const results: any[] = [];

        for (const c of clients ?? []) {
          const next = c.contract_start_date ? computeNextPayment(c.contract_start_date) : null;
          let templateKey: string | null = null;
          if (forceClientId) {
            templateKey = forceTemplate || "payment_reminder_due";
          } else {
            if (!next) continue;
            const diff = next.diffDays;
            if (diff === 5) templateKey = "payment_reminder_5d";
            else if (diff === 0) templateKey = "payment_reminder_due";
          }
          if (!templateKey) continue;

          const amountNum = Number(c.monthly_recurring_revenue || c.contract_value || 0);
          const dueDate = next ? next.date.toLocaleDateString("pt-BR") : today.toLocaleDateString("pt-BR");
          const data = {
            contact_name: c.contact_name || c.company_name,
            company_name: c.company_name,
            due_date: dueDate,
            amount: brl(amountNum),
          };
          // TEST MODE: always send to fixed address.
          const recipient = TEST_RECIPIENT;
          const idempotencyKey = forceClientId
            ? `${templateKey}-${c.id}-force-${nowKey}`
            : `${templateKey}-${c.id}-${todayKey}`;
          const res = await enqueue(supabase, templateKey, recipient, data, idempotencyKey);
          results.push({ client: c.company_name, template: templateKey, ...res });
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to trigger" }),
    },
  },
});
