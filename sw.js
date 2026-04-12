/* ═══════════════════════════════════════════════════════
   SUTRIX — Service Worker  (sw.js)
   Strategy: Cache-First for assets, Network-First for HTML
═══════════════════════════════════════════════════════ */

const CACHE_NAME   = 'sutrix-v1';
const OFFLINE_URL  = './index.html';

/* Files to pre-cache on install */
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
];

/* ── INSTALL: pre-cache core assets ── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: clean up old caches ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: smart caching strategy ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET and cross-origin requests */
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  /* CDN / external scripts → Network-first, fallback to cache */
  if (url.origin !== location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }

  /* HTML pages → Network-first so updates are picked up */
  if (request.destination === 'document' || request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  /* All other assets (JS, CSS, images, fonts) → Cache-first */
  event.respondWith(cacheFirst(request));
});

/* ─────────────────────────────────────────────────────
   Helper strategies
───────────────────────────────────────────────────── */

/** Cache-first: return cached version, else fetch & cache */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline – resource not cached.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/** Network-first: try network, fall back to cache */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline – resource not cached.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/** Network-first for HTML with offline page fallback */
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request) || await caches.match(OFFLINE_URL);
    return (
      cached ||
      new Response(
        `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Sutrix – Offline</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{background:#060A0A;color:#00E5CC;font-family:monospace;
        display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:12px;}
        h1{font-size:1.6rem;letter-spacing:.2em;}p{color:#527070;font-size:.75rem;}</style></head>
        <body><h1>∑ SUTRIX</h1><p>You're offline. Please reconnect to continue.</p></body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    );
  }
}

/* ── BACKGROUND SYNC (optional, for future use) ── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sutrix-sync') {
    // Placeholder for future background sync logic
    console.log('[Sutrix SW] Background sync triggered');
  }
});

/* ── PUSH NOTIFICATIONS (optional placeholder) ── */
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Sutrix', body: 'New update available!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-72.png',
    })
  );
});
