-- Applicata il 17/11/2026 sul progetto Supabase ywsolxklcyctrezngclz.
-- Sezione dedicata all'app Gl0w-up (app clienti/visitatori + backoffice)
create schema if not exists glowup;
comment on schema glowup is 'Gl0w-up: app clienti e visitatori + backoffice del team. Tabelle con RLS obbligatoria.';

-- Accesso allo schema: solo utenti autenticati e service_role. anon si aggiunge solo se servirà.
revoke all on schema glowup from public;
grant usage on schema glowup to authenticated, service_role;

-- Privilegi predefiniti per gli oggetti futuri (la RLS su ogni tabella decide le righe)
alter default privileges in schema glowup grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema glowup grant all on tables to service_role;
alter default privileges in schema glowup grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema glowup revoke execute on functions from public;
alter default privileges in schema glowup grant execute on functions to authenticated, service_role;
