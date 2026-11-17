-- Gl0w-up — spazi per i file (bucket privati) e regole d'accesso.
-- Convenzione dei percorsi: la prima cartella è l'id dell'azienda cliente.
--   glowup-lavori/<company_id>/<work_id>/<versione>/<file>
--   glowup-documenti/<company_id>/contratti|fatture/<file>
--   glowup-condivisi/<company_id>/<cartella>/<file>
--   glowup-messaggi/<company_id>/<file>  oppure  glowup-messaggi/visitatori/<user_id>/<file>
--   glowup-consigli/<file>
-- I file si aprono con link firmati a scadenza (createSignedUrl).

insert into storage.buckets (id, name, public, file_size_limit) values
  ('glowup-lavori',    'glowup-lavori',    false, 104857600),  -- 100 MB
  ('glowup-documenti', 'glowup-documenti', false, 20971520),   -- 20 MB
  ('glowup-condivisi', 'glowup-condivisi', false, 104857600),
  ('glowup-messaggi',  'glowup-messaggi',  false, 26214400),   -- 25 MB
  ('glowup-consigli',  'glowup-consigli',  false, 10485760)    -- 10 MB
on conflict (id) do nothing;

-- Lavori: T legge, A e O caricano; il cliente legge i file della propria azienda
create policy "glowup lavori lettura" on storage.objects for select to authenticated
  using (bucket_id = 'glowup-lavori' and (glowup_private.is_team()
         or (storage.foldername(name))[1] = glowup_private.client_company()::text));
create policy "glowup lavori scrittura" on storage.objects for insert to authenticated
  with check (bucket_id = 'glowup-lavori' and glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]));
create policy "glowup lavori modifica" on storage.objects for update to authenticated
  using (bucket_id = 'glowup-lavori' and glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]));
create policy "glowup lavori eliminazione" on storage.objects for delete to authenticated
  using (bucket_id = 'glowup-lavori' and glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]));

-- Documenti (contratti, fatture): A gestisce, C legge; il cliente legge i propri
create policy "glowup documenti lettura" on storage.objects for select to authenticated
  using (bucket_id = 'glowup-documenti' and (glowup_private.has_role(array['amministratore','commerciale']::glowup.team_role[])
         or (storage.foldername(name))[1] = glowup_private.client_company()::text));
create policy "glowup documenti scrittura" on storage.objects for insert to authenticated
  with check (bucket_id = 'glowup-documenti' and glowup_private.is_admin());
create policy "glowup documenti modifica" on storage.objects for update to authenticated
  using (bucket_id = 'glowup-documenti' and glowup_private.is_admin());
create policy "glowup documenti eliminazione" on storage.objects for delete to authenticated
  using (bucket_id = 'glowup-documenti' and glowup_private.is_admin());

-- Materiali condivisi: T legge, A e O caricano; il cliente legge e carica nella propria cartella
create policy "glowup condivisi lettura" on storage.objects for select to authenticated
  using (bucket_id = 'glowup-condivisi' and (glowup_private.is_team()
         or (storage.foldername(name))[1] = glowup_private.client_company()::text));
create policy "glowup condivisi scrittura" on storage.objects for insert to authenticated
  with check (bucket_id = 'glowup-condivisi' and (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[])
         or (storage.foldername(name))[1] = glowup_private.client_company_active()::text));
create policy "glowup condivisi eliminazione" on storage.objects for delete to authenticated
  using (bucket_id = 'glowup-condivisi' and (glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[])
         or ((storage.foldername(name))[1] = glowup_private.client_company_active()::text and owner_id = (select auth.uid())::text)));

-- Allegati dei messaggi: stessa logica delle conversazioni
create policy "glowup messaggi lettura" on storage.objects for select to authenticated
  using (bucket_id = 'glowup-messaggi' and (
         ((storage.foldername(name))[1] <> 'visitatori' and (glowup_private.is_team()
              or (storage.foldername(name))[1] = glowup_private.client_company()::text))
      or ((storage.foldername(name))[1] = 'visitatori' and (
              glowup_private.has_role(array['amministratore','commerciale']::glowup.team_role[])
              or (storage.foldername(name))[2] = (select auth.uid())::text))));
create policy "glowup messaggi scrittura" on storage.objects for insert to authenticated
  with check (bucket_id = 'glowup-messaggi' and (
         ((storage.foldername(name))[1] <> 'visitatori' and (
              glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[])
              or (storage.foldername(name))[1] = glowup_private.client_company_active()::text))
      or ((storage.foldername(name))[1] = 'visitatori' and (
              glowup_private.is_admin()
              or ((storage.foldername(name))[2] = (select auth.uid())::text and glowup_private.is_visitor())))));

-- Immagini dei consigli: le legge chi usa Gl0w-up; A e O caricano
create policy "glowup consigli lettura" on storage.objects for select to authenticated
  using (bucket_id = 'glowup-consigli' and glowup_private.has_profile());
create policy "glowup consigli scrittura" on storage.objects for insert to authenticated
  with check (bucket_id = 'glowup-consigli' and glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]));
create policy "glowup consigli eliminazione" on storage.objects for delete to authenticated
  using (bucket_id = 'glowup-consigli' and glowup_private.has_role(array['amministratore','operativo']::glowup.team_role[]));
