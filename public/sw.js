self.addEventListener('push', (event) => {
  let data = { title: '🚨 Nueva Alerta de Trading', body: 'Revisa tu gráfico' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/badge.png',
    vibrate: [300, 100, 300, 100, 500], // Patrón de vibración agresivo
    tag: 'trade-alert-' + Date.now(),
    renotify: true,
    requireInteraction: true // Mantiene la notificación visible hasta que el usuario la toque
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Al tocar la notificación, abre la web
  event.waitUntil(
    clients.openWindow('/')
  );
});