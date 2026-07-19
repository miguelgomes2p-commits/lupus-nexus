-- Permitir que admins e gestores leiam o log de e-mails na Inbox
CREATE POLICY "Admins can read email_send_log"
  ON public.email_send_log FOR SELECT
  TO authenticated
  USING (public.is_admin_or_gestor(auth.uid()));

-- Promover Miguel Gomes a admin master
INSERT INTO public.user_roles (user_id, role)
VALUES ('3ed96874-32ca-491a-998f-78af6e0e8899', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;