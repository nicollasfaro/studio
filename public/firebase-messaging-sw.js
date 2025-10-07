
// Import the Firebase app and messaging libraries.
// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// Initialize the Firebase app in the service worker with the same configuration
// as in the main app.
// It's important to copy your actual firebaseConfig here.
const firebaseConfig = {
  "projectId": "studio-1120078662-2af08",
  "appId": "1:782477450219:web:35c4aea7a95eeba5e557ae",
  "storageBucket": "studio-1120078662-2af08.firebasestorage.app",
  "apiKey": "AIzaSyAy725ooH734-1cjxR30jCDd9XaJrmcD48",
  "authDomain": "studio-1120078662-2af08.firebaseapp.com",
  "messagingSenderId": "782477450219"
};


const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/**
 * onBackgroundMessage is used to handle messages received when your web app
 * is in the background or closed. The handler function must be defined in this
 * service worker file.
 */
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Nova Notificação';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
