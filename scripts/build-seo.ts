import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { sitemapXml, storyArchive } from "./seo-files";
import { siteUrl } from "../src/lib/seo";
import { categories } from "../src/lib/content";
import { articlePath, categoryPath } from "../src/lib/routes";
import { fetchPublication } from "./public-content";
import { renderPage } from "./prerender";

const now = new Date();
const { posts, settings, hash } = await fetchPublication(now);
const sitemap = sitemapXml(posts, now);
if (Buffer.byteLength(sitemap, "utf8") > 50 * 1024 * 1024)
  throw new Error("Sitemap exceeds the size limit.");
const shell = await readFile("dist/index.html", "utf8");
await mkdir("dist/stories", { recursive: true });
await writeFile("dist/sitemap.xml", sitemap);
await writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
);
await writeFile("dist/stories/index.html", storyArchive(posts, now));
await writeFile(
  "dist/content-version.json",
  JSON.stringify({ hash, built_at: now.toISOString(), articles: posts.length }),
);
await writeFile(
  "dist/404.html",
  shell
    .replace(
      /<title>[^<]*<\/title>/,
      "<title>Page not found | AstroBitPlays</title>",
    )
    .replace(
      'content="index, follow, max-image-preview:large"',
      'content="noindex, follow"',
    ),
);
const paths = ["/", ...categories.map(categoryPath), ...posts.map(articlePath)];
for (const path of paths) {
  if (!/^\/(?:[a-z0-9-]+\/)*$/.test(path))
    throw new Error("Invalid publication path");
  const file = join("dist", path.slice(1), "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, await renderPage(shell, path, posts, settings));
}
console.log(
  `Rendered ${paths.length} pages and rebuilt the sitemap from ${posts.length} published articles.`,
);
