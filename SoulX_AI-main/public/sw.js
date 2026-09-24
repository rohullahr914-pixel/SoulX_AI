const CACHE_NAME = "soulx-static-v4";
const OFFLINE_URL = "/offline.html";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("soulx-") && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Never cache documents, API responses, auth state, RSC payloads, or development bundles.
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(async () =>
      (await caches.match(OFFLINE_URL)) || new Response("You are offline.", { status: 503 })
    ));
    return;
  }
  if (!url.pathname.startsWith("/_next/static/") || !/\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname)) return;
  const response = caches.open(CACHE_NAME).then(async cache => {
    const hit = await cache.match(event.request);
    if (hit) return hit;
    const fresh = await fetch(event.request);
    if (fresh.ok && fresh.type === "basic") {
      try {
        await cache.put(event.request, fresh.clone());
        const keys = await cache.keys();
        for (const key of keys.slice(0, Math.max(0, keys.length - 100))) {
          if (!key.url.endsWith(OFFLINE_URL)) await cache.delete(key);
        }
      } catch { /* Storage quota must never prevent a successful network response. */ }
    }
    return fresh;
  });
  event.respondWith(response);
  event.waitUntil(response.then(() => undefined, () => undefined));
});
