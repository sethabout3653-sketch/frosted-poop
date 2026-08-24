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
