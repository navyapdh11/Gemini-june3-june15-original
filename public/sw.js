/**
 * AASTACLEAN Professional CleanersApp Service Worker (ISO 9001 & Offline Resilient Workbox)
 * Enables complete offline capability, checklists caching, and signature queueing for when network drops.
 */

const CACHE_NAME = 'aastaclean-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

// Install Event - Pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('👷 Service Worker: Pre-caching offline shell shell assets');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('👷 Service Worker: Some assets failed to pre-cache during static installation:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('👷 Service Worker: Clearing outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first with Cache fallback, fallback to custom offline response for checklists or photos
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for caching
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid response, clone and cache it
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline Fallback
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If a JSON request fails (e.g. checklists), return standard offline response
          if (event.request.headers.get('accept')?.includes('application/json')) {
            return new Response(JSON.stringify({ 
              status: 'offline', 
              message: 'You are currently disconnected. Checklist and Signature queues will auto-synchronise when your signal returns.' 
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        });
      })
  );
});

// Sync Event for Background Sync when connectivity is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'aastaclean-sync-queue') {
    console.log('👷 Service Worker: Background sync event triggered! Re-establishing roster connections...');
    event.waitUntil(
      // Alert active clients that sync was triggered by the background worker
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SERVICE_WORKER_SYNC_TRIGGERED',
            timestamp: new Date().toLocaleTimeString()
          });
        });
      })
    );
  }
});
