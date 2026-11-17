-- Gl0w-up — funzioni di supporto, automazioni (trigger) e regole di sicurezza (RLS).
-- Le funzioni stanno in glowup_private, che NON va esposto nella Data API.

create schema if not exists glowup_private;
revoke all on schema glowup_private from public;
grant usage on schema glowup_private to authenticated, service_role;

-- ================= Funzioni per le regole =================
create function glowup_private.team_role() returns glowup.team_role
language sql stable security definer set search_path = '' as $$
  select p.team_role from glowup.profiles p
  where p.id = (select auth.uid()) and p.kind = 'team' and p.active
$$;

create function glowup_private.is_team() returns boolean
language sql stable security definer set search_path = '' as $$
  select glowup_private.team_role() is not null
$$;

create function glowup_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(glowup_private.team_role() = 'amministratore', false)
$$;

create function glowup_private.has_role(roles glowup.team_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(glowup_private.team_role() = any(roles), false)
$$;

-- Azienda leggibile dal cliente: attiva, oppure chiusa da meno di 3 mesi (sola lettura)
create function glowup_private.client_company() returns uuid
language sql stable security definer set search_path = '' as $$
  select c.id from glowup.profiles p join glowup.companies c on c.id = p.company_id
  where p.id = (select auth.uid()) and p.kind = 'cliente' and p.active
    and (c.status = 'attivo' or c.closed_at > now() - interval '3 months')
$$;

-- Azienda su cui il cliente può scrivere: solo se attiva
create function glowup_private.client_company_active() returns uuid
language sql stable security definer set search_path = '' as $$
  select c.id from glowup.profiles p join glowup.companies c on c.id = p.company_id
  where p.id = (select auth.uid()) and p.kind = 'cliente' and p.active and c.status = 'attivo'
$$;

create function glowup_private.is_visitor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from glowup.profiles p
                 where p.id = (select auth.uid()) and p.kind = 'visitatore' and p.active)
$$;

create function glowup_private.has_profile() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from glowup.profiles p where p.id = (select auth.uid()) and p.active)
$$;

-- Conversazioni: chi legge e chi scrive
create function glowup_private.can_read_conversation(conv uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from glowup.conversations c where c.id = conv and (
      (c.company_id is not null and (glowup_private.is_team() or c.company_id = glowup_private.client_company()))
      or (c.visitor_user_id is not null and (
            glowup_private.has_role(array['amministratore','commerciale']::glowup.team_role[])
            or c.visitor_user_id = (select auth.uid())))
    ))
$$;

create function glowup_private.can_write_conversation(conv uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from glowup.conversations c where c.id = conv and (
      (c.company_id is not null and (
            glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[])
            or c.company_id = glowup_private.client_company_active()))
      or (c.visitor_user_id is not null and (
            glowup_private.is_admin() or c.visitor_user_id = (select auth.uid())))
    ))
$$;

