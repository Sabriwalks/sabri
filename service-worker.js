const CACHE_NAME = "sabri-cache-v30";
const ASSETS_TO_CACHE = ["/", "/index.html", "/style.css", "/app.js", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Defensive counterpart to the unconditional self.skipWaiting() above — that
// alone already activates a new worker immediately in every browser tested,
// but if a browser ever ends up leaving it in the "waiting" state anyway,
// the update banner's tap handler (see app.js) can still force it forward
// by posting this message.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // API calls need a live connection regardless — never intercept them.
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => offlineResponse());
    })
  );
});

function offlineResponse() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Sabri — Offline</title>
<style>
  body {
    background: #0F1B2D;
    color: #FAF7F2;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    margin: 0;
    text-align: center;
    padding: 24px;
  }
</style>
</head>
<body>
  <p>You are offline — reconnect to continue your tour.</p>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
