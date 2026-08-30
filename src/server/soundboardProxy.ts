import { Buffer } from "node:buffer";
import { Router } from "express";

const router = Router();

router.all(["/scramjet-proxy", "/scramjet-proxy/*"], async (req, res) => {
  try {
    // Get the dynamic path they are trying to access
    const proxyPath = req.url.replace(/^\/scramjet-proxy/, "") || "/";
    const targetUrl = `https://www.myinstants.com${proxyPath}`;
    
    // Fetch the target URL
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": req.headers.accept || "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // Strip frame restrictions so it loads in our iframe
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    if (contentType.includes("text/html")) {
      const body = await response.text();
      res.setHeader("Content-Type", "text/html");
      
      // Rewrite relative URLs to point back to our proxy so navigation works inside the iframe
      const rewrittenBody = body
        .replace(/href="\//g, 'href="/api/soundboard/scramjet-proxy/')
        .replace(/src="\//g, 'src="/api/soundboard/scramjet-proxy/')
        .replace(/action="\//g, 'action="/api/soundboard/scramjet-proxy/')
        // Handle absolute URLs to myinstants.com
        .replace(/href="https:\/\/(www\.)?myinstants\.com\//g, 'href="/api/soundboard/scramjet-proxy/')
        .replace(/src="https:\/\/(www\.)?myinstants\.com\//g, 'src="/api/soundboard/scramjet-proxy/');

      return res.send(rewrittenBody);
    } else {
      // For images, sounds, CSS, JS, just pipe it back directly
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      if (response.body) {
        const { Readable } = await import("node:stream");
        const nodeStream = Readable.fromWeb(response.body as any);
        nodeStream.on("error", (err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) res.status(500).end();
        });
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    }
  } catch (err: any) {
    console.error("Soundboard Proxy Error:", err);
    res.status(500).send("Proxy error: " + err.message);
  }
});

export default router;
