// Минимальный Service Worker: при навигации (F5) всегда запрашиваем index.html с сервера, без кэша.
self.addEventListener('fetch', function (event) {
  if (event.request.mode !== 'navigate') return;
  if (event.request.url.indexOf(self.registration.scope) !== 0) return;
  event.respondWith(
    fetch(event.request, { cache: 'reload', redirect: 'follow' })
  );
});
