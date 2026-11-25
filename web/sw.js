const CACHE = "tt-v2";
const SHELL = ["./", "index.html", "app.js", "style.css", "data.json", "manifest.webmanifest", "icon-192.png", "apple-touch-icon.png"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE), nav = r.mode === "navigate";
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
      const res = await fetch(r.url, {cache: "no-cache", signal: ctl.signal}); clearTimeout(t);
      if (res.ok) c.put(nav ? "index.html" : r.url, res.clone());
      return res;
    } catch (err) {
      return (await c.match(nav ? "index.html" : r.url, {ignoreSearch: true})) || Response.error();
    }
  })());
});
