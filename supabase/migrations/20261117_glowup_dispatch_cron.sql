-- Gl0w-up — attiva pg_cron e pg_net e chiama glowup-dispatch ogni 5 minuti.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Codice segreto casuale per glowup-dispatch, conservato cifrato nel Vault.
-- Va copiato nei segreti delle Edge Functions come GLOWUP_CRON_SECRET.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'glowup_cron_secret',
                           'Gl0w-up: header x-cron-secret per glowup-dispatch')
where not exists (select 1 from vault.secrets where name = 'glowup_cron_secret');

select cron.schedule(
  'glowup-dispatch',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://ywsolxklcyctrezngclz.supabase.co/functions/v1/glowup-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'glowup_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
