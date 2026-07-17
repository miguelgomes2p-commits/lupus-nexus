import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

const SITE_NAME = 'Lupus Assessoria'
const SENDER_DOMAIN = 'notify.lupusassessoria.com'
const FROM_DOMAIN = 'lupusassessoria.com'
const LOGO_URL = 'https://lupus-nexus.lovable.app/__l5e/assets-v1/e55ef617-6fa9-46da-a339-fd16750ee592/lupus-logo.jpeg'

function wrapWithBranding(innerHtml: string): string {
  return `<div style="background:#ffffff;padding:24px 0;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;text-align:center;padding:0 16px 16px;">
    <img src="${LOGO_URL}" alt="Lupus Assessoria" width="96" height="96" style="display:inline-block;width:96px;height:auto;border:0;outline:none;text-decoration:none;" />
  </div>
  <div style="max-width:600px;margin:0 auto;padding:0 16px;">${innerHtml}</div>
</div>`
}

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function interpolate(str: string, data: Record<string, any>): string {
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = data?.[k]
    return v === undefined || v === null ? '' : String(v)
  })
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}

export const Route = createFileRoute('/lovable/email/transactional/send')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const authHeader = request.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.slice('Bearer '.length).trim()
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Allow either an end-user JWT OR the service-role key (for internal cron calls)
        const isServiceRole = token === supabaseServiceKey
        if (!isServiceRole) {
          const { data: { user }, error: authError } = await supabase.auth.getUser(token)
          if (authError || !user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }
        }

        let templateName: string
        let recipientEmail: string
        let idempotencyKey: string
        let messageId: string
        let templateData: Record<string, any> = {}
        try {
          const body = await request.json()
          templateName = body.templateName || body.template_name
          recipientEmail = body.recipientEmail || body.recipient_email
          messageId = crypto.randomUUID()
          idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId
          if (body.templateData && typeof body.templateData === 'object') {
            templateData = body.templateData
          }
        } catch {
          return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 })
        }

        if (!templateName) {
          return Response.json({ error: 'templateName is required' }, { status: 400 })
        }
        if (!recipientEmail) {
          return Response.json({ error: 'recipientEmail is required' }, { status: 400 })
        }

        // 1. Load template from DB
        const { data: script, error: scriptErr } = await supabase
          .from('email_scripts')
          .select('key, subject, body_html, active')
          .eq('key', templateName)
          .maybeSingle()

        if (scriptErr || !script) {
          return Response.json(
            { error: `Template '${templateName}' not found` },
            { status: 404 }
          )
        }
        if (!script.active) {
          return Response.json({ success: false, reason: 'template_inactive' })
        }

        const effectiveRecipient = recipientEmail

        // 2. Suppression check
        const { data: suppressed, error: suppressionError } = await supabase
          .from('suppressed_emails')
          .select('id')
          .eq('email', effectiveRecipient.toLowerCase())
          .maybeSingle()

        if (suppressionError) {
          return Response.json({ error: 'Failed to verify suppression status' }, { status: 500 })
        }
        if (suppressed) {
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'suppressed',
          })
          return Response.json({ success: false, reason: 'email_suppressed' })
        }

        // 3. Unsubscribe token
        const normalizedEmail = effectiveRecipient.toLowerCase()
        let unsubscribeToken: string
        const { data: existingToken } = await supabase
          .from('email_unsubscribe_tokens')
          .select('token, used_at')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (existingToken && !existingToken.used_at) {
          unsubscribeToken = existingToken.token
        } else if (!existingToken) {
          unsubscribeToken = generateToken()
          await supabase
            .from('email_unsubscribe_tokens')
            .upsert(
              { token: unsubscribeToken, email: normalizedEmail },
              { onConflict: 'email', ignoreDuplicates: true }
            )
          const { data: storedToken } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token')
            .eq('email', normalizedEmail)
            .maybeSingle()
          if (!storedToken) {
            return Response.json({ error: 'Failed to prepare email' }, { status: 500 })
          }
          unsubscribeToken = storedToken.token
        } else {
          return Response.json({ success: false, reason: 'email_suppressed' })
        }

        // 4. Render template via variable interpolation
        const subject = interpolate(script.subject, templateData)
        const html = interpolate(script.body_html, templateData)
        const text = htmlToText(html)

        // 5. Log + enqueue
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: effectiveRecipient,
          status: 'pending',
        })

        const { error: enqueueError } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: effectiveRecipient,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text,
            purpose: 'transactional',
            label: templateName,
            idempotency_key: idempotencyKey,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        })

        if (enqueueError) {
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'failed',
            error_message: 'Failed to enqueue email',
          })
          return Response.json({ error: 'Failed to enqueue email' }, { status: 500 })
        }

        console.log('Transactional email enqueued', {
          templateName,
          recipient_redacted: redactEmail(effectiveRecipient),
        })

        return Response.json({ success: true, queued: true })
      },
    },
  },
})
