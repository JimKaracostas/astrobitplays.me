export const categories = ['News', 'Reviews', 'Guides', 'Videos'] as const
export type Category = typeof categories[number]
export interface Post {
  id: string
  title: string
  slug: string
  excerpt: string
  body: string
  category: Category
  status: 'draft' | 'published'
  cover_url: string
  youtube_url: string
  score: number | null
  featured: boolean
  created_at: string
  updated_at: string
  published_at: string | null
}
export type PostInput = Omit<Post, 'id' | 'created_at' | 'updated_at'>
export const placeholder = '/galaxy-placeholder.png'
export function slugify(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
export function youtubeId(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    const host = url.hostname.replace(/^(www|m)\./, '')
    const id = host === 'youtu.be' ? url.pathname.slice(1) : ['youtube.com', 'youtube-nocookie.com'].includes(host)
      ? url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1] : null
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch { return null }
}
export function safeImage(value: string) {
  if (!value || typeof value !== 'string') return placeholder
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value
  try { return ['https:', 'http:'].includes(new URL(value).protocol) ? value : placeholder } catch { return placeholder }
}
export function validatePost(post: PostInput) {
  if (!post.title.trim()) return 'Add a title.'
  if (post.title.trim().length > 200) return 'Keep the title under 201 characters.'
  if (post.slug.length > 200) return 'Keep the article URL under 201 characters.'
  if (post.excerpt?.length > 400) return 'Keep the summary under 401 characters.'
  if (post.body.length > 200000) return 'The article is too long to save.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) return 'Use lowercase letters, numbers and hyphens for the URL.'
  if (!post.body.trim()) return 'Write the article before saving.'
  if (post.cover_url && (!post.cover_url.startsWith('https://') || safeImage(post.cover_url) === placeholder)) return 'Use an HTTPS cover image URL, or leave it blank for the galaxy cover.'
  if (post.youtube_url && !youtubeId(post.youtube_url)) return 'Enter a valid YouTube video URL.'
  if (post.category === 'Videos' && !youtubeId(post.youtube_url)) return 'Add a YouTube URL for this video post.'
  if (post.score !== null && (!Number.isFinite(post.score) || post.score < 0 || post.score > 10)) return 'The review score must be between 0 and 10.'
  return null
}
export function formatDate(date: string | null) {
  return date ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date)) : 'Draft'
}
export function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.ceil(words / 220))
  return `${minutes} min read`
}
