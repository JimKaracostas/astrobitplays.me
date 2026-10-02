-- Enable permanent post deletion for the database-designated owner only.
begin;

grant delete on public.posts to authenticated;

drop policy if exists "Only owner deletes posts" on public.posts;
create policy "Only owner deletes posts" on public.posts for delete to authenticated
  using ((select public.is_owner()));

-- Existing foreign keys cascade bookmarks, views and revisions on deletion.
commit;
