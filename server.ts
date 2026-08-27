import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import gameProxy from "./src/server/gameProxy.js";
import { chatRouter, setupChatWebSocket } from "./src/server/chatServer.js";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  // We need to parse JSON and urlencoded requests
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Initialize Chat WebSocket Server
  const chatWss = new WebSocketServer({ noServer: true });
  setupChatWebSocket(chatWss);

  // Handle WebSocket Upgrade events (for Chat WebSocket only now)
  server.on("upgrade", (req, socket, head) => {
    const url = req.url || "";
    if (url.startsWith("/ws/chat") || url.startsWith("/ws/chat/")) {
      chatWss.handleUpgrade(req, socket, head, (ws) => {
        chatWss.emit("connection", ws, req);
      });
    }
  });

  // Attach API routes
  app.use("/api/public", gameProxy);
  app.use("/api/chat", chatRouter);

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

  // Global Express Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Global Express Error caught:", err);
    if (res.headersSent) return;
    return res.status(err?.status || 500).json({
      error: err?.message || "Internal server error. Please try again.",
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server start error:", err);
});
