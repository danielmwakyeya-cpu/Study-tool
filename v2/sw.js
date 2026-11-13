const CACHE = "studyhub-v2-2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/main.js",
  "./js/util.js",
  "./js/dates.js",
  "./js/grades.js",
  "./js/srs.js",
  "./js/search.js",
  "./js/merge.js",
  "./js/migrate.js",
  "./js/seed.js",
  "./js/config.js",
  "./js/db.js",
  "./js/store.js",
  "./js/backup.js",
  "./js/router.js",
  "./js/icons.js",
  "./js/ui.js",
  "./js/queries.js",
  "./js/sync.js",
  "./js/pages/render.js",
  "./js/pages/actions.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const fresh = await fetch(request);
      if (fresh.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") {
        const home = await caches.match("./index.html");
        if (home) return home;
      }
      throw error;
    }
  })());
});
