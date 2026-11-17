-- Gl0w-up — tipi e tabelle della fase 1 (schema glowup).
-- Modello dati dalla Guida per lo sviluppatore (pag. 9-10) + campi emersi dai mockup.

-- ---------- Tipi ----------
create type glowup.profile_kind      as enum ('cliente', 'visitatore', 'team');
create type glowup.team_role         as enum ('amministratore', 'operativo', 'commerciale');
create type glowup.company_status    as enum ('attivo', 'chiuso');
create type glowup.method_step       as enum ('ascolto', 'restituzione', 'strategia', 'consegna');
create type glowup.work_status       as enum ('bozza', 'da_approvare', 'in_modifica', 'approvato');
create type glowup.feedback_outcome  as enum ('approvato', 'modifiche');
create type glowup.appointment_type  as enum ('consegna', 'call', 'incontro', 'shooting', 'analisi_strategica');
create type glowup.appointment_status as enum ('da_confermare', 'confermato', 'annullato');
create type glowup.appointment_mode  as enum ('telefono', 'in_sede', 'altro');
create type glowup.tip_status        as enum ('bozza', 'pubblicato', 'ritirato');
create type glowup.questionnaire_kind as enum ('conoscitivo', 'gradimento');
create type glowup.invoice_status    as enum ('da_pagare', 'pagata', 'scaduta');
create type glowup.visitor_status    as enum ('nuovo', 'call_fissata', 'cliente', 'non_interessato');

-- ---------- Aziende e persone ----------
create table glowup.companies (
  id               uuid primary key default gen_random_uuid(),
  legal_name       text not null,                 -- ragione sociale
  trade_name       text,                          -- nome commerciale
  sector           text,
  contact_name     text,                          -- referente
  phone            text,
  email            text,
  status           glowup.company_status not null default 'attivo',
  client_since     date,                          -- "Cliente da [mese anno]"
  closed_at        timestamptz,                   -- fine rapporto: 3 mesi di sola lettura
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table glowup.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  kind               glowup.profile_kind not null,
  team_role          glowup.team_role,
  company_id         uuid references glowup.companies(id) on delete set null,
  full_name          text,
  email              text,
  phone              text,
  job_title          text,                        -- ruolo visibile accanto al nome nei messaggi
  active             boolean not null default true,
  invited_at         timestamptz,
  last_seen_at       timestamptz,
  notification_prefs jsonb not null default '{}'::jsonb,
  privacy_accepted_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint team_role_only_for_team check ((kind = 'team') = (team_role is not null)),
  constraint company_only_for_client check (kind = 'cliente' or company_id is null)
);
-- Un solo account per azienda cliente
create unique index profiles_one_client_per_company on glowup.profiles(company_id) where kind = 'cliente';

