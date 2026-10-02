import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import sharp from "sharp";
import { renderToStaticMarkup } from "react-dom/server";
import { allowedImageUrl, resizeCover } from "./image-assets";
import { CoverImagesContext, coverImageProps } from "../src/lib/cover-images";
import { CoverImage } from "../src/CoverImage";

test("Cover processing only fetches configured public covers and the current external cover provider", () => {
  const project = "https://project.supabase.co";
  assert.equal(allowedImageUrl(`${project}/storage/v1/object/public/covers/one.png`, project), true);
  assert.equal(allowedImageUrl("https://www.gamespot.com/image.jpg", project), true);
  for (const url of ["http://www.gamespot.com/image.jpg", "https://user:pass@www.gamespot.com/image.jpg", "https://www.gamespot.com:444/image.jpg", "https://www.gamespot.com.evil.test/image.jpg", "https://127.0.0.1/image.jpg", `${project}/storage/v1/object/authenticated/covers/private.png`, "not a URL"]) {
    assert.equal(allowedImageUrl(url, project), false, url);
  }
});
test("Generated covers retain proportions, encode as WebP and never upscale small originals", async () => {
  const dir = await mkdtemp(join(tmpdir(), "astrobit-cover-test-"));
  try {
    const input = await sharp({ create: { width: 1000, height: 600, channels: 3, background: "#00a7df" } }).png().toBuffer();
    const variants = await resizeCover(input, "https://www.gamespot.com/test.png", dir);
    assert.deepEqual(variants.map(({ width }) => width), [320, 640, 960, 1000]);
    for (const variant of variants) {
      const filename = variant.src.split("/").at(-1)!;
      const buffer = await readFile(join(dir, filename));
      const meta = await sharp(buffer).metadata();
      assert.equal(meta.format, "webp");
      assert.equal(meta.width, variant.width);
      assert.equal(meta.height, variant.height);
      assert.equal(variant.height, variant.width * 0.6);
      assert.equal(buffer.length, variant.bytes);
      assert.ok(meta.width! <= 1000);
    }
  } finally {
    assert.ok(resolve(dir).startsWith(resolve(tmpdir()) + sep));
    await rm(dir, { recursive: true, force: true });
  }
});
test("SSR and interactive covers use the same responsive candidates and retain an original fallback", () => {
  const source = "https://www.gamespot.com/test.jpg";
  const variants = [
    { src: "/generated/covers/test-320.webp", width: 320, height: 180, bytes: 1000 },
    { src: "/generated/covers/test-960.webp", width: 960, height: 540, bytes: 3000 },
  ];
  const props = coverImageProps(source, { [source]: variants });
  assert.equal(props.src, variants[1].src);
  assert.equal(props.original, source);
  assert.equal(props.srcSet, `${variants[0].src} 320w, ${variants[1].src} 960w`);
  assert.equal(coverImageProps(source, {}).src, source);
  assert.equal(coverImageProps("javascript:alert(1)", {}).src, "/galaxy-placeholder.png");
  const html = renderToStaticMarkup(<CoverImagesContext.Provider value={{ [source]: variants }}><CoverImage source={source} sizes="400px" priority /></CoverImagesContext.Provider>);
  assert.match(html, /srcSet="\/generated\/covers\/test-320.webp 320w, \/generated\/covers\/test-960.webp 960w"/);
  assert.match(html, /sizes="400px"/);
  assert.match(html, /fetchPriority="high"/);
});
