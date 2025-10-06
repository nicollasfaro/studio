// This file needs to be in the public directory

// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "studio-1120078662-2af08",
  "appId": "1:782477450219:web:35c4aea7a95eeba5e557ae",
  "storageBucket": "studio-1120078662-2af08.firebasestorage.app",
  "apiKey": "AIzaSyAy725ooH734-1cjxR30jCDd9XaJrmcD48",
  "authDomain": "studio-1120078662-2af08.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "782477450219"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png' // Make sure you have an icon in your public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
