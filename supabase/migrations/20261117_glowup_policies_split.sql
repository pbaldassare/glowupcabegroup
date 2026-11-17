-- Gl0w-up — separa le regole "for all" (wr) in insert/update/delete, così la lettura
-- passa da una sola regola (consiglio prestazioni di Supabase: multiple_permissive_policies).
-- Unisce anche le due regole di inserimento degli appuntamenti (team / visitatore).
do $$
declare p record;
begin
  for p in select tablename, qual from pg_policies where schemaname = 'glowup' and policyname = 'wr' loop
    execute format('drop policy wr on glowup.%I', p.tablename);
    execute format('create policy ins on glowup.%I for insert to authenticated with check (%s)', p.tablename, p.qual);
    execute format('create policy upd on glowup.%I for update to authenticated using (%s) with check (%s)', p.tablename, p.qual, p.qual);
    execute format('create policy del on glowup.%I for delete to authenticated using (%s)', p.tablename, p.qual);
  end loop;
end $$;

drop policy ins_team on glowup.appointments;
drop policy ins_visitor on glowup.appointments;
create policy ins on glowup.appointments for insert to authenticated
  with check (glowup_private.is_team()
              or (visitor_user_id = (select auth.uid()) and company_id is null and glowup_private.is_visitor()
                  and type = 'call' and status = 'da_confermare' and starts_at > now()
                  and mode in ('telefono', 'in_sede')));
