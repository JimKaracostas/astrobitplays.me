-- Search published stories in Postgres so readers do not download every full article.
begin;

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

alter table public.posts add column if not exists search_vector tsvector;

create or replace function private.make_post_search_vector(
  post_title text,
  post_excerpt text,
  post_body text
) returns tsvector
language sql stable
set search_path = '' as $$
  select
    setweight(to_tsvector('simple', extensions.unaccent(coalesce(post_title, ''))), 'A') ||
    setweight(to_tsvector('simple', extensions.unaccent(coalesce(post_excerpt, ''))), 'B') ||
    setweight(to_tsvector('simple', extensions.unaccent(coalesce(post_body, ''))), 'C');
$$;
revoke all on function private.make_post_search_vector(text, text, text) from public, anon, authenticated;

create or replace function private.refresh_post_search_vector() returns trigger
language plpgsql
set search_path = '' as $$
begin
  new.search_vector := private.make_post_search_vector(new.title, new.excerpt, new.body);
  return new;
end;
$$;
revoke all on function private.refresh_post_search_vector() from public, anon, authenticated;

drop trigger if exists refresh_post_search_vector on public.posts;
create trigger refresh_post_search_vector
before insert or update of title, excerpt, body on public.posts
for each row execute function private.refresh_post_search_vector();

update public.posts
set search_vector = private.make_post_search_vector(title, excerpt, body)
where search_vector is null;

create index if not exists posts_public_search on public.posts using gin(search_vector)
where status = 'published';

create or replace function public.search_posts(
  search_text text,
  search_category text default null,
  result_offset integer default 0,
  result_limit integer default 1000
)
returns table(
  id uuid,
  title text,
  slug text,
  excerpt text,
  category text,
  status text,
  cover_url text,
  youtube_url text,
  score numeric,
  featured boolean,
  pinned boolean,
  feature_order integer,
  review_details jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  published_at timestamptz,
  search_rank real
)
language plpgsql stable security definer
set search_path = '' as $$
declare
  search_query tsquery;
begin
  search_query := websearch_to_tsquery('simple', extensions.unaccent(coalesce(search_text, '')));
  if numnode(search_query) = 0 then return; end if;

  return query
  select p.id, p.title, p.slug, p.excerpt, p.category, p.status, p.cover_url,
    p.youtube_url, p.score, p.featured, p.pinned, p.feature_order, p.review_details,
    p.created_at, p.updated_at, p.published_at,
    ts_rank_cd(p.search_vector, search_query, 32) as search_rank
  from public.posts p
  where p.status = 'published'
    and p.published_at <= now()
    and p.category in ('News', 'Reviews')
    and (search_category is null or p.category = search_category)
    and p.search_vector @@ search_query
  order by ts_rank_cd(p.search_vector, search_query, 32) desc, p.published_at desc, p.id
  limit least(greatest(coalesce(result_limit, 1000), 1), 1000)
  offset greatest(coalesce(result_offset, 0), 0);
end;
$$;
revoke all on function public.search_posts(text, text, integer, integer) from public;
grant execute on function public.search_posts(text, text, integer, integer) to anon, authenticated;

commit;
