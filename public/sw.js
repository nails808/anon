const CACHE = 'anon-shell-v4';
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
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/pay/') ||
    url.pathname.startsWith('/telegram/')
  ) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
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
    data: {},
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = {
        ...data,
        ...parsed,
        data: { ...(data.data || {}), ...(parsed.data || {}) },
      };
    }
  } catch {
    try {
      if (event.data) data.body = event.data.text();
    } catch {
      /* ignore */
    }
  }

  const targetUrl = data.url || data.data?.url || '/';
  const options = {
    body: data.body,
    icon: data.icon || '/shield.svg',
    badge: data.badge || '/shield.svg',
    data: {
      url: targetUrl,
      receiptId: data.data?.receiptId || data.receiptId || null,
      createdAt: data.data?.createdAt || data.createdAt || null,
      kind: data.data?.kind || null,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Anon', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = event.notification?.data?.url;
  let target;
  try {
    target = rawUrl
      ? new URL(rawUrl, self.location.origin).href
      : new URL('/', self.location.origin).href;
  } catch {
    target = self.location.origin + '/';
  }

  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });

      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(target);
            } catch {
              /* some browsers block navigate */
            }
          }
          return;
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(target);
      }
    })()
  );
});
