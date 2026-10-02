import type { Category, Post } from "./content";

export type StorySort = "relevance" | "newest" | "oldest";
export function normalizeSearch(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/['’]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
export function discoverStories(posts: Post[], {
  query = "", category = "", sort = "newest", savedIds,
}: { query?: string; category?: Category | ""; sort?: StorySort; savedIds?: string[] } = {}) {
  const phrase = normalizeSearch(query);
  const terms = [...new Set(phrase.split(" ").filter(Boolean))];
  const saved = savedIds ? new Set(savedIds) : null;
  return posts.filter((post) => (!category || post.category === category) && (!saved || saved.has(post.id)))
    .map((post) => {
      if (!terms.length) return { post, score: 0 };
      const title = normalizeSearch(post.title);
      const excerpt = normalizeSearch(post.excerpt);
      const body = normalizeSearch(post.body);
      const text = `${title} ${excerpt} ${body}`;
      if (!terms.every((term) => text.includes(term))) return { post, score: -1 };
      const score = terms.reduce((total, term) => total + (title.includes(term) ? 8 : excerpt.includes(term) ? 3 : 1), 0)
        + (title.includes(phrase) ? 20 : 0) + (title.startsWith(phrase) ? 10 : 0);
      return { post, score };
    })
    .filter(({ score }) => score >= 0)
    .sort((a, b) => {
      if (sort === "relevance" && a.score !== b.score) return b.score - a.score;
      const dates = (a.post.published_at || "").localeCompare(b.post.published_at || "");
      return (sort === "oldest" ? dates : -dates) || a.post.id.localeCompare(b.post.id);
    }).map(({ post }) => post);
}
