import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { safeImage, placeholder } from './content'

interface MarkdownContentProps {
  content: string
}

function getFullText(node: ReactNode): string {
  if (!node) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getFullText).join('')
  if (typeof node === 'object' && node && 'props' in node) {
    return getFullText((node as { props?: { children?: ReactNode } }).props?.children)
  }
  return ''
}

function extractAllYoutubeIds(node: ReactNode): string[] {
  const ids: string[] = []
  function walk(n: ReactNode) {
    if (!n) return
    if (typeof n === 'string') {
      const regex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi
      let match: RegExpExecArray | null
      while ((match = regex.exec(n)) !== null) {
        if (!ids.includes(match[1])) ids.push(match[1])
      }
    } else if (Array.isArray(n)) {
      n.forEach(walk)
    } else if (typeof n === 'object' && n && 'props' in n) {
      const props = (n as { props?: { href?: string; children?: ReactNode } }).props
      if (props?.href) {
        const m = props.href.match(/(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i)
        if (m && !ids.includes(m[1])) ids.push(m[1])
      }
      if (props?.children) walk(props.children)
    }
  }
  walk(node)
  return ids
}

function extractAllTweets(node: ReactNode): Array<{ url: string; username: string; id: string }> {
  const tweets: Array<{ url: string; username: string; id: string }> = []
  function walk(n: ReactNode) {
    if (!n) return
    if (typeof n === 'string') {
      const regex = /(https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+))/gi
      let match: RegExpExecArray | null
      while ((match = regex.exec(n)) !== null) {
        if (!tweets.some(t => t.id === match![3])) {
          tweets.push({ url: match[1], username: match[2], id: match[3] })
        }
      }
    } else if (Array.isArray(n)) {
      n.forEach(walk)
    } else if (typeof n === 'object' && n && 'props' in n) {
      const props = (n as { props?: { href?: string; children?: ReactNode } }).props
      if (props?.href) {
        const m = props.href.match(/^https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/i)
        if (m && !tweets.some(t => t.id === m[2])) {
          tweets.push({ url: props.href, username: m[1], id: m[2] })
        }
      }
      if (props?.children) walk(props.children)
    }
  }
  walk(node)
  return tweets
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        img: ({ src, alt }) => (
          <figure className="body-image-figure">
            <img
              src={src ? safeImage(src) : placeholder}
              alt={alt || ''}
              loading="lazy"
              onError={e => {
                e.currentTarget.onerror = null
                e.currentTarget.src = placeholder
              }}
            />
            {alt && <figcaption className="image-caption">{alt}</figcaption>}
          </figure>
        ),
        p: ({ children }) => {
          const ytIds = extractAllYoutubeIds(children)
          const tweets = extractAllTweets(children)

          if (ytIds.length === 0 && tweets.length === 0) {
            return <p>{children}</p>
          }

          const rawText = getFullText(children).trim()
          const cleanText = rawText
            .replace(/https?:\/\/[^\s]+/gi, '')
            .replace(/[<>\[\]()]/g, '')
            .trim()
          const isSolelyEmbed = cleanText.length === 0

          return (
            <>
              {!isSolelyEmbed && <p>{children}</p>}
              {ytIds.map(id => (
                <div key={id} className="body-embed-wrapper">
                  <iframe
                    className="video body-video"
                    src={`https://www.youtube-nocookie.com/embed/${id}`}
                    title="YouTube video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              ))}
              {tweets.map(t => (
                <div key={t.id} className="tweet-embed-card">
                  <div className="tweet-header">
                    <span className="tweet-author">@{t.username} on X</span>
                    <span className="tweet-badge">X Post</span>
                  </div>
                  <p className="tweet-content">“{t.url}”</p>
                  <a className="tweet-link" href={t.url} target="_blank" rel="noopener noreferrer">
                    View on X (Twitter) →
                  </a>
                </div>
              ))}
            </>
          )
        },
        a: ({ href, children }) => {
          if (!href) return <span>{children}</span>
          return (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
