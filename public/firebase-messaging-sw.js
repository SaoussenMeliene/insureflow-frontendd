importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDF6OPbo5xr_iaYNOqDykNT1O35bCVVX1g",
  authDomain: "insureflow-b2aff.firebaseapp.com",
  projectId: "insureflow-b2aff",
  storageBucket: "insureflow-b2aff.firebasestorage.app",
  messagingSenderId: "755938427431",
  appId: "1:755938427431:web:1a7bb21dd1980388fa0402"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('📩 Background notification:', payload);

  // ✅ includeUncontrolled pour trouver tous les onglets Angular
  self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((clientList) => {
    console.log('Clients trouvés:', clientList.length);
    for (const client of clientList) {
      client.postMessage({
        type:  'NOTIFICATION_CLICK',
        title: payload.notification?.title || '',
        body:  payload.notification?.body  || ''
      });
    }
  });

  self.registration.showNotification(
    payload.notification?.title || 'InsureFlow',
    {
      body: payload.notification?.body || '',
      icon: '/logo.png',
      data: payload.data
    }
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({
          type:  'NOTIFICATION_CLICK',
          title: event.notification.title,
          body:  event.notification.body
        });
        return client.focus();
      }
    })
  );
});