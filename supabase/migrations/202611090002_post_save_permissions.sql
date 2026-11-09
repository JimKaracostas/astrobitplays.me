-- Fix search trigger permissions on public.posts so authenticated owners can save and edit posts
begin;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'extensions') then
    execute 'grant usage on schema extensions to anon, authenticated';
  end if;

  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'make_post_search_vector'
  ) then
    execute $func$
      create or replace function private.refresh_post_search_vector() returns trigger
      language plpgsql security definer
      set search_path = '' as $f$
      begin
        new.search_vector := private.make_post_search_vector(new.title, new.excerpt, new.body);
        return new;
      end;
      $f$;
    $func$;
    execute 'grant execute on function private.refresh_post_search_vector() to authenticated';
    execute 'grant execute on function private.make_post_search_vector(text, text, text) to authenticated';
  end if;

  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'capture_revision'
  ) then
    execute 'grant execute on function private.capture_revision() to authenticated';
  end if;

  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'stamp_post'
  ) then
    execute 'grant execute on function private.stamp_post() to authenticated';
  end if;
end $$;

commit;
