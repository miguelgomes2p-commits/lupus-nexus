/**
 * Integração WhatsApp — Evolution API.
 * Server-only. Nunca importar em código de cliente.
 */

export function interpolate(str: string, data: Record<string, any>): string {
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = data?.[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

/** Normaliza para o formato E.164 sem "+" esperado pela Evolution (ex: 5511999999999). */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length <= 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 15) return null;
  return digits;
}

type EvolutionConfig = {
  baseUrl: string;
  apiKey: string;
  instance: string;
};

export const EVOLUTION_SETTINGS_KEY = "secret_evolution_api";

/**
 * Configuração da Evolution API. Prioriza o que foi salvo manualmente em
 * Configurações → WhatsApp (tabela settings) e cai para as variáveis de ambiente.
 */
export async function getEvolutionConfig(supabase?: any): Promise<EvolutionConfig | null> {
  let baseUrl = process.env["EVOLUTION_API_URL"];
  let apiKey = process.env["EVOLUTION_API_KEY"];
  let instance = process.env["EVOLUTION_INSTANCE"];

  if (supabase) {
    try {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", EVOLUTION_SETTINGS_KEY)
        .maybeSingle();
      const v = data?.value as any;
      if (v?.base_url) baseUrl = v.base_url;
      if (v?.api_key) apiKey = v.api_key;
      if (v?.instance) instance = v.instance;
    } catch {
      // mantém env
    }
  }

  if (!baseUrl || !apiKey || !instance) return null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    instance,
  };
}


async function postEvolution(cfg: EvolutionConfig, body: any, endpoint = "sendText") {
  const res = await fetch(`${cfg.baseUrl}/message/${endpoint}/${encodeURIComponent(cfg.instance)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: cfg.apiKey },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (res.status === 404) {
    parsed = { hint: `Instância "${cfg.instance}" não encontrada na Evolution API (EVOLUTION_INSTANCE inválida)`, response: parsed };
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

type ResolvedRecipient = {
  ok: boolean;
  number?: string;
  jid?: string;
  status?: number;
  error?: string;
};

/**
 * Confirma o cadastro do número no WhatsApp antes do envio. Além de impedir
 * falsos positivos, usa o número canônico devolvido pelo próprio WhatsApp
 * (importante para números brasileiros afetados pela regra do nono dígito).
 */
async function resolveWhatsAppRecipient(cfg: EvolutionConfig, target: string): Promise<ResolvedRecipient> {
  try {
    const res = await fetch(
      `${cfg.baseUrl}/chat/whatsappNumbers/${encodeURIComponent(cfg.instance)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: cfg.apiKey },
        body: JSON.stringify({ numbers: [target] }),
      },
    );
    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    if (!res.ok) {
      return { ok: false, status: res.status, error: JSON.stringify(body).slice(0, 500) };
    }

    const entry = Array.isArray(body) ? body[0] : body?.data?.[0];
    if (!entry?.exists || !entry?.jid) {
      return { ok: false, status: res.status, error: "number_not_registered_on_whatsapp" };
    }

    const canonical = String(entry.number ?? entry.jid).split("@")[0].replace(/\D/g, "");
    if (!canonical) return { ok: false, status: res.status, error: "invalid_recipient_jid" };
    return { ok: true, number: canonical, jid: String(entry.jid), status: res.status };
  } catch (error: any) {
    return { ok: false, error: `recipient_check_failed: ${error?.message ?? "erro"}` };
  }
}

function acceptedMessage(attempt: { ok: boolean; body: any }) {
  if (!attempt.ok) return false;
  const providerError = attempt.body?.error ?? attempt.body?.response?.message;
  if (providerError) return false;
  return Boolean(attempt.body?.key?.id && attempt.body?.key?.remoteJid);
}

