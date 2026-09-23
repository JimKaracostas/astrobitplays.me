begin;

alter table public.posts add column if not exists pinned boolean not null default false;
alter table public.posts add column if not exists feature_order integer not null default 0 check (feature_order between 0 and 99);
alter table public.posts add column if not exists review_details jsonb not null default '{}'::jsonb check (jsonb_typeof(review_details) = 'object' and octet_length(review_details::text) <= 20000);

create table if not exists public.site_settings (
  singleton boolean primary key default true check (singleton),
  featured_limit integer not null default 4 check (featured_limit between 2 and 5),
  section_order text[] not null default array['News','Reviews','Guides','Videos'] check (section_order <@ array['News','Reviews','Guides','Videos']::text[] and cardinality(section_order) between 1 and 4),
  updated_at timestamptz not null default now()
);
insert into public.site_settings(singleton) values (true) on conflict do nothing;
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
drop policy if exists "Public homepage settings" on public.site_settings;
create policy "Public homepage settings" on public.site_settings for select using (true);
drop policy if exists "Owner updates homepage settings" on public.site_settings;
create policy "Owner updates homepage settings" on public.site_settings for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create or replace function private.stamp_settings() returns trigger language plpgsql set search_path = '' as $$
begin
  if cardinality(new.section_order) <> (select count(distinct value) from unnest(new.section_order) value) then raise exception 'Homepage sections must be unique'; end if;
  new.updated_at = now(); return new;
end;
$$;
drop trigger if exists stamp_settings on public.site_settings;
create trigger stamp_settings before update on public.site_settings for each row execute function private.stamp_settings();

create table if not exists private.post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  saved_at timestamptz not null default now(),
  snapshot jsonb not null
);
create index if not exists post_revisions_post_saved on private.post_revisions(post_id, saved_at desc);
alter table private.post_revisions enable row level security;
revoke all on private.post_revisions from public, anon, authenticated;
create or replace function private.capture_revision() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into private.post_revisions(post_id, snapshot) values (new.id, to_jsonb(new));
  return new;
end;
$$;
revoke all on function private.capture_revision() from public;
drop trigger if exists capture_revision on public.posts;
create trigger capture_revision after insert or update on public.posts for each row execute function private.capture_revision();
insert into private.post_revisions(post_id, snapshot)
select p.id, to_jsonb(p) from public.posts p where not exists (select 1 from private.post_revisions r where r.post_id = p.id);

create or replace function public.post_revisions(article_id uuid) returns table(id uuid, saved_at timestamptz, snapshot jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'Owner access required' using errcode = '42501'; end if;
  return query select r.id, r.saved_at, r.snapshot from private.post_revisions r where r.post_id = article_id order by r.saved_at desc, r.id desc limit 30;
end;
$$;
revoke all on function public.post_revisions(uuid) from public;
grant execute on function public.post_revisions(uuid) to authenticated;

create or replace function public.restore_revision(revision_id uuid, expected_updated_at timestamptz) returns public.posts
language plpgsql security definer set search_path = '' as $$
declare revision private.post_revisions; restored public.posts;
begin
  if not public.is_owner() then raise exception 'Owner access required' using errcode = '42501'; end if;
  select * into revision from private.post_revisions where id = revision_id;
  if not found then raise exception 'Revision not found'; end if;
  update public.posts p set
    title = revision.snapshot->>'title', slug = revision.snapshot->>'slug', excerpt = revision.snapshot->>'excerpt',
    body = revision.snapshot->>'body', category = revision.snapshot->>'category',
    cover_url = revision.snapshot->>'cover_url', youtube_url = revision.snapshot->>'youtube_url',
    score = (revision.snapshot->>'score')::numeric,
    featured = coalesce((revision.snapshot->>'featured')::boolean, false),
    pinned = coalesce((revision.snapshot->>'pinned')::boolean, false),
    feature_order = coalesce((revision.snapshot->>'feature_order')::integer, 0),
    review_details = coalesce(revision.snapshot->'review_details', '{}'::jsonb),
    status = 'draft', published_at = null
  where p.id = revision.post_id and p.updated_at = expected_updated_at returning p.* into restored;
  if not found then raise exception 'This article changed. Reopen it before restoring.' using errcode = '40001'; end if;
  return restored;
end;
$$;
revoke all on function public.restore_revision(uuid, timestamptz) from public;
grant execute on function public.restore_revision(uuid, timestamptz) to authenticated;

grant select on storage.objects to authenticated;
drop policy if exists "Owner browses media" on storage.objects;
create policy "Owner browses media" on storage.objects for select to authenticated using (bucket_id = 'covers' and (select public.is_owner()));

commit;
