import { writeFile } from "node:fs/promises";
import { loadEnv } from "vite";
import { fetchPublication } from "./public-content";
import { allowedImageUrl, downloadCover, prepareCoverDirectory, resizeCover } from "./image-assets";
import type { CoverManifest } from "../src/lib/cover-images";

const env = { ...loadEnv("production", process.cwd(), "VITE_"), ...process.env };
const projectOrigin = env.VITE_SUPABASE_URL || "https://yodtnppcsmyeymbnmvsu.supabase.co";
const { posts } = await fetchPublication();
const output = await prepareCoverDirectory();
const manifest: CoverManifest = {};
for (const source of new Set(posts.map((post) => post.cover_url).filter(Boolean))) {
  if (!allowedImageUrl(source, projectOrigin)) continue;
  try {
    const input = await downloadCover(source, projectOrigin);
    const variants = await resizeCover(input, source, output);
    manifest[source] = variants;
    const mobile = variants.find((variant) => variant.width >= 640) || variants.at(-1)!;
    console.log(`Cover optimized: ${input.length} bytes → ${mobile.bytes} bytes at ${mobile.width}px.`);
  } catch (error) {
    console.warn(`Using original cover: ${error instanceof Error ? error.message : "Image conversion failed"}`);
  }
}
await writeFile(".generated/covers.json", JSON.stringify(manifest));
console.log(`Prepared responsive covers for ${Object.keys(manifest).length} images.`);
