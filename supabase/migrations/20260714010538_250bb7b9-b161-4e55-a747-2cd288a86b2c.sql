
-- Table for admin-editable email templates
CREATE TABLE public.email_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'transactional',
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables_desc TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_scripts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.email_scripts TO authenticated;
GRANT ALL ON public.email_scripts TO service_role;

ALTER TABLE public.email_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_scripts read all authenticated"
  ON public.email_scripts FOR SELECT TO authenticated USING (true);

CREATE POLICY "email_scripts admin write"
  ON public.email_scripts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "email_scripts admin update"
  ON public.email_scripts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "email_scripts admin delete"
  ON public.email_scripts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tg_email_scripts_updated
  BEFORE UPDATE ON public.email_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.email_scripts (key, name, category, subject, body_html, variables_desc) VALUES
('welcome_client', 'Boas-vindas ao cliente', 'onboarding',
 'Bem-vindo(a) à Lupus, {{contact_name}}!',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">
  <h1 style="color:#0f172a;margin:0 0 16px">Seja bem-vindo(a), {{contact_name}}!</h1>
  <p>Olá, é uma satisfação ter a <strong>{{company_name}}</strong> como nova parceira da Lupus Assessoria.</p>
  <p>Seu contrato foi registrado com sucesso e nossa equipe já iniciou o processo de onboarding. Em breve entraremos em contato para os próximos passos.</p>
  <p style="margin-top:24px">Qualquer dúvida, é só responder a este e-mail.</p>
  <p style="margin-top:32px">Abraços,<br/><strong>Equipe Lupus Assessoria</strong></p>
 </div>',
 'contact_name, company_name, contract_value, contract_start_date'),
('payment_reminder_5d', 'Lembrete de pagamento (5 dias antes)', 'billing',
 'Lembrete: sua mensalidade vence em 5 dias — {{company_name}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">
  <h1 style="color:#0f172a;margin:0 0 16px">Olá, {{contact_name}}</h1>
  <p>Este é um lembrete amigável: a mensalidade da <strong>{{company_name}}</strong> vence em <strong>{{due_date}}</strong> (em 5 dias).</p>
  <p>Valor: <strong>R$ {{amount}}</strong></p>
  <p>Caso o pagamento já tenha sido efetuado, por favor desconsidere esta mensagem.</p>
  <p style="margin-top:32px">Atenciosamente,<br/><strong>Equipe Lupus Assessoria</strong></p>
 </div>',
 'contact_name, company_name, due_date, amount'),
('payment_reminder_due', 'Lembrete de pagamento (dia do vencimento)', 'billing',
 'Vence hoje: mensalidade {{company_name}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a">
  <h1 style="color:#0f172a;margin:0 0 16px">Olá, {{contact_name}}</h1>
  <p>A mensalidade da <strong>{{company_name}}</strong> vence <strong>hoje ({{due_date}})</strong>.</p>
  <p>Valor: <strong>R$ {{amount}}</strong></p>
  <p>Se o pagamento já foi realizado, por favor desconsidere este e-mail.</p>
  <p style="margin-top:32px">Atenciosamente,<br/><strong>Equipe Lupus Assessoria</strong></p>
 </div>',
 'contact_name, company_name, due_date, amount');
