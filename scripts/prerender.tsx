import { renderToReadableStream } from "react-dom/server";
import { App } from "../src/App";
import type { Post, SiteSettings } from "../src/lib/content";
import { pageMetadata } from "../src/lib/seo";
import { parseRoute } from "../src/lib/routes";
import { escapeXml } from "./seo-files";

export const safeJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

export async function renderPage(
  shell: string,
  path: string,
  posts: Post[],
  settings: SiteSettings,
) {
  const route = parseRoute(path);
  const seed = posts.map((post) => ({
    ...post,
    body: post.slug === route.slug ? post.body : "",
  }));
  const stream = await renderToReadableStream(
    <App initialPosts={seed} initialSettings={settings} location={path} />,
  );
  await stream.allReady;
  const markup = await new Response(stream).text();
  const post = posts.find((item) => item.slug === route.slug);
  const meta = pageMetadata({ post, ...route });
  let head = `<title>${escapeXml(meta.title)}</title>\n<meta name="description" content="${escapeXml(meta.description)}">\n`;
  // The root also serves legacy query URLs. Their raw HTML must not canonicalize them to the homepage.
  if (path !== "/")
    head += `<link rel="canonical" href="${escapeXml(meta.canonical)}">\n`;
  for (const [name, value] of Object.entries({
    "og:title": meta.title,
    "og:description": meta.description,
    "og:url": meta.canonical,
    "og:type": meta.type,
    "og:image": meta.image,
  }))
    head += `<meta property="${name}" content="${escapeXml(value)}">\n`;
  for (const [name, value] of Object.entries({
    "twitter:card": "summary_large_image",
    "twitter:title": meta.title,
    "twitter:description": meta.description,
    "twitter:image": meta.image,
  }))
    head += `<meta name="${name}" content="${escapeXml(value)}">\n`;
  if (meta.schema)
    head += `<script type="application/ld+json" id="publication-schema">${safeJson(meta.schema)}</script>\n`;
  return shell
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(
      /<meta\s+(?:name="(?:description|twitter:[^"]+)"|property="og:(?:title|description|url|type|image)")[^>]*>/g,
      "",
    )
    .replace("</head>", `${head}</head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root">${markup}</div><script type="application/json" id="publication-data">${safeJson({ path, posts: seed, settings })}</script>`,
    );
}
