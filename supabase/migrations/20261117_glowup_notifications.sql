-- Gl0w-up — notifiche automatiche sugli eventi + prenotazione call solo tramite funzione.
-- Le notifiche nascono qui (centro notifiche in app); push e mail le spedisce la funzione glowup-dispatch.

alter table glowup.notifications
  add column send_email boolean not null default false,
  add column sent_at timestamptz;                       -- push/mail già elaborati
create index notifications_unsent_idx on glowup.notifications(created_at) where sent_at is null;

alter table glowup.appointments add column reminder_sent_at timestamptz;

-- Il visitatore non inserisce più direttamente l'appuntamento: passa da glowup-book-call,
-- che controlla che lo slot sia libero. Il team continua a inserire.
drop policy ins on glowup.appointments;
create policy ins on glowup.appointments for insert to authenticated with check (glowup_private.is_team());

-- ---------- Destinatari ----------
create function glowup_private.company_users(c uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.id), '{}') from glowup.profiles p
  where p.company_id = c and p.kind = 'cliente' and p.active
$$;

create function glowup_private.team_users(roles glowup.team_role[]) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.id), '{}') from glowup.profiles p
  where p.kind = 'team' and p.active and p.team_role = any(roles)
$$;

create function glowup_private.notify(users uuid[], k text, t text, b text, l text, mail boolean)
returns void language sql security definer set search_path = '' as $$
  insert into glowup.notifications (user_id, kind, title, body, link, send_email)
  select distinct u, k, t, b, l, mail from unnest(users) u
  where u is not null and u is distinct from (select auth.uid())   -- niente notifiche a sé stessi
$$;

create function glowup_private.fmt(ts timestamptz) returns text
language sql immutable set search_path = '' as $$
  select to_char(ts at time zone 'Europe/Rome', 'DD/MM "alle" HH24:MI')
$$;

-- ---------- Lavori: inviato al cliente (anche nuova versione dopo modifiche) ----------
create function glowup_private.on_work() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'da_approvare' and (tg_op = 'INSERT' or old.status is distinct from 'da_approvare') then
    perform glowup_private.notify(glowup_private.company_users(new.company_id), 'lavoro_da_approvare',
      'C''è un nuovo lavoro da approvare: ' || new.title, null, '/lavori/' || new.id, true);
  end if;
  return new;
end $$;
create trigger notify after insert or update of status on glowup.works
  for each row execute function glowup_private.on_work();

-- ---------- Riscontro del cliente -> team ----------
create function glowup_private.on_feedback() returns trigger
language plpgsql security definer set search_path = '' as $$
declare w record;
begin
  select wk.title, c.legal_name, coalesce(c.trade_name, c.legal_name) as name into w
    from glowup.works wk join glowup.companies c on c.id = wk.company_id where wk.id = new.work_id;
  perform glowup_private.notify(glowup_private.team_users(array['amministratore','operativo']::glowup.team_role[]),
    case when new.outcome = 'approvato' then 'lavoro_approvato' else 'modifiche_richieste' end,
    w.name || case when new.outcome = 'approvato' then ' ha approvato ' else ' chiede modifiche a ' end || w.title,
    new.comment, '/lavori/' || new.work_id, false);
  return new;
end $$;
create trigger notify after insert on glowup.feedback
  for each row execute function glowup_private.on_feedback();

-- ---------- Messaggi ----------
create function glowup_private.on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cv record; author_team boolean; nm text;
begin
  select * into cv from glowup.conversations where id = new.conversation_id;
  select p.kind = 'team', coalesce(p.full_name, 'Qualcuno') into author_team, nm from glowup.profiles p where p.id = new.author_id;
  if cv.company_id is not null then
    if author_team then
      perform glowup_private.notify(glowup_private.company_users(cv.company_id), 'messaggio', 'Gl0w-up ti ha scritto', left(new.body, 140), '/messaggi', false);
    else
      perform glowup_private.notify(glowup_private.team_users(array['amministratore','operativo','commerciale']::glowup.team_role[]),
        'messaggio_cliente', nm || ' ha scritto', left(new.body, 140), '/messaggi/' || cv.id, false);
    end if;
  else
    if author_team then
      perform glowup_private.notify(array[cv.visitor_user_id], 'messaggio', 'Gl0w-up ti ha scritto', left(new.body, 140), '/messaggi', false);
    else
      perform glowup_private.notify(glowup_private.team_users(array['amministratore','commerciale']::glowup.team_role[]),
        'messaggio_visitatore', nm || ' (visitatore) ha scritto', left(new.body, 140), '/messaggi/' || cv.id, false);
    end if;
  end if;
  return new;
