import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

function interpolate(str: string, data: Record<string, any>): string {
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = data?.[k]
    return v === undefined || v === null ? '' : String(v)
  })
}

export const Route = createFileRoute('/lovable/email/transactional/preview')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const lovableApiKey = process.env.LOVABLE_API_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const authHeader = request.headers.get('Authorization')
        if (lovableApiKey && authHeader !== `Bearer ${lovableApiKey}`) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let templateName: string
        let templateData: Record<string, any> = {}
        try {
          const body = await request.json()
          templateName = body.templateName || body.template_name
          if (body.templateData && typeof body.templateData === 'object') {
            templateData = body.templateData
          }
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        if (!templateName) {
          return Response.json({ error: 'templateName is required' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { data: script } = await supabase
          .from('email_scripts')
          .select('subject, body_html')
          .eq('key', templateName)
          .maybeSingle()

        if (!script) {
          return Response.json({ error: 'Template not found' }, { status: 404 })
        }

        return Response.json({
          subject: interpolate(script.subject, templateData),
          html: interpolate(script.body_html, templateData),
        })
      },
    },
  },
})
