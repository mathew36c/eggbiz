if (self instanceof ServiceWorkerGlobalScope) {
  const CACHE_NAME = "egg-business-v1";
  const OFFLINE_URL = "/offline";

  const PRECACHE_URLS = [
    "/",
    "/inventory",
    "/sales",
    "/expenses",
    "/analytics",
    "/offline",
  ];

  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(PRECACHE_URLS);
      })
    );
    self.skipWaiting();
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
    );
    self.clients.claim();
  });

  self.addEventListener("fetch", (event) => {
    if (event.request.mode === "navigate") {
      event.respondWith(
        fetch(event.request).catch(() => {
          return caches.match(event.request).then((response) => {
            return response || caches.match(OFFLINE_URL);
          });
        })
      );
      return;
    }

    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
  });
}