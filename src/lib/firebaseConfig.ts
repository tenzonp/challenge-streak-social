// Firebase Web App Configuration
// These are PUBLIC keys - Firebase security comes from Firebase Rules, not hiding these values
// Get these from your Firebase Console: Project Settings > General > Your Apps > Web App

export const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// VAPID key for web push notifications
// Get this from Firebase Console: Project Settings > Cloud Messaging > Web Push certificates
export const vapidKey = "YOUR_VAPID_KEY";
