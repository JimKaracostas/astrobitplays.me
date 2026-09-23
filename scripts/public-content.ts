import { createHash } from "node:crypto";
import { loadEnv } from "vite";
import { normalizeSettings } from "../src/lib/content";
import type { Post, SiteSettings } from "../src/lib/content";

export async function fetchPublication(now = new Date()) {
  const env = {
    ...loadEnv("production", process.cwd(), "VITE_"),
    ...process.env,
  };
  const origin =
    env.VITE_SUPABASE_URL || "https://yodtnppcsmyeymbnmvsu.supabase.co";
  const key =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_-3AWyMVXqorNfmZoBDmKnA_ZWGXBe0O";
  async function get(table: string, params: Record<string, string>) {
    const url = new URL(`/rest/v1/${table}`, origin);
    url.search = new URLSearchParams(params).toString();
    const response = await fetch(url, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(
        `Cannot read public ${table} (${response.status}); publication build stopped.`,
      );
    return response.json();
  }
  const posts: Post[] = [];
  for (let offset = 0; ; offset += 1000) {
    const batch = (await get("posts", {
      select: "*",
      category: "in.(News,Reviews)",
      status: "eq.published",
      published_at: `lte.${now.toISOString()}`,
      order: "published_at.desc,id.asc",
      offset: String(offset),
      limit: "1000",
    })) as Post[];
    if (!Array.isArray(batch)) throw new Error("Invalid public posts response");
    posts.push(...batch);
    if (batch.length < 1000) break;
  }
  const rows = (await get("site_settings", {
    select: "featured_limit,section_order",
  })) as SiteSettings[];
  const settings = normalizeSettings(rows[0]);
  const hash = createHash("sha256")
    .update(JSON.stringify({ posts, settings }))
    .digest("hex");
  return { posts, settings, hash };
}
