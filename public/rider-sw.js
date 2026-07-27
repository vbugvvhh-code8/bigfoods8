// Minimal service worker for the BigFoods rider PWA (scope: /rider-portal).
// Same approach as the customer PWA -- no attempt to precache Next.js's
// build-hashed asset filenames (those change every deploy). Instead:
// stale-while-revalidate for same-origin GET requests, which keeps the
// last-seen shell available offline/on flaky connections without any
// build-time coupling.

const CACHE_NAME = 'bigfoods-rider-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const {request} = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache the Supabase functions/API calls or auth redirects.
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
