/**
 * Offline cache.
 *
 * Strategy is deliberately not "cache everything forever":
 *   - the app shell is cache-first and versioned, because it changes only on deploy;
 *   - the corpus is network-first with a cache fallback, so a new corpus is picked
 *     up when online but practice keeps working on a plane.
 *
 * A version bump in CACHE_NAME drops the old shell on activate.
 */
const CACHE = 'cca-prep-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/main.js',
  './js/guide.js',
  './js/data.js',
  './js/ui.js',
  './js/progress.js',
  './js/practice.js',
  './js/exam.js',
  './js/blind.js',
  './js/review.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

const DATA = ['./data/corpus.json', './data/quarantine.json', './data/blind-set.json', './data/guide.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // The shell must all be present or there is no offline app at all.
      await cache.addAll(SHELL);
      // Data is best-effort: a missing blind set should not block installation.
      await Promise.all(DATA.map((url) => cache.add(url).catch(() => {})));
      self.skipWaiting();
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline and not cached' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes('/data/')) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html')),
    );
    return;
  }
  event.respondWith(cacheFirst(request));
});
