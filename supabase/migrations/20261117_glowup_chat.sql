-- Gl0w-up — chat: referenti del cliente (chi gestisce i suoi progetti) e anteprima dell'ultimo messaggio.

-- Referenti: persone del team assegnate a un cliente. Ricevono gli avvisi dei suoi messaggi.
create table glowup.company_team (
  company_id   uuid not null references glowup.companies(id) on delete cascade,
  team_user_id uuid not null references glowup.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (company_id, team_user_id)
);
create index on glowup.company_team(team_user_id);
alter table glowup.company_team enable row level security;

create policy sel on glowup.company_team for select to authenticated
  using (glowup_private.is_team() or company_id = glowup_private.client_company());
create policy ins on glowup.company_team for insert to authenticated with check (glowup_private.is_admin());
create policy del on glowup.company_team for delete to authenticated using (glowup_private.is_admin());

-- Solo persone del team possono essere referenti
create function glowup_private.check_company_team() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from glowup.profiles p where p.id = new.team_user_id and p.kind = 'team') then
    raise exception 'Il referente deve essere una persona del team';
  end if;
  return new;
end $$;
create trigger check_company_team before insert on glowup.company_team
  for each row execute function glowup_private.check_company_team();

-- Anteprima per la casella dei messaggi
alter table glowup.conversations
  add column last_message_preview text,
  add column last_author_id uuid references glowup.profiles(id) on delete set null;
create index on glowup.conversations(last_author_id);

create or replace function glowup_private.touch_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update glowup.conversations
     set last_message_at = new.created_at,
         last_author_id = new.author_id,
         last_message_preview = coalesce(nullif(left(new.body, 140), ''), '📎 Allegato')
   where id = new.conversation_id;
  return new;
end $$;

-- Messaggio del cliente: avviso ai suoi referenti e all'amministratore (a tutto il team se non ha referenti)
create or replace function glowup_private.on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cv record; author_team boolean; nm text; refs uuid[];
begin
  select * into cv from glowup.conversations where id = new.conversation_id;
  select p.kind = 'team', coalesce(p.full_name, 'Qualcuno') into author_team, nm from glowup.profiles p where p.id = new.author_id;
  if cv.company_id is not null then
    if author_team then
      perform glowup_private.notify(glowup_private.company_users(cv.company_id), 'messaggio', 'Gl0w-up ti ha scritto', left(new.body, 140), '/messaggi', false);
    else
      select coalesce(array_agg(ct.team_user_id), '{}') into refs
        from glowup.company_team ct join glowup.profiles p on p.id = ct.team_user_id and p.active
       where ct.company_id = cv.company_id;
      if cardinality(refs) = 0 then
        refs := glowup_private.team_users(array['amministratore','operativo','commerciale']::glowup.team_role[]);
      else
        refs := refs || glowup_private.team_users(array['amministratore']::glowup.team_role[]);
      end if;
      perform glowup_private.notify(refs, 'messaggio_cliente', nm || ' ha scritto', left(new.body, 140), '/messaggi/' || cv.id, false);
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

revoke execute on function glowup_private.check_company_team(), glowup_private.touch_conversation(), glowup_private.on_message()
  from public, anon, authenticated;
