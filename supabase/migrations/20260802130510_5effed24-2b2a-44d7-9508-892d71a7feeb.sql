CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('whatsapp-payment-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-payment-reminders');

SELECT cron.schedule(
  'whatsapp-payment-reminders',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--1669744a-5c0e-441b-8336-4b321e0db338.lovable.app/api/public/hooks/whatsapp-reminders',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcGlraG5wZ2JvdmRlZm56aHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NzY4MTQsImV4cCI6MjA5MjA1MjgxNH0.B1AwAIhBvn1Q-fF2yrSM44oVm68N11t6ukg3tQOu-2k"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);