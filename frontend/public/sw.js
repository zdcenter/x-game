// X-Game Production PWA Service Worker
const CACHE_NAME = 'xgame-offline-v2026.11.02.1209';

// Core static assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/pwa-icon.svg',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/docs/index.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Use resilient per-asset caching so one failing asset does not abort the rest
      await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn(`[SW] Pre-cache skipped for ${asset}:`, err);
          })
        )
      );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((k) => {
            if (k !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', k);
              return caches.delete(k);
            }
          })
        )
      )
    ]).then(() => {
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_NAME });
        });
      });
    })
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Bypass non-GET, WebSockets, chrome extensions, vite HMR, dev localhost, etc.
  if (
    req.method !== 'GET' ||
    !url.protocol.startsWith('http') ||
    url.pathname.startsWith('/ws/') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@fs') ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1'
  ) {
    return;
  }

  // 2. Bypass dynamic user authentication, admin actions & version.json live checks
  if (
    url.pathname.startsWith('/api/v1/auth') ||
    url.pathname.startsWith('/api/v1/admin') ||
    url.pathname === '/version.json'
  ) {
    return;
  }

  // 3. Navigation requests (HTML pages) -> Fast-Timeout Network with Immediate Cache Fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const networkFetch = fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        });

        const cached =
          (await caches.match(req)) ||
          (await caches.match('/')) ||
          (await caches.match('/index.html'));

        // If we have a cached offline shell, race network with a 1500ms timeout
        // to prevent 30~60s white-screen hangs on weak/flaky networks
        if (cached) {
          let timeoutId;
          const timeoutFallback = new Promise((resolve) => {
            timeoutId = setTimeout(() => {
              console.warn('[SW] Navigation network timeout (1500ms), serving cached SPA shell');
              resolve(cached);
            }, 1500);
          });

          try {
            const winner = await Promise.race([networkFetch, timeoutFallback]);
            clearTimeout(timeoutId);
            return winner;
          } catch {
            clearTimeout(timeoutId);
            return cached;
          }
        }

        // If no cached copy exists, wait for network or try root fallback
        return networkFetch.catch(async () => {
          return (await caches.match('/')) || (await caches.match('/index.html'));
        });
      })()
    );
    return;
  }

  // 4. Static assets (JS, CSS, fonts, audio, icons) -> Stale-While-Revalidate
  const isStatic =
    url.origin === self.location.origin &&
    (/\.(js|css|woff2?|ttf|png|svg|ico|webp|mp3|wav|ogg|json)$/i.test(url.pathname) ||
      url.pathname.startsWith('/assets/'));

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return networkRes;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 5. Other GET API or media requests -> Network-first with cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
