importScripts('https://www.gstatic.com/firebasejs/3.6.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.6.2/firebase-messaging.js');

var config = {
  apiKey: "AIzaSyAlRO_7_sv1BhgJ6xT1MRscondyLoh70vo",
  authDomain: "draftleague2017.firebaseapp.com",
  databaseURL: "https://draftleague2017.firebaseio.com",
  storageBucket: "draftleague2017.appspot.com",
  messagingSenderId: "382673579824"
};

firebase.initializeApp(config);

const messaging = firebase.messaging();

// messaging.setBackgroundMessageHandler(function(payload) {
//   console.log('[firebase-messaging-sw.js] Received background message ', payload);
//   // Customize notification here
//   const notificationTitle = 'Background Message Title';
//   const notificationOptions = {
//     body: 'Background Message body.',
//     icon: '/firebase-logo.png'
//   };
//
//   return self.registration.showNotification(notificationTitle,
//       notificationOptions);
// });
