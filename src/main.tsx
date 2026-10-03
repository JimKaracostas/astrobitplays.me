import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import type { Post, SiteSettings } from "./lib/content";
import type { CoverManifest } from "./lib/cover-images";

if ("serviceWorker" in navigator && window.isSecureContext) {
  void navigator.serviceWorker.register("/sw.js").then(async () => {
    if (window.location.search) return;
    const registration = await navigator.serviceWorker.ready;
    const assets = Array.from(document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
      "script[src], link[rel='stylesheet'][href]",
    )).map((element) => element instanceof HTMLScriptElement ? element.src : element.href)
      .filter((url) => new URL(url).origin === window.location.origin);
    registration.active?.postMessage({ type: "CACHE_CURRENT_PAGE", assets });
  }).catch(() => {
    /* The publication remains available when offline support is unavailable. */
  });
}

let images: CoverManifest = {};
try { images = JSON.parse(document.getElementById("cover-images")?.textContent || "{}"); }
catch { /* Original covers remain available without generated images. */ }

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
    <App initialPosts={initial.posts} initialSettings={initial.settings} initialImages={images} />
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
