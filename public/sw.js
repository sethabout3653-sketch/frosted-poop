importScripts("/proxy/baremux-worker.js");
importScripts("/uv/uv.bundle.js");
importScripts("/uv/uv.config.js");
importScripts(__uv$config.sw || "/uv/uv.sw.js");
importScripts("/proxy/scramjet.all.js");

const uv = new UVServiceWorker();
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      // 1. Ultraviolet routing
      if (uv.route(event)) {
        return await uv.fetch(event);
      }

      // 2. Scramjet routing
      try {
        await scramjet.loadConfig();
        if (scramjet.route(event)) {
          return await scramjet.fetch(event);
        }
      } catch {
        /* proceed to fallback */
      }

      return await fetch(event.request);
    })(),
  );
});
