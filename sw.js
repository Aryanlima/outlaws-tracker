const CACHE_NAME = "outlaws-v1";

// Files to cache for offline use
const STATIC_ASSETS = [
  "/",
  "/index.html",
];

// Install — cache app shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — remove old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Supabase API calls → always network (never cache live data)
// - Everything else → network first, fall back to cache
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never cache Supabase API — always fresh
  if (url.hostname.includes("supabase.co")) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: "offline" }), { headers: { "Content-Type": "application/json" } })));
    return;
  }

  // Network first for everything else, cache as fallback
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache a copy of fresh responses
        if (res.ok && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match("/index.html")))
  );
});
