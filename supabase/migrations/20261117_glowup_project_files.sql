-- Gl0w-up — documenti dei progetti (PDF, Word, Excel, immagini...) e cronologia degli step.

-- ---------- Documenti ----------
create table glowup.project_files (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references glowup.projects(id) on delete cascade,
  company_id        uuid not null references glowup.companies(id) on delete cascade,  -- copiato dal progetto
  file_path         text not null,          -- storage: glowup-condivisi/<company_id>/progetti/<project_id>/...
  name              text not null,
  size_bytes        bigint,
  mime_type         text,
  visible_to_client boolean not null default true,
  uploaded_by       uuid references glowup.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index on glowup.project_files(project_id, created_at desc);
create index on glowup.project_files(company_id);
create index on glowup.project_files(uploaded_by);
alter table glowup.project_files enable row level security;

create function glowup_private.prepare_project_file() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select p.company_id into new.company_id from glowup.projects p where p.id = new.project_id;
  if (select auth.uid()) is not null then new.uploaded_by := (select auth.uid()); end if;
  return new;
end $$;
create trigger prepare_project_file before insert on glowup.project_files
  for each row execute function glowup_private.prepare_project_file();
create trigger audit after insert or update or delete on glowup.project_files
  for each row execute function glowup_private.audit();

-- Team: legge tutto; amministratore e operativo caricano, nascondono, eliminano.
-- Cliente: vede solo i documenti visibili dei propri progetti.
create policy sel on glowup.project_files for select to authenticated
  using (glowup_private.is_team() or (company_id = glowup_private.client_company() and visible_to_client));
create policy ins on glowup.project_files for insert to authenticated
  with check (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]));
create policy upd on glowup.project_files for update to authenticated
  using (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]))
  with check (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]));
create policy del on glowup.project_files for delete to authenticated
  using (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]));

-- File: nella cartella "progetti" il cliente legge solo i documenti visibili e non può caricare.
drop policy "glowup condivisi lettura" on storage.objects;
create policy "glowup condivisi lettura" on storage.objects for select to authenticated
  using (bucket_id = 'glowup-condivisi' and (glowup_private.is_team()
         or ((storage.foldername(objects.name))[1] = glowup_private.client_company()::text
             and ((storage.foldername(objects.name))[2] is distinct from 'progetti'
                  -- objects.name esplicito: project_files ha anche lei una colonna "name"
                  or exists (select 1 from glowup.project_files pf where pf.file_path = objects.name and pf.visible_to_client)))));
drop policy "glowup condivisi scrittura" on storage.objects;
create policy "glowup condivisi scrittura" on storage.objects for insert to authenticated
  with check (bucket_id = 'glowup-condivisi' and (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[])
         or ((storage.foldername(name))[1] = glowup_private.client_company_active()::text
             and (storage.foldername(name))[2] is distinct from 'progetti')));

-- ---------- Cronologia degli step (mockup C7) ----------
create table glowup.project_steps (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references glowup.projects(id) on delete cascade,
  company_id  uuid not null references glowup.companies(id) on delete cascade,
  step        glowup.method_step not null,
  reached_at  timestamptz not null default now()
);
create index on glowup.project_steps(project_id, reached_at);
create index on glowup.project_steps(company_id);
alter table glowup.project_steps enable row level security;
create policy sel on glowup.project_steps for select to authenticated
  using (glowup_private.is_team() or company_id = glowup_private.client_company());

create function glowup_private.log_project_step() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.step is distinct from old.step then
    insert into glowup.project_steps (project_id, company_id, step) values (new.id, new.company_id, new.step);
  end if;
  return new;
end $$;
create trigger log_project_step after insert or update of step on glowup.projects
  for each row execute function glowup_private.log_project_step();

-- Progetti esistenti: registra lo step attuale
insert into glowup.project_steps (project_id, company_id, step, reached_at)
select id, company_id, step, updated_at from glowup.projects;

revoke execute on function glowup_private.prepare_project_file(), glowup_private.log_project_step() from public, anon, authenticated;

-- Avviso al cliente quando arriva un nuovo documento visibile nel suo progetto
create function glowup_private.on_project_file() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  if new.visible_to_client and (tg_op = 'INSERT' or not old.visible_to_client) then
    select p.title into t from glowup.projects p where p.id = new.project_id;
    perform glowup_private.notify(glowup_private.company_users(new.company_id), 'documento',
      'Nuovo documento in ' || coalesce(t, 'un tuo progetto'), new.name, '/progetti/' || new.project_id, false);
  end if;
  return new;
end $$;
create trigger notify after insert or update of visible_to_client on glowup.project_files
  for each row execute function glowup_private.on_project_file();
revoke execute on function glowup_private.on_project_file() from public, anon, authenticated;
