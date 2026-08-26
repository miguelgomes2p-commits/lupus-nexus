/**
 * Serviço único de cobranças por WhatsApp (Luna / Evolution API).
 * Server-only. Nunca importar em código de cliente.
 */
import {
  normalizePhone,
  renderWhatsAppTemplate,
  sendWhatsAppRawText,
  checkEvolutionInstance,
} from "@/lib/whatsapp.server";

export const BILLING_SETTINGS_KEY = "billing_reminders_config";

export type ReminderRule = { kind: "before" | "due" | "after"; days?: number };

export type BillingConfig = {
  enabled: boolean;
  test_mode: boolean;
  test_number: string | null;
  director_group_jid: string | null;
  director_group_name: string | null;
  notify_directors: boolean;
  rules: ReminderRule[];
};

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  enabled: false,
  test_mode: true,
  test_number: null,
  director_group_jid: null,
  director_group_name: null,
  notify_directors: true,
  rules: [{ kind: "before", days: 3 }, { kind: "due" }, { kind: "after", days: 3 }],
};

export async function getBillingConfig(supabase: any): Promise<BillingConfig> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", BILLING_SETTINGS_KEY)
    .maybeSingle();
  const v = (data?.value ?? {}) as Partial<BillingConfig>;
  return {
    ...DEFAULT_BILLING_CONFIG,
    ...v,
    rules: Array.isArray(v.rules) && v.rules.length ? v.rules : DEFAULT_BILLING_CONFIG.rules,
  };
}

