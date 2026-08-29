/**
 * PORTAL UJIAN MAN 3 HULU SUNGAI SELATAN
 * PWA Service Worker v4 - Network First, No aggressive caching
 * Fixes: ERR_FAILED caused by stale cached redirects
 */

const CACHE_NAME = 'portal-man3hss-v4';

// On install - clear old caches and activate immediately
self.addEventListener('install', (e) => {
  console.log('[SW] Installing v4 - clearing old caches...');
  self.skipWaiting();
});

// On activate - delete ALL old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: Network First for ALL requests - never serve stale cached pages
self.addEventListener('fetch', (e) => {
  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // Skip cross-origin requests
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // Always use network for HTML pages - no caching
  if (e.request.destination === 'document' || 
      e.request.url.endsWith('.html') ||
      url.pathname === '/' ||
      url.pathname === '/index' ||
      url.pathname === '/login' ||
      url.pathname === '/guide' ||
      url.pathname === '/admin' ||
      url.pathname === '/exam') {
    e.respondWith(
      fetch(e.request).catch(() => {
        return new Response('<h1>Koneksi terputus</h1>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  // For JS/CSS assets: network first, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