end $$;
create trigger notify after insert on glowup.messages
  for each row execute function glowup_private.on_message();

-- ---------- Appuntamenti ----------
create function glowup_private.on_appointment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare users uuid[]; what text;
begin
  users := case when new.company_id is not null then glowup_private.company_users(new.company_id)
                else array[new.visitor_user_id] end;
  if tg_op = 'INSERT' then
    if new.visitor_user_id is not null and new.status = 'da_confermare' then
      -- nuova richiesta di call da un visitatore -> commerciale e amministratore
      perform glowup_private.notify(glowup_private.team_users(array['amministratore','commerciale']::glowup.team_role[]),
        'richiesta_visitatore', 'Nuova richiesta di call', glowup_private.fmt(new.starts_at), '/richieste', true);
      return new;
    end if;
    what := case when new.status = 'confermato' then 'confermato' else 'creato' end;
  elsif new.status = 'annullato' and old.status is distinct from 'annullato' then
    what := 'annullato';
  elsif new.status = 'confermato' and old.status = 'da_confermare' then
    what := 'confermato';
  elsif new.starts_at is distinct from old.starts_at then
    what := 'spostato';
  else
    return new;
  end if;
  perform glowup_private.notify(users, 'appuntamento',
    new.title || ' ' || what || case when what <> 'annullato' then ': ' || glowup_private.fmt(new.starts_at) else '' end,
    null, '/calendario', true);
  return new;
end $$;
create trigger notify after insert or update of status, starts_at on glowup.appointments
  for each row execute function glowup_private.on_appointment();

-- Se l'appuntamento si sposta, il promemoria va rimandato
create function glowup_private.reset_reminder() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.starts_at is distinct from old.starts_at then new.reminder_sent_at := null; end if;
  return new;
end $$;
create trigger reset_reminder before update of starts_at on glowup.appointments
  for each row execute function glowup_private.reset_reminder();

-- ---------- Consigli pubblicati -> tutti i clienti (disattivabile dalle preferenze) ----------
create function glowup_private.on_tip() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pubblicato' and (tg_op = 'INSERT' or old.status is distinct from 'pubblicato') then
    perform glowup_private.notify(
      (select coalesce(array_agg(p.id), '{}') from glowup.profiles p where p.kind = 'cliente' and p.active),
      'consiglio', 'Un nuovo consiglio per la tua comunicazione', new.title, '/consigli/' || new.id, false);
  end if;
  return new;
end $$;
create trigger notify after insert or update of status on glowup.tips
  for each row execute function glowup_private.on_tip();

-- ---------- Fattura caricata -> cliente ----------
create function glowup_private.on_invoice() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform glowup_private.notify(glowup_private.company_users(new.company_id), 'fattura',
    'Nuova fattura n. ' || new.number, null, '/il-mio-spazio/fatture', true);
  return new;
end $$;
create trigger notify after insert on glowup.invoices
  for each row execute function glowup_private.on_invoice();

-- ---------- Questionario compilato -> team ----------
create function glowup_private.on_questionnaire() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform glowup_private.notify(glowup_private.team_users(array['amministratore','commerciale']::glowup.team_role[]),
    'questionario', 'Questionario ' || new.kind || ' compilato', null, '/questionari/' || new.id, true);
  return new;
end $$;
create trigger notify after insert on glowup.questionnaires
  for each row execute function glowup_private.on_questionnaire();

revoke execute on function
  glowup_private.company_users(uuid), glowup_private.team_users(glowup.team_role[]),
  glowup_private.notify(uuid[], text, text, text, text, boolean), glowup_private.fmt(timestamptz),
  glowup_private.on_work(), glowup_private.on_feedback(), glowup_private.on_message(),
  glowup_private.on_appointment(), glowup_private.on_tip(), glowup_private.on_invoice(),
  glowup_private.on_questionnaire(), glowup_private.reset_reminder()
  from public, anon, authenticated;