export async function saveBillingConfig(supabase: any, patch: Partial<BillingConfig>) {
  const current = await getBillingConfig(supabase);
  const value = { ...current, ...patch };
  const { error } = await supabase
    .from("settings")
    .upsert({ key: BILLING_SETTINGS_KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  return value;
}

export function ruleId(rule: ReminderRule): string {
  if (rule.kind === "due") return "DUE";
  return `${rule.kind === "before" ? "BEFORE" : "AFTER"}_${rule.days ?? 0}`;
}

export function ruleLabel(id: string): string {
  if (id === "DUE") return "No vencimento";
  if (id.startsWith("BEFORE_")) return `${id.split("_")[1]} dia(s) antes`;
  if (id.startsWith("AFTER_")) return `${id.split("_")[1]} dia(s) depois`;
  if (id === "MANUAL") return "Envio manual";
  return id;
}

export function brl(n: number) {
  return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ptDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Hoje em horário de Brasília (a rotina roda em UTC). */
export function todayBR(): Date {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function monthDue(base: Date, offsetMonths: number, day: number): string {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth() + offsetMonths;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return toISODate(new Date(Date.UTC(y, m, Math.min(day, last))));
}

export function diffDays(dueISO: string, today: Date) {
  const due = new Date(`${dueISO}T00:00:00Z`).getTime();
  return Math.round((due - today.getTime()) / 86400000);
}

export const CLIENT_BILLING_FIELDS =
  "id, company_name, contact_name, whatsapp, phone, email, status, whatsapp_automation, monthly_recurring_revenue, contract_value, contract_start_date, billing_entity_id, pix_key";

export type BillingContext = {
  ok: boolean;
  skip?: string;
  clientId: string;
  clientName: string;
  whatsapp?: string | null;
  amount: number;
  dueDate: string;
  competencia: string;
  pix?: string | null;
  cnpj?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  invoiceId?: string | null;
};

/** Datas de vencimento candidatas para o cliente (mês anterior, atual e próximo). */
export function candidateDueDates(client: any, today = todayBR()): string[] {
  const start = client?.contract_start_date ? new Date(`${client.contract_start_date}T00:00:00Z`) : null;
  const day = start ? start.getUTCDate() : 10;
  return [-1, 0, 1].map((o) => monthDue(today, o, day));
}

/**
 * Monta o contexto de cobrança de um cliente para um vencimento específico,
 * validando todas as condições exigidas antes de qualquer envio.
 */
export async function buildBillingContext(
  supabase: any,
  client: any,
  dueDate: string,
): Promise<BillingContext> {
  const competencia = `${dueDate.slice(0, 7)}-01`;
  const base: BillingContext = {
    ok: false,
    clientId: client.id,
    clientName: client.company_name,
    whatsapp: client.whatsapp,
    amount: 0,
    dueDate,
    competencia,
  };

  if (client.status !== "ativo") return { ...base, skip: "SKIPPED_CLIENT_INACTIVE" };
  if (!client.whatsapp_automation) return { ...base, skip: "SKIPPED_REMINDER_DISABLED" };

  const phone = normalizePhone(client.whatsapp);
  if (!phone) return { ...base, skip: "SKIPPED_MISSING_WHATSAPP" };

  let entity: any = null;
  if (client.billing_entity_id) {
    const { data } = await supabase
      .from("billing_entities")
      .select("id, name, cnpj, pix_key, is_active")
      .eq("id", client.billing_entity_id)
      .maybeSingle();
    entity = data;
  }
  if (!entity || entity.is_active === false) return { ...base, skip: "SKIPPED_MISSING_BILLING_ENTITY" };

  const pix = (client.pix_key || entity.pix_key || "").trim();
  if (!pix) return { ...base, skip: "SKIPPED_MISSING_PIX" };

  const { data: invoice } = await supabase
    .from("client_invoices")
    .select("id, amount, due_date, status")
    .eq("client_id", client.id)
    .eq("reference_month", competencia)
    .maybeSingle();

  const amount = Number(invoice?.amount ?? client.monthly_recurring_revenue ?? client.contract_value ?? 0);
  if (!amount || amount <= 0) return { ...base, skip: "SKIPPED_MISSING_AMOUNT" };

  return {
    ...base,
    ok: true,
    whatsapp: phone,
    amount,
    dueDate: invoice?.due_date ?? dueDate,
    pix,
    cnpj: entity.cnpj,
    entityId: entity.id,
    entityName: entity.name,
    invoiceId: invoice?.id ?? null,
  };
}

export function idempotencyKey(ctx: { clientId: string; competencia: string; dueDate: string }, type: string) {
  return `${ctx.clientId}_${ctx.competencia.slice(0, 7)}_${ctx.dueDate}_${type}`;
}

async function notifyDirectors(
  supabase: any,
  cfg: BillingConfig,
  templateKey: string,
  data: Record<string, any>,
): Promise<string | null> {
  if (!cfg.notify_directors) return null;
  const target = cfg.test_mode && cfg.test_number && !cfg.director_group_jid ? cfg.test_number : cfg.director_group_jid;
  if (!target) return null;
  const message = await renderWhatsAppTemplate(supabase, templateKey, data);
  if (!message) return null;
  const res = await sendWhatsAppRawText(supabase, {
    to: target,
    message,
    templateName: templateKey,
    metadata: { kind: "director_notification" },
  });
  return res.messageId ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ProcessResult = {
  client: string;
  status: "sent" | "failed" | "skipped" | "duplicate";
  reason?: string;
  reminderType: string;
  messageId?: string | null;
};

/**
 * Pipeline completo de uma cobrança: valida → template → idempotência →
 * log processing → envio pela Luna → atualiza log → avisa a diretoria.
 */
export async function processBillingReminder(
  supabase: any,
  opts: {
    client: any;
    dueDate: string;
    reminderType: string;
    cfg: BillingConfig;
    source: "cron" | "manual" | "manual_resend" | "test";
    userId?: string | null;
    allowDuplicate?: boolean;
  },
): Promise<ProcessResult> {
  const { client, dueDate, reminderType, cfg } = opts;
  const ctx = await buildBillingContext(supabase, client, dueDate);
  const isTest = cfg.test_mode || opts.source === "test";

  if (!ctx.ok) {
    await supabase.from("billing_reminders").insert({
      client_id: ctx.clientId,
      competencia: ctx.competencia,
      due_date: ctx.dueDate,
      amount: ctx.amount,
      reminder_type: reminderType,
      whatsapp: client.whatsapp,
      status: "skipped",
      skip_reason: ctx.skip,
      idempotency_key: `${idempotencyKey(ctx, reminderType)}_SKIP_${Date.now()}`,
      is_test: isTest,
      trigger_source: opts.source,
      triggered_by: opts.userId ?? null,
    });
    return { client: ctx.clientName, status: "skipped", reason: ctx.skip, reminderType };
  }

  const key = opts.allowDuplicate
    ? `${idempotencyKey(ctx, reminderType)}_${Date.now()}`
    : idempotencyKey(ctx, reminderType);

  // Idempotência: já houve um envio bem-sucedido para essa chave?
  if (!opts.allowDuplicate) {
    const { data: existing } = await supabase
      .from("billing_reminders")
      .select("id, status")
      .eq("idempotency_key", key)
      .maybeSingle();
    if (existing && ["sent", "processing"].includes(existing.status)) {
      return { client: ctx.clientName, status: "duplicate", reason: "already_sent", reminderType };
    }
    if (existing) await supabase.from("billing_reminders").delete().eq("id", existing.id);
  }

  const message = await renderWhatsAppTemplate(supabase, "wa_billing_reminder", {
    nome_cliente: client.contact_name || client.company_name,
    valor: brl(ctx.amount),
    vencimento: ptDate(ctx.dueDate),
    pix: ctx.pix,
    cnpj: ctx.cnpj ?? "",
    empresa_cobranca: ctx.entityName ?? "",
  });
  if (!message) {
    return { client: ctx.clientName, status: "skipped", reason: "SKIPPED_TEMPLATE_INACTIVE", reminderType };
  }

  const destination = isTest ? normalizePhone(cfg.test_number) : ctx.whatsapp!;
  if (!destination) {
    return { client: ctx.clientName, status: "skipped", reason: "SKIPPED_TEST_NUMBER_MISSING", reminderType };
  }

  // Reserva a chave (protege contra execução dupla do scheduler e duplo clique)
  const { data: row, error: insertError } = await supabase
    .from("billing_reminders")
    .insert({
      client_id: ctx.clientId,
      invoice_id: ctx.invoiceId,
      competencia: ctx.competencia,
      due_date: ctx.dueDate,
      amount: ctx.amount,
      reminder_type: reminderType,
      billing_entity_id: ctx.entityId,
      cnpj: ctx.cnpj,
      pix_key: ctx.pix,
      whatsapp: destination,
      message,
      status: "processing",
      idempotency_key: key,
      is_test: isTest,
      trigger_source: opts.source,
      triggered_by: opts.userId ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    return { client: ctx.clientName, status: "duplicate", reason: "idempotency_conflict", reminderType };
  }

  let attempts = 0;
  let last: any = null;
  while (attempts < 3) {
    attempts++;
    last = await sendWhatsAppRawText(supabase, {
      to: destination,
      message,
      templateName: "wa_billing_reminder",
      clientId: ctx.clientId,
      metadata: { reminder_type: reminderType, billing_reminder_id: row.id, is_test: isTest },
    });
    if (last.ok) break;
    if (last.skipped) break; // erro de configuração: não adianta repetir
    if (attempts < 3) await sleep(1500);
  }

  const okSend = Boolean(last?.ok);
  const directorMsg = await notifyDirectors(
    supabase,
    cfg,
    okSend ? "wa_billing_director_ok" : "wa_billing_director_fail",
    {
      cliente: ctx.clientName,
      whatsapp: destination,
      valor: brl(ctx.amount),
      vencimento: ptDate(ctx.dueDate),
      cnpj: ctx.cnpj ?? "",
      data_hora: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      erro: last?.error ?? last?.skipped ?? "desconhecido",
    },
  );

  await supabase
    .from("billing_reminders")
    .update({
      status: okSend ? "sent" : "failed",
      attempts,
      provider_message_id: last?.messageId ?? null,
      provider_response: last ?? null,
      error_message: okSend ? null : (last?.error ?? last?.skipped ?? "erro desconhecido"),
      director_notified: Boolean(directorMsg),
      director_message_id: directorMsg,
    })
    .eq("id", row.id);

  return {
    client: ctx.clientName,
    status: okSend ? "sent" : "failed",
    reason: okSend ? undefined : (last?.error ?? last?.skipped),
    reminderType,
    messageId: last?.messageId ?? null,
  };
}

/** Execução diária: percorre clientes e dispara as regras configuradas. */
export async function runBillingReminders(
  supabase: any,
  opts: { clientId?: string | null; force?: boolean } = {},
) {
  const cfg = await getBillingConfig(supabase);
  if (!cfg.enabled && !opts.force) return { ok: false, skipped: "automation_disabled", results: [] };

  const instance = await checkEvolutionInstance(supabase);
  if (!instance.ok) return { ok: false, skipped: instance.reason, results: [] };

  let q = supabase.from("clients").select(CLIENT_BILLING_FIELDS).eq("status", "ativo");
  if (opts.clientId) q = q.eq("id", opts.clientId);
  const { data: clients, error } = await q;
  if (error) throw new Error(error.message);

  const today = todayBR();
  const results: ProcessResult[] = [];

  for (const client of clients ?? []) {
    if (!client.whatsapp_automation) continue;
    for (const due of candidateDueDates(client, today)) {
      const diff = diffDays(due, today);
      const rule = cfg.rules.find((r) =>
        r.kind === "due" ? diff === 0 : r.kind === "before" ? diff === (r.days ?? 0) : diff === -(r.days ?? 0),
      );
      if (!rule) continue;
      const res = await processBillingReminder(supabase, {
        client,
        dueDate: due,
        reminderType: ruleId(rule),
        cfg,
        source: "cron",
      });
      results.push(res);
    }
  }

  return { ok: true, processed: results.length, results };
}
