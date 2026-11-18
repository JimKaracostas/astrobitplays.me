import type { ReactNode } from "react";
import type { Element, ElementContent, Root, RootContent } from "hast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeImage, placeholder, youtubeId } from "./content";
import { remarkHeadingIds } from "./reader";
import { VideoEmbed } from "../VideoEmbed";

type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "break" }
  | { kind: "img"; node: Element };

const phrasingTags = new Set([
  "a", "abbr", "b", "bdi", "bdo", "cite", "code", "data", "del", "dfn",
  "em", "i", "ins", "kbd", "mark", "q", "rp", "rt", "ruby", "s", "samp",
  "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr",
]);
const headingTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const imageContainerTags = new Set([
  "p", "li", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote",
]);

function isIconImageSrc(src: unknown): boolean {
  return (
    typeof src === "string" &&
    (/trophy\.png/i.test(src) || /smilies/i.test(src))
  );
}

function collectInlineTokens(children: ElementContent[], out: InlineToken[]) {
  for (const child of children) {
    if (child.type === "text") {
      out.push({ kind: "text", value: child.value });
    } else if (child.type === "element") {
      if (child.tagName === "img") {
        out.push({ kind: "img", node: child });
      } else if (child.tagName === "br") {
        out.push({ kind: "break" });
      } else if (phrasingTags.has(child.tagName)) {
        collectInlineTokens(child.children, out);
      } else {
        out.push({ kind: "break" });
      }
    }
  }
}

function hasTextBeforeBreak(
  tokens: InlineToken[],
  start: number,
  step: -1 | 1,
): boolean {
  for (let i = start + step; i >= 0 && i < tokens.length; i += step) {
    const token = tokens[i];
    if (token.kind === "break") return false;
    if (token.kind !== "text") continue;
    const nl =
      step < 0 ? token.value.lastIndexOf("\n") : token.value.indexOf("\n");
    const segment =
      nl === -1
        ? token.value
        : step < 0
          ? token.value.slice(nl + 1)
          : token.value.slice(0, nl);
    if (/\S/.test(segment)) return true;
    if (nl !== -1) return false;
  }
  return false;
}

function hasSameLineText(tokens: InlineToken[], index: number): boolean {
  return (
    hasTextBeforeBreak(tokens, index, -1) ||
    hasTextBeforeBreak(tokens, index, 1)
  );
}

function classList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  return [];
}

function addClassName(el: Element, name: string) {
  const classes = classList(el.properties.className);
  if (!classes.includes(name)) classes.push(name);
  el.properties.className = classes;
}

function isInlineImageElement(el: Element): boolean {
  const classes = classList(el.properties?.className);
  return (
    classes.includes("body-inline-icon") ||
    classes.includes("body-inline-image")
  );
}

function hasDescendantElement(
  node: Element | undefined,
  predicate: (el: Element) => boolean,
): boolean {
  if (!node) return false;
  return node.children.some((child) => {
    if (child.type !== "element") return false;
    return predicate(child) || hasDescendantElement(child, predicate);
  });
}

function classifyContainerImages(container: Element) {
  const tokens: InlineToken[] = [];
  collectInlineTokens(container.children, tokens);
  const imgs = tokens.filter((token) => token.kind === "img");
  if (imgs.length === 0) return;

  const hasOtherContent = tokens.some(
    (token) =>
      token.kind === "break" ||
      (token.kind === "text" && /\S/.test(token.value)),
  );
  const isStandaloneParagraph =
    container.tagName === "p" && imgs.length === 1 && !hasOtherContent;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind !== "img") continue;
    const img = token.node;
    if (isIconImageSrc(img.properties?.src)) {
      addClassName(img, "body-inline-icon");
    } else if (isStandaloneParagraph) {
      // Standalone paragraph images render as block <figure> elements with captions.
      continue;
    } else if (
      headingTags.has(container.tagName) ||
      hasSameLineText(tokens, i)
    ) {
      addClassName(img, "body-inline-icon");
    } else {
      addClassName(img, "body-inline-image");
    }
  }
}

/** Classifies markdown images as standalone figures, inline icons, or inline images. */
function rehypeClassifyImages() {
  return (tree: Root) => {
    function visit(node: Root | RootContent) {
      if (node.type === "element") {
        if (imageContainerTags.has(node.tagName)) {
          classifyContainerImages(node);
        }
        for (const child of node.children) {
          if (child.type !== "element" || !phrasingTags.has(child.tagName)) {
            visit(child);
          }
        }
        return;
      }
      if ("children" in node) {
        for (const child of node.children) visit(child);
      }
    }
    visit(tree);
  };
}

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
      rehypePlugins={[rehypeClassifyImages]}
      skipHtml
      components={{
        img: ({ src, alt, className }) => {
          const safeSrc = src ? safeImage(src) : placeholder;
          const classes = classList(className);
          if (isIconImageSrc(src) && !classes.includes("body-inline-icon")) {
            classes.push("body-inline-icon");
          }
          const inlineClass = classes.join(" ") || undefined;
          const image = (
            <img
              className={inlineClass}
              src={safeSrc}
              alt={alt || ""}
              loading="lazy"
              onError={(event) => {
                if (event.currentTarget.getAttribute("src") !== placeholder)
                  event.currentTarget.src = placeholder;
              }}
            />
          );
          if (inlineClass) return image;
          return (
            <figure className="body-image-figure">
              {image}
              {alt && <figcaption className="image-caption">{alt}</figcaption>}
            </figure>
          );
        },
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
          const hasFigure = hasDescendantElement(
            node,
            (el) => el.tagName === "img" && !isInlineImageElement(el),
          );
          const hasImg = hasDescendantElement(
            node,
            (el) => el.tagName === "img",
          );
          // Only hide URLs that actually became embeds. Keep unrelated links and prose.
          const solelyEmbeds =
            !hasImg &&
            embedUrls.length > 0 &&
            embedUrls
              .reduce((rest, url) => rest.split(url).join(""), text)
              .trim() === "";
          return (
            <>
              {!solelyEmbeds &&
                (hasFigure ? (
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
