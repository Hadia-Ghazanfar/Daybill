/* Daybill service worker.
 * Bump CACHE_VERSION on every deploy to invalidate all caches.
 * Strategy: network-first for navigations and /api; cache-first for
 * /assets, /icons and hashed build files.
 */
const CACHE_VERSION = 'daybill-v1';
const STATIC_CACHE = `daybill-static-${CACHE_VERSION}`;
const ASSETS_CACHE = `daybill-assets-${CACHE_VERSION}`;

// Lets the app (main.tsx) ask which version controls the page so it can
// unregister a stale worker instead of serving a stale app.
self.addEventListener('message', (event) => {
  if (
    event.data &&
    event.data.type === 'DAYBILL_GET_VERSION' &&
    event.ports &&
    event.ports[0]
  ) {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.includes(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) {
    cache.put(request, fresh.clone());
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // API: always fresh.
  if (path.startsWith('/api')) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // Navigations: fresh HTML, offline fallback to cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, STATIC_CACHE).catch(() =>
        caches.match('/index.html')
      )
    );
    return;
  }

  // Images / icons: cache-first.
  if (path.startsWith('/assets/') || path.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // Hashed build files and everything else: cache-first.
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});
