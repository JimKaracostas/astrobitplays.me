import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoEmbed } from "../src/VideoEmbed";
import { MarkdownContent } from "../src/lib/MarkdownContent";

test("Video cards make no player or thumbnail request before activation and keep an external fallback", () => {
  const html = renderToStaticMarkup(<VideoEmbed url="https://youtu.be/abcdefghijk" title="Launch trailer" />);
  assert.doesNotMatch(html, /<iframe|<img|<link|src=/);
  assert.match(html, /aria-label="Play Launch trailer"/);
  assert.match(html, /aria-describedby=/);
  assert.match(html, /YouTube loads only when you press play/);
  assert.match(html, /href="https:\/\/www.youtube.com\/watch\?v=abcdefghijk" target="_blank" rel="noopener noreferrer"/);
});

test("Invalid video sources do not create a player card or an unsafe link", () => {
  for (const url of ["", "https://evil.example/embed/abcdefghijk", "javascript:alert(1)", "https://user:password@youtube.com/watch?v=abcdefghijk", "https://youtu.be/short"]) {
    assert.equal(renderToStaticMarkup(<VideoEmbed url={url} />), "", url);
  }
});

test("Markdown video labels remain descriptive and surrounding prose and links are preserved", () => {
  const html = renderToStaticMarkup(<MarkdownContent content={"Watch the [Launch trailer](https://youtu.be/abcdefghijk), then read our [review](/reviews/).\n\nhttps://youtu.be/abcdefghijk https://www.youtube.com/watch?v=abcdefghijk"} />);
  assert.match(html, /aria-label="Play Launch trailer"/);
  assert.match(html, /then read our/);
  assert.match(html, /href="\/reviews\/"/);
  assert.equal((html.match(/class="video-embed"/g) || []).length, 2, "Different paragraphs keep their media; duplicate links within one paragraph share a card");
  assert.doesNotMatch(html, /<iframe/);
});
