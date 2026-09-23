import { categories, normalizeReview } from "./content.ts";
import type { Post, PostInput } from "./content.ts";

export const emptyPost: PostInput = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  category: "News",
  status: "draft",
  cover_url: "",
  youtube_url: "",
  score: null,
  featured: false,
  published_at: null,
  pinned: false,
  feature_order: 0,
  review_details: normalizeReview({}),
};
export function postInput(post?: Post): PostInput {
  if (!post) return { ...emptyPost };
  return {
    ...Object.fromEntries(
      Object.keys(emptyPost).map((key) => [
        key,
        post[key as keyof PostInput] ?? emptyPost[key as keyof PostInput],
      ]),
    ),
    review_details: normalizeReview(post.review_details),
  } as PostInput;
}
export interface DraftBackup {
  version: 1;
  form: PostInput;
  baseUpdatedAt: string | null;
  savedAt: string;
}
export function decodeBackup(raw: string | null): DraftBackup | null {
  try {
    const value = JSON.parse(raw || "null") as DraftBackup | null;
    if (
      value?.version !== 1 ||
      !value.form ||
      typeof value.savedAt !== "string" ||
      !Number.isFinite(Date.parse(value.savedAt))
    )
      return null;
    const form = value.form;
    if (
      ["title", "slug", "excerpt", "body", "cover_url", "youtube_url"].some(
        (key) => typeof form[key as keyof PostInput] !== "string",
      )
    )
      return null;
    if (
      !categories.includes(form.category) ||
      !["draft", "published"].includes(form.status) ||
      typeof form.featured !== "boolean"
    )
      return null;
    if (
      form.score !== null &&
      (typeof form.score !== "number" || !Number.isFinite(form.score))
    )
      return null;
    if (form.published_at !== null && typeof form.published_at !== "string")
      return null;
    if (value.baseUpdatedAt !== null && typeof value.baseUpdatedAt !== "string")
      return null;
    return { ...value, form: postInput(form as Post) };
  } catch {
    return null;
  }
}
export function backupKey(userId: string, postId = "new") {
  return `astrobit:${userId}:draft:${postId}`;
}
export function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function insertText(
  body: string,
  start: number,
  end: number,
  prefix: string,
  suffix = "",
  fallback = "text",
) {
  const selected = body.slice(start, end) || fallback;
  return {
    text: body.slice(0, start) + prefix + selected + suffix + body.slice(end),
    start: start + prefix.length,
    end: start + prefix.length + selected.length,
  };
}
export function markdownImage(alt: string, url: string) {
  return `\n\n![${alt.replace(/[\\[\]\r\n]/g, " ").trim()}](${url})\n\n`;
}
