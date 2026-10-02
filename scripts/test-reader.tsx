import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ArticleReader } from "../src/ArticleReader";
import { MarkdownContent } from "../src/lib/MarkdownContent";
import { articleOutline, readingProgress } from "../src/lib/reader";
import { discoverStories } from "../src/lib/discovery";
import type { Post } from "../src/lib/content";
import { emptyPost } from "../src/lib/editor";

test("Article outlines match rendered heading anchors, including duplicate and Unicode headings", () => {
  const content = "## **Combat**\n\n## Combat\n\n### Combat 2\n\n## Κόσμος\n\nWorld design\n------------\n\n```md\n## Not a section\n```";
  const outline = articleOutline(content);
  assert.deepEqual(outline.map(({ id }) => id), [
    "section-combat", "section-combat-2", "section-combat-2-2", "section-κοσμος", "section-world-design",
  ]);
  const html = renderToStaticMarkup(<ArticleReader content={content} />);
  for (const { id } of outline) {
    assert.ok(html.includes(`href="#${id}"`));
    assert.ok(html.includes(`id="${id}"`));
  }
  assert.doesNotMatch(html, /href="#section-not-a-section"/);
  assert.match(html, /aria-label="Article text size"/);
  assert.match(html, /tabindex="-1"/);
  assert.doesNotMatch(renderToStaticMarkup(<ArticleReader content="A short article." />), /On this page/);
});

test("Fragment and relative article links stay in the reading tab; external links stay protected", () => {
  const html = renderToStaticMarkup(<MarkdownContent content="[Section](#section-combat) [News](/news/) [External](https://example.com) [Protocol relative](//example.com)" />);
  assert.match(html, /<a href="#section-combat">Section<\/a>/);
  assert.match(html, /<a href="\/news\/">News<\/a>/);
  assert.match(html, /href="https:\/\/example.com" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /href="\/\/example.com" target="_blank" rel="noopener noreferrer"/);
});

test("Reading progress tracks the article body and clamps outside its bounds", () => {
  assert.equal(readingProgress(1000, 2000, 1000), 0);
  assert.equal(readingProgress(0, 2000, 1000), 0.5);
  assert.equal(readingProgress(-1000, 2000, 1000), 1);
  assert.equal(readingProgress(-2000, 2000, 1000), 1);
  assert.equal(readingProgress(2000, 2000, 1000), 0);
  assert.equal(readingProgress(0, 0, 1000), 0);
});

const story: Post = {
  ...emptyPost, id: "title", title: "Café’s Wolverine review", slug: "review", category: "Reviews",
  excerpt: "Insomniac returns.", body: "Combat across a new world.", status: "published",
  published_at: "2026-09-01T10:00:00Z", created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-01T10:00:00Z",
};
const stories: Post[] = [
  { ...story, id: "body", title: "A new superhero game", body: "A cafe and Wolverine are in the story.", category: "News", published_at: "2026-09-20T10:00:00Z" },
  story,
  { ...story, id: "other", title: "Another review", excerpt: "Elsewhere.", body: "An unrelated game.", published_at: "2026-09-10T10:00:00Z" },
];
test("Discovery ranks titles first, accepts accents and apostrophes, and finds words across fields", () => {
  assert.deepEqual(discoverStories(stories, { query: "  WOLVERINE   café  ", sort: "relevance" }).map(({ id }) => id), ["title", "body"]);
  assert.deepEqual(discoverStories(stories, { query: "cafes" }).map(({ id }) => id), ["title"]);
  assert.deepEqual(discoverStories(stories, { query: "combat Insomniac" }).map(({ id }) => id), ["title"]);
  assert.deepEqual(discoverStories(stories, { query: "Wolverine missing" }), []);
  assert.deepEqual(stories.map(({ id }) => id), ["body", "title", "other"], "Searching never mutates the feed");
});
test("Discovery combines category and reading-list filters with deterministic date sorting", () => {
  assert.deepEqual(discoverStories(stories, { category: "Reviews", sort: "oldest" }).map(({ id }) => id), ["title", "other"]);
  assert.deepEqual(discoverStories(stories, { savedIds: ["body", "title"], category: "Reviews" }).map(({ id }) => id), ["title"]);
  assert.deepEqual(discoverStories(stories, { savedIds: [] }), []);
  assert.deepEqual(discoverStories(stories, { query: "   " }).map(({ id }) => id), ["body", "other", "title"]);
});
