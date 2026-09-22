import { categories } from '../src/lib/content'
import type { Post } from '../src/lib/content'
import { articleUrl, siteUrl } from '../src/lib/seo'

export type SitemapPost = Pick<Post, 'title' | 'slug' | 'category' | 'status' | 'published_at' | 'updated_at'>
export function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)
}
export function publicPosts(posts: SitemapPost[], now = new Date()) {
  return posts.filter(post => post.status === 'published' && post.published_at && Number.isFinite(Date.parse(post.published_at)) && Date.parse(post.published_at) <= now.getTime() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug))
}
export function sitemapXml(posts: SitemapPost[], now = new Date()) {
  const published = publicPosts(posts, now)
  function lastModified(items: SitemapPost[]) {
    const dates = items.map(post => Date.parse(post.updated_at)).filter(date => Number.isFinite(date) && date <= now.getTime())
    return dates.length ? new Date(Math.max(...dates)).toISOString() : undefined
  }
  const entries = [
    { url: `${siteUrl}/`, modified: lastModified(published) },
    { url: `${siteUrl}/stories/`, modified: lastModified(published) },
    { url: `${siteUrl}/privacy/`, modified: undefined },
    { url: `${siteUrl}/terms/`, modified: undefined },
    ...categories.filter(category => published.some(post => post.category === category)).map(category => ({ url: `${siteUrl}/?section=${category}`, modified: lastModified(published.filter(post => post.category === category)) })),
    ...published.map(post => ({ url: articleUrl(post.slug), modified: lastModified([post]) })),
  ]
  if (entries.length > 50000) throw new Error('Sitemap exceeds 50,000 URLs; split it into a sitemap index before deployment.')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(entry => `  <url><loc>${escapeXml(entry.url)}</loc>${entry.modified ? `<lastmod>${entry.modified}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`
}
export function storyArchive(posts: SitemapPost[], now = new Date()) {
  const published = publicPosts(posts, now)
  const sections = categories.filter(category => published.some(post => post.category === category)).map(category => `<section><h2>${category}</h2><ul>${published.filter(post => post.category === category).map(post => `<li><a href="${escapeXml(articleUrl(post.slug))}">${escapeXml(post.title)}</a><time datetime="${escapeXml(post.published_at!)}">${escapeXml(new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(post.published_at!)))}</time></li>`).join('')}</ul></section>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>All stories | AstroBitPlays</title><meta name="description" content="Browse published gaming news, reviews, guides and videos from AstroBitPlays."><meta name="robots" content="index, follow"><link rel="canonical" href="${siteUrl}/stories/"><link rel="icon" href="/logo.jpg"><style>body{margin:0;font:17px/1.65 Arial,sans-serif;color:#111721}header{background:#0b1b2c;color:#fff;padding:22px max(24px,calc((100% - 1000px)/2))}header a{color:inherit;font-weight:800;text-decoration:none}main{max-width:1000px;margin:40px auto;padding:0 24px}h1{font-size:36px}h2{border-bottom:2px solid #00a7df;padding-bottom:8px}ul{list-style:none;padding:0}li{padding:16px 0;border-bottom:1px solid #dce2e9}a{color:#08778f;overflow-wrap:anywhere}a:focus-visible{outline:3px solid #008aca;outline-offset:4px}time{display:block;color:#596477;font-size:14px}footer{padding:28px 0}footer a{margin-right:20px}</style></head><body><header><a href="/">ASTROBITPLAYS</a></header><main><h1>All stories</h1>${sections || '<p>No stories published yet.</p>'}<footer><a href="/">Home</a><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms of Service</a></footer></main></body></html>`
}
