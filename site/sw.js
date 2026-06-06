const CACHE_NAME = 'bb-v8-' + new Date().toISOString().slice(0,10);
const STATIC_ASSETS = [
  '/',
  '/manifest.json'
];

// Install: 预缓存
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: 清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: 网络优先，离线降级到缓存
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Firebase/API/CDN请求不缓存
  if (url.hostname.includes('firebaseio.com') || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('jsdelivr.net')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          return cached || new Response('离线模式', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});
