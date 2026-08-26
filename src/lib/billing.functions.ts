import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BillingSettingsInput = {
  enabled?: boolean;
  test_mode?: boolean;
  test_number?: string | null;
  director_group_jid?: string | null;
  director_group_name?: string | null;
  notify_directors?: boolean;
  rules?: { kind: "before" | "due" | "after"; days?: number }[];
};

async function assertManager(context: any) {
  const { supabase, userId } = context;
  const { data } = await supabase.rpc("is_admin_or_gestor", { _user_id: userId });
  if (!data) throw new Error("Apenas administradores ou gestores");
}

export const getBillingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertManager(context);
    const { getBillingConfig } = await import("@/lib/billing.server");
    const { getEvolutionConfig, checkEvolutionInstance } = await import("@/lib/whatsapp.server");
    const cfg = await getBillingConfig(context.supabase);
    const evo = await getEvolutionConfig(context.supabase);
    const instance = await checkEvolutionInstance(context.supabase);
    return { config: cfg, instance: { name: evo?.instance ?? null, ...instance } };
  });

export const saveBillingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: BillingSettingsInput) => input ?? {})
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const { saveBillingConfig } = await import("@/lib/billing.server");
    return await saveBillingConfig(context.supabase, data as any);
  });

export const listWhatsAppGroups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertManager(context);
    const { fetchWhatsAppGroups } = await import("@/lib/whatsapp.server");
    return await fetchWhatsAppGroups(context.supabase);
  });

/** Dados que serão usados na cobrança — para a tela de confirmação. */
export const previewBillingReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string }) => {
    if (!input?.clientId) throw new Error("clientId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const b = await import("@/lib/billing.server");
    const { data: client } = await context.supabase
      .from("clients")
      .select(b.CLIENT_BILLING_FIELDS)
      .eq("id", data.clientId)
      .maybeSingle();
    if (!client) throw new Error("Cliente não encontrado");

    const cfg = await b.getBillingConfig(context.supabase);
    const today = b.todayBR();
    const dues = b.candidateDueDates(client, today);
    const due = dues.find((d) => b.diffDays(d, today) >= 0) ?? dues[dues.length - 1];
    const ctx = await b.buildBillingContext(context.supabase, client, due);
    return {
      ...ctx,
      testMode: cfg.test_mode,
      testNumber: cfg.test_number,
      directorGroup: cfg.director_group_name ?? cfg.director_group_jid,
    };
  });

/** Envio manual — usa exatamente o mesmo serviço da automação. */
export const sendBillingReminderNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string; allowDuplicate?: boolean }) => {
    if (!input?.clientId) throw new Error("clientId obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const b = await import("@/lib/billing.server");
    const { data: client } = await context.supabase
      .from("clients")
      .select(b.CLIENT_BILLING_FIELDS)
      .eq("id", data.clientId)
      .maybeSingle();
    if (!client) throw new Error("Cliente não encontrado");

    const cfg = await b.getBillingConfig(context.supabase);
    const today = b.todayBR();
    const dues = b.candidateDueDates(client, today);
    const due = dues.find((d) => b.diffDays(d, today) >= 0) ?? dues[dues.length - 1];

    return await b.processBillingReminder(context.supabase, {
      client,
      dueDate: due,
      reminderType: data.allowDuplicate ? "MANUAL_RESEND" : "MANUAL",
      cfg,
      source: data.allowDuplicate ? "manual_resend" : "manual",
      userId: context.userId,
      allowDuplicate: Boolean(data.allowDuplicate),
    });
  });

/** Disparo de teste do template para o número/grupo de teste. */
export const sendBillingTestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { target: "number" | "group"; clientId?: string | null }) => input)
  .handler(async ({ data, context }) => {
    await assertManager(context);
    const b = await import("@/lib/billing.server");
    const { sendWhatsAppRawText, renderWhatsAppTemplate } = await import("@/lib/whatsapp.server");
    const cfg = await b.getBillingConfig(context.supabase);

    const to = data.target === "group" ? cfg.director_group_jid : cfg.test_number;
    if (!to) throw new Error(data.target === "group" ? "Grupo da diretoria não configurado" : "Número de teste não configurado");

    let message =
      "🧪 Teste do SCL — a Luna está conectada e pronta para enviar as cobranças automáticas.";
    if (data.clientId) {
      const { data: client } = await context.supabase
        .from("clients")
        .select(b.CLIENT_BILLING_FIELDS)
        .eq("id", data.clientId)
        .maybeSingle();
      if (client) {
        const today = b.todayBR();
        const dues = b.candidateDueDates(client, today);
        const due = dues.find((d) => b.diffDays(d, today) >= 0) ?? dues[0];
        const ctx = await b.buildBillingContext(context.supabase, client, due);
        const rendered = await renderWhatsAppTemplate(context.supabase, "wa_billing_reminder", {
          nome_cliente: client.contact_name || client.company_name,
          valor: b.brl(ctx.amount),
          vencimento: ctx.dueDate.split("-").reverse().join("/"),
          pix: ctx.pix ?? "(sem PIX configurado)",
          cnpj: ctx.cnpj ?? "",
          empresa_cobranca: ctx.entityName ?? "",
        });
        if (rendered) message = `🧪 *TESTE*\n\n${rendered}`;
      }
    }

    return await sendWhatsAppRawText(context.supabase, {
      to,
      message,
      templateName: "wa_billing_test",
      metadata: { kind: "test" },
    });
  });
