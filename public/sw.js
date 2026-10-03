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
