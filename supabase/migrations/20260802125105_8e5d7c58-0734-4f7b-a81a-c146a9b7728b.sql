CREATE TABLE public.whatsapp_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  recipient_phone text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  provider_response jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_send_log TO authenticated;
GRANT ALL ON public.whatsapp_send_log TO service_role;

ALTER TABLE public.whatsapp_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read whatsapp log"
ON public.whatsapp_send_log FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_whatsapp_send_log_updated_at
BEFORE UPDATE ON public.whatsapp_send_log
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_whatsapp_send_log_created_at ON public.whatsapp_send_log (created_at DESC);

INSERT INTO public.email_scripts (key, name, category, subject, body_html, variables_desc, active)
VALUES
 ('wa_payment_reminder_5d', 'WhatsApp — Lembrete 5 dias antes', 'whatsapp', 'Lembrete de vencimento',
  'Olá, {{contact_name}}! 👋\n\nPassando para lembrar que a mensalidade da *{{company_name}}* no valor de *R$ {{amount}}* vence em *{{due_date}}* (em 5 dias).\n\nQualquer dúvida é só chamar por aqui.\n\n_Lupus Assessoria_',
  '{{contact_name}}, {{company_name}}, {{amount}}, {{due_date}}, {{reference_month}}', true),
 ('wa_payment_reminder_due', 'WhatsApp — Lembrete no dia do vencimento', 'whatsapp', 'Vence hoje',
  'Olá, {{contact_name}}! 👋\n\nA mensalidade da *{{company_name}}* no valor de *R$ {{amount}}* vence *hoje ({{due_date}})*.\n\nAssim que o pagamento for realizado, é só nos avisar por aqui.\n\n_Lupus Assessoria_',
  '{{contact_name}}, {{company_name}}, {{amount}}, {{due_date}}, {{reference_month}}', true),
 ('wa_welcome_client', 'WhatsApp — Boas-vindas ao cliente', 'whatsapp', 'Boas-vindas',
  'Seja bem-vindo(a), {{contact_name}}! 🎉\n\nÉ um prazer ter a *{{company_name}}* com a gente na Lupus Assessoria.\n\nQualquer necessidade, fale com a gente por aqui.\n\n_Lupus Assessoria_',
  '{{contact_name}}, {{company_name}}', true)
ON CONFLICT (key) DO NOTHING;