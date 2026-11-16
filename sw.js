const CACHE_NAME = 'classroom-app-permanent-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './IMG_2013.png',
  './3602-ministere-leducation-jeunesse-et-sport-cambodge-moeys.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of CORE_ASSETS) {
        try {
          await cache.add(url);
        } catch (e) {}
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.hostname.includes('supabase.co')) return;

  if (req.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match('./index.html') || await cache.match(req);
        const networkFetch = fetch(req)
          .then((netRes) => {
            if (netRes && netRes.ok) {
              cache.put('./index.html', netRes.clone());
              cache.put(req, netRes.clone());
            }
            return netRes;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkFetch);
          return cached;
        }
        const netRes = await networkFetch;
        if (netRes) return netRes;
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) {
        event.waitUntil(
          fetch(req).then((netRes) => {
            if (netRes && (netRes.ok || netRes.type === 'opaque')) {
              cache.put(req, netRes.clone());
            }
          }).catch(() => {})
        );
        return cached;
      }
      try {
        const netRes = await fetch(req);
        if (netRes && (netRes.ok || netRes.type === 'opaque')) {
          cache.put(req, netRes.clone());
        }
        return netRes;
      } catch (e) {
        return new Response('', { status: 408 });
      }
    })
  );
});
