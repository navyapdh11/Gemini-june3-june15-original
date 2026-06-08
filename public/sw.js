/**
 * AASTACLEAN Professional CleanersApp Service Worker (ISO 9001 & Offline Resilient Workbox)
 * Upgraded with Native IndexedDB storage engine to cache heavy signature & photo payloads
 * that survive cold restarts and completely bypass localStorage capacity caps.
 */

const CACHE_NAME = 'aastaclean-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

const DB_NAME = "AastaCleanOfflineDB";
const DB_VERSION = 1;

/**
 * Open standard IndexedDB inside the Service Worker scope
 */
function openIDB() {
  return new Promise((resolve, reject) => {
    // If running in environments where indexedDB is omitted
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available inside this worker context.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("signatures")) {
        db.createObjectStore("signatures", { keyPath: "quoteId" });
        console.log("👷 SW: Provisioned 'signatures' store in SW database.");
      }
      if (!db.objectStoreNames.contains("photos")) {
        const photoStore = db.createObjectStore("photos", { keyPath: "id" });
        photoStore.createIndex("by_quoteId", "quoteId", { unique: false });
        console.log("👷 SW: Provisioned 'photos' store in SW database.");
      }
    };
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// 1. Install Event - Pre-cache essential assets & bootstrap IndexedDB
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('👷 Service Worker: Pre-caching offline shell assets');
        return cache.addAll(ASSETS).catch(err => {
          console.warn('👷 Service Worker: Some assets failed to pre-cache during static installation:', err);
        });
      }),
      openIDB().then(() => {
        console.log('👷 Service Worker: IndexedDB bootstrapped successfully on install.');
      }).catch(err => {
        console.warn('👷 Service Worker: IndexedDB bootstrap failed on install:', err);
      })
    ]).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Clean up stale caches and claim clients
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

// 3. Fetch Event - Intercept both regular assets and virtual API routes for signature/photos offline retrieval
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Advanced: Intercept virtual endpoints for signatures or photo evidence while offline
  if (url.pathname.startsWith('/api/offline/')) {
    event.respondWith(
      handleVirtualOfflineAPI(url.pathname)
    );
    return;
  }

  // Handle standard GET requests for assets caching
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

/**
 * Handle virtual routes by pulling large blobs/base64 straight from the IndexedDB store inside SW context.
 * Enables clean, decoupled read endpoints that mock backend database schemas for cached media.
 */
async function handleVirtualOfflineAPI(pathname) {
  try {
    const db = await openIDB();
    
    // Intercept signature fetches: /api/offline/signature/:quoteId
    if (pathname.includes('/signature/')) {
      const quoteId = pathname.split('/signature/')[1];
      
      const signatureObj = await new Promise((resolve) => {
        const transaction = db.transaction("signatures", "readonly");
        const store = transaction.objectStore("signatures");
        const req = store.get(quoteId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      if (signatureObj) {
        return new Response(JSON.stringify({
          success: true,
          quoteId,
          clientSignature: signatureObj.dataUrl,
          createdAt: signatureObj.createdAt,
          source: "ServiceWorkerIndexedDB"
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: false,
        message: `No digital sign-off is buffered inside IndexedDB for JobId #${quoteId}`
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Intercept photo fetches: /api/offline/photos/:quoteId
    if (pathname.includes('/photos/')) {
      const quoteId = pathname.split('/photos/')[1];
      
      const photosList = await new Promise((resolve) => {
        const transaction = db.transaction("photos", "readonly");
        const store = transaction.objectStore("photos");
        const list = [];
        const req = store.openCursor();
        
        req.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const val = cursor.value;
            if (val.quoteId === quoteId) {
              list.push(val);
            }
            cursor.continue();
          } else {
            resolve(list);
          }
        };
        req.onerror = () => resolve([]);
      });

      return new Response(JSON.stringify({
        success: true,
        quoteId,
        beforePhotos: photosList.filter(p => p.type === "before").map(p => p.dataUrl),
        afterPhotos: photosList.filter(p => p.type === "after").map(p => p.dataUrl),
        count: photosList.length,
        source: "ServiceWorkerIndexedDB"
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid virtual endpoint." }), { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "IndexedDB retrieval failed in SW context", details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 4. Message Event Listener - Expose Service Worker healthchecks & size computations
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_SW_OFFLINE_DB_STATS') {
    openIDB().then((db) => {
      const getStoreCount = (name) => {
        return new Promise((resolve) => {
          const tx = db.transaction(name, "readonly");
          const store = tx.objectStore(name);
          const req = store.count();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(0);
        });
      };

      Promise.all([
        getStoreCount("signatures"),
        getStoreCount("photos")
      ]).then(([signatureCount, photoCount]) => {
        event.ports[0].postMessage({
          success: true,
          stats: {
            signaturesStored: signatureCount,
            photosStored: photoCount,
            dbName: DB_NAME,
            version: DB_VERSION
          }
        });
      });
    }).catch(err => {
      event.ports[0].postMessage({ success: false, error: err.message });
    });
  }
});

// 5. Sync Event for Background Sync when connectivity is restored
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
