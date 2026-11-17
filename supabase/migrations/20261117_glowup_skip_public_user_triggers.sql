-- Applicata il 17/11/2026 sul progetto Supabase ywsolxklcyctrezngclz.
-- Gli utenti di Gl0w-up (metadato app = 'glowup') non ricevono profilo e workspace
-- della piattaforma "alter ego" (schema public). Per tutti gli altri utenti nulla cambia.
-- Unica differenza rispetto a prima: il controllo is_glowup_user all'inizio delle due funzioni.
create or replace function public.is_glowup_user(u auth.users)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(u.raw_app_meta_data->>'app', u.raw_user_meta_data->>'app') = 'glowup'
$$;
revoke execute on function public.is_glowup_user(auth.users) from public, anon, authenticated;

create or replace function public.handle_new_user()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
BEGIN
  IF public.is_glowup_user(NEW) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

create or replace function public.handle_new_user_workspace()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
DECLARE
  _workspace_id uuid;
  _slug text;
  _base_slug text;
  _suffix int := 0;
BEGIN
  IF public.is_glowup_user(NEW) THEN
    RETURN NEW;
  END IF;

  -- Build a base slug from email local-part
  _base_slug := regexp_replace(lower(split_part(NEW.email, '@', 1)), '[^a-z0-9]+', '-', 'g');
  IF _base_slug IS NULL OR length(_base_slug) = 0 THEN
    _base_slug := 'workspace';
  END IF;
  _slug := _base_slug;

  -- Ensure slug uniqueness
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = _slug) LOOP
    _suffix := _suffix + 1;
    _slug := _base_slug || '-' || _suffix::text;
  END LOOP;

  -- Create workspace owned by the new user
  INSERT INTO public.workspaces (name, slug, owner_user_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'workspace_name', initcap(_base_slug) || '''s workspace'),
    _slug,
    NEW.id
  )
  RETURNING id INTO _workspace_id;

  -- Add the user as a member of the workspace
  INSERT INTO public.workspace_members (workspace_id, user_id)
  VALUES (_workspace_id, NEW.id)
  ON CONFLICT DO NOTHING;

  -- Grant client_owner role scoped to this workspace
  INSERT INTO public.user_roles (user_id, role, workspace_id)
  VALUES (NEW.id, 'client_owner', _workspace_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Le funzioni trigger non vanno chiamate via API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_user_workspace() from public, anon, authenticated;
