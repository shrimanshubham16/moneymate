// Service Worker for FinFlow PWA - Enhanced with Stale-While-Revalidate
// Bump version to invalidate old caches/hashes when deploying
const SW_VERSION = '1.8.0'; // Force cache clear after useRef fix
const CACHE_NAME = `finflow-static-${SW_VERSION}`;
const RUNTIME_CACHE = `finflow-runtime-${SW_VERSION}`;
const IMAGE_CACHE = `finflow-images-${SW_VERSION}`;

// Static assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Cache expiration times
const MAX_AGE = {
  static: 7 * 24 * 60 * 60 * 1000, // 7 days for static assets
  runtime: 60 * 60 * 1000, // 1 hour for JS/CSS
  images: 30 * 24 * 60 * 60 * 1000 // 30 days for images
};

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
          // Delete ALL old caches except current ones
          if (cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && 
              cacheName !== IMAGE_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Stale-While-Revalidate strategy for assets
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch fresh version in background
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse); // Fallback to cache on network error
  
  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Fetch event - Enhanced with multiple caching strategies
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests (always fetch from network for fresh data)
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('supabase.co') ||
      event.request.url.includes('railway.app')) {
    return;
  }

  const url = new URL(event.request.url);
  
  // STALE-WHILE-REVALIDATE for JS/CSS assets
  if (url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname.startsWith('/assets/')) {
    event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
    return;
  }
  
  // NETWORK FIRST for HTML documents
  if (event.request.destination === 'document' || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh HTML
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
            // Last resort: return cached index
            return caches.match('/');
          });
        })
    );
    return;
  }

  // CACHE FIRST for images and icons (long-lived)
  if (event.request.destination === 'image' || 
      url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // CACHE FIRST for fonts and other static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
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
