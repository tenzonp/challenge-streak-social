import { initializeApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, Messaging, onMessage } from "firebase/messaging";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

// Firebase config - these are public/publishable keys
const firebaseConfig = {
  apiKey: "AIzaSyAXsEdjVun0cG0ogo09OjabsrW9vaNgkBU",
  authDomain: "wemet-d7395.firebaseapp.com",
  databaseURL: "https://wemet-d7395-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wemet-d7395",
  storageBucket: "wemet-d7395.firebasestorage.app",
  messagingSenderId: "715534380195",
  appId: "1:715534380195:web:4b954291c45de85cfe6316",
  measurementId: "G-G32X3V1769",
};

export const initializeFirebase = (): FirebaseApp | null => {
  if (app) return app;

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn("[Firebase] Missing configuration");
    return null;
  }

  try {
    app = initializeApp(firebaseConfig);
    console.log("[Firebase] Initialized");
    return app;
  } catch (error) {
    console.error("[Firebase] Init error:", error);
    return null;
  }
};

export const getFirebaseMessaging = (): Messaging | null => {
  if (messaging) return messaging;

  const firebaseApp = initializeFirebase();
  if (!firebaseApp) return null;

  try {
    messaging = getMessaging(firebaseApp);
    return messaging;
  } catch (error) {
    console.error("[Firebase] Messaging init error:", error);
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  const messagingInstance = getFirebaseMessaging();
  if (!messagingInstance) {
    console.error("[Firebase] Messaging not available");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[Firebase] Permission denied");
      return null;
    }

    // Get the FCM token using VAPID key from Firebase Console
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    const token = await getToken(messagingInstance, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.register("/firebase-messaging-sw.js"),
    });

    console.log("[Firebase] FCM Token:", token?.substring(0, 20) + "...");
    return token;
  } catch (error) {
    console.error("[Firebase] Token error:", error);
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  const messagingInstance = getFirebaseMessaging();
  if (!messagingInstance) return;

  return onMessage(messagingInstance, (payload) => {
    console.log("[Firebase] Foreground message:", payload);
    callback(payload);
  });
};
