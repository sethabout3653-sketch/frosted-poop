import express from "express";
import path from "path";
import http from "http";
import { createServer as createViteServer } from "vite";
import { server as wispServer } from "@mercuryworkshop/wisp-js";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  // Handle Wisp WebSocket connections for proxying (Render / local / self-hosted)
  server.on("upgrade", (req, socket, head) => {
    if (req.url && (req.url.startsWith("/wisp") || req.url.startsWith("/wisp/"))) {
      wispServer.routeRequest(req, socket, head);
    }
  });

  // Game assets proxy: serves games from CDN with correct MIME headers & base tags
  app.get("/api/public/g/*", async (req, res) => {
    try {
      const rawPath = (req.params as Record<string, string>)[0] || "";
      const cdnUrl = `https://cdn.jsdelivr.net/gh/selenite-cc/selenite-old@main/${rawPath}`;
      const response = await fetch(cdnUrl);
      if (!response.ok) {
        return res.status(response.status).send("Game asset not found");
      }

      if (rawPath.endsWith(".html") || rawPath.endsWith(".htm")) {
        res.setHeader("content-type", "text/html; charset=utf-8");
        let html = await response.text();
        const dir = rawPath.substring(0, rawPath.lastIndexOf("/"));
        if (!html.includes("<base ")) {
          html = html.replace(/<head[^>]*>/i, `$&<base href="/api/public/g/${dir}/">`);
        }
        return res.send(html);
      }

      if (rawPath.endsWith(".js")) {
        res.setHeader("content-type", "application/javascript");
      } else if (rawPath.endsWith(".css")) {
        res.setHeader("content-type", "text/css");
      } else if (rawPath.endsWith(".wasm")) {
        res.setHeader("content-type", "application/wasm");
      } else if (rawPath.endsWith(".json")) {
        res.setHeader("content-type", "application/json");
      } else if (rawPath.endsWith(".png")) {
        res.setHeader("content-type", "image/png");
      } else if (rawPath.endsWith(".jpg") || rawPath.endsWith(".jpeg")) {
        res.setHeader("content-type", "image/jpeg");
      } else if (rawPath.endsWith(".svg")) {
        res.setHeader("content-type", "image/svg+xml");
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType) res.setHeader("content-type", contentType);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (err) {
      console.error("Game proxy error:", err);
      res.status(500).send("Game proxy error");
    }
  });

  // Helper for fetching CDN assets with GitHub raw fallback
  async function fetchGNAsset(subPath: string): Promise<Response | null> {
    const urlsToTry = [
      `https://cdn.jsdelivr.net/gh/${subPath}`,
      `https://raw.githubusercontent.com/${subPath.replace("@", "/")}`,
    ];

    if (!subPath.includes("@")) {
      const parts = subPath.split("/");
      if (parts.length >= 2) {
        const userRepo = parts.slice(0, 2).join("/");
        const rest = parts.slice(2).join("/");
        urlsToTry.push(`https://raw.githubusercontent.com/${userRepo}/main/${rest}`);
        urlsToTry.push(`https://raw.githubusercontent.com/${userRepo}/master/${rest}`);
        urlsToTry.push(`https://cdn.jsdelivr.net/gh/${userRepo}@main/${rest}`);
        urlsToTry.push(`https://cdn.jsdelivr.net/gh/${userRepo}@master/${rest}`);
      }
    }

    for (const u of urlsToTry) {
      try {
        const res = await fetch(u, { redirect: "follow" });
        if (res.ok) return res;
      } catch {
        // ignore fetch error and try next URL
      }
    }
    return null;
  }

  // GN Math Games Proxy: serves gn-math HTML5 games and ALL assets through Express proxy
  app.get("/api/public/gn/*", async (req, res) => {
    try {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

      const rawPath = (req.params as Record<string, string>)[0] || "";
      let response: Response | null = null;
      let cleanPathNoQuery = rawPath.split("?")[0] || "";

      if (rawPath.startsWith("cdn/")) {
        const cdnSubPath = rawPath.replace(/^cdn\//, "");
        response = await fetchGNAsset(cdnSubPath);
        cleanPathNoQuery = cdnSubPath.split("?")[0] || "";
      } else if (rawPath.startsWith("gh/")) {
        const ghSubPath = rawPath.replace(/^gh\//, "");
        const ghUrl = `https://raw.githubusercontent.com/${ghSubPath}`;
        try {
          const r = await fetch(ghUrl, { redirect: "follow" });
          if (r.ok) response = r;
        } catch {
          // ignore
        }
        cleanPathNoQuery = ghSubPath.split("?")[0] || "";
      } else if (rawPath.startsWith("http:/") || rawPath.startsWith("https:/")) {
        const fullUrl = rawPath.replace(/^(https?:)\/*/, "$1//");
        try {
          const r = await fetch(fullUrl, { redirect: "follow" });
          if (r.ok) response = r;
        } catch {
          // ignore
        }
      } else if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
        try {
          const r = await fetch(rawPath, { redirect: "follow" });
          if (r.ok) response = r;
        } catch {
          // ignore
        }
      } else {
        const cleanGamePath = rawPath.replace(/^game\//, "");
        cleanPathNoQuery = cleanGamePath.split("?")[0] || "";
        const primaryUrl = `https://raw.githubusercontent.com/freebuisness/html/main/${cleanGamePath}`;
        try {
          const r = await fetch(primaryUrl, { redirect: "follow" });
          if (r.ok) {
            response = r;
          } else {
            response = await fetchGNAsset(`freebuisness/html@main/${cleanGamePath}`);
          }
        } catch {
          response = await fetchGNAsset(`freebuisness/html@main/${cleanGamePath}`);
        }
      }

      if (!response || !response.ok) {
        return res.status(404).send("GN Game asset not found");
      }

      if (
        cleanPathNoQuery.endsWith(".html") ||
        cleanPathNoQuery.endsWith(".htm") ||
        cleanPathNoQuery === "" ||
        !cleanPathNoQuery.includes(".")
      ) {
        res.setHeader("content-type", "text/html; charset=utf-8");
        let html = await response.text();

        // Rewrite all jsDelivr and Raw GitHub CDN links to proxied links
        html = html.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
        html = html.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");

        if (!html.includes("<base ")) {
          let detectedBase = "/api/public/gn/game/";
          const cdnMatch = html.match(/\/api\/public\/gn\/cdn\/[^\x27" \t\n\r>]+/i);
          if (cdnMatch) {
            const fullMatch = cdnMatch[0];
            const matchRepo = fullMatch.match(
              /(\/api\/public\/gn\/cdn\/[^/]+\/[^/]+(?:@[^/]+)?\/?)/i,
            );
            if (matchRepo) {
              detectedBase = matchRepo[1];
              if (!detectedBase.endsWith("/")) detectedBase += "/";
            }
          }
          html = html.replace(/<head[^>]*>/i, `$&<base href="${detectedBase}">`);
        } else {
          // If a base tag was already present, rewrite it to proxy
          html = html.replace(
            /<base([^>]*)\bhref=["\x27]https:\/\/cdn\.jsdelivr\.net\/gh\/([^"\x27]+)["\x27]/gi,
            '<base$1href="/api/public/gn/cdn/$2"',
          );
        }
        return res.send(html);
      }

      if (cleanPathNoQuery.endsWith(".js")) {
        res.setHeader("content-type", "application/javascript; charset=utf-8");
        let jsText = await response.text();
        jsText = jsText.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
        jsText = jsText.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");
        return res.send(jsText);
      }

      if (cleanPathNoQuery.endsWith(".css")) {
        res.setHeader("content-type", "text/css; charset=utf-8");
        let cssText = await response.text();
        cssText = cssText.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
        return res.send(cssText);
      }

      if (cleanPathNoQuery.endsWith(".json")) {
        res.setHeader("content-type", "application/json");
        let jsonText = await response.text();
        jsonText = jsonText.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
        return res.send(jsonText);
      }

      if (cleanPathNoQuery.endsWith(".wasm")) {
        res.setHeader("content-type", "application/wasm");
      } else if (cleanPathNoQuery.endsWith(".png")) {
        res.setHeader("content-type", "image/png");
      } else if (cleanPathNoQuery.endsWith(".jpg") || cleanPathNoQuery.endsWith(".jpeg")) {
        res.setHeader("content-type", "image/jpeg");
      } else if (cleanPathNoQuery.endsWith(".svg")) {
        res.setHeader("content-type", "image/svg+xml");
      } else {
        const contentType = response.headers.get("content-type");
        if (contentType) res.setHeader("content-type", contentType);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return res.send(buffer);
    } catch (err) {
      console.error("GN Game proxy error:", err);
      return res.status(500).send("GN Game proxy error");
    }
  });

  // Catch any unintercepted proxy requests so they don't serve the React index.html app recursively
  app.use(["/~/uv/*", "/~/scramjet/*"], (req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connecting...</title>
  <style>
    body { background: #09090b; color: #a1a1aa; font-family: ui-sans-serif, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-size: 13px; }
  </style>
</head>
<body>
  <p>Connecting to secure Browser...</p>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function() {
        navigator.serviceWorker.ready.then(function() {
          setTimeout(function() { location.reload(); }, 250);
        });
      });
    }
  </script>
</body>
</html>`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
