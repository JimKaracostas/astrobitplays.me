import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeImage, placeholder, youtubeId } from "./content";
import { remarkHeadingIds } from "./reader";
import { VideoEmbed } from "../VideoEmbed";

function collectText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (node && typeof node === "object" && "props" in node)
    return collectText((node.props as { children?: ReactNode }).children);
  return "";
}
function collectUrls(node: ReactNode): string[] {
  if (typeof node === "string") return node.split(/\s+/).filter(Boolean);
  if (Array.isArray(node)) return node.flatMap(collectUrls);
  if (node && typeof node === "object" && "props" in node) {
    const props = node.props as { href?: string; children?: ReactNode };
    return [
      ...(props.href ? [props.href] : []),
      ...collectUrls(props.children),
    ];
  }
  return [];
}
function tweet(value: string) {
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      !["x.com", "twitter.com", "www.x.com", "www.twitter.com"].includes(
        url.hostname,
      )
    )
      return null;
    const match = url.pathname.match(/^\/([\w]+)\/status\/(\d+)\/?$/);
    return match
      ? {
          username: match[1],
          id: match[2],
          url: `https://x.com/${match[1]}/status/${match[2]}`,
        }
      : null;
  } catch {
    return null;
  }
}

function videoTitle(node: ReactNode, id: string): string | undefined {
  if (Array.isArray(node)) return node.map((item) => videoTitle(item, id)).find(Boolean);
  if (node && typeof node === "object" && "props" in node) {
    const props = node.props as { href?: string; children?: ReactNode };
    const label = collectText(props.children).trim();
    if (youtubeId(props.href) === id && label && !youtubeId(label)) return label.slice(0, 200);
    return videoTitle(props.children, id);
  }
  return undefined;
}

export function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkHeadingIds]}
      skipHtml
      components={{
        img: ({ src, alt }) => (
          <figure className="body-image-figure">
            <img
              src={src ? safeImage(src) : placeholder}
              alt={alt || ""}
              loading="lazy"
              onError={(event) => {
                if (event.currentTarget.getAttribute("src") !== placeholder)
                  event.currentTarget.src = placeholder;
              }}
            />
            {alt && <figcaption className="image-caption">{alt}</figcaption>}
          </figure>
        ),
        p: ({ children, node }) => {
          const urls = [...new Set(collectUrls(children))];
          const videos = [
            ...new Set(urls.map(youtubeId).filter((id): id is string => !!id)),
          ];
          const tweets = [
            ...new Map(
              urls
                .map(tweet)
                .filter((item) => item !== null)
                .map((item) => [item.id, item]),
            ).values(),
          ];
          const embedUrls = urls.filter((url) => youtubeId(url) || tweet(url));
          const text = collectText(children).trim();
          // Only hide URLs that actually became embeds. Keep unrelated links and prose.
          const solelyEmbeds =
            embedUrls.length > 0 &&
            embedUrls
              .reduce((rest, url) => rest.split(url).join(""), text)
              .trim() === "";
          const hasImage = node?.children.some(
            (child) =>
              child.type === "element" &&
              (child.tagName === "img" ||
                child.children.some(
                  (inner) =>
                    inner.type === "element" && inner.tagName === "img",
                )),
          );
          return (
            <>
              {!solelyEmbeds &&
                (hasImage ? (
                  <div className="body-paragraph">{children}</div>
                ) : (
                  <p>{children}</p>
                ))}
              {videos.map((id) => (
                <div className="body-embed-wrapper" key={id}>
                  <VideoEmbed url={`https://youtu.be/${id}`} title={videoTitle(children, id)} />
                </div>
              ))}
              {tweets.map((item) => (
                <aside className="tweet-embed-card" key={item.id}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    View @{item.username}’s post on X
                  </a>
                </aside>
              ))}
            </>
          );
        },
        a: ({ href, children }) =>
          href ? (
            <a
              href={href}
              target={href.startsWith("#") || (href.startsWith("/") && !href.startsWith("//")) ? undefined : "_blank"}
              rel={href.startsWith("#") || (href.startsWith("/") && !href.startsWith("//")) ? undefined : "noopener noreferrer"}
            >
              {children}
            </a>
          ) : (
            <span>{children}</span>
          ),
        table: ({ children }) => (
          <div className="table-wrap">
            <table>{children}</table>
          </div>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
