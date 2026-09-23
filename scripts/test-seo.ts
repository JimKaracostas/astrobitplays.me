import { test } from "node:test";
import assert from "node:assert/strict";
import { pageMetadata, articleUrl, plainDescription } from "../src/lib/seo";
import { sitemapXml, storyArchive } from "./seo-files";
import type { Post } from "../src/lib/content";

const post: Post = {
  id: "published",
  title: "A game & its world",
  slug: "a-game",
  excerpt: "An honest review.",
  body: "Full article body.",
  category: "Reviews",
  status: "published",
  cover_url: "https://example.com/cover.jpg",
  youtube_url: "",
  score: 8,
  featured: false,
  created_at: "2026-09-01T09:00:00Z",
  published_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-02T10:00:00Z",
};
const now = new Date("2026-09-22T12:00:00Z");
test("Sitemap contains only published, due articles and accurate modification dates", () => {
  const xml = sitemapXml(
    [
      post,
      { ...post, slug: "private-draft", status: "draft" },
      { ...post, slug: "future-post", published_at: "2030-01-01T00:00:00Z" },
    ],
    now,
  );
  assert.match(
    xml,
    /<loc>https:\/\/astrobitplays.me\/reviews\/a-game\/<\/loc>/,
  );
  assert.match(xml, /<lastmod>2026-09-02T10:00:00.000Z<\/lastmod>/);
  assert.match(xml, /\/reviews\//);
  assert.doesNotMatch(
    xml,
    /private-draft|future-post|\/news\/|page=studio|\?q=/,
  );
  assert.doesNotMatch(xml, /2026-09-22/);
  assert.doesNotMatch(
    sitemapXml([], now),
    /lastmod|\/(news|reviews|guides|videos)\//,
  );
});
test("Article metadata uses its canonical URL and actual publication data", () => {
  const meta = pageMetadata({ post, slug: post.slug });
  assert.equal(meta.canonical, articleUrl(post.slug, post.category));
  assert.equal(meta.description, post.excerpt);
  assert.equal(meta.image, post.cover_url);
  assert.equal(meta.noindex, false);
  assert.equal(meta.schema?.["@type"], "Article");
  assert.equal(
    (meta.schema as Record<string, unknown>).datePublished,
    post.published_at,
  );
  assert.equal(
    pageMetadata({ post: { ...post, category: "News" } }).schema?.["@type"],
    "NewsArticle",
  );
  assert.ok(!JSON.stringify(meta.schema).includes("aggregateRating"));
});
test("Account pages, search results and missing stories are excluded from indexing", () => {
  for (const state of [
    { page: "studio" },
    { page: "saved" },
    { page: "signin" },
    { isSearch: true, query: "" },
    { isSearch: true, query: "games" },
    { slug: "missing" },
    { unknownPath: true },
    { section: "Unknown" },
  ]) {
    const meta = pageMetadata(state);
    assert.equal(meta.noindex, true);
    assert.equal(meta.schema, null);
  }
  assert.equal(pageMetadata({ slug: "loading", loading: true }).noindex, false);
  assert.equal(
    pageMetadata({ slug: "temporary-outage", error: true }).noindex,
    false,
  );
  assert.equal(
    pageMetadata({ section: "News" }).canonical,
    "https://astrobitplays.me/news/",
  );
});
test("The HTML archive escapes titles and excludes drafts; descriptions remove Markdown", () => {
  const html = storyArchive(
    [
      { ...post, title: "<script>alert(1)</script> & title" },
      { ...post, slug: "draft-secret", status: "draft" },
    ],
    now,
  );
  assert.doesNotMatch(html, /<script>|draft-secret/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; title/);
  assert.match(html, /href="https:\/\/astrobitplays.me\/reviews\/a-game\/"/);
  assert.equal(
    plainDescription("## A **bold** [link](https://example.com)"),
    "A bold link",
  );
  assert.ok(plainDescription("A".repeat(300)).length <= 160);
});