/** Diagnóstico: confere se a instância configurada existe e está conectada. */
export async function checkEvolutionInstance(supabase?: any, cfgIn?: EvolutionConfig | null): Promise<{ ok: boolean; reason?: string; instance?: string; state?: string; available?: string[] }> {
  const cfg = cfgIn ?? (await getEvolutionConfig(supabase));
  if (!cfg) return { ok: false, reason: "evolution_not_configured" };
  try {
    const res = await fetch(`${cfg.baseUrl}/instance/fetchInstances`, { headers: { apikey: cfg.apiKey } });
    const list: any[] = await res.json();
    const found = (list ?? []).find((i) => i?.name === cfg.instance || i?.instance?.instanceName === cfg.instance);
    if (!found) {
      return {
        ok: false,
        reason: "instance_not_found",
        instance: cfg.instance,
        available: (list ?? []).map((i) => i?.name ?? i?.instance?.instanceName).filter(Boolean),
      };
    }
    const state = found.connectionStatus ?? found?.instance?.status;
    return { ok: state === "open", reason: state === "open" ? undefined : "instance_disconnected", instance: cfg.instance, state };
  } catch (e: any) {
    return { ok: false, reason: `check_failed: ${e?.message ?? "erro"}` };
  }
}

export type SendResult = {
  ok: boolean;
  skipped?: string;
  status?: number;
  error?: string;
  to?: string;
  jid?: string;
  messageId?: string;
  deliveryStatus?: string;
};

/**
 * Envia uma mensagem de WhatsApp usando um script cadastrado (tabela email_scripts,
 * categoria "whatsapp") e registra em whatsapp_send_log.
 */
export async function sendWhatsAppTemplate(
  supabase: any,
  opts: {
    templateKey: string;
    phone: string | null | undefined;
    data: Record<string, any>;
    clientId?: string | null;
    metadata?: Record<string, any>;
  }
): Promise<SendResult> {
  const cfg = await getEvolutionConfig(supabase);
  if (!cfg) return { ok: false, skipped: "evolution_not_configured" };

  const instance = await checkEvolutionInstance(supabase, cfg);
  if (!instance.ok) {
    return {
      ok: false,
      skipped: instance.reason ?? "instance_unavailable",
      error: instance.state ? `Instância da Luna desconectada (${instance.state})` : instance.reason,
    };
  }

  const { data: script } = await supabase
    .from("email_scripts")
    .select("body_html, active")
    .eq("key", opts.templateKey)
    .maybeSingle();
  if (!script || !script.active) return { ok: false, skipped: "template_missing_or_inactive" };

  const target = normalizePhone(opts.phone);
  if (!target) return { ok: false, skipped: "invalid_phone" };

  const recipient = await resolveWhatsAppRecipient(cfg, target);
  if (!recipient.ok || !recipient.number) {
    return { ok: false, to: target, status: recipient.status, error: recipient.error ?? "recipient_not_found" };
  }

  const message = interpolate(String(script.body_html), opts.data);

  const { data: logRow } = await supabase
    .from("whatsapp_send_log")
    .insert({
      template_name: opts.templateKey,
      recipient_phone: recipient.number,
      client_id: opts.clientId ?? null,
      message,
      status: "pending",
      metadata: { ...(opts.metadata ?? {}), original_phone: opts.phone ?? null, recipient_jid: recipient.jid },
    })
    .select("id")
    .single();

  let attempt = await postEvolution(cfg, { number: recipient.number, text: message });
  if (!acceptedMessage(attempt)) {
    // Evolution API v1 usa outro formato de payload
    attempt = await postEvolution(cfg, { number: recipient.number, textMessage: { text: message } });
  }

  const accepted = acceptedMessage(attempt);
  const messageId = attempt.body?.key?.id;
  const remoteJid = attempt.body?.key?.remoteJid ?? recipient.jid;
  const deliveryStatus = attempt.body?.status;

  if (logRow?.id) {
    await supabase
      .from("whatsapp_send_log")
      .update({
        status: accepted ? "sent" : "failed",
        error_message: accepted ? null : `HTTP ${attempt.status}: ${JSON.stringify(attempt.body).slice(0, 500)}`,
        provider_response: attempt.body,
      })
      .eq("id", logRow.id);
  }

  return accepted
    ? { ok: true, to: recipient.number, jid: remoteJid, messageId, deliveryStatus, status: attempt.status }
    : { ok: false, to: recipient.number, jid: remoteJid, status: attempt.status, error: JSON.stringify(attempt.body).slice(0, 500) };
}

