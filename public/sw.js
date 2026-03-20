// ParkingPro Service Worker v2
const SW_VERSION = 'v2';
const CACHE_STATIC = `parkingpro-static-${SW_VERSION}`;
const CACHE_DYNAMIC = `parkingpro-dynamic-${SW_VERSION}`;
const CACHE_API = `parkingpro-api-${SW_VERSION}`;

const CACHE_SIZE_DYNAMIC = 50;
const CACHE_SIZE_API = 100;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

const STATIC_EXTENSIONS = /\.(js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|ico)(\?.*)?$/i;

const API_SWR_PATTERNS = [
  /\/api\/v1\/reports\/dashboard/,
  /\/api\/v1\/reports\//,
];

const NETWORK_TIMEOUT_MS = 10000;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((k) => cache.delete(k)));
  }
}

function networkWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Network timeout')), timeoutMs);
    fetch(request.clone())
      .then((res) => { clearTimeout(timer); resolve(res); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

async function storeInCache(cacheName, request, response, maxEntries) {
  if (!response || !response.ok) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  await trimCache(cacheName, maxEntries);
}

// ─── Install ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Do NOT skip waiting automatically; let message handler control it.
});

// ─── Activate ────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const currentCaches = new Set([CACHE_STATIC, CACHE_DYNAMIC, CACHE_API]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !currentCaches.has(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin or explicitly allowed requests; skip non-HTTP(S).
  if (!url.protocol.startsWith('http')) return;

  // ── Static assets: cache-first ──────────────────────────────────────────
  if (request.method === 'GET' && STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          storeInCache(CACHE_STATIC, request, response, Infinity);
          return response;
        });
      })
    );
    return;
  }

  // ── API calls (GET) ──────────────────────────────────────────────────────
  if (request.method === 'GET' && url.pathname.startsWith('/api/')) {
    // Stale-while-revalidate for dashboard/reports
    if (API_SWR_PATTERNS.some((p) => p.test(url.pathname))) {
      event.respondWith(
        caches.open(CACHE_API).then(async (cache) => {
          const cached = await cache.match(request);
          const fetchPromise = fetch(request.clone()).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
              trimCache(CACHE_API, CACHE_SIZE_API);
            }
            return response;
          }).catch(() => cached);

          return cached || fetchPromise;
        })
      );
      return;
    }

    // Network-first with 10 s timeout and cache fallback for all other API GETs
    event.respondWith(
      (async () => {
        try {
          const response = await networkWithTimeout(request, NETWORK_TIMEOUT_MS);
          await storeInCache(CACHE_API, request, response, CACHE_SIZE_API);
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'Offline – no cached data available' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ── Dynamic (non-API GET) ─────────────────────────────────────────────────
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request).then((response) => {
          storeInCache(CACHE_DYNAMIC, request, response, CACHE_SIZE_DYNAMIC);
          return response;
        }).catch(() => cached);

        return cached || fetched;
      })
    );
  }
});

// ─── Background Sync ────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (
    event.tag === 'sync-entry' ||
    event.tag === 'sync-exit' ||
    event.tag === 'sync-payment' ||
    event.tag === 'sync-offline-queue'
  ) {
    event.waitUntil(notifyClientsToSync(event.tag));
  }
});

async function notifyClientsToSync(tag) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'BACKGROUND_SYNC', tag });
  }
}

// ─── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = { title: 'ParkingPro', body: 'Nueva notificacion', icon: '/favicon.svg' };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; } catch { data.body = event.data.text(); }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/favicon.svg',
      tag: data.tag || 'parkingpro-admin',
      data: data.data || {},
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// ─── Message Handlers ────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type } = event.data || {};

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => caches.delete(k)))
      ).then(() => {
        if (event.ports?.[0]) event.ports[0].postMessage({ success: true });
      })
    );
    return;
  }

  if (type === 'NETWORK_STATUS') {
    // Broadcast current online status back to requesting client.
    if (event.ports?.[0]) {
      event.ports[0].postMessage({ online: self.navigator?.onLine ?? true });
    }
    return;
  }
});
