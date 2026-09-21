import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { slugify, youtubeId, safeImage, validatePost, placeholder } from '../src/lib/content.ts'

test('Content validation rejects unsafe links and invalid scores', () => {
  assert.equal(slugify('A new world: Café!'), 'a-new-world-cafe')
  assert.equal(youtubeId('https://youtu.be/abcdefghijk'), 'abcdefghijk')
  assert.equal(youtubeId('https://www.youtube.com/shorts/abcdefghijk'), 'abcdefghijk')
  assert.equal(youtubeId('https://youtube.com.evil.test/watch?v=abcdefghijk'), null)
  assert.equal(youtubeId('javascript:alert(1)'), null)
  assert.equal(safeImage('javascript:alert(1)'), placeholder)
  const input = { title: 'Test', slug: 'test', body: 'Text', category: 'News', cover_url: '', youtube_url: '', score: null }
  assert.equal(validatePost(input), null)
  assert.ok(validatePost({ ...input, score: 11 }))
  assert.ok(validatePost({ ...input, category: 'Videos' }))
  assert.ok(validatePost({ ...input, body: '  ' }))
})

test('Database enforces owner-only publishing, reader isolation and real view counts', async () => {
  // All fixtures exist only in this disposable in-memory PostgreSQL instance.
  const db = new PGlite()
  const owner = '00000000-0000-4000-8000-000000000001'
  const reader = '00000000-0000-4000-8000-000000000002'
  const other = '00000000-0000-4000-8000-000000000003'
  const published = '10000000-0000-4000-8000-000000000001'
  const draft = '10000000-0000-4000-8000-000000000002'
  const visit = '20000000-0000-4000-8000-000000000001'
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth, storage to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant insert on storage.objects to authenticated;
    insert into auth.users values ('${owner}'), ('${reader}'), ('${other}');
  `)
  await db.exec(await readFile(new URL('../supabase/migrations/202609210001_publication.sql', import.meta.url), 'utf8'))
  await db.exec(`insert into private.site_owner(user_id) values ('${owner}')`)
  async function as(role, id, sql) {
    await db.exec('begin')
    try {
      await db.exec(`set local role ${role}`)
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id || ''])
      const result = await db.query(sql)
      await db.exec('commit')
      return result.rows
    } catch (error) { await db.exec('rollback'); throw error }
  }
  try {
    assert.equal((await as('anon', null, 'select public.is_owner() as owner'))[0].owner, false)
    assert.equal((await as('authenticated', owner, 'select public.is_owner() as owner'))[0].owner, true)
    await as('authenticated', owner, `insert into public.posts(id,title,slug,body,category,status) values ('${published}','Public','public','Article text','News','published'),('${draft}','Draft','draft','Private text','Reviews','draft')`)
    assert.equal((await as('anon', null, 'select * from public.posts')).length, 1)
    assert.equal((await as('authenticated', reader, 'select * from public.posts')).length, 1)
    assert.equal((await as('authenticated', owner, 'select * from public.posts')).length, 2)
    await assert.rejects(as('authenticated', reader, "insert into public.posts(title,slug,body,category) values ('Bad','bad','bad','News')"), /row-level security/)
    assert.equal((await as('authenticated', reader, `update public.posts set title='Hacked' where id='${published}' returning id`)).length, 0)
    await assert.rejects(as('authenticated', reader, `insert into private.site_owner(user_id) values ('${reader}')`), /permission denied/)
    await assert.rejects(db.exec(`insert into private.site_owner(user_id) values ('${reader}')`), /duplicate key/)
    await assert.rejects(as('authenticated', reader, 'select * from public.post_stats()'), /Owner access required/)
    await assert.rejects(as('anon', null, 'select * from public.post_stats()'), /permission denied/)
    await as('authenticated', reader, `insert into public.bookmarks(user_id,post_id) values ('${reader}','${published}')`)
    assert.equal((await as('authenticated', reader, 'select * from public.bookmarks')).length, 1)
    assert.equal((await as('authenticated', other, 'select * from public.bookmarks')).length, 0)
    await assert.rejects(as('authenticated', reader, `insert into public.bookmarks(user_id,post_id) values ('${other}','${published}')`), /row-level security/)
    await assert.rejects(as('authenticated', reader, `insert into public.bookmarks(user_id,post_id) values ('${reader}','${draft}')`), /row-level security/)
    await as('anon', null, `select public.record_post_view('${published}','${visit}')`)
    await as('anon', null, `select public.record_post_view('${published}','${visit}')`)
    await as('anon', null, `select public.record_post_view('${draft}','${visit}')`)
    await as('authenticated', owner, `select public.record_post_view('${published}','${owner}')`)
    const stats = await as('authenticated', owner, 'select * from public.post_stats()')
    assert.equal(Number(stats.find(row => row.post_id === published).total_views), 1)
    assert.equal(Number(stats.find(row => row.post_id === published).recent_views), 1)
    assert.equal(Number(stats.find(row => row.post_id === draft).total_views), 0)
    await assert.rejects(as('authenticated', reader, 'select * from private.post_views'), /permission denied/)
    await assert.rejects(as('authenticated', reader, "insert into storage.objects(bucket_id,name) values ('covers','bad.png')"), /row-level security/)
    await as('authenticated', owner, "insert into storage.objects(bucket_id,name) values ('covers','owner.png')")
    await as('authenticated', owner, `update public.posts set status='draft' where id='${published}'`)
    assert.equal((await as('anon', null, 'select * from public.posts')).length, 0)
    assert.equal((await as('authenticated', owner, `select published_at from public.posts where id='${published}'`))[0].published_at, null)
    await as('authenticated', owner, `update public.posts set status='published' where id='${published}'`)
    assert.equal((await as('anon', null, 'select * from public.posts')).length, 1)
  } finally { await db.close() }
})
