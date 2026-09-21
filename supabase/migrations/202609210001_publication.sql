-- Idempotent setup migration. Safe to run multiple times without errors.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table if not exists private.site_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete restrict
);
revoke all on private.site_owner from public, anon, authenticated;
alter table private.site_owner enable row level security;

create or replace function public.is_owner() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists (select 1 from private.site_owner where user_id = (select auth.uid()));
$$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 200),
  excerpt text not null default '' check (length(excerpt) <= 400),
  body text not null check (length(trim(body)) between 1 and 200000),
  category text not null check (category in ('News', 'Reviews', 'Guides', 'Videos')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  cover_url text not null default '' check (cover_url = '' or cover_url ~ '^https://'),
  youtube_url text not null default '',
  score numeric(3,1) check (score between 0 and 10),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists posts_public_feed on public.posts(status, published_at desc);
alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update on public.posts to authenticated;

drop policy if exists "Read published articles or own drafts" on public.posts;
create policy "Read published articles or own drafts" on public.posts for select
  using ((status = 'published' and published_at <= now()) or (select public.is_owner()));

drop policy if exists "Only owner creates posts" on public.posts;
create policy "Only owner creates posts" on public.posts for insert to authenticated
  with check ((select public.is_owner()));

drop policy if exists "Only owner edits posts" on public.posts;
create policy "Only owner edits posts" on public.posts for update to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

create or replace function private.stamp_post() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  if new.status = 'published' then new.published_at = coalesce(new.published_at, now());
  else new.published_at = null; end if;
  return new;
end;
$$;

drop trigger if exists stamp_post on public.posts;
create trigger stamp_post before insert or update on public.posts for each row execute function private.stamp_post();

create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, post_id)
);
alter table public.bookmarks enable row level security;
revoke all on public.bookmarks from anon, authenticated;
grant select, insert, delete on public.bookmarks to authenticated;

drop policy if exists "Readers see their saved posts" on public.bookmarks;
create policy "Readers see their saved posts" on public.bookmarks for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Readers save published posts" on public.bookmarks;
create policy "Readers save published posts" on public.bookmarks for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.posts where id = post_id and status = 'published' and published_at <= now()));

drop policy if exists "Readers remove their saved posts" on public.bookmarks;
create policy "Readers remove their saved posts" on public.bookmarks for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists private.post_views (
  post_id uuid not null references public.posts(id) on delete cascade,
  visitor_id uuid not null,
  viewed_on date not null default (now() at time zone 'utc')::date,
  primary key (post_id, visitor_id, viewed_on)
);
alter table private.post_views enable row level security;
revoke all on private.post_views from public, anon, authenticated;

create or replace function public.record_post_view(post_id uuid, visitor_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if visitor_id is null or (select public.is_owner()) then return; end if;
  if exists (select 1 from public.posts p where p.id = post_id and p.status = 'published' and p.published_at <= now()) then
    insert into private.post_views(post_id, visitor_id) values (post_id, visitor_id) on conflict do nothing;
  end if;
end;
$$;
revoke all on function public.record_post_view(uuid, uuid) from public;
grant execute on function public.record_post_view(uuid, uuid) to anon, authenticated;

create or replace function public.post_stats() returns table(post_id uuid, total_views bigint, recent_views bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_owner() then raise exception 'Owner access required' using errcode = '42501'; end if;
  return query select p.id, count(v.post_id), count(v.post_id) filter (where v.viewed_on >= (now() at time zone 'utc')::date - 29)
    from public.posts p left join private.post_views v on p.id = v.post_id group by p.id;
end;
$$;
revoke all on function public.post_stats() from public;
grant execute on function public.post_stats() to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values ('covers', 'covers', true, 5242880, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do nothing;

drop policy if exists "Owner uploads covers" on storage.objects;
create policy "Owner uploads covers" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (select public.is_owner()));

commit;
