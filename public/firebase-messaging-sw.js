// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config will be passed via postMessage from main app
let firebaseConfig = null;
let isInitialized = false;

// Listen for config from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    initializeFirebase();
  }
});

function initializeFirebase() {
  if (isInitialized || !firebaseConfig) {
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[Firebase SW] Background message received:', payload);

      // FCM sends data-only messages for web
      const data = payload.data || {};
      const notification = payload.notification || {};
      
      const title = notification.title || data.title || 'Woup';
      const body = notification.body || data.body || 'You have a new notification';
      
      const notificationOptions = {
        body: body,
        icon: notification.icon || data.icon || '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/',
          type: data.type || 'message',
          ...data
        },
        tag: data.tag || `woup-${Date.now()}`,
        renotify: true,
        requireInteraction: false,
      };

      console.log('[Firebase SW] Showing notification:', title, notificationOptions);
      return self.registration.showNotification(title, notificationOptions);
    });

    isInitialized = true;
    console.log('[Firebase SW] Initialized successfully');
  } catch (error) {
    console.error('[Firebase SW] Init error:', error);
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase SW] Notification clicked:', event.notification);
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.navigate(url).then(() => client.focus());
          }
        }
        // Open new window if no existing one found
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle push events directly (fallback for non-FCM pushes)
self.addEventListener('push', (event) => {
  console.log('[Firebase SW] Push event received');
  
  if (!event.data) {
    console.log('[Firebase SW] No data in push event');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { body: event.data.text() || 'New notification' };
  }

  // If FCM is handling this, skip (it will trigger onBackgroundMessage)
  if (data.notification || data.data?.title) {
    console.log('[Firebase SW] FCM message, letting onBackgroundMessage handle it');
    return;
  }

  const title = data.title || 'Woup';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/' },
    tag: data.tag || `woup-${Date.now()}`,
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Install - skip waiting
self.addEventListener('install', (event) => {
  console.log('[Firebase SW] Installing');
  event.waitUntil(self.skipWaiting());
});

// Activate - claim clients
self.addEventListener('activate', (event) => {
  console.log('[Firebase SW] Activating');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clear old caches
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    ])
  );
});
