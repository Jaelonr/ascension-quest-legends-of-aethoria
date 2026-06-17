const CACHE_NAME = "fitness-rpg-shell-v1";
const SHELL_URLS = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_URLS).catch(() => {})
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Navigation: serve app shell, fall back to cache if offline
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match("/index.html").then((cached) => cached ?? fetch(request))
      )
    );
    return;
  }

  // Cache-first for static assets
  if (
    request.method === "GET" &&
    url.origin === self.location.origin &&
    (url.pathname.match(/\.(js|css|woff2?|png|svg|ico|webp|ttf)$/) ||
      url.pathname.startsWith("/assets/"))
  ) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Fitness RPG", body: event.data.text() };
  }
  const options = {
    body: payload.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag ?? "default",
    data: { url: payload.url ?? "/" },
    vibrate: [100, 50, 100],
  };
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Fitness RPG", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(clients.openWindow(url));
});
