/* اشتركاتي — service worker: يعمل بدون إنترنت ويتحدث تلقائياً عند رفع نسخة جديدة */
const CACHE = "ishtirakati-v1";
const CORE = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon.png", "icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // الصفحة: الشبكة أولاً (لتصلك آخر نسخة) ثم النسخة المخزنة عند انقطاع الإنترنت
    if (req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/")) {
      e.respondWith(
        fetch(req)
          .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("index.html", copy)); return res; })
          .catch(() => caches.match("index.html", { ignoreSearch: true }).then((r) => r || caches.match("./")))
      );
      return;
    }
    // الأيقونات والملفات الثابتة: من المخزن أولاً
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }))
    );
    return;
  }
  // خطوط جوجل: تُخزَّن بعد أول تحميل لتظهر بدون إنترنت
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
  }
});
