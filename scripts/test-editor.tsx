import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { MarkdownContent } from '../src/lib/MarkdownContent'
import { backupKey, decodeBackup, emptyPost, insertText, markdownImage } from '../src/lib/editor'
import { youtubeId, validatePost } from '../src/lib/content'

test('Draft backups are account-scoped and malformed storage cannot crash the editor', () => {
  assert.notEqual(backupKey('owner-a'), backupKey('owner-b'))
  assert.equal(decodeBackup('{broken'), null)
  assert.equal(decodeBackup(JSON.stringify({ version: 1, form: { body: 'only body' } })), null)
  const backup = { version: 1, form: { ...emptyPost, title: 'Unfinished article', body: 'Unsaved text' }, baseUpdatedAt: '2026-09-21T10:00:00Z', savedAt: '2026-09-22T11:00:00Z' }
  assert.deepEqual(decodeBackup(JSON.stringify(backup)), backup)
  assert.equal(decodeBackup(JSON.stringify({ ...backup, form: { ...backup.form, score: 'bad' } })), null)
})

test('Formatting and image insertion preserve surrounding text and selection', () => {
  assert.deepEqual(insertText('Hello world!', 6, 11, '**', '**'), { text: 'Hello **world**!', start: 8, end: 13 })
  const image = markdownImage('A [forest]\nscene', 'https://images.example/test.png')
  const result = insertText('Before. After.', 7, 7, image, '', '')
  assert.equal(result.text, 'Before.' + image + ' After.')
  assert.ok(!result.text.includes('text'))
  assert.ok(!image.includes('[forest]'))
})

test('Only recognized video hosts are embedded', () => {
  assert.equal(youtubeId('youtube.com/watch?v=abcdefghijk'), 'abcdefghijk')
  assert.equal(youtubeId('https://www.youtube-nocookie.com/embed/abcdefghijk'), 'abcdefghijk')
  assert.equal(youtubeId('https://youtube.com/live/abcdefghijk?t=12'), 'abcdefghijk')
  assert.equal(youtubeId('https://evil.example/youtube.com/watch?v=abcdefghijk'), null)
  assert.equal(youtubeId('https://youtu.be/abcdefghijk-extra'), null)
  const html = renderToStaticMarkup(<MarkdownContent content={'https://youtu.be/abcdefghijk\n\n[Reference](https://example.com)'} />)
  assert.match(html, /youtube-nocookie\.com\/embed\/abcdefghijk/)
  assert.match(html, /href="https:\/\/example.com"/)
  const mixed = renderToStaticMarkup(<MarkdownContent content={'https://youtu.be/abcdefghijk https://example.com'} />)
  assert.match(mixed, /href="https:\/\/example.com"/)
})

test('Inline images produce valid block structure and unsafe markup stays inert', () => {
  const html = renderToStaticMarkup(<MarkdownContent content={'![Caption](https://example.com/image.png)\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))'} />)
  assert.match(html, /<figure/)
  assert.match(html, /<figcaption[^>]*>Caption/)
  assert.doesNotMatch(html, /<p><figure/)
  assert.doesNotMatch(html, /<script/)
  assert.doesNotMatch(html, /href="javascript:/)
})

test('Cover validation agrees with the database HTTPS constraint', () => {
  const input = { ...emptyPost, title: 'Article', slug: 'article', body: 'Body' }
  assert.equal(validatePost(input), null)
  assert.ok(validatePost({ ...input, cover_url: 'http://example.com/image.png' }))
  assert.ok(validatePost({ ...input, cover_url: '/logo.png' }))
  assert.equal(validatePost({ ...input, cover_url: 'https://example.com/image.png' }), null)
})
