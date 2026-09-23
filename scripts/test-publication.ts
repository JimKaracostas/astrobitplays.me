import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultSettings, featuredStories, normalizeSettings, publicationState } from '../src/lib/content'
import type { Post } from '../src/lib/content'
import { decodeBackup, emptyPost } from '../src/lib/editor'
import { parseRoute } from '../src/lib/routes'
import { renderPage, safeJson } from './prerender'

const article: Post = { ...emptyPost, id: 'one', slug: 'review-one', title: 'Review one', body: 'An article with **formatted text**.', category: 'Reviews', status: 'published', published_at: '2026-09-01T10:00:00Z', created_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z' }

test('Clean and legacy routes resolve; inactive sections are not public routes', () => {
  assert.equal(parseRoute('/reviews/review-one/').slug, article.slug)
  assert.equal(parseRoute('/?article=review-one').slug, article.slug)
  assert.equal(parseRoute('/news/').section, 'News')
  for (const path of ['/guides/', '/videos/', '/reviews/a/b/', '/other/']) assert.equal(parseRoute(path).unknownPath, true)
  assert.deepEqual(normalizeSettings({ section_order: ['Guides', 'Reviews', 'Videos', 'News'] as never }).section_order, ['Reviews', 'News'])
})

test('Pinned stories precede featured stories and dates define scheduled publication', () => {
  const input = [article, { ...article, id: 'two', featured: true }, { ...article, id: 'three', pinned: true }]
  assert.deepEqual(featuredStories(input, 2).map(post => post.id), ['three', 'two'])
  assert.deepEqual(input.map(post => post.id), ['one', 'two', 'three'])
  assert.equal(publicationState({ status: 'published', published_at: '2030-01-01' }, Date.parse('2026-09-23')), 'scheduled')
  assert.equal(publicationState(article, Date.parse('2026-09-23')), 'published')
})

test('Malformed saved review details cannot crash the editor', () => {
  const decoded = decodeBackup(JSON.stringify({ version: 1, form: { ...emptyPost, review_details: { game: {}, platforms: 'bad', pros: [null, 'A point'] } }, baseUpdatedAt: null, savedAt: '2026-09-23T10:00:00Z' }))
  assert.equal(decoded?.form.review_details?.game, '')
  assert.deepEqual(decoded?.form.review_details?.platforms, [])
  assert.deepEqual(decoded?.form.review_details?.pros, ['A point'])
})

test('Prerendered articles include full text, social metadata and safely escaped bootstrap data', async () => {
  const shell = '<html><head><title>Original</title></head><body><div id="root"></div></body></html>'
  const html = await renderPage(shell, '/reviews/review-one/', [article], defaultSettings)
  assert.match(html, /<strong>formatted text<\/strong>/)
  assert.match(html, /property="og:title" content="Review one/)
  assert.match(html, /rel="canonical" href="https:\/\/astrobitplays.me\/reviews\/review-one\/"/)
  assert.match(html, /application\/ld\+json/)
  assert.doesNotMatch(safeJson({ value: '</script><script>alert(1)</script>' }), /</)
})
