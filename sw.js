const CACHE_NAME = 'ryzon-v28';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/firebase-config.js',
    '/ryzon_logo.png',
    '/manifest.json',
    'https://unpkg.com/lucide@latest',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
    self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                // Delete all old cache versions
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        }).then(() => self.clients.claim()) // Claim existing clients immediately
    );
});

self.addEventListener('fetch', e => {
    // Network-first strategy for HTML, CSS, JS to guarantee live updates
    if (e.request.url.includes('.html') || e.request.url.includes('.js') || e.request.url.includes('.css')) {
        e.respondWith(
            fetch(e.request).then(networkResponse => {
                // Cache the fresh response
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(e.request, responseClone);
                });
                return networkResponse;
            }).catch(() => {
                // Fall back to cache if offline
                return caches.match(e.request);
            })
        );
    } else {
        // Cache-first for images, etc
        e.respondWith(
            caches.match(e.request).then(response => {
                return response || fetch(e.request);
            }).catch(() => {
            })
        );
    }
});
