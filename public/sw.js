// Service Worker para Push Notifications - FoodHub09
const CACHE_NAME = 'foodhub09-v1';
const STATIC_ASSETS = [
  '/favicon.ico',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: 'FoodHub09',
    body: 'Nova notificação',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
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
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
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

  // Default action or 'open' action
  const urlToOpen = event.notification.data?.url || '/courier';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Open new window
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
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      requireInteraction: true,
      vibrate: [200, 100, 200],
    });
  }
});

// Background sync for offline support
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-deliveries') {
    event.waitUntil(
      // Could sync pending delivery status updates here
      Promise.resolve()
    );
  }
});
