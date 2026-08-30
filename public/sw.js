const CACHE_SHELL = "frosted-shell-v1";
const CACHE_GAMES = "frosted-games-v1";

// Core static shell assets to pre-cache
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/robots.txt",
];

// Install Event - Pre-cache core app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) => {
        return cache.addAll(SHELL_ASSETS).catch((err) => {
          console.warn("[Frosted SW] Shell pre-cache warning:", err);
        });
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate Event - Clean up stale cache buckets
self.addEventListener("activate", (event) => {
  const allowedCaches = [CACHE_SHELL, CACHE_GAMES];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => !allowedCaches.includes(key))
            .map((key) => caches.delete(key)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Utility to check if a URL belongs to game proxy or game CDN assets
function isGameAssetUrl(urlStr) {
  if (!urlStr) return false;
  return (
    urlStr.includes("/api/public/") ||
    urlStr.includes("/api/soundboard/") ||
    urlStr.includes("cdn.jsdelivr.net") ||
    urlStr.includes("raw.githubusercontent.com") ||
    urlStr.includes("unpkg.com") ||
    urlStr.includes("cdnjs.cloudflare.com")
  );
}

// Slice response array buffer for Range Requests (crucial for HTML5/WebGL game audio and media streaming)
async function sliceRangeResponse(request, cachedResponse) {
  const rangeHeader = request.headers.get("Range");
  if (!rangeHeader) return cachedResponse;

  try {
    const arrayBuffer = await cachedResponse.arrayBuffer();
    const bytes = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(bytes[0], 10);
    const end = bytes[1] ? parseInt(bytes[1], 10) : arrayBuffer.byteLength - 1;

    if (start >= arrayBuffer.byteLength) {
      return new Response("", {
        status: 416,
        headers: { "Content-Range": `bytes */${arrayBuffer.byteLength}` },
      });
    }

    const slicedBuffer = arrayBuffer.slice(start, end + 1);
    const contentType =
      cachedResponse.headers.get("Content-Type") || "application/octet-stream";

    return new Response(slicedBuffer, {
      status: 206,
      statusText: "Partial Content",
      headers: {
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${arrayBuffer.byteLength}`,
        "Content-Length": slicedBuffer.byteLength.toString(),
        "Accept-Ranges": "bytes",
      },
    });
  } catch {
    return cachedResponse;
  }
}

// Fetch Interceptor
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Strategy 1: Game & Proxy Assets -> Cache-First with Network Fallback + Auto-Caching
  if (isGameAssetUrl(url.href)) {
    event.respondWith(
      (async () => {
        const gameCache = await caches.open(CACHE_GAMES);
        // Check exact match or query-less match
        let cached = await gameCache.match(request);
        if (!cached && url.search) {
          cached = await gameCache.match(url.origin + url.pathname);
        }

        if (cached) {
          if (request.headers.get("Range")) {
            return sliceRangeResponse(request, cached);
          }
          return cached;
        }

        try {
          const networkResponse = await fetch(request);
          if (
            networkResponse &&
            (networkResponse.status === 200 || networkResponse.type === "opaque")
          ) {
            // Store a clone in the games cache bucket so future visits work 100% offline
            gameCache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (err) {
          console.warn("[Frosted SW] Offline game request failed:", request.url, err);
          return new Response("Game asset not available offline.", {
            status: 503,
            statusText: "Offline Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        }
      })(),
    );
    return;
  }

  // Strategy 2: HTML Page Navigation -> Network First, Fallback to Cached App Shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_SHELL).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_SHELL);
          const cachedPage =
            (await cache.match("/index.html")) || (await cache.match("/"));
          if (cachedPage) return cachedPage;
          return new Response("App is offline.", {
            status: 503,
            headers: { "Content-Type": "text/html" },
          });
        }),
    );
    return;
  }

  // Strategy 3: Application JS/CSS & Static Assets -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_SHELL).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => null);

      return cached || fetchPromise || new Response("Asset offline", { status: 504 });
    }),
  );
});

// Messages Handler (Communication with Client)
self.addEventListener("message", async (event) => {
  if (!event.data) return;

  const { type, urls } = event.data;

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (type === "GET_CACHED_GAME_KEYS") {
    const gameCache = await caches.open(CACHE_GAMES);
    const requests = await gameCache.keys();
    const resultUrls = requests.map((r) => r.url);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: "CACHED_GAME_KEYS_RESULT", urls: resultUrls });
    }
  } else if (type === "CACHE_GAME_ASSETS") {
    if (Array.isArray(urls)) {
      const gameCache = await caches.open(CACHE_GAMES);
      let count = 0;
      for (const u of urls) {
        try {
          const req = new Request(u, { mode: "cors" });
          const existing = await gameCache.match(req);
          if (!existing) {
            const res = await fetch(req);
            if (res.ok || res.type === "opaque") {
              await gameCache.put(req, res);
              count++;
            }
          }
        } catch (err) {
          console.warn("[Frosted SW] Failed to pre-cache game URL:", u, err);
        }
      }
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: "CACHE_GAME_ASSETS_COMPLETE", count });
      }
    }
  } else if (type === "CLEAR_GAME_CACHE") {
    await caches.delete(CACHE_GAMES);
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: "CLEAR_GAME_CACHE_COMPLETE" });
    }
  }
});
