import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SendWhatsAppInput = {
  templateKey: string;
  phone?: string | null;
  clientId?: string | null;
  data?: Record<string, any>;
};

export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SendWhatsAppInput) => {
    if (!input?.templateKey) throw new Error("templateKey obrigatório");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWhatsAppTemplate } = await import("@/lib/whatsapp.server");

    let phone = data.phone ?? null;
    let clientData: Record<string, any> = {};
    if (data.clientId) {
      const { data: client } = await supabaseAdmin
        .from("clients")
        .select("id, company_name, contact_name, whatsapp, phone, contract_value, contract_start_date")
        .eq("id", data.clientId)
        .maybeSingle();
      if (client) {
        phone = phone ?? (client as any).whatsapp ?? (client as any).phone ?? null;
        clientData = {
          contact_name: (client as any).contact_name || (client as any).company_name || "",
          company_name: (client as any).company_name || "",
        };
      }
    }

    return await sendWhatsAppTemplate(supabaseAdmin, {
      templateKey: data.templateKey,
      phone,
      clientId: data.clientId ?? null,
      data: { ...clientData, ...(data.data ?? {}) },
      metadata: { trigger: "manual" },
    });
  });
