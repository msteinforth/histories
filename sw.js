// Offline-Fähigkeit: App-Hülle aus dem Cache (im Hintergrund aktualisiert),
// Inhalte zuerst aus dem Netz, damit neue Tage sofort erscheinen.
const CACHE = 'histories-v2';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/logic.js', 'js/store.js', 'js/views.js', 'js/cards.js', 'js/viewer.js', 'js/ui.js', 'js/util.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  if (url.pathname.includes('/content/') && url.pathname.endsWith('.json')) {
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true })));
    return;
  }

  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((cached) => {
    const fresh = fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