/**
 * Verifica se o cliente pode receber mensagens automáticas:
 * precisa estar ativo, com automação ligada e com WhatsApp válido.
 */
export function whatsappGate(client: any): { allowed: boolean; reason?: string; phone?: string } {
  if (!client) return { allowed: false, reason: "client_not_found" };
  if (client.status !== "ativo") return { allowed: false, reason: "client_inactive" };
  if (!client.whatsapp_automation) return { allowed: false, reason: "automation_disabled" };
  const phone = normalizePhone(client.whatsapp);
  if (!phone) return { allowed: false, reason: "invalid_phone" };
  return { allowed: true, phone };
}

/** Envia um documento/imagem (ex.: NFE) por WhatsApp e registra no log. */
export async function sendWhatsAppMedia(
  supabase: any,
  opts: {
    phone: string | null | undefined;
    mediaUrl: string;
    fileName: string;
    caption?: string;
    clientId?: string | null;
    templateName?: string;
    metadata?: Record<string, any>;
  }
): Promise<SendResult> {
  const cfg = await getEvolutionConfig(supabase);
  if (!cfg) return { ok: false, skipped: "evolution_not_configured" };

  const instance = await checkEvolutionInstance(supabase, cfg);
  if (!instance.ok) {
    return {
      ok: false,
      skipped: instance.reason ?? "instance_unavailable",
      error: instance.state ? `Instância da Luna desconectada (${instance.state})` : instance.reason,
    };
  }

  const isGroup = (opts.phone ?? "").endsWith("@g.us");
  const target = isGroup ? String(opts.phone) : normalizePhone(opts.phone);
  if (!target) return { ok: false, skipped: "invalid_phone" };

  let sendTo = target;
  if (!isGroup) {
    const recipient = await resolveWhatsAppRecipient(cfg, target);
    if (!recipient.ok || !recipient.number) {
      return { ok: false, to: target, status: recipient.status, error: recipient.error ?? "recipient_not_found" };
    }
    sendTo = recipient.number;
  }


  const isImage = /\.(png|jpe?g|webp)$/i.test(opts.fileName);
  const mediatype = isImage ? "image" : "document";

  const { data: logRow } = await supabase
    .from("whatsapp_send_log")
    .insert({
      template_name: opts.templateName ?? "wa_media",
      recipient_phone: recipient.number,
      client_id: opts.clientId ?? null,
      message: opts.caption ?? opts.fileName,
      status: "pending",
      metadata: { ...(opts.metadata ?? {}), file_name: opts.fileName, kind: "media", recipient_jid: recipient.jid },
    })
    .select("id")
    .single();

  // v2
  let attempt = await postEvolution(
    cfg,
    { number: recipient.number, mediatype, mimetype: isImage ? undefined : "application/pdf", media: opts.mediaUrl, fileName: opts.fileName, caption: opts.caption ?? "" },
    "sendMedia"
  );
  if (!acceptedMessage(attempt)) {
    // v1
    attempt = await postEvolution(
      cfg,
      { number: recipient.number, mediaMessage: { mediatype, fileName: opts.fileName, caption: opts.caption ?? "", media: opts.mediaUrl } },
      "sendMedia"
    );
  }

  const accepted = acceptedMessage(attempt);
  const messageId = attempt.body?.key?.id;
  const remoteJid = attempt.body?.key?.remoteJid ?? recipient.jid;
  const deliveryStatus = attempt.body?.status;

  if (logRow?.id) {
    await supabase
      .from("whatsapp_send_log")
      .update({
        status: accepted ? "sent" : "failed",
        error_message: accepted ? null : `HTTP ${attempt.status}: ${JSON.stringify(attempt.body).slice(0, 500)}`,
        provider_response: attempt.body,
      })
      .eq("id", logRow.id);
  }

  return accepted
    ? { ok: true, to: recipient.number, jid: remoteJid, messageId, deliveryStatus, status: attempt.status }
    : { ok: false, to: recipient.number, jid: remoteJid, status: attempt.status, error: JSON.stringify(attempt.body).slice(0, 500) };
}

/**
 * Lista os grupos em que a instância da Luna participa (Evolution v2).
 * Usado apenas na configuração — o envio sempre usa o JID salvo.
 */
