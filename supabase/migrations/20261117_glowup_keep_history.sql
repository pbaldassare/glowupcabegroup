-- Gl0w-up — se un utente cancella l'account, messaggi e riscontri restano nello storico
-- dell'agenzia senza autore (prima venivano cancellati a cascata).
alter table glowup.messages alter column author_id drop not null;
alter table glowup.messages drop constraint messages_author_id_fkey,
  add constraint messages_author_id_fkey foreign key (author_id) references glowup.profiles(id) on delete set null;
alter table glowup.feedback alter column author_id drop not null;
alter table glowup.feedback drop constraint feedback_author_id_fkey,
  add constraint feedback_author_id_fkey foreign key (author_id) references glowup.profiles(id) on delete set null;
