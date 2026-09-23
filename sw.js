// Offline-tuki: sovellus toimii ilman verkkoa ensimmäisen käynnin jälkeen.
// Vaihda versionumeroa, kun julkaiset muutoksia.
const CACHE = 'soivat-sivut-v3';
const FILES = [
  './', './index.html', './style.css', './manifest.webmanifest', './icon.svg',
  './js/audio.js', './js/animals.js', './js/music.js', './js/visuals.js', './js/app.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Verkko ensin, jotta päivitykset näkyvät heti; ilman verkkoa käytetään välimuistia
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
    .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
