/* ============================================================
   SERVICE WORKER — Juni's RNG Game
   Caches the app shell (index.html, manifest.json, this file) so the game can be opened and
   played with no network connection at all. This is intentionally minimal:
     - Only same-origin requests are ever intercepted. Cross-origin requests (fonts, the
       anticheat time-check) are left completely alone and go straight to the network, so they
       fail/succeed exactly as they already did before a service worker existed.
     - Cache-first for the app shell: once installed, index.html loads instantly from cache
       whether or not there's a network, then update-checks in the background for next time.
     - Bump CACHE_VERSION whenever index.html changes and you want returning players to pick up
       the new version (old caches are cleared automatically on activate).

   IMPORTANT: this does NOT change how save data works. IndexedDB and localStorage are both
   entirely separate from this cache and are untouched by anything here — this only affects
   whether the page's own HTML/CSS/JS can load without a network connection.
   ============================================================ */

const CACHE_VERSION = 'junis-rng-shell-v15';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only ever handle same-origin GET requests. Everything else (cross-origin fonts, the
  // Cloudflare anticheat time-check, any future external call) is left completely alone —
  // passing through untouched means it behaves exactly as it did with no service worker at all.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          // Keep the cached app shell fresh for next time, without blocking this response on it.
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached); // offline and not cached — nothing more we can do

      // Cache-first: serve instantly from cache if we have it (this is what makes offline load
      // fast/possible at all), while still updating the cache in the background for next time.
      return cached || networkFetch;
    })
  );
});
