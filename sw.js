const CACHE_NAME = 'mindmap-cache-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './src/state.js',
  './src/utils.js',
  './src/create-delete.js',
  './src/smart-placement.js',
  './src/layout.js',
  './src/geometry.js',
  './src/selection.js',
  './src/edit.js',
  './src/drag.js',
  './src/input-mouse.js',
  './src/input-touch.js',
  './src/menus.js',
  './src/link-mode.js',
  './src/branch-view.js',
  './src/mobile-rename.js',
  './src/notes.js',
  './src/trash.js',
  './src/line-panel.js',
  './src/ui.js',
  './src/menu.js',
  './src/init.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  // Activate immediately, don't wait for old tabs to close
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});