-- ================= Automazioni =================
create function glowup_private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  for t in select c.table_name from information_schema.columns c
           where c.table_schema = 'glowup' and c.column_name = 'updated_at' loop
    execute format('create trigger set_updated_at before update on glowup.%I
                    for each row execute function glowup_private.set_updated_at()', t);
  end loop;
end $$;

-- Nuovo utente con app = 'glowup' -> profilo Gl0w-up.
-- Il tipo (cliente/team) e il ruolo si leggono SOLO da app_metadata, che può scrivere
-- solo il server (service_role). Chi si registra da solo è sempre "visitatore".
create function glowup_private.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k glowup.profile_kind;
  r glowup.team_role;
begin
  if coalesce(new.raw_app_meta_data->>'app', new.raw_user_meta_data->>'app') is distinct from 'glowup' then
    return new;
  end if;
  k := coalesce(nullif(new.raw_app_meta_data->>'kind', ''), 'visitatore')::glowup.profile_kind;
  if k = 'team' then
    r := coalesce(nullif(new.raw_app_meta_data->>'team_role', ''), 'operativo')::glowup.team_role;
  end if;
  insert into glowup.profiles (id, kind, team_role, company_id, full_name, email, invited_at)
  values (
    new.id, k, r,
    case when k = 'cliente' then nullif(new.raw_app_meta_data->>'company_id', '')::uuid end,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when k <> 'visitatore' then now() end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger glowup_on_auth_user_created after insert on auth.users
  for each row execute function glowup_private.handle_new_auth_user();

-- Profilo: l'utente può cambiare solo i propri dati di contatto e preferenze.
-- Tipo, ruolo, azienda, stato e mail li cambia solo l'amministratore o il server.
create function glowup_private.guard_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not glowup_private.is_admin() then
    new.kind := old.kind; new.team_role := old.team_role; new.company_id := old.company_id;
    new.active := old.active; new.email := old.email; new.invited_at := old.invited_at;
  end if;
  return new;
end $$;
create trigger guard_profile before update on glowup.profiles
  for each row execute function glowup_private.guard_profile();

-- Visitatore: non può cambiare il proprio stato né collegarsi a un'azienda
create function glowup_private.guard_visitor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not glowup_private.is_team() then
    if tg_op = 'INSERT' then
      new.status := 'nuovo'; new.company_id := null; new.outcome_note := null;
    else
      new.status := old.status; new.company_id := old.company_id; new.outcome_note := old.outcome_note;
      new.privacy_consent_at := old.privacy_consent_at;
    end if;
  end if;
  return new;
end $$;
create trigger guard_visitor before insert or update on glowup.visitors
  for each row execute function glowup_private.guard_visitor();

-- Una conversazione per azienda e una per visitatore, create in automatico
create function glowup_private.create_company_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into glowup.conversations (company_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger create_conversation after insert on glowup.companies
  for each row execute function glowup_private.create_company_conversation();

create function glowup_private.create_visitor_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into glowup.conversations (visitor_user_id) values (new.user_id) on conflict do nothing;
  return new;
end $$;
create trigger create_conversation after insert on glowup.visitors
  for each row execute function glowup_private.create_visitor_conversation();

create function glowup_private.touch_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update glowup.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;
create trigger touch_conversation after insert on glowup.messages
  for each row execute function glowup_private.touch_conversation();

-- Messaggio: autore = utente collegato, data = adesso
create function glowup_private.prepare_message() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null then new.author_id := (select auth.uid()); end if;
  new.created_at := now();
  return new;
end $$;
create trigger prepare_message before insert on glowup.messages
  for each row execute function glowup_private.prepare_message();

-- Versione: numero progressivo, azienda copiata dal lavoro, autore = chi carica
create function glowup_private.prepare_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select w.company_id into new.company_id from glowup.works w where w.id = new.work_id;
  select coalesce(max(v.number), 0) + 1 into new.number from glowup.work_versions v where v.work_id = new.work_id;
  if (select auth.uid()) is not null then new.uploaded_by := (select auth.uid()); end if;
  return new;
end $$;
create trigger prepare_version before insert on glowup.work_versions
  for each row execute function glowup_private.prepare_version();

-- Riscontro del cliente: solo sull'ultima versione inviata di un lavoro "da approvare".
-- Dopo il riscontro il lavoro passa ad "approvato" (archiviato) o "in modifica".
create function glowup_private.prepare_feedback() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  select ver.id, ver.work_id, ver.company_id, ver.sent_at, w.status,
         (select max(x.number) from glowup.work_versions x where x.work_id = ver.work_id and x.sent_at is not null) as last_sent,
         ver.number
    into v
    from glowup.work_versions ver join glowup.works w on w.id = ver.work_id
   where ver.id = new.version_id;
  if v.id is null or v.sent_at is null then raise exception 'Versione non disponibile'; end if;
  if v.status <> 'da_approvare' then raise exception 'Il lavoro non è in attesa di approvazione'; end if;
  if v.number <> v.last_sent then raise exception 'Si può rispondere solo all''ultima versione'; end if;
  new.work_id := v.work_id;
  new.company_id := v.company_id;
  if (select auth.uid()) is not null then new.author_id := (select auth.uid()); end if;
  new.created_at := now();
  return new;
end $$;
create trigger prepare_feedback before insert on glowup.feedback
  for each row execute function glowup_private.prepare_feedback();

create function glowup_private.apply_feedback() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update glowup.works
     set status = case when new.outcome = 'approvato' then 'approvato'::glowup.work_status else 'in_modifica'::glowup.work_status end,
         archived_at = case when new.outcome = 'approvato' then now() end
   where id = new.work_id;
  return new;
end $$;
create trigger apply_feedback after insert on glowup.feedback
  for each row execute function glowup_private.apply_feedback();

-- Registro delle azioni (chi ha caricato, chi ha approvato, quando)
create function glowup_private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rec jsonb; cid uuid; eid uuid;
begin
  rec := to_jsonb(coalesce(new, old));
  eid := nullif(coalesce(rec->>'id', rec->>'user_id'), '')::uuid;
  cid := case when tg_table_name = 'companies' then eid else nullif(rec->>'company_id', '')::uuid end;
  insert into glowup.audit_log (actor_id, action, entity, entity_id, company_id, data)
  values ((select auth.uid()), lower(tg_op), tg_table_name, eid, cid,
          case when tg_op = 'UPDATE' then jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)) else rec end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['companies','contracts','company_services','invoices','projects','works',
                           'work_versions','feedback','appointments','visitors','tips'] loop
    execute format('create trigger audit after insert or update or delete on glowup.%I
                    for each row execute function glowup_private.audit()', t);
  end loop;
end $$;
-- profili: solo i cambi di tipo/ruolo/azienda/stato
create trigger audit after update on glowup.profiles
  for each row when (old.kind is distinct from new.kind or old.team_role is distinct from new.team_role
                     or old.company_id is distinct from new.company_id or old.active is distinct from new.active)
  execute function glowup_private.audit();

-- Permessi d'esecuzione: le funzioni servono alle regole, non vanno chiamate dall'esterno
revoke execute on all functions in schema glowup_private from public, anon;
grant execute on function
  glowup_private.team_role(), glowup_private.is_team(), glowup_private.is_admin(),
  glowup_private.has_role(glowup.team_role[]), glowup_private.client_company(),
  glowup_private.client_company_active(), glowup_private.is_visitor(), glowup_private.has_profile(),
  glowup_private.can_read_conversation(uuid), glowup_private.can_write_conversation(uuid)
  to authenticated, service_role;
revoke execute on function
  glowup_private.handle_new_auth_user(), glowup_private.guard_profile(), glowup_private.guard_visitor(),
  glowup_private.create_company_conversation(), glowup_private.create_visitor_conversation(),
  glowup_private.touch_conversation(), glowup_private.prepare_message(), glowup_private.prepare_version(),
  glowup_private.prepare_feedback(), glowup_private.apply_feedback(), glowup_private.audit(),
  glowup_private.set_updated_at()
  from authenticated;

-- ================= Regole di sicurezza (RLS) =================
-- Legenda: T = team (tutti i ruoli), A = amministratore, O = operativo, C = commerciale

-- Aziende: T legge, A gestisce; il cliente legge la propria
create policy sel on glowup.companies for select to authenticated
  using (glowup_private.is_team() or id = glowup_private.client_company());
create policy ins on glowup.companies for insert to authenticated with check (glowup_private.is_admin());
create policy upd on glowup.companies for update to authenticated using (glowup_private.is_admin()) with check (glowup_private.is_admin());
create policy del on glowup.companies for delete to authenticated using (glowup_private.is_admin());

-- Profili: ognuno vede il proprio; T vede tutti; tutti vedono i profili del team (nome e ruolo nei messaggi)
create policy sel on glowup.profiles for select to authenticated
  using (id = (select auth.uid()) or glowup_private.is_team() or (kind = 'team' and glowup_private.has_profile()));
create policy upd on glowup.profiles for update to authenticated
  using (id = (select auth.uid()) or glowup_private.is_admin())
  with check (id = (select auth.uid()) or glowup_private.is_admin());

-- Visitatori: il visitatore gestisce la propria scheda; A e C la leggono e ne aggiornano l'esito
create policy sel on glowup.visitors for select to authenticated
  using (user_id = (select auth.uid()) or glowup_private.has_role(array['amministratore','commerciale']::glowup.team_role[]));
create policy ins on glowup.visitors for insert to authenticated
  with check (user_id = (select auth.uid()) and glowup_private.is_visitor());
create policy upd on glowup.visitors for update to authenticated
  using (user_id = (select auth.uid()) or glowup_private.has_role(array['amministratore','commerciale']::glowup.team_role[]))
  with check (user_id = (select auth.uid()) or glowup_private.has_role(array['amministratore','commerciale']::glowup.team_role[]));

-- Disponibilità del commerciale: leggibile da chi usa Gl0w-up; la gestiscono A e il commerciale stesso
create policy sel on glowup.availability for select to authenticated using (glowup_private.has_profile());
create policy ins on glowup.availability for insert to authenticated
  with check (glowup_private.is_admin() or (team_user_id = (select auth.uid()) and glowup_private.has_role(array['commerciale']::glowup.team_role[])));
create policy upd on glowup.availability for update to authenticated
  using (glowup_private.is_admin() or (team_user_id = (select auth.uid()) and glowup_private.has_role(array['commerciale']::glowup.team_role[])))
  with check (glowup_private.is_admin() or (team_user_id = (select auth.uid()) and glowup_private.has_role(array['commerciale']::glowup.team_role[])));
create policy del on glowup.availability for delete to authenticated
  using (glowup_private.is_admin() or (team_user_id = (select auth.uid()) and glowup_private.has_role(array['commerciale']::glowup.team_role[])));

-- Cataloghi (pacchetti, servizi): li legge chi usa Gl0w-up, li gestisce A
create policy sel on glowup.packages for select to authenticated using (glowup_private.has_profile());
create policy wr  on glowup.packages for all to authenticated using (glowup_private.is_admin()) with check (glowup_private.is_admin());
create policy sel on glowup.services for select to authenticated using (glowup_private.has_profile());
create policy wr  on glowup.services for all to authenticated using (glowup_private.is_admin()) with check (glowup_private.is_admin());

-- Contratti, servizi attivi, fatture: A gestisce, C legge, O nessun accesso; il cliente legge i propri
create policy sel on glowup.contracts for select to authenticated
  using (glowup_private.has_role(array['amministratore','commerciale']::glowup.team_role[]) or company_id = glowup_private.client_company());
create policy wr  on glowup.contracts for all to authenticated using (glowup_private.is_admin()) with check (glowup_private.is_admin());
create policy sel on glowup.company_services for select to authenticated
  using (glowup_private.has_role(array['amministratore','commerciale']::glowup.team_role[]) or company_id = glowup_private.client_company());
create policy wr  on glowup.company_services for all to authenticated using (glowup_private.is_admin()) with check (glowup_private.is_admin());
create policy sel on glowup.invoices for select to authenticated
  using (glowup_private.has_role(array['amministratore','commerciale']::glowup.team_role[]) or company_id = glowup_private.client_company());
create policy wr  on glowup.invoices for all to authenticated using (glowup_private.is_admin()) with check (glowup_private.is_admin());

-- Progetti: T legge, A e O gestiscono; il cliente legge i propri
create policy sel on glowup.projects for select to authenticated
  using (glowup_private.is_team() or company_id = glowup_private.client_company());
create policy wr  on glowup.projects for all to authenticated
  using (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]))
  with check (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]));

