const CACHE_NAME = 'product-management-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/Tienda.webp',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/html5-qrcode@2.3.8/dist/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  '/icons/icono1.png',
  '/icons/icono2.png',
  '/icons/icono3.png',
  '/screenshots/icono4.png'
];

// Estrategia: Cache First with Network Fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE)
          .then(() => {
            console.log('Todos los recursos han sido cacheados');
            return self.skipWaiting();
          })
          .catch((error) => {
            console.log('Fallo al cachear recursos:', error);
          });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Eliminando cache antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Excluir solicitudes de la cámara y APIs externas
  if (event.request.url.includes('/camera/') || 
      event.request.url.includes('chrome-extension') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return fetch(event.request);
  }

  // Para solicitudes de datos (API), usar Network First
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Opcional: cachear respuestas API
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Para todos los demás recursos, usar Cache First
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        return cachedResponse || fetch(event.request)
          .then((response) => {
            // Solo cacheamos respuestas GET y exitosas
            if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method !== 'GET') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache));

            return response;
          });
      })
  );
});

// Manejar mensajes para actualizar la caché
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Manejar sincronización en background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('Sincronizando datos en background...');
    // Aquí iría la lógica para sincronizar datos
  }
});

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
