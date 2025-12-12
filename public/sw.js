// Service Worker for Push Notifications
self.addEventListener('push', (event) => {
  const options = event.data?.json() || {};
  
  const notificationOptions = {
    body: options.body || 'New notification',
    icon: options.icon || '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: options.data || {},
    actions: options.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(options.title || 'Woup', notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
