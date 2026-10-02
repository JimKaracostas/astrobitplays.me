import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { CoverManifest, CoverVariant } from "../src/lib/cover-images";

export const imageWidths = [320, 640, 960, 1280, 1600, 1920];
const maxBytes = 8 * 1024 * 1024;
export function allowedImageUrl(value: string, projectOrigin: string) {
  try {
    const url = new URL(value);
    const project = new URL(projectOrigin);
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") && (
      (url.origin === project.origin && url.pathname.startsWith("/storage/v1/object/public/covers/")) ||
      url.hostname === "www.gamespot.com"
    );
  } catch { return false; }
}
export async function downloadCover(value: string, projectOrigin: string) {
  let current = value;
  const signal = AbortSignal.timeout(20000);
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!allowedImageUrl(current, projectOrigin)) throw new Error("Unsupported cover host");
    const response = await fetch(current, { redirect: "manual", signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const target = response.headers.get("location");
      await response.body?.cancel();
      if (!target) throw new Error("Missing image redirect");
      current = new URL(target, current).href;
      continue;
    }
    if (!response.ok || !/^image\/(jpeg|png|webp|avif)(?:;|$)/i.test(response.headers.get("content-type") || "")) {
      await response.body?.cancel();
      throw new Error("Cover is unavailable or unsupported");
    }
    if (Number(response.headers.get("content-length")) > maxBytes) {
      await response.body?.cancel();
      throw new Error("Cover exceeds the download limit");
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (!response.body) throw new Error("Empty image response");
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > maxBytes) throw new Error("Cover exceeds the download limit");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Too many image redirects");
}
export async function resizeCover(input: Buffer, source: string, output: string) {
  const hash = createHash("sha256").update(input).digest("hex").slice(0, 20);
  const variants: CoverVariant[] = [];
  const seen = new Set<number>();
  for (const width of imageWidths) {
    const { data, info } = await sharp(input, { limitInputPixels: 32_000_000 })
      .rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
    if (seen.has(info.width)) continue;
    seen.add(info.width);
    const filename = `${hash}-${info.width}.webp`;
    await writeFile(resolve(output, filename), data);
    variants.push({ src: `/generated/covers/${filename}`, width: info.width, height: info.height, bytes: data.length });
  }
  if (!variants.length) throw new Error(`No variants for ${source}`);
  return variants;
}
export async function loadCoverManifest(): Promise<CoverManifest> {
  try { return JSON.parse(await readFile(".generated/covers.json", "utf8")); }
  catch { return {}; }
}
export async function prepareCoverDirectory() {
  const workspace = resolve(".");
  const output = resolve("public/generated/covers");
  if (!output.startsWith(workspace + sep)) throw new Error("Cover output must stay inside the workspace");
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await mkdir(".generated", { recursive: true });
  return output;
}
