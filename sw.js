// ============================================================
// CloudSource — Service Worker
// Caches app shell for offline/PWA install
// ============================================================

const CACHE_NAME = 'cloudsource-v1';

const SHELL_FILES = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/js/config.js',
  '/js/db.js',
  '/js/utils.js',
  '/js/weather.js',
  '/js/map.js',
  '/js/report.js',
  '/js/timeline.js',
  '/js/detail.js',
  '/js/auth.js',
  '/manifest.json',
];

// Install: cache shell files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API/data, cache-first for shell
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Network-first for API calls and external resources
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('open-meteo') ||
    url.hostname.includes('api.weather.gov') ||
    url.hostname.includes('tile.openstreetmap') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('cdn.jsdelivr') ||
    url.hostname.includes('fonts.googleapis') ||
    url.hostname.includes('fonts.gstatic')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for app shell
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache new resources
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
