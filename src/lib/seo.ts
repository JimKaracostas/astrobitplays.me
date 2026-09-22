import { categories, placeholder, safeImage } from './content'
import type { Post } from './content'

export const siteUrl = 'https://astrobitplays.me'
export const siteDescription = 'Gaming news, reviews, guides and videos from AstroBitPlays.'
export const articleUrl = (slug: string) => `${siteUrl}/?article=${encodeURIComponent(slug)}`
const organization = { '@type': 'Organization', name: 'AstroBitPlays', url: siteUrl, logo: { '@type': 'ImageObject', url: `${siteUrl}/logo.jpg` } }

export function plainDescription(value: string) {
  const text = value.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*_`>~]/g, '').replace(/\s+/g, ' ').trim()
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text
}

export function pageMetadata({ post, section = '', page = '', query = '', isSearch = false, slug = '', loading = false, error = false, unknownPath = false }: {
  post?: Post; section?: string; page?: string; query?: string; isSearch?: boolean; slug?: string; loading?: boolean; error?: boolean; unknownPath?: boolean
}) {
  const validSection = categories.some(category => category === section)
  const noindex = !!page || isSearch || unknownPath || (!!section && !validSection) || (!!slug && !post && !loading && !error)
  const title = post?.title || (unknownPath ? 'Page not found' : slug ? loading || error ? 'Article' : 'Article not found' : page === 'studio' ? 'Dashboard' : page === 'saved' ? 'Saved articles' : page === 'signin' ? 'Sign in' : isSearch ? query ? `Search: ${query}` : 'Search articles' : section || 'Gaming news, reviews & guides')
  const canonical = post ? articleUrl(post.slug) : slug ? articleUrl(slug) : validSection ? `${siteUrl}/?section=${encodeURIComponent(section)}` : `${siteUrl}/`
  const description = post ? plainDescription(post.excerpt || post.body) : validSection ? `The latest gaming ${section.toLowerCase()} from AstroBitPlays.` : siteDescription
  const image = new URL(post?.cover_url ? safeImage(post.cover_url) : placeholder, siteUrl).href
  const schema = noindex || (slug && !post) ? null : post ? {
    '@context': 'https://schema.org', '@type': post.category === 'News' ? 'NewsArticle' : 'Article',
    '@id': `${canonical}#article`, mainEntityOfPage: canonical, url: canonical,
    headline: post.title, description, image: [image], datePublished: post.published_at,
    dateModified: post.updated_at, articleSection: post.category, inLanguage: 'en',
    author: { '@type': 'Organization', name: 'AstroBitPlays', url: siteUrl }, publisher: organization,
  } : { '@context': 'https://schema.org', '@type': validSection ? 'CollectionPage' : 'WebSite', name: title, url: canonical, description, publisher: organization }
  return { title: `${title} | AstroBitPlays`, description, canonical, image, noindex, type: post ? 'article' : 'website', schema }
}

export function applyMetadata(metadata: ReturnType<typeof pageMetadata>) {
  document.title = metadata.title
  function meta(attribute: 'name' | 'property', name: string, content: string) {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
    if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, name); document.head.append(element) }
    element.content = content
  }
  meta('name', 'description', metadata.description)
  meta('name', 'robots', metadata.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large')
  meta('property', 'og:title', metadata.title)
  meta('property', 'og:description', metadata.description)
  meta('property', 'og:url', metadata.canonical)
  meta('property', 'og:type', metadata.type)
  meta('property', 'og:image', metadata.image)
  meta('name', 'twitter:card', 'summary_large_image')
  meta('name', 'twitter:title', metadata.title)
  meta('name', 'twitter:description', metadata.description)
  meta('name', 'twitter:image', metadata.image)
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical) }
  canonical.href = metadata.canonical
  document.getElementById('publication-schema')?.remove()
  if (metadata.schema) {
    const script = document.createElement('script'); script.id = 'publication-schema'; script.type = 'application/ld+json'
    script.textContent = JSON.stringify(metadata.schema); document.head.append(script)
  }
}
