// AUH ETA service worker: keeps the app working with no signal.
// Change the version number each time you upload new files, so phones fetch the update.
const CACHE = 'auh-eta-v4';

// Your own pages
const LOCAL = [
  './',
  'index.html',
  'calculator.html',
  'manifest.json',
  'icons/icon-192.png'
];

// Libraries the pages load from the internet (saved on first online visit)
const CDN = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/@phosphor-icons/web',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700;800&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // One failure (for example a missing icon) must not stop the rest
    await Promise.all(LOCAL.map(u => cache.add(u).catch(() => {})));
    await Promise.all(CDN.map(async u => {
      try { await cache.put(u, await fetch(u, { mode: 'no-cors' })); } catch (e) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });

    // Pages: try the network first so updates show up, fall back to the saved copy
    if (req.mode === 'navigate') {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        return cached || (await cache.match('index.html')) || Response.error();
      }
    }

    // Everything else (scripts, fonts, icons): use the saved copy, refresh it in the background
    const refresh = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await refresh) || Response.error();
  })());
});
