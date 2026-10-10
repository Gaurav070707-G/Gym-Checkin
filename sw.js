/* Habuild Gym Check-in: lets the page open without internet (e.g. inside a gym with no signal).
   The page itself is always fetched fresh when online (network first), so updates show up immediately. */
const CACHE = 'gym-checkin-v1';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // API calls (POST) always go to the network
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Our own page: network first, fall back to the saved copy when offline
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  if (/cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|assets\.habit\.yoga/.test(url.hostname)) {
    // Library, fonts and logo: use the saved copy, refresh it in the background
    event.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req)
          .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});
