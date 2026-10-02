import { test } from "node:test";
import assert from "node:assert/strict";
import { rssXml } from "./rss";
import type { Post } from "../src/lib/content";
import { emptyPost } from "../src/lib/editor";

const post: Post = {
  ...emptyPost, id: "one", slug: "one", title: "A & B <review>", excerpt: "A </description> & B\u0001",
  category: "Reviews", status: "published", published_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-02T10:00:00Z", created_at: "2026-09-01T10:00:00Z",
};
test("RSS includes only due public stories and safely escapes editorial text", () => {
  const xml = rssXml([
    post, { ...post, id: "draft", slug: "private-draft", status: "draft" },
    { ...post, id: "future", slug: "scheduled", published_at: "2030-01-01T00:00:00Z" },
    { ...post, id: "inactive", slug: "inactive", category: "Guides" as never },
  ], new Date("2026-10-02T00:00:00Z"));
  assert.equal((xml.match(/<item>/g) || []).length, 1);
  assert.match(xml, /A &amp; B &lt;review&gt;/);
  assert.match(xml, /&lt;\/description&gt; &amp; B/);
  assert.doesNotMatch(xml, /private-draft|scheduled|inactive/);
  assert.equal(xml.includes("\u0001"), false);
  assert.match(xml, /<pubDate>Tue, 01 Sep 2026 10:00:00 GMT<\/pubDate>/);
  assert.match(xml, /<link>https:\/\/astrobitplays.me\/reviews\/one\/<\/link>/);
  assert.match(xml, /atom:link.*rel="self"/);
});
test("RSS sorts and limits recent stories without mutating input, and identity survives URL changes", () => {
  const input = Array.from({ length: 55 }, (_, index) => ({ ...post, id: String(index), slug: `story-${index}`, published_at: new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString() }));
  const xml = rssXml(input, new Date("2026-10-02T00:00:00Z"));
  assert.equal((xml.match(/<item>/g) || []).length, 50);
  assert.ok(xml.indexOf("story-54/") < xml.indexOf("story-53/"));
  assert.doesNotMatch(xml, /story-4\//);
  assert.equal(input[0].id, "0");
  const guid = rssXml([post]).match(/<guid[^>]*>([^<]+)<\/guid>/)?.[1];
  assert.equal(rssXml([{ ...post, slug: "new-url" }]).match(/<guid[^>]*>([^<]+)<\/guid>/)?.[1], guid);
  assert.doesNotMatch(rssXml([]), /<item>/);
});
