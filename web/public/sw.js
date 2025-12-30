// Service Worker for FinFlow PWA
// Bump version to invalidate old caches/hashes when deploying
const SW_VERSION = '1.6.0';
const CACHE_NAME = `finflow-${SW_VERSION}`;
const RUNTIME_CACHE = `finflow-runtime-${SW_VERSION}`;

// Assets to cache on install (only static assets, NOT index.html)
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets only
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Installing v${SW_VERSION}...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up ALL old caches immediately
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Activating v${SW_VERSION}...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL old caches
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - NETWORK FIRST for HTML/JS, cache for static assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests (always fetch from network)
  if (event.request.url.includes('/api/') || event.request.url.includes('railway.app')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // NETWORK FIRST for HTML and JS files (prevents stale cache issues)
  if (event.request.destination === 'document' || 
      url.pathname.endsWith('.js') || 
      url.pathname === '/' ||
      url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh response
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache only if network fails
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Last resort: return cached index.html for navigation
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
          });
        })
    );
    return;
  }

  // CACHE FIRST for static assets (icons, fonts, images)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          });
      })
  );
});

// Handle background sync (for future offline functionality)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
});

// Handle push notifications (for future alerts)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
});

// Listen for skip waiting message from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
