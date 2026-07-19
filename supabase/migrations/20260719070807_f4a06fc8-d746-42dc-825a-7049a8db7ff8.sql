
CREATE TABLE public.agenda_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','weekly')),
  recurrence_until DATE,
  color TEXT DEFAULT 'primary',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_events TO authenticated;
GRANT ALL ON public.agenda_events TO service_role;

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view events" ON public.agenda_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert events" ON public.agenda_events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update events" ON public.agenda_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete events" ON public.agenda_events FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_agenda_events_updated BEFORE UPDATE ON public.agenda_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_agenda_events_starts_at ON public.agenda_events(starts_at);
CREATE INDEX idx_agenda_events_client_id ON public.agenda_events(client_id);
