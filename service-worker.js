const CACHE_NAME = "fitness-tracker-v11";
const APP_ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/reset.css",
  "css/variables.css",
  "css/layout.css",
  "css/components.css",
  "css/responsive.css",
  "js/app.js",
  "js/router.js",
  "js/database.js",
  "js/utils.js",
  "js/validation.js",
  "js/calculations.js",
  "js/goals.js",
  "js/export-import.js",
  "js/views/dashboard.js",
  "js/views/daily-entry.js",
  "js/views/body-fat.js",
  "js/views/trends.js",
  "js/views/goals.js",
  "js/views/settings.js",
  "assets/icons/app-icon.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/apple-touch-icon.png"
];

const OFFLINE_FALLBACK = "index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(OFFLINE_FALLBACK))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
      .then((response) => {
        if (response && response.ok && event.request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_FALLBACK)))
  );
});
