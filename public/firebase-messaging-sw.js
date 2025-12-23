// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config will be passed via postMessage or set during build
let firebaseConfig = null;

// Listen for config from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    initializeFirebase();
  }
});

function initializeFirebase() {
  if (!firebaseConfig) {
    console.log('[Firebase SW] No config yet');
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[Firebase SW] Background message:', payload);

      const notificationTitle = payload.notification?.title || payload.data?.title || 'Woup';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'You have a new notification',
        icon: payload.notification?.icon || '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
        data: payload.data || { url: '/' },
        tag: payload.data?.tag || `woup-${Date.now()}`,
        renotify: true,
        requireInteraction: false,
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

    console.log('[Firebase SW] Initialized successfully');
  } catch (error) {
    console.error('[Firebase SW] Init error:', error);
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.navigate(url).then(() => client.focus());
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
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
  event.waitUntil(self.clients.claim());
});
