const CACHE_PREFIX = "tt-shell-";
const CACHE = CACHE_PREFIX + "__SHELL_VERSION__";
const SCOPE = self.registration.scope;
const INDEX = new URL("index.html", SCOPE).href;
const DATA = new URL("data.json", SCOPE).href;
const FILES = ["index.html", "app.js", "style.css", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const SHELL = new Set(FILES.map(file => new URL(file, SCOPE).href));

function validData(data) {
  return typeof data?.version === "string" && Array.isArray(data.topics) &&
    data.topics.every(topic => typeof topic?.topic === "string" && typeof topic.title === "string" &&
      Array.isArray(topic.questions) && topic.questions.every(q => typeof q?.id === "string" &&
        (!q.leetcode || Array.isArray(q.leetcode))));
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const files = [...SHELL, DATA].map(url => new Request(url, {cache: "reload"}));
    await cache.addAll(files);
    if (!validData(await (await cache.match(DATA)).json())) throw new Error("Invalid question bank");
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const old = names.filter(name => name !== CACHE && (name.startsWith(CACHE_PREFIX) || ["tt-v2", "tt-v3"].includes(name)));
    await Promise.all(old.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

let refreshing;
function refreshData(cache) {
  if (!refreshing) {
    refreshing = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(DATA, {cache: "no-cache", signal: controller.signal});
        if (!response.ok) return false;
        const data = await response.clone().json();
        if (!validData(data)) return false;
        const saved = await cache.match(DATA);
        const previous = saved && await saved.json().catch(() => null);
        if (previous?.version === data.version) return true;
        await cache.put(DATA, response);
        const clients = await self.clients.matchAll({type: "window"});
        clients.forEach(client => client.postMessage({type: "questions-updated", data}));
        return true;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

self.addEventListener("message", event => {
  if (event.data === "refresh-questions") {
    event.waitUntil((async () => {
      if (refreshing && await refreshing) return;
      await refreshData(await caches.open(CACHE));
    })());
  }
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  url.search = "";
  const key = url.href === SCOPE && request.mode === "navigate" ? INDEX : url.href;
  if (key === DATA) {
    const cache = caches.open(CACHE);
    const cached = cache.then(store => store.match(DATA));
    const updated = cache.then(refreshData);
    event.waitUntil(updated);
    event.respondWith(cached.then(async response => {
      if (response) return response;
      await updated;
      return (await (await cache).match(DATA)) || Response.error();
    }));
  } else if (SHELL.has(key)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(key)).then(response => response || fetch(request)));
  }
});
