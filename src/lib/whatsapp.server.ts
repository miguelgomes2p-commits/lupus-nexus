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

export function getEvolutionConfig(): EvolutionConfig | null {
  const baseUrl = process.env["EVOLUTION_API_URL"];
  const apiKey = process.env["EVOLUTION_API_KEY"];
  const instance = process.env["EVOLUTION_INSTANCE"];
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
  return { ok: res.ok, status: res.status, body: parsed };
}

export type SendResult = {
  ok: boolean;
  skipped?: string;
  status?: number;
  error?: string;
  to?: string;
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
  const cfg = getEvolutionConfig();
  if (!cfg) return { ok: false, skipped: "evolution_not_configured" };

  const { data: script } = await supabase
    .from("email_scripts")
    .select("body_html, active")
    .eq("key", opts.templateKey)
    .maybeSingle();
  if (!script || !script.active) return { ok: false, skipped: "template_missing_or_inactive" };

  const target = normalizePhone(opts.phone);
  if (!target) return { ok: false, skipped: "invalid_phone" };

  const message = interpolate(String(script.body_html), opts.data);

  const { data: logRow } = await supabase
    .from("whatsapp_send_log")
    .insert({
      template_name: opts.templateKey,
      recipient_phone: target,
      client_id: opts.clientId ?? null,
      message,
      status: "pending",
      metadata: { ...(opts.metadata ?? {}), original_phone: opts.phone ?? null },
    })
    .select("id")
    .single();

  let attempt = await postEvolution(cfg, { number: target, text: message });
  if (!attempt.ok) {
    // Evolution API v1 usa outro formato de payload
    attempt = await postEvolution(cfg, { number: target, textMessage: { text: message } });
  }

  if (logRow?.id) {
    await supabase
      .from("whatsapp_send_log")
      .update({
        status: attempt.ok ? "sent" : "failed",
        error_message: attempt.ok ? null : `HTTP ${attempt.status}: ${JSON.stringify(attempt.body).slice(0, 500)}`,
        provider_response: attempt.body,
      })
      .eq("id", logRow.id);
  }

  return attempt.ok
    ? { ok: true, to: target, status: attempt.status }
    : { ok: false, to: target, status: attempt.status, error: JSON.stringify(attempt.body).slice(0, 500) };
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
  const cfg = getEvolutionConfig();
  if (!cfg) return { ok: false, skipped: "evolution_not_configured" };

  const target = normalizePhone(opts.phone);
  if (!target) return { ok: false, skipped: "invalid_phone" };

  const isImage = /\.(png|jpe?g|webp)$/i.test(opts.fileName);
  const mediatype = isImage ? "image" : "document";

  const { data: logRow } = await supabase
    .from("whatsapp_send_log")
    .insert({
      template_name: opts.templateName ?? "wa_media",
      recipient_phone: target,
      client_id: opts.clientId ?? null,
      message: opts.caption ?? opts.fileName,
      status: "pending",
      metadata: { ...(opts.metadata ?? {}), file_name: opts.fileName, kind: "media" },
    })
    .select("id")
    .single();

  // v2
  let attempt = await postEvolution(
    cfg,
    { number: target, mediatype, mimetype: isImage ? undefined : "application/pdf", media: opts.mediaUrl, fileName: opts.fileName, caption: opts.caption ?? "" },
    "sendMedia"
  );
  if (!attempt.ok) {
    // v1
    attempt = await postEvolution(
      cfg,
      { number: target, mediaMessage: { mediatype, fileName: opts.fileName, caption: opts.caption ?? "", media: opts.mediaUrl } },
      "sendMedia"
    );
  }

  if (logRow?.id) {
    await supabase
      .from("whatsapp_send_log")
      .update({
        status: attempt.ok ? "sent" : "failed",
        error_message: attempt.ok ? null : `HTTP ${attempt.status}: ${JSON.stringify(attempt.body).slice(0, 500)}`,
        provider_response: attempt.body,
      })
      .eq("id", logRow.id);
  }

  return attempt.ok
    ? { ok: true, to: target, status: attempt.status }
    : { ok: false, to: target, status: attempt.status, error: JSON.stringify(attempt.body).slice(0, 500) };
}
