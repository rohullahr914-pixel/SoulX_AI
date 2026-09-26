const CACHE_NAME = "soulx-offline-v6";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("soulx-") && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Keep live pages network-first and fall back to a dedicated offline document.
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(async () =>
      (await caches.match(OFFLINE_URL)) || new Response("You are offline.", { status: 503 }),
    ));
  }
});
