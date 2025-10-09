// Importa os scripts do Firebase necessários para o Service Worker.
// É importante usar a versão 'compat' para a sintaxe usada aqui.
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js');

// As configurações do seu projeto Firebase.
// ATENÇÃO: Essas configurações são públicas e seguras para serem expostas.
const firebaseConfig = {
  "projectId": "studio-1120078662-2af08",
  "appId": "1:782477450219:web:35c4aea7a95eeba5e557ae",
  "storageBucket": "studio-1120078662-2af08.firebasestorage.app",
  "apiKey": "AIzaSyAy725ooH734-1cjxR30jCDd9XaJrmcD48",
  "authDomain": "studio-1120078662-2af08.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "782477450219"
};


// Inicializa o Firebase no Service Worker
firebase.initializeApp(firebaseConfig);

// Obtém uma instância do Firebase Messaging para lidar com mensagens em segundo plano.
const messaging = firebase.messaging();

/**
 * Opcional: Manipulador para quando uma notificação é recebida enquanto
 * o app está em segundo plano. Você pode customizar a notificação aqui.
 */
messaging.onBackgroundMessage((payload) => {
  console.log(
    '[firebase-messaging-sw.js] Received background message ',
    payload
  );
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icons/icon-192x192.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
