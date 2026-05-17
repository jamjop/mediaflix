// Minimal service worker — enables PWA installability without offline caching.
// API data is always live so we intentionally skip caching strategies.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(self.clients.claim()),
);
