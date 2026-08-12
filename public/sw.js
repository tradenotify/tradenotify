self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let title = '🚨 TradeNotify Alerta';
  let body = 'Nueva señal recibida';
  let url = '/app';

  if (event.data) {
    try {
      const data = event.data.json();
      if (data.title) title = String(data.title);
      if (data.body) body = String(data.body);
      if (data.message) body = String(data.message);
      if (data.data && data.data.url) url = data.data.url;
    } catch (e) {
      body = event.data.text();
    }
  }

  const options = {
    body: body,
    icon: '/icon.png',
    data: { url: url }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});