-- Lavori: T legge, A e O gestiscono; il cliente vede i propri tranne le bozze
create policy sel on glowup.works for select to authenticated
  using (glowup_private.is_team() or (company_id = glowup_private.client_company() and status <> 'bozza'));
create policy wr  on glowup.works for all to authenticated
  using (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]))
  with check (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]));

-- Versioni: il cliente vede solo quelle inviate
create policy sel on glowup.work_versions for select to authenticated
  using (glowup_private.is_team() or (company_id = glowup_private.client_company() and sent_at is not null));
create policy wr  on glowup.work_versions for all to authenticated
  using (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]))
  with check (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]));

-- Riscontri: il cliente li crea (Approvo / Chiedo modifiche) solo per la propria azienda attiva
create policy sel on glowup.feedback for select to authenticated
  using (glowup_private.is_team() or company_id = glowup_private.client_company());
create policy ins on glowup.feedback for insert to authenticated
  with check (company_id = glowup_private.client_company_active() and author_id = (select auth.uid()));

-- Appuntamenti: T gestisce (C fissa/sposta/annulla); il cliente vede i propri e non li crea;
-- il visitatore prenota la propria call (da confermare)
create policy sel on glowup.appointments for select to authenticated
  using (glowup_private.is_team() or company_id = glowup_private.client_company() or visitor_user_id = (select auth.uid()));
