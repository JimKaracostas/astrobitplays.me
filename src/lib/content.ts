export const categories = ["News", "Reviews"] as const;
export type Category = (typeof categories)[number];
export interface ReviewDetails {
  game?: string;
  platforms?: string[];
  release_date?: string;
  developer?: string;
  verdict?: string;
  pros?: string[];
  cons?: string[];
}
export interface SiteSettings {
  featured_limit: number;
  section_order: Category[];
}
export const defaultSettings: SiteSettings = {
  featured_limit: 4,
  section_order: [...categories],
};
export function normalizeSettings(
  value?: Partial<SiteSettings> | null,
): SiteSettings {
  const order = Array.isArray(value?.section_order)
    ? [
        ...new Set(
          value.section_order.filter((item) => categories.includes(item)),
        ),
      ]
    : [...categories];
  return {
    featured_limit:
      Number.isInteger(value?.featured_limit) &&
      value!.featured_limit! >= 2 &&
      value!.featured_limit! <= 5
        ? value!.featured_limit!
        : 4,
    section_order: order.length ? order : [...categories],
  };
}
export function normalizeReview(value: unknown): ReviewDetails {
  const details =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries([
    ...["game", "release_date", "developer", "verdict"].map((key) => [
      key,
      typeof details[key] === "string" ? details[key] : "",
    ]),
    ...["platforms", "pros", "cons"].map((key) => [
      key,
      Array.isArray(details[key])
        ? details[key].filter((item) => typeof item === "string")
        : [],
    ]),
  ]) as ReviewDetails;
}
export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: Category;
  status: "draft" | "published";
  cover_url: string;
  youtube_url: string;
  score: number | null;
  featured: boolean;
  pinned?: boolean;
  feature_order?: number;
  review_details?: ReviewDetails;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}
export type PostInput = Omit<Post, "id" | "created_at" | "updated_at">;
export const placeholder = "/galaxy-placeholder.png";
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function youtubeId(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    const host = url.hostname.replace(/^(www|m)\./, "");
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : ["youtube.com", "youtube-nocookie.com"].includes(host)
          ? url.searchParams.get("v") ||
            url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1]
          : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function safeImage(value: string) {
  if (!value || typeof value !== "string") return placeholder;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"))
    return value;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol)
      ? value
      : placeholder;
  } catch {
    return placeholder;
  }
}
export function validatePost(post: PostInput) {
  if (!post.title.trim()) return "Add a title.";
  if (post.title.trim().length > 200)
    return "Keep the title under 201 characters.";
  if (post.slug.length > 200)
    return "Keep the article URL under 201 characters.";
  if (post.excerpt?.length > 400)
    return "Keep the summary under 401 characters.";
  if (post.body.length > 200000) return "The article is too long to save.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug))
    return "Use lowercase letters, numbers and hyphens for the URL.";
  if (!post.body.trim()) return "Write the article before saving.";
  if (post.published_at && !Number.isFinite(Date.parse(post.published_at)))
    return "Choose a valid publication date.";
  if (
    post.feature_order !== undefined &&
    (!Number.isInteger(post.feature_order) ||
      post.feature_order < 0 ||
      post.feature_order > 99)
  )
    return "Feature position must be a whole number from 0 to 99.";
  if (post.review_details && JSON.stringify(post.review_details).length > 10000)
    return "Shorten the review details.";
  if (
    post.cover_url &&
    (!post.cover_url.startsWith("https://") ||
      safeImage(post.cover_url) === placeholder)
  )
    return "Use an HTTPS cover image URL, or leave it blank for the galaxy cover.";
  if (post.youtube_url && !youtubeId(post.youtube_url))
    return "Enter a valid YouTube video URL.";
  if (!categories.includes(post.category)) return "Choose News or Reviews.";
  if (
    post.score !== null &&
    (!Number.isFinite(post.score) || post.score < 0 || post.score > 10)
  )
    return "The review score must be between 0 and 10.";
  return null;
}
export function formatDate(date: string | null) {
  return date
    ? new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(date))
    : "Draft";
}

export function publicationState(
  post: Pick<Post, "status" | "published_at">,
  now = Date.now(),
) {
  return post.status === "draft"
    ? "draft"
    : post.published_at && Date.parse(post.published_at) > now
      ? "scheduled"
      : "published";
}
export function featuredStories(posts: Post[], limit = 4) {
  return [...posts]
    .sort(
      (a, b) =>
        Number(!!b.pinned) - Number(!!a.pinned) ||
        Number(b.featured) - Number(a.featured) ||
        (a.feature_order || 0) - (b.feature_order || 0) ||
        (b.published_at || "").localeCompare(a.published_at || "") ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}
export function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return `${minutes} min read`;
}
