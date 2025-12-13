// Service Worker for Push Notifications - Enhanced with better logging

const SW_VERSION = '1.0.1';

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  
  let options = {};
  try {
    options = event.data?.json() || {};
  } catch (e) {
    console.log('[SW] Push data is not JSON, using text:', event.data?.text());
    options = { body: event.data?.text() || 'New notification' };
  }
  
  const notificationOptions = {
    body: options.body || 'New notification',
    icon: options.icon || '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: options.data || {},
    actions: options.actions || [],
    tag: options.tag || 'woup-notification',
    renotify: true
  };

  console.log('[SW] Showing notification:', options.title, notificationOptions);

  event.waitUntil(
    self.registration.showNotification(options.title || 'Woup', notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);
  event.notification.close();

  const data = event.notification.data || {};
  const urlToOpen = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', SW_VERSION);
  // Skip waiting to activate immediately
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', SW_VERSION);
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches if any
      caches.keys().then(keys => 
        Promise.all(keys.map(key => caches.delete(key)))
      )
    ])
  );
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed:', event);
  // The subscription was invalidated, need to resubscribe
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(subscription => {
        console.log('[SW] Re-subscribed:', subscription.endpoint);
      })
      .catch(err => {
        console.error('[SW] Failed to re-subscribe:', err);
      })
  );
});
