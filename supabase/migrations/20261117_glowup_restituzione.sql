-- Gl0w-up — quando il cliente approva un lavoro di tipo "Restituzione", il progetto passa a Strategia.
create or replace function glowup_private.apply_feedback() returns trigger
language plpgsql security definer set search_path = '' as $$
declare w record;
begin
  update glowup.works
     set status = case when new.outcome = 'approvato' then 'approvato'::glowup.work_status else 'in_modifica'::glowup.work_status end,
         archived_at = case when new.outcome = 'approvato' then now() end
   where id = new.work_id
   returning project_id, kind into w;
  if new.outcome = 'approvato' and w.project_id is not null and lower(coalesce(w.kind, '')) = 'restituzione' then
    update glowup.projects set step = 'strategia' where id = w.project_id and step in ('ascolto', 'restituzione');
  end if;
  return new;
end $$;
revoke execute on function glowup_private.apply_feedback() from public, anon, authenticated;
