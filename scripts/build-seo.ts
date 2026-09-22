import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { sitemapXml, storyArchive } from './seo-files'
import type { SitemapPost } from './seo-files'
import { siteUrl } from '../src/lib/seo'

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }
const origin = env.VITE_SUPABASE_URL || 'https://yodtnppcsmyeymbnmvsu.supabase.co'
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-3AWyMVXqorNfmZoBDmKnA_ZWGXBe0O'
const now = new Date()
const posts: SitemapPost[] = []
// Anonymous, read-only request: never use an owner session or service-role key.
for (let offset = 0; ; offset += 1000) {
  const url = new URL('/rest/v1/posts', origin)
  url.search = new URLSearchParams({ select: 'title,slug,category,status,published_at,updated_at', status: 'eq.published', published_at: `lte.${now.toISOString()}`, order: 'published_at.desc,id.asc', offset: String(offset), limit: '1000' }).toString()
  const response = await fetch(url, { headers: { apikey: key }, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Cannot build sitemap: public posts request failed (${response.status}). Keeping the existing deployment is safer than deploying an incomplete sitemap.`)
  const batch = await response.json() as SitemapPost[]
  if (!Array.isArray(batch)) throw new Error('Unexpected public posts response; sitemap generation stopped.')
  posts.push(...batch)
  if (batch.length < 1000) break
}
const sitemap = sitemapXml(posts, now)
if (Buffer.byteLength(sitemap, 'utf8') > 50 * 1024 * 1024) throw new Error('Sitemap exceeds the uncompressed size limit.')
await mkdir('dist/stories', { recursive: true })
await writeFile('dist/sitemap.xml', sitemap)
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`)
await writeFile('dist/stories/index.html', storyArchive(posts, now))
const shell = await readFile('dist/index.html', 'utf8')
await writeFile('dist/404.html', shell.replace(/<title>[^<]*<\/title>/, '<title>Page not found | AstroBitPlays</title>').replace('content="index, follow, max-image-preview:large"', 'content="noindex, follow"'))
console.log(`Built sitemap and crawlable archive from ${posts.length} published articles.`)
