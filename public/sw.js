importScripts("/proxy/baremux-worker.js");
importScripts("/uv/uv.bundle.js");
importScripts("/uv/uv.config.js");
importScripts(__uv$config.sw || "/uv/uv.sw.js");
importScripts("/controller/controller.sw.js");

const uv = new UVServiceWorker();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      // 1. Ultraviolet routing
      if (uv.route(event)) {
        return await uv.fetch(event);
      }

      // 2. Scramjet v2 routing
      try {
        if (self.$scramjetController && self.$scramjetController.shouldRoute(event)) {
          return await self.$scramjetController.route(event);
        }
      } catch (err) {
        console.warn("Scramjet SW error", err);
      }

      return await fetch(event.request);
    })(),
  );
});