create table glowup.visitors (
  user_id            uuid primary key references glowup.profiles(id) on delete cascade,
  full_name          text not null,
  company_name       text,
  sector             text,
  email              text,
  phone              text,
  privacy_consent_at timestamptz not null,
  marketing_consent  boolean not null default false,
  status             glowup.visitor_status not null default 'nuovo',
  outcome_note       text,
  company_id         uuid references glowup.companies(id) on delete set null,  -- quando diventa cliente
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table glowup.availability (
  id            uuid primary key default gen_random_uuid(),
  team_user_id  uuid not null references glowup.profiles(id) on delete cascade,
  weekday       smallint not null check (weekday between 1 and 5),   -- lun-ven
  start_time    time not null,
  end_time      time not null,
  slot_minutes  smallint not null default 30 check (slot_minutes between 10 and 120),
  check (end_time > start_time)
);

-- ---------- Contratto, servizi, fatture ----------
create table glowup.packages (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique,
  sort  smallint not null default 0
);

create table glowup.services (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique,
  sort  smallint not null default 0
);

create table glowup.contracts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references glowup.companies(id) on delete cascade,
  file_path   text,                          -- storage: glowup-documenti/<company_id>/...
  attachments text[] not null default '{}',
  signed_on   date,
  starts_on   date,
  ends_on     date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table glowup.company_services (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references glowup.companies(id) on delete cascade,
  service_id  uuid not null references glowup.services(id),
  package_id  uuid references glowup.packages(id),
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table glowup.invoices (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references glowup.companies(id) on delete cascade,
  contract_id uuid references glowup.contracts(id) on delete set null,
  number      text not null,
  issued_on   date not null,
  amount      numeric(12,2) not null check (amount >= 0),
  due_on      date,
  file_path   text,
  status      glowup.invoice_status not null default 'da_pagare',
  paid_on     date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, number)
);

-- ---------- Progetti e lavori ----------
create table glowup.projects (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references glowup.companies(id) on delete cascade,
  title       text not null,
  service_id  uuid references glowup.services(id),
  step        glowup.method_step not null default 'ascolto',
  started_on  date,
  due_on      date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table glowup.works (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references glowup.companies(id) on delete cascade,
  project_id  uuid references glowup.projects(id) on delete set null,
  title       text not null,
  kind        text,                          -- post, sito, foto, restituzione...
  client_note text,                          -- nota del team per il cliente
  status      glowup.work_status not null default 'bozza',
  created_by  uuid references glowup.profiles(id) on delete set null,
  sent_at     timestamptz,                   -- primo invio al cliente
  archived_at timestamptz,                   -- valorizzato all'approvazione
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table glowup.work_versions (
  id          uuid primary key default gen_random_uuid(),
  work_id     uuid not null references glowup.works(id) on delete cascade,
  company_id  uuid not null references glowup.companies(id) on delete cascade,  -- copiato dal lavoro (trigger)
  number      integer not null,
  files       text[] not null default '{}',  -- storage: glowup-lavori/<company_id>/<work_id>/...
  team_note   text,
  uploaded_by uuid references glowup.profiles(id) on delete set null,
  sent_at     timestamptz,                   -- null = non ancora inviata al cliente
  created_at  timestamptz not null default now(),
  unique (work_id, number)
);

-- Riscontro del cliente su una versione; pins = note posizionate sull'immagine
-- formato: [{"file": "<path>", "x": 0.42, "y": 0.18, "text": "..."}] con x,y relativi (0-1)
create table glowup.feedback (
  id          uuid primary key default gen_random_uuid(),
  version_id  uuid not null references glowup.work_versions(id) on delete cascade,
  work_id     uuid not null references glowup.works(id) on delete cascade,
  company_id  uuid not null references glowup.companies(id) on delete cascade,
  author_id   uuid not null references glowup.profiles(id) on delete cascade,
  outcome     glowup.feedback_outcome not null,
  comment     text,
  pins        jsonb not null default '[]'::jsonb check (jsonb_typeof(pins) = 'array'),
  created_at  timestamptz not null default now()
);

-- ---------- Appuntamenti ----------
create table glowup.appointments (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid references glowup.companies(id) on delete cascade,
  visitor_user_id uuid references glowup.visitors(user_id) on delete cascade,
  project_id      uuid references glowup.projects(id) on delete set null,
  type            glowup.appointment_type not null,
  title           text not null,
  starts_at       timestamptz not null,
  duration_min    smallint not null default 30 check (duration_min between 5 and 600),
  mode            glowup.appointment_mode,
  location        text,                      -- luogo o link
  notes           text,
  status          glowup.appointment_status not null default 'confermato',
  team_user_ids   uuid[] not null default '{}',  -- partecipanti del team
  created_by      uuid references glowup.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint appointment_owner check ((company_id is not null) <> (visitor_user_id is not null))
);

-- ---------- Messaggi ----------
create table glowup.conversations (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid unique references glowup.companies(id) on delete cascade,
  visitor_user_id uuid unique references glowup.visitors(user_id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  constraint conversation_owner check ((company_id is not null) <> (visitor_user_id is not null))
);

create table glowup.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references glowup.conversations(id) on delete cascade,
  author_id       uuid not null references glowup.profiles(id) on delete cascade,
  body            text,
  attachments     text[] not null default '{}',   -- storage: glowup-messaggi/...
  work_id         uuid references glowup.works(id) on delete set null,
  appointment_id  uuid references glowup.appointments(id) on delete set null,
  created_at      timestamptz not null default now(),
  check (coalesce(length(body), 0) > 0 or cardinality(attachments) > 0)
);

create table glowup.conversation_reads (
  conversation_id uuid not null references glowup.conversations(id) on delete cascade,
  user_id         uuid not null references glowup.profiles(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ---------- Consigli ----------
create table glowup.tips (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     text,
  read_minutes smallint,
  image_path   text,                         -- storage: glowup-consigli/...
  points       text[] not null default '{}', -- i 3 punti numerati
  body         text,
  link         text,
  status       glowup.tip_status not null default 'bozza',
  publish_at   timestamptz,
  created_by   uuid references glowup.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- Questionari, file condivisi ----------
create table glowup.questionnaires (
  id           uuid primary key default gen_random_uuid(),
  kind         glowup.questionnaire_kind not null,
  user_id      uuid not null references glowup.profiles(id) on delete cascade,
  company_id   uuid references glowup.companies(id) on delete cascade,
  answers      jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create table glowup.shared_files (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references glowup.companies(id) on delete cascade,
  file_path   text not null,                 -- storage: glowup-condivisi/<company_id>/...
  name        text not null,
  folder      text,
  uploaded_by uuid references glowup.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------- Notifiche e registro ----------
create table glowup.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references glowup.profiles(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create table glowup.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references glowup.profiles(id) on delete cascade,
  endpoint   text not null unique,
  keys       jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table glowup.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  company_id  uuid,
  data        jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- Indici (chiavi esterne e filtri delle regole di sicurezza) ----------
create index on glowup.profiles(company_id);
create index on glowup.visitors(company_id);
create index on glowup.availability(team_user_id);
create index on glowup.contracts(company_id);
create index on glowup.company_services(company_id);
create index on glowup.company_services(service_id);
create index on glowup.company_services(package_id);
create index on glowup.invoices(company_id);
create index on glowup.invoices(contract_id);
create index on glowup.projects(company_id);
create index on glowup.projects(service_id);
create index on glowup.works(company_id, status);
create index on glowup.works(project_id);
create index on glowup.works(created_by);
create index on glowup.work_versions(company_id);
create index on glowup.work_versions(uploaded_by);
create index on glowup.feedback(version_id);
create index on glowup.feedback(work_id);
create index on glowup.feedback(company_id);
create index on glowup.feedback(author_id);
create index on glowup.appointments(company_id, starts_at);
create index on glowup.appointments(visitor_user_id);
create index on glowup.appointments(project_id);
create index on glowup.appointments(created_by);
create index on glowup.appointments(starts_at);
create index on glowup.messages(conversation_id, created_at);
create index on glowup.messages(author_id);
create index on glowup.messages(work_id);
create index on glowup.messages(appointment_id);
create index on glowup.conversation_reads(user_id);
create index on glowup.tips(status, publish_at);
create index on glowup.tips(created_by);
create index on glowup.questionnaires(user_id);
create index on glowup.questionnaires(company_id);
create index on glowup.shared_files(company_id);
create index on glowup.shared_files(uploaded_by);
create index on glowup.notifications(user_id, created_at desc);
create index on glowup.push_subscriptions(user_id);
create index on glowup.audit_log(company_id, created_at desc);

-- ---------- RLS attiva su tutte le tabelle (le regole sono nella migrazione successiva) ----------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'glowup' loop
    execute format('alter table glowup.%I enable row level security', t);
  end loop;
end $$;

-- ---------- Dati iniziali (segnaposto, da sostituire) ----------
insert into glowup.packages (name, sort) values
  ('Business', 1), ('Comfort', 2), ('Smart', 3), ('Creative', 4), ('Su misura', 5);
insert into glowup.services (name, sort)
  select 'Servizio ' || g || ' (segnaposto)', g from generate_series(1, 8) g;
