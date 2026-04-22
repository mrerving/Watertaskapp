/**
 * service-worker.js — Runtime caching with network-first strategy.
 *
 * Install never pre-caches files (so it can never fail).
 * Files are cached on first fetch and served from cache when offline.
 * GitHub API calls always go to the network.
 */

const CACHE = 'tides-v2';

// === Install: nothing to pre-cache — just activate immediately ===
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// === Activate: clean up old caches and take control immediately ===
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// === Fetch: network-first with runtime caching ===
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept GitHub API calls
  if (url.hostname === 'api.github.com') return;

  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for offline use
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — try the cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // For navigation requests (HTML page), serve index.html from cache
          if (event.request.mode === 'navigate') {
            return caches.match(new URL('index.html', self.registration.scope));
          }
        });
      })
  );
});
