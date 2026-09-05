import express from "express";
import path from "path";
import http from "http";
import gameProxy from "./src/server/gameProxy.js";
import { chatRouter } from "./src/server/chatServer.js";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  // We need to parse JSON and urlencoded requests
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Health check & system static routes
  app.get(["/api/health", "/health"], (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  app.get("/ads.txt", (_req, res) => {
    res.type("text/plain").send("exoclick.com, DIRECT\n");
  });

  // Attach API routes
  app.use("/api/public", gameProxy);
  app.use("/api/chat", chatRouter);

  // Serve the bundled React app in every environment. The build step creates
  // dist/app.js and dist/index.html without a dev-server runtime or HMR socket.
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

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