create policy ins_team on glowup.appointments for insert to authenticated with check (glowup_private.is_team());
create policy ins_visitor on glowup.appointments for insert to authenticated
  with check (visitor_user_id = (select auth.uid()) and company_id is null and glowup_private.is_visitor()
              and type = 'call' and status = 'da_confermare' and starts_at > now()
              and mode in ('telefono', 'in_sede'));
create policy upd on glowup.appointments for update to authenticated using (glowup_private.is_team()) with check (glowup_private.is_team());
create policy del on glowup.appointments for delete to authenticated using (glowup_private.is_admin());

-- Conversazioni e messaggi
create policy sel on glowup.conversations for select to authenticated using (glowup_private.can_read_conversation(id));
create policy sel on glowup.messages for select to authenticated using (glowup_private.can_read_conversation(conversation_id));
create policy ins on glowup.messages for insert to authenticated
  with check (author_id = (select auth.uid()) and glowup_private.can_write_conversation(conversation_id));
create policy own on glowup.conversation_reads for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and glowup_private.can_read_conversation(conversation_id));

-- Consigli: pubblicati visibili a chi usa Gl0w-up; A pubblica; O scrive solo bozze (proposta)
create policy sel on glowup.tips for select to authenticated
  using (glowup_private.is_team() or (glowup_private.has_profile() and status = 'pubblicato' and coalesce(publish_at, created_at) <= now()));
