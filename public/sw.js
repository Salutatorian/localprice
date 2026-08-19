const APP_SHELL = ["/m/saipan", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("localprice-v1").then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/m/saipan"))),
  );
});
