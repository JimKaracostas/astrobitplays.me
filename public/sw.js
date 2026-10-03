const CACHE_NAME = "astrobit-public-v1";
const OFFLINE_URL = "/offline.html";
const STATIC_ASSET = /\.(?:avif|css|gif|ico|jpe?g|js|json|mjs|png|svg|webmanifest|webp|woff2?)$/i;
const MAX_CACHED_ITEMS = 120;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, "/site.webmanifest"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith("astrobit-public-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

async function saveResponse(cache, request, response) {
  if (!response.ok || response.type !== "basic") return;
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  const removable = keys.filter((key) => ![OFFLINE_URL, "/site.webmanifest"].includes(new URL(key.url).pathname));
  await Promise.all(removable.slice(0, Math.max(0, keys.length - MAX_CACHED_ITEMS)).map((key) => cache.delete(key)));
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_CURRENT_PAGE") return;
  const clientUrl = event.source?.url;
  if (typeof clientUrl !== "string") return;
  const pageUrl = new URL(clientUrl);
  if (pageUrl.origin !== self.location.origin || pageUrl.search) return;

  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const pageRequest = new Request(pageUrl.href, { credentials: "omit" });
    try {
      await saveResponse(cache, pageRequest, await fetch(pageRequest));
    } catch { /* Keep previously cached content when a request fails. */ }

    const assets = Array.isArray(event.data.assets) ? event.data.assets.slice(0, 20) : [];
    for (const value of assets) {
      if (typeof value !== "string") continue;
      const assetUrl = new URL(value);
      if (assetUrl.origin !== self.location.origin || assetUrl.search || !STATIC_ASSET.test(assetUrl.pathname)) continue;
      const assetRequest = new Request(assetUrl.href, { credentials: "omit" });
      try {
        await saveResponse(cache, assetRequest, await fetch(assetRequest));
      } catch { /* Some assets can still load from the normal network. */ }
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (url.search) return response;
        if (response.status === 404) {
          await cache.delete(request);
          return response;
        }
        await saveResponse(cache, request, response);
        return response;
      } catch {
        if (!url.search) {
          const savedPage = await cache.match(request);
          if (savedPage) return savedPage;
        }
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  if (!url.search && STATIC_ASSET.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const savedAsset = await cache.match(request);
      if (savedAsset) return savedAsset;
      const response = await fetch(request);
      await saveResponse(cache, request, response);
      return response;
    })());
  }
});
