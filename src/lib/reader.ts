import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root, RootContent } from "mdast";

export type ArticleSection = { id: string; title: string; depth: number };
export type ReadingTheme = "light" | "dark";
type TextNode = { type: string; value?: string; alt?: string | null; children?: TextNode[] };
function headingText(node: TextNode): string {
  if (node.type === "html") return "";
  if (node.type === "break") return " ";
  return node.value ?? node.alt ?? node.children?.map(headingText).join("") ?? "";
}

// The outline and rendered headings share one AST-based ID algorithm.
// Fenced code, Setext headings and inline Markdown are handled by the parser.
export function decorateHeadings(tree: Root): ArticleSection[] {
  const sections: ArticleSection[] = [];
  const used = new Set<string>();
  function visit(node: Root | RootContent) {
    if (node.type === "heading") {
      const title = headingText(node).trim();
      const slug = title.normalize("NFKD").replace(/\p{M}/gu, "")
        .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "heading";
      const base = `section-${slug}`;
      let id = base;
      for (let suffix = 2; used.has(id); suffix++) id = `${base}-${suffix}`;
      used.add(id);
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id, tabIndex: -1 } };
      if (title && (node.depth === 2 || node.depth === 3)) sections.push({ id, title, depth: node.depth });
    }
    if ("children" in node) node.children.forEach(visit);
  }
  visit(tree);
  return sections;
}
export function remarkHeadingIds() {
  return (tree: Root) => { decorateHeadings(tree); };
}
const outlineParser = unified().use(remarkParse).use(remarkGfm);
export function articleOutline(content: string) {
  return decorateHeadings(outlineParser.parse(content));
}
export function readingProgress(top: number, height: number, viewport: number) {
  if (height <= 0 || viewport <= 0) return 0;
  return Math.min(1, Math.max(0, (viewport - top) / height));
}
