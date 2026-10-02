import type { Post } from "../src/lib/content";
import { articleUrl, siteDescription, siteUrl } from "../src/lib/seo";
import { escapeXml, publicPosts } from "./seo-files";

export function rssXml(posts: Post[], now = new Date()) {
  const published = publicPosts(posts, now)
    .sort((a, b) => Date.parse(b.published_at!) - Date.parse(a.published_at!) || a.id.localeCompare(b.id))
    .slice(0, 50);
  const items = published.map((post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(articleUrl(post.slug, post.category))}</link>
      <guid isPermaLink="false">${escapeXml(`${siteUrl}/posts/${post.id}`)}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <category>${escapeXml(post.category)}</category>
      <pubDate>${new Date(post.published_at!).toUTCString()}</pubDate>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AstroBitPlays</title>
    <link>${siteUrl}/</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>en</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}
