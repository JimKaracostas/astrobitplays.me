import ReactMarkdown from 'react-markdown'
import { youtubeId, safeImage, placeholder } from './content'

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
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
          if (typeof children === 'string') {
            const trimmed = children.trim()
            const yt = youtubeId(trimmed)
            if (yt) {
              return (
                <div className="body-embed-wrapper">
                  <iframe
                    className="video body-video"
                    src={`https://www.youtube-nocookie.com/embed/${yt}`}
                    title="YouTube video"
                    allow="encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              )
            }
            const tweet = trimmed.match(/^https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/i)
            if (tweet) {
              const username = tweet[1]
              return (
                <div className="tweet-embed-card">
                  <div className="tweet-header">
                    <span className="tweet-author">@{username} on X</span>
                    <span className="tweet-badge">X Post</span>
                  </div>
                  <p className="tweet-content">“{trimmed}”</p>
                  <a className="tweet-link" href={trimmed} target="_blank" rel="noopener noreferrer">
                    View on X (Twitter) →
                  </a>
                </div>
              )
            }
          }
          return <p>{children}</p>
        },
        a: ({ href, children }) => {
          if (!href) return <span>{children}</span>
          const yt = youtubeId(href)
          const text = String(children).trim()
          if (yt && (text === href || text.toLowerCase().includes('youtube') || text.toLowerCase().includes('video') || text === '')) {
            return (
              <span className="body-embed-wrapper">
                <iframe
                  className="video body-video"
                  src={`https://www.youtube-nocookie.com/embed/${yt}`}
                  title="YouTube video"
                  allow="encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                />
              </span>
            )
          }
          const tweetMatch = href.match(/^https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/i)
          if (tweetMatch && (text === href || text.toLowerCase().includes('twitter') || text.toLowerCase().includes('tweet') || text === '')) {
            const username = tweetMatch[1]
            return (
              <span className="tweet-embed-card">
                <span className="tweet-header">
                  <span className="tweet-author">@{username} on X</span>
                  <span className="tweet-badge">X Post</span>
                </span>
                <span className="tweet-content">{text !== href ? text : 'View post on X'}</span>
                <a className="tweet-link" href={href} target="_blank" rel="noopener noreferrer">
                  Open on X →
                </a>
              </span>
            )
          }
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
