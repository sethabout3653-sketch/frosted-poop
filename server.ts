import express from "express";
import path from "path";
import http from "http";
import { createServer as createViteServer } from "vite";
import { server as wispServer } from "@mercuryworkshop/wisp-js";
import gameProxy from "./src/server/gameProxy.js";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const server = http.createServer(app);

  // Handle Wisp WebSocket connections for proxying (Render / local / self-hosted)
  server.on("upgrade", (req, socket, head) => {
    if (req.url && (req.url.startsWith("/wisp") || req.url.startsWith("/wisp/"))) {
      wispServer.routeRequest(req, socket, head);
    }
  });

  // Attach game proxy routes
  app.use("/api/public", gameProxy);

  // Helper to extract target origin from a Scramjet/UV proxy referer header
  function extractProxyTargetOrigin(referer?: string): string | null {
    if (!referer) return null;
    try {
      const u = new URL(referer);
      if (u.pathname.startsWith("/~/sj/")) {
        const rawTarget = u.pathname.slice("/~/sj/".length);
        const decoded = decodeURIComponent(rawTarget);
        const targetUrl = /^https?:\/\//i.test(decoded) ? decoded : "https://" + decoded;
        const targetObj = new URL(targetUrl);
        return targetObj.origin;
      }
    } catch {
      /* silent */
    }
    return null;
  }

  // Prevent internal site relative requests or unintercepted proxy requests from recursively serving the React index.html app
  app.use((req, res, next) => {
    const pathName = req.path;

    // Allowed top-level app paths and system assets
    const isAppSystemPath =
      pathName === "/" ||
      pathName === "/index.html" ||
      pathName.startsWith("/src/") ||
      pathName.startsWith("/public/") ||
      pathName.startsWith("/node_modules/") ||
      pathName.startsWith("/@") ||
      pathName.startsWith("/proxy/") ||
      pathName.startsWith("/scramjet/") ||
      pathName.startsWith("/uv/") ||
      pathName.startsWith("/controller/") ||
      pathName === "/sw.js" ||
      pathName.startsWith("/wisp") ||
      pathName.startsWith("/api/");

    if (isAppSystemPath) {
      return next();
    }

    // Explicit proxy prefixes
    if (
      pathName.startsWith("/~/uv/") ||
      pathName.startsWith("/~/scramjet/") ||
      pathName.startsWith("/~/sj/")
    ) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.send(`<!DOCTYPE html>
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
    }

    // Check if this request originated from inside a proxy iframe
    const referer = req.headers.referer;
    const targetOrigin = extractProxyTargetOrigin(referer);
    if (targetOrigin) {
      const redirectedTarget = targetOrigin + req.originalUrl;
      return res.redirect(`/~/sj/${encodeURIComponent(redirectedTarget)}`);
    }

    const isIframeRequest =
      req.headers["sec-fetch-dest"] === "iframe" ||
      req.headers["sec-fetch-mode"] === "nested-navigate" ||
      (referer && referer.includes("/~/"));

    if (isIframeRequest) {
      return res.status(404).send("Page not found in proxy frame.");
    }

    next();
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
