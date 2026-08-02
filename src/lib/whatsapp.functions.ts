import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SendWhatsAppInput = {
  templateKey: string;
  clientId?: string | null;
  /** Ignora o gate de automação/status (uso em disparos manuais pelo painel) */
  force?: boolean;
  data?: Record<string, any>;
};

export type SendWhatsAppNfeInput = {
  clientId: string;
  filePath: string;
  fileName: string;
  invoiceId?: string | null;
  caption?: string;
  force?: boolean;
};

export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SendWhatsAppInput) => {
    if (!input?.templateKey) throw new Error("templateKey obrigatório");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWhatsAppTemplate, whatsappGate, normalizePhone } = await import("@/lib/whatsapp.server");
    const clientFields = "id, company_name, contact_name, whatsapp, phone, status, whatsapp_automation";

    if (!data.clientId) return { ok: false, skipped: "client_required" };

    const { data: client } = await supabaseAdmin
      .from("clients")
      .select(clientFields)
      .eq("id", data.clientId)
      .maybeSingle();

    const gate = whatsappGate(client);
    const phone = gate.phone ?? normalizePhone((client as any)?.whatsapp);
    if (!gate.allowed && !(data.force && phone)) {
      return { ok: false, skipped: gate.reason };
    }

    return await sendWhatsAppTemplate(supabaseAdmin, {
      templateKey: data.templateKey,
      phone,
      clientId: data.clientId,
      data: {
        contact_name: (client as any)?.contact_name || (client as any)?.company_name || "",
        company_name: (client as any)?.company_name || "",
        ...(data.data ?? {}),
      },
      metadata: { trigger: "manual" },
    });
  });

/** Envia o arquivo da NFE por WhatsApp para o cliente. */
export const sendWhatsAppNfe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SendWhatsAppNfeInput) => {
    if (!input?.clientId || !input?.filePath) throw new Error("clientId e filePath obrigatórios");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWhatsAppMedia, whatsappGate, normalizePhone } = await import("@/lib/whatsapp.server");
    const clientFields = "id, company_name, contact_name, whatsapp, phone, status, whatsapp_automation";

    const { data: client } = await supabaseAdmin
      .from("clients")
      .select(clientFields)
      .eq("id", data.clientId)
      .maybeSingle();

    const gate = whatsappGate(client);
    const phone = gate.phone ?? normalizePhone((client as any)?.whatsapp);
    if (!gate.allowed && !(data.force && phone)) {
      return { ok: false, skipped: gate.reason };
    }

    const signed = await supabaseAdmin.storage
      .from("client-documents")
      .createSignedUrl(data.filePath, 60 * 60 * 24 * 7);
    const url = signed.data?.signedUrl;
    if (!url) return { ok: false, skipped: "signed_url_failed" };

    return await sendWhatsAppMedia(supabaseAdmin, {
      phone,
      mediaUrl: url,
      fileName: data.fileName,
      caption:
        data.caption ??
        `Olá, ${(client as any)?.contact_name || (client as any)?.company_name}! Segue a nota fiscal referente ao seu contrato com a Lupus Assessoria.`,
      clientId: data.clientId,
      templateName: "wa_nfe_attached",
      metadata: { invoice_id: data.invoiceId ?? null, trigger: "nfe_upload" },
    });
  });
