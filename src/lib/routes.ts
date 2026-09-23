import { categories } from "./content";
import type { Category, Post } from "./content";

export function categoryPath(category: string) {
  return `/${category.toLowerCase()}/`;
}
export function articlePath(post: Pick<Post, "slug" | "category">) {
  return `${categoryPath(post.category)}${encodeURIComponent(post.slug)}/`;
}
export function parseRoute(location: string) {
  const url = new URL(location, "https://astrobitplays.me");
  const parts = url.pathname.split("/").filter(Boolean);
  const category = categories.find((item) => item.toLowerCase() === parts[0]);
  const cleanArticle =
    category &&
    parts.length === 2 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parts[1]);
  return {
    section: cleanArticle
      ? ""
      : category && parts.length === 1
        ? category
        : url.searchParams.get("section") || "",
    slug: cleanArticle ? parts[1] : url.searchParams.get("article") || "",
    page: url.searchParams.get("page") || "",
    query: url.searchParams.get("q") || "",
    isSearch: url.searchParams.has("q"),
    unknownPath:
      !["/", "/index.html"].includes(url.pathname) &&
      !(category && (parts.length === 1 || cleanArticle)),
    pathCategory: category as Category | undefined,
    params: url.searchParams,
  };
}