export async function fetchWhatsAppGroups(
  supabase?: any,
): Promise<{ ok: boolean; reason?: string; groups: { id: string; subject: string; size?: number }[] }> {
  const cfg = await getEvolutionConfig(supabase);
  if (!cfg) return { ok: false, reason: "evolution_not_configured", groups: [] };
  try {
    const res = await fetch(
      `${cfg.baseUrl}/group/fetchAllGroups/${encodeURIComponent(cfg.instance)}?getParticipants=false`,
      { headers: { apikey: cfg.apiKey } },
    );
    const text = await res.text();
    let body: any = null;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}: ${String(text).slice(0, 200)}`, groups: [] };
    const list: any[] = Array.isArray(body) ? body : (body?.data ?? body?.groups ?? []);
    const groups = (list ?? [])
      .map((g: any) => ({ id: String(g?.id ?? g?.jid ?? ""), subject: String(g?.subject ?? g?.name ?? "Grupo"), size: g?.size ?? g?.participants?.length }))
      .filter((g) => g.id.endsWith("@g.us"));
    return { ok: true, groups };
  } catch (e: any) {
    return { ok: false, reason: `fetch_failed: ${e?.message ?? "erro"}`, groups: [] };
  }
}

/**
 * Envia texto já renderizado para um destino cru (número normalizado ou JID de grupo).
 * Camada única de envio — reutiliza a mesma instância/credenciais da Luna.
 */
export async function sendWhatsAppRawText(
  supabase: any,
  opts: {
    to: string;
    message: string;
    templateName?: string;
    clientId?: string | null;
    metadata?: Record<string, any>;
  },
): Promise<SendResult> {
  const cfg = await getEvolutionConfig(supabase);
  if (!cfg) return { ok: false, skipped: "evolution_not_configured" };

  const isGroup = opts.to.endsWith("@g.us");
  let target = opts.to;
  let jid: string | undefined = isGroup ? opts.to : undefined;

  if (!isGroup) {
    const normalized = normalizePhone(opts.to);
    if (!normalized) return { ok: false, skipped: "invalid_phone" };
    const recipient = await resolveWhatsAppRecipient(cfg, normalized);
    if (!recipient.ok || !recipient.number) {
      return { ok: false, to: normalized, status: recipient.status, error: recipient.error ?? "recipient_not_found" };
    }
    target = recipient.number;
    jid = recipient.jid;
  }

  const { data: logRow } = await supabase
    .from("whatsapp_send_log")
    .insert({
      template_name: opts.templateName ?? "wa_raw_text",
      recipient_phone: target,
      client_id: opts.clientId ?? null,
      message: opts.message,
      status: "pending",
      metadata: { ...(opts.metadata ?? {}), recipient_jid: jid, is_group: isGroup },
    })
    .select("id")
    .single();

  let attempt = await postEvolution(cfg, { number: target, text: opts.message });
  if (!acceptedMessage(attempt)) {
    attempt = await postEvolution(cfg, { number: target, textMessage: { text: opts.message } });
  }

  const accepted = acceptedMessage(attempt);
  if (logRow?.id) {
    await supabase
      .from("whatsapp_send_log")
      .update({
        status: accepted ? "sent" : "failed",
        error_message: accepted ? null : `HTTP ${attempt.status}: ${JSON.stringify(attempt.body).slice(0, 500)}`,
        provider_response: attempt.body,
      })
      .eq("id", logRow.id);
  }

  return accepted
    ? { ok: true, to: target, jid: attempt.body?.key?.remoteJid ?? jid, messageId: attempt.body?.key?.id, status: attempt.status }
    : { ok: false, to: target, jid, status: attempt.status, error: JSON.stringify(attempt.body).slice(0, 500) };
}

/** Busca um template de mensagem cadastrado (email_scripts) e interpola as variáveis. */
export async function renderWhatsAppTemplate(
  supabase: any,
  key: string,
  data: Record<string, any>,
): Promise<string | null> {
  const { data: script } = await supabase
    .from("email_scripts")
    .select("body_html, active")
    .eq("key", key)
    .maybeSingle();
  if (!script || !script.active) return null;
  return interpolate(String(script.body_html), data);
}
