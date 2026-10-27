const CACHE_NAME = 'qastaha-v2';
const urlsToCache = ['/', '/shop', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) return;
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request).then(res=>{
      if (res.ok && event.request.url.startsWith(self.location.origin)) {
        const clone=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(event.request, clone));
      }
      return res;
    }).catch(()=>caches.match('/')))
  );
});
