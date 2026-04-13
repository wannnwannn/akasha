// Ceci est le script qui tourne en arrière-plan sur le téléphone

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker Akasha installé.');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Écouteur pour les futures notifications Push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "Nouvelle sortie Akasha";
  const options = {
    body: data.body || "Votre épisode est disponible !",
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: data.url || "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Comportement au clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