create policy ins on glowup.tips for insert to authenticated
  with check (glowup_private.is_admin() or (glowup_private.has_role(array['operativo']::glowup.team_role[]) and status = 'bozza'));
create policy upd on glowup.tips for update to authenticated
  using (glowup_private.is_admin() or (glowup_private.has_role(array['operativo']::glowup.team_role[]) and status = 'bozza'))
  with check (glowup_private.is_admin() or (glowup_private.has_role(array['operativo']::glowup.team_role[]) and status = 'bozza'));
create policy del on glowup.tips for delete to authenticated using (glowup_private.is_admin());

-- Questionari: chi compila vede i propri; T li legge
create policy sel on glowup.questionnaires for select to authenticated
  using (user_id = (select auth.uid()) or glowup_private.is_team());
create policy ins on glowup.questionnaires for insert to authenticated
  with check (user_id = (select auth.uid()) and glowup_private.has_profile()
              and (company_id is null or company_id = glowup_private.client_company_active()));

-- File condivisi: T legge, A e O gestiscono; il cliente legge e carica nella propria azienda
create policy sel on glowup.shared_files for select to authenticated
  using (glowup_private.is_team() or company_id = glowup_private.client_company());
create policy ins on glowup.shared_files for insert to authenticated
  with check (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[])
              or (company_id = glowup_private.client_company_active() and uploaded_by = (select auth.uid())));
create policy del on glowup.shared_files for delete to authenticated
  using (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[])
         or (company_id = glowup_private.client_company_active() and uploaded_by = (select auth.uid())));

-- Notifiche: ognuno le proprie (le crea il server)
create policy sel on glowup.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy upd on glowup.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Iscrizioni alle notifiche push: ognuno le proprie
create policy own on glowup.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and glowup_private.has_profile());

-- Registro delle azioni: solo A lo legge; nessuno lo modifica
create policy sel on glowup.audit_log for select to authenticated using (glowup_private.is_admin());

-- Messaggi e notifiche in tempo reale
alter publication supabase_realtime add table glowup.messages, glowup.notifications;
