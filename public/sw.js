self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let payload = { title: 'TradeNotify', message: 'Nueva alerta' };
    
    if (event.data) {
        try {
            payload = event.data.json();
        } catch (e) {
            payload = { title: 'TradeNotify', message: event.data.text() };
        }
    }

    const options = {
        body: payload.message || payload.body,
        icon: '/icon.png',
        badge: '/icon.png',
        data: { url: payload.data?.url || '/app' }
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});