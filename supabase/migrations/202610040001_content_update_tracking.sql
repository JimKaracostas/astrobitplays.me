-- Track reader-visible edits separately from database bookkeeping timestamps.
begin;

alter table public.posts add column if not exists content_updated_at timestamptz;

-- Search-index backfills must not make every story appear newly edited.
create or replace function private.stamp_post() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := now();
  elsif row(new.title, new.slug, new.excerpt, new.body, new.category, new.status,
      new.cover_url, new.youtube_url, new.score, new.featured, new.pinned,
      new.feature_order, new.review_details, new.published_at)
      is distinct from
    row(old.title, old.slug, old.excerpt, old.body, old.category, old.status,
      old.cover_url, old.youtube_url, old.score, old.featured, old.pinned,
      old.feature_order, old.review_details, old.published_at) then
    new.updated_at := now();
  end if;
  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;

-- The indexed-search backfill recorded an automatic revision. Restore the
-- prior editorial timestamp when that revision changed only search_vector.
with ranked_revisions as (
  select post_id, snapshot,
    row_number() over (partition by post_id order by saved_at desc, id desc) as position
  from private.post_revisions
), migration_revision as (
  select latest.post_id, latest.snapshot as latest_snapshot,
    previous.snapshot as previous_snapshot
  from ranked_revisions latest
  join ranked_revisions previous on previous.post_id = latest.post_id and previous.position = 2
  where latest.position = 1
), restored as (
  select p.id,
    case
      when m.latest_snapshot ? 'search_vector'
        and not (m.previous_snapshot ? 'search_vector')
        and (m.latest_snapshot ->> 'updated_at')::timestamptz = p.updated_at
        and (m.latest_snapshot - 'search_vector' - 'updated_at') = (m.previous_snapshot - 'updated_at')
      then (m.previous_snapshot ->> 'updated_at')::timestamptz
      else p.updated_at
    end as editorial_updated_at
  from public.posts p
  left join migration_revision m on m.post_id = p.id
)
update public.posts p
set updated_at = restored.editorial_updated_at,
  content_updated_at = coalesce(restored.editorial_updated_at, p.published_at, p.created_at)
from restored
where restored.id = p.id and p.content_updated_at is null;

create or replace function private.set_content_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.content_updated_at := case when new.status = 'published'
      then coalesce(new.published_at, new.created_at, now()) else null end;
  elsif old.status is distinct from new.status and new.status = 'published' then
    new.content_updated_at := coalesce(new.published_at, now());
  elsif row(new.title, new.slug, new.excerpt, new.body, new.category, new.cover_url,
      new.youtube_url, new.score, new.review_details)
      is distinct from
    row(old.title, old.slug, old.excerpt, old.body, old.category, old.cover_url,
      old.youtube_url, old.score, old.review_details) then
    new.content_updated_at := case when new.status = 'published' then now() else null end;
  end if;
  return new;
end;
$$;
revoke all on function private.set_content_updated_at() from public, anon, authenticated;

drop trigger if exists update_content_updated_at on public.posts;
create trigger update_content_updated_at
before insert or update of title, slug, excerpt, body, category, cover_url,
  youtube_url, score, review_details, status on public.posts
for each row execute function private.set_content_updated_at();

commit;
