const CACHE = 'anon-shell-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/shield.svg',
  '/icons/commbank.png',
  '/icons/westpac.png',
  '/icons/anz.png',
  '/icons/nab.png',
  '/icons/up.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/pay/') || url.pathname.startsWith('/telegram/')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ||
      fetch(event.request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match('/'))
    )
  );
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Anon',
    body: 'You have a new notification.',
    icon: '/shield.svg',
    badge: '/shield.svg',
    url: '/',
  };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: data.icon || '/shield.svg',
    badge: data.badge || data.icon || '/shield.svg',
    data: { url: data.url || data.data?.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Anon', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = event.notification.data?.url || '/';
  let target;
  try {
    target = new URL(raw, self.location.origin).href;
  } catch {
    target = self.location.origin + '/';
  }

  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus();
          if ('navigate' in client && target !== client.url) {
            try {
              await client.navigate(target);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })()
  );
});
