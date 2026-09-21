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
export function youtubeId(value: string): string | null {
  if (!value.trim()) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    const host = url.hostname.replace(/^www\./, '')
    const id = host === 'youtu.be' ? url.pathname.slice(1) : ['youtube.com', 'm.youtube.com'].includes(host)
      ? (url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1]) : null
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch { return null }
}
export function safeImage(value: string) {
  try { return new URL(value).protocol === 'https:' ? value : placeholder } catch { return placeholder }
}
export function validatePost(post: PostInput) {
  if (!post.title.trim()) return 'Add a title.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) return 'Use lowercase letters, numbers and hyphens for the URL.'
  if (!post.body.trim()) return 'Write the article before saving.'
  if (post.cover_url && safeImage(post.cover_url) === placeholder) return 'Use an HTTPS cover image URL.'
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

