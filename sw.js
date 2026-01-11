const cacheName = 'ders-takip-v19.42'; // Versiyonu v2 yaptık (önbellek tazelenmesi için)
const staticAssets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './ikon.png' // Eksik olan ikonu ekledik
];

// Uygulama yüklendiğinde varlıkları önbelleğe al
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(staticAssets);
    })
  );
  self.skipWaiting();
});

// Yeni versiyon yüklendiğinde eski önbelleği temizle
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== cacheName).map(key => caches.delete(key))
      );
    })
  );
});

// İnternet varken ağdan çek, yoksa önbellekten getir (Network-first fallback to cache)
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});