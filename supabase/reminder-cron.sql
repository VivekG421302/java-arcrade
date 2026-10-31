-- Run once in the Supabase SQL editor after deploying the function.
-- Replace <PROJECT_REF> and <CRON_SECRET> (must match the function's CRON_SECRET secret).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'daily-noon-reminder',
  '*/30 * * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-reminder',
       headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
     ); $$
);
