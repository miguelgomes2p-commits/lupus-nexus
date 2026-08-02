ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp_automation boolean NOT NULL DEFAULT false;