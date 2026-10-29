/* THE BKRY Demand Form - service worker
   index.html badalne par CACHE_VERSION ka number barha den taake purana cache hat jaye. */
var CACHE_VERSION = 'v8';
var CACHE = 'bkry-demand-' + CACHE_VERSION;

var LOCAL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

/* Bahar ki libraries / fonts - pehli dafa online khulne par cache ho jati hain */
var REMOTE = [
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600&family=Dancing+Script:wght@600&display=swap'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(LOCAL).then(function () {
        return Promise.all(REMOTE.map(function (u) {
          return fetch(new Request(u, { mode: 'no-cors' }))
            .then(function (r) { return c.put(u, r); })
            .catch(function () {});
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('bkry-demand-') === 0 && k !== CACHE;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function store(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
  }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  /* Page khulna: pehle network (taake naya version mile), na ho to cache */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) { return store('./index.html', res); })
        .catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  /* Baqi sab: cache pehle, saath mein background mein update */
  if (url.origin === location.origin ||
      /(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { return store(req, res); }).catch(function () { return hit; });
        return hit || net;
      })
    );
  }
});
