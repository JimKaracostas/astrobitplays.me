import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import type { Post, SiteSettings } from "./lib/content";

let initial: { posts?: Post[]; settings?: SiteSettings; path?: string } = {};
try {
  initial = JSON.parse(
    document.getElementById("publication-data")?.textContent || "{}",
  );
} catch {
  /* The live API remains available if an old snapshot cannot be read. */
}

const app = (
  <StrictMode>
    <App initialPosts={initial.posts} initialSettings={initial.settings} />
  </StrictMode>
);
const container = document.getElementById("root")!;
const params = new URLSearchParams(window.location.search);
if (
  initial.path === window.location.pathname &&
  !["q", "page", "article", "section", "error", "error_description"].some((key) => params.has(key)) &&
  !window.location.hash.includes("error_description")
)
  hydrateRoot(container, app);
else createRoot(container).render(app);
