import { Router } from "express";

const router = Router();

router.all(["/scramjet-proxy", "/scramjet-proxy/*"], async (req, res) => {
  try {
    // Get the dynamic path they are trying to access
    const proxyPath = req.url.replace(/^\/scramjet-proxy/, "") || "/";
    const targetUrl = `https://www.myinstants.com${proxyPath}`;
    
    // Fetch the target URL using native fetch (no libcurl)
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Accept": req.headers.accept || "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });

    const contentType = response.headers.get("content-type") || "";

    // Strip frame restrictions so it loads in our iframe
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    if (contentType.includes("text/html") || contentType.includes("text/css") || contentType.includes("javascript") || contentType.includes("application/json")) {
      const body = await response.text();
      res.setHeader("Content-Type", contentType);
      
      let rewrittenBody = body;

      if (contentType.includes("text/html")) {
        // Rewrite HTML tags and inline attributes
        rewrittenBody = rewrittenBody
          .replace(/(href|src|action)=("|')\/(?!\/)/gi, '$1=$2/api/soundboard/scramjet-proxy/')
          .replace(/play\((["'])\/(?!\/)/gi, 'play($1/api/soundboard/scramjet-proxy/')
          .replace(/(href|src|action)=("|')https:\/\/(www\.)?myinstants\.com\//gi, '$1=$2/api/soundboard/scramjet-proxy/')
          .replace(/url\((["']?)\/(?!\/)/gi, 'url($1/api/soundboard/scramjet-proxy/');
      } else if (contentType.includes("text/css")) {
        // Rewrite CSS url() functions
        rewrittenBody = rewrittenBody
          .replace(/url\((["']?)\/(?!\/)/gi, 'url($1/api/soundboard/scramjet-proxy/');
      } else if (contentType.includes("javascript")) {
        // Rewrite common JS strings that represent absolute paths to media or APIs
        rewrittenBody = rewrittenBody
          .replace(/(["'])\/media\/(?!\/)/gi, '$1/api/soundboard/scramjet-proxy/media/')
          .replace(/(["'])\/api\/(?!\/)/gi, '$1/api/soundboard/scramjet-proxy/api/')
          .replace(/play\((["'])\/(?!\/)/gi, 'play($1/api/soundboard/scramjet-proxy/');
      }

      return res.send(rewrittenBody);
    } else {
      // For images, sounds, CSS, JS, stream it natively back to the client
      // Uses Node's Readable.fromWeb to bypass Vercel memory/payload limits
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      if (response.body) {
        const arrayBuffer = await response.arrayBuffer();
        res.end(Buffer.from(arrayBuffer));
      } else {
        res.end();
      }
    }
  } catch (err: any) {
    console.error("Soundboard Proxy Error:", err);
    if (!res.headersSent) {
      res.status(500).send("Proxy error: " + err.message);
    }
  }
});

export default router;
