CREATE TABLE public.billing_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  cnpj text,
  pix_key_type text NOT NULL DEFAULT 'cnpj',
  pix_key text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_entities TO authenticated;
GRANT ALL ON public.billing_entities TO service_role;
ALTER TABLE public.billing_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_entities_select" ON public.billing_entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "billing_entities_insert" ON public.billing_entities FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "billing_entities_update" ON public.billing_entities FOR UPDATE TO authenticated USING (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "billing_entities_delete" ON public.billing_entities FOR DELETE TO authenticated USING (public.is_admin_or_gestor(auth.uid()));

CREATE TRIGGER update_billing_entities_updated_at BEFORE UPDATE ON public.billing_entities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS billing_entity_id uuid REFERENCES public.billing_entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pix_key text;

CREATE TABLE public.billing_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.client_invoices(id) ON DELETE SET NULL,
  competencia date NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  reminder_type text NOT NULL,
  billing_entity_id uuid REFERENCES public.billing_entities(id) ON DELETE SET NULL,
  cnpj text,
  pix_key text,
  whatsapp text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  provider_message_id text,
  provider_response jsonb,
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  skip_reason text,
  idempotency_key text NOT NULL,
  is_test boolean NOT NULL DEFAULT false,
  trigger_source text NOT NULL DEFAULT 'cron',
  triggered_by uuid,
  director_notified boolean NOT NULL DEFAULT false,
  director_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX billing_reminders_idempotency_key_uidx ON public.billing_reminders (idempotency_key);
CREATE INDEX billing_reminders_client_idx ON public.billing_reminders (client_id, created_at DESC);
CREATE INDEX billing_reminders_status_idx ON public.billing_reminders (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_reminders TO authenticated;
GRANT ALL ON public.billing_reminders TO service_role;
ALTER TABLE public.billing_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_reminders_select" ON public.billing_reminders FOR SELECT TO authenticated USING (true);
CREATE POLICY "billing_reminders_insert" ON public.billing_reminders FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "billing_reminders_update" ON public.billing_reminders FOR UPDATE TO authenticated USING (public.is_admin_or_gestor(auth.uid()));
CREATE POLICY "billing_reminders_delete" ON public.billing_reminders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_billing_reminders_updated_at BEFORE UPDATE ON public.billing_reminders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.email_scripts (key, name, category, subject, body_html, variables_desc, active)
VALUES
 ('wa_billing_reminder', 'WhatsApp · Lembrete de cobrança', 'whatsapp', 'Lembrete de cobrança',
  E'Olá, {{nome_cliente}}! 👋\n\nPassando para lembrar que sua mensalidade da *Lupus Assessoria*, no valor de *{{valor}}*, vence em *{{vencimento}}*.\n\n💳 *Pagamento via PIX*\n\nChave PIX:\n{{pix}}\n\nSe o pagamento já tiver sido realizado, pode desconsiderar esta mensagem. ✅\n\nEm caso de dúvida, estamos à disposição.\n\n— Lupus Assessoria',
  '{{nome_cliente}}, {{valor}}, {{vencimento}}, {{pix}}, {{cnpj}}, {{empresa_cobranca}}', true),
 ('wa_billing_director_ok', 'WhatsApp · Diretoria · Cobrança enviada', 'whatsapp', 'Cobrança enviada',
  E'🔔 *LEMBRETE DE COBRANÇA ENVIADO*\n\n👤 Cliente: {{cliente}}\n📱 WhatsApp: {{whatsapp}}\n💰 Valor: {{valor}}\n📅 Vencimento: {{vencimento}}\n🏢 CNPJ de cobrança: {{cnpj}}\n🕐 Enviado em: {{data_hora}}\n\n✅ Status: Enviado com sucesso pela Luna',
  '{{cliente}}, {{whatsapp}}, {{valor}}, {{vencimento}}, {{cnpj}}, {{data_hora}}', true),
 ('wa_billing_director_fail', 'WhatsApp · Diretoria · Falha na cobrança', 'whatsapp', 'Falha no envio',
  E'🚨 *FALHA NO ENVIO DE COBRANÇA*\n\n👤 Cliente: {{cliente}}\n📱 WhatsApp: {{whatsapp}}\n💰 Valor: {{valor}}\n📅 Vencimento: {{vencimento}}\n\n❌ Status: Falha no envio\n\nMotivo:\n{{erro}}',
  '{{cliente}}, {{whatsapp}}, {{valor}}, {{vencimento}}, {{erro}}', true)
ON CONFLICT (key) DO NOTHING;