-- Daily at 08:00 Lagos (07:00 UTC): email unregistered vendors nearing the cap.
-- The function is idempotent (milestones are recorded in vendor_cap_notices).
select cron.schedule(
  'vendor-cap-check-daily',
  '0 7 * * *',
  $$ select net.http_post(
       url := 'https://tuwduhrcufqaxvmckuni.supabase.co/functions/v1/vendor-cap-check',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);
