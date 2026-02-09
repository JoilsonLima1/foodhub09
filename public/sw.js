// Service Worker para PWA - FoodHub09
// Version tag for cache busting
const SW_VERSION = 'v2';
const CACHE_NAME = `foodhub09-${SW_VERSION}`;
const STATIC_ASSETS = [
  '/favicon.ico',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
];

// Patterns to NEVER cache (private/API routes)
const NO_CACHE_PATTERNS = [
  /\/rest\/v1\//,       // Supabase REST API
  /\/auth\//,           // Auth endpoints
  /\/functions\//,      // Edge functions
  /\/storage\//,        // Storage API
  /\/realtime\//,       // Realtime
  /supabase\.co/,       // Any supabase domain
  /localhost/,          // Dev server
  /\.lovable\.app/,     // Preview domains
  /manifest\.webmanifest/, // Dynamic manifest
  /\/api\//,            // Generic API
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installing...`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activating...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('foodhub09-') && name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests except for static CDN assets
  if (url.origin !== self.location.origin) return;

  // Skip no-cache patterns (API, auth, etc.)
  if (NO_CACHE_PATTERNS.some((pattern) => pattern.test(request.url))) return;

  // For navigation requests: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache error responses
          if (!response.ok) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // For static assets (JS/CSS/images): cache-first
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response.ok) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: 'FoodHub09',
    body: 'Nova notificação',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: 'default',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-icon-192.png',
    badge: data.badge || '/pwa-icon-192.png',
    tag: data.tag,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: data.data,
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  let urlToOpen = '/courier';
  
  if (event.action === 'track' || event.action === 'open') {
    urlToOpen = event.notification.data?.url || '/rastrear';
  } else if (event.notification.data?.url) {
    urlToOpen = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

// Message from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      ...options,
      icon: options.icon || '/pwa-icon-192.png',
      badge: options.badge || '/pwa-icon-192.png',
      requireInteraction: true,
      vibrate: [200, 100, 200],
    });
  }

  if (event.data.type === 'BROADCAST_ORDER_UPDATE') {
    const { notification, orderNumber } = event.data;
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      tag: notification.tag || `order-${orderNumber}`,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: notification.data,
      actions: [
        { action: 'track', title: 'Ver Pedido' },
        { action: 'dismiss', title: 'Dispensar' }
      ]
    });
  }

  // Force update check
  if (event.data.type === 'CHECK_UPDATE') {
    self.registration.update();
  }
});

// Background sync for offline support
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-deliveries') {
    event.waitUntil(Promise.resolve());
  }
});
