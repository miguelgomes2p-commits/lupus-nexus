import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppTemplate, whatsappGate } from "@/lib/whatsapp.server";

function brl(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const Route = createFileRoute("/api/public/hooks/whatsapp-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = process.env["SUPABASE_URL"] ?? import.meta.env.VITE_SUPABASE_URL;
        const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !key) return Response.json({ error: "config" }, { status: 500 });
        const supabase = createClient(url, key);

        let body: any = {};
        try { body = await request.json(); } catch {}
        const forceInvoiceId: string | undefined = body?.invoiceId;
        const force: boolean = body?.force === true;
        const forceTemplate: string | undefined = body?.template;

        let query = supabase
          .from("client_invoices")
          .select("id, client_id, reference_month, due_date, amount, status, clients:client_id(id, company_name, contact_name, whatsapp, phone, status, whatsapp_automation)")
          .eq("status", "pendente_nfe");
        if (forceInvoiceId) query = query.eq("id", forceInvoiceId);
        const { data: invoices, error } = await query;
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const results: any[] = [];

        for (const inv of invoices ?? []) {
          const client = (inv as any).clients;
          const due = new Date(`${inv.due_date}T00:00:00`);
          const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

          let templateKey: string | null = null;
          if (forceInvoiceId) {
            templateKey = forceTemplate || (diff <= 0 ? "wa_payment_reminder_due" : "wa_payment_reminder_5d");
          } else if (diff === 5) {
            templateKey = "wa_payment_reminder_5d";
          } else if (diff === 0) {
            templateKey = "wa_payment_reminder_due";
          }
          if (!templateKey) continue;

          // Só clientes ativos com automação de WhatsApp habilitada
          const gate = whatsappGate(client);
          if (!gate.allowed && !(force && client?.whatsapp)) {
            results.push({ invoice: inv.id, client: client?.company_name, ok: false, skipped: gate.reason });
            continue;
          }

          const res = await sendWhatsAppTemplate(supabase, {
            templateKey,
            phone: gate.phone ?? client?.whatsapp,
            clientId: client?.id ?? inv.client_id,
            data: {
              contact_name: client?.contact_name || client?.company_name || "",
              company_name: client?.company_name || "",
              due_date: due.toLocaleDateString("pt-BR"),
              amount: brl(Number(inv.amount)),
              reference_month: inv.reference_month,
            },
            metadata: { invoice_id: inv.id, trigger: forceInvoiceId ? "manual" : "cron" },
          });
          results.push({ invoice: inv.id, client: client?.company_name, template: templateKey, ...res });
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to trigger" }),
    },
  },
});
