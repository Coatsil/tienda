const CACHE_NAME = 'product-management-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/html5-qrcode@2.3.8/dist/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Estrategia: Cache First, luego Network
self.addEventListener('fetch', event => {
  // Excluir las solicitudes de la cámara y las APIs externas
  if (event.request.url.includes('/camera/') || 
      event.request.url.includes('chrome-extension') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request)
          .then(fetchResponse => {
            // Solo cacheamos respuestas GET y exitosas
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic' || event.request.method !== 'GET') {
              return fetchResponse;
            }

            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return fetchResponse;
          });
      })
  );
});