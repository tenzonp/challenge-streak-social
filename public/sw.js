// Service Worker for Push Notifications - Optimized v2
const SW_VERSION = '2.0.0';

// Handle push events
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (e) {
    data = { body: event.data?.text() || 'New notification' };
  }
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/' },
    tag: data.tag || `woup-${Date.now()}`,
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Woup', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.navigate(url).then(() => client.focus());
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Install - skip waiting
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v' + SW_VERSION);
  event.waitUntil(self.skipWaiting());
});

// Activate - claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v' + SW_VERSION);
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    ])
  );
});

// Handle subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Subscription changed');
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(sub => console.log('[SW] Resubscribed'))
      .catch(err => console.error('[SW] Resubscribe failed:', err))
  );
});
