import { Buffer } from "node:buffer";
import { Router } from "express";

const router = Router();

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

// Clean and sanitize HTML from third-party repos (removes domain locks, anti-embed scripts, ads, and tracking)
function sanitizeAndCleanGameHtml(rawHtml: string): string {
  let html = rawHtml;

  // 1. Remove Google Tag Manager, analytics, and advertising scripts
  html = html.replace(/<script\b[^>]*googletagmanager\.com[^>]*><\/script>/gi, "");
  html = html.replace(/<script\b[^>]*googlesyndication\.com[^>]*><\/script>/gi, "");
  html = html.replace(/<script\b[^>]*adservice\.google[^>]*><\/script>/gi, "");
  html = html.replace(
    /<script\b[^>]*>\s*(?:window\.dataLayer|\(function\([^)]*\)\s*\{\s*dataLayer)[\s\S]*?<\/script>/gi,
    "",
  );

  // 2. Remove third-party ad blocks & floating sidebar ad overlays
  html = html.replace(/<div\b[^>]*id=["\x27]sidebarad\d*["\x27][\s\S]*?<\/div>/gi, "");
  html = html.replace(/<style[^>]*>[\s\S]*?#sidebarad[\s\S]*?<\/style>/gi, "");

  // 3. Remove malicious domain-lock and anti-leech scripts (e.g. scripts checking location.hostname or removing document.body)
  html = html.replace(
    /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*(?:IuySzzpOiISwZDDrwmF|sFfEkK\$fMziBAJZwZbkuvp|UravPbGESYjDUNqxKcf\$Vqza|_0x257e|_0xe8c3)[\s\S]*?<\/script>/gi,
    "",
  );

  // 4. Rewrite all CDN links to proxied local API endpoints
  html = html.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
  html = html.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");

  // 5. Rewrite or insert base href tag
  if (!html.includes("<base ")) {
    let detectedBase = "/api/public/gn/game/";
    const cdnMatch = html.match(/\/api\/public\/gn\/cdn\/[^\x27" \t\n\r>]+/i);
    if (cdnMatch) {
      const fullMatch = cdnMatch[0];
      const matchRepo = fullMatch.match(/(\/api\/public\/gn\/cdn\/[^/]+\/[^/]+(?:@[^/]+)?\/?)/i);
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
    html = html.replace(
      /<base([^>]*)\bhref=["\x27]https:\/\/raw\.githubusercontent\.com\/([^"\x27]+)["\x27]/gi,
      '<base$1href="/api/public/gn/gh/$2"',
    );
  }

  return html;
}

function getMimeType(cleanPath: string, defaultContentType: string | null): string {
  const p = cleanPath.toLowerCase();
  if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".json")) return "application/json; charset=utf-8";
  if (p.endsWith(".wasm")) return "application/wasm";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".gif")) return "image/gif";
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".ico")) return "image/x-icon";
  if (p.endsWith(".mp3")) return "audio/mpeg";
  if (p.endsWith(".ogg")) return "audio/ogg";
  if (p.endsWith(".wav")) return "audio/wav";
  if (p.endsWith(".m4a")) return "audio/mp4";
  if (p.endsWith(".mp4")) return "video/mp4";
  if (p.endsWith(".webm")) return "video/webm";
  if (p.endsWith(".woff2")) return "font/woff2";
  if (p.endsWith(".woff")) return "font/woff";
  if (p.endsWith(".ttf")) return "font/ttf";
  if (p.endsWith(".otf")) return "font/otf";
  if (
    p.endsWith(".zip") ||
    p.endsWith(".data") ||
    p.endsWith(".unityweb") ||
    p.endsWith(".pck") ||
    p.endsWith(".bin") ||
    p.endsWith(".cch") ||
    /\.part\d+$/i.test(p)
  ) {
    return "application/octet-stream";
  }
  return defaultContentType || "application/octet-stream";
}

// Game assets proxy: serves games from CDN with correct MIME headers & base tags
router.get("/g/*", async (req, res) => {
  try {
    const rawPath = (req.params as Record<string, string>)[0] || "";
    const cdnUrl = `https://cdn.jsdelivr.net/gh/selenite-cc/selenite-old@main/${rawPath}`;
    const response = await fetch(cdnUrl);
    if (!response.ok) {
      return res.status(response.status).send("Game asset not found");
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Type, Accept-Ranges, ETag",
    );

    if (rawPath.endsWith(".html") || rawPath.endsWith(".htm")) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      let html = await response.text();
      const dir = rawPath.substring(0, rawPath.lastIndexOf("/"));
      if (!html.includes("<base ")) {
        html = html.replace(/<head[^>]*>/i, `$&<base href="/api/public/g/${dir}/">`);
      }
      return res.send(html);
    }

    const mime = getMimeType(rawPath, response.headers.get("content-type"));
    res.setHeader("content-type", mime);

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(buffer);
  } catch (err) {
    console.error("Game proxy error:", err);
    return res.status(500).send("Game proxy error");
  }
});

// GN Math Games Proxy: serves gn-math HTML5 games and ALL assets through Express proxy
router.get("/gn/*", async (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Type, Accept-Ranges, ETag",
    );

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

    // HTML files: sanitize and rewrite base/links
    if (
      cleanPathNoQuery.endsWith(".html") ||
      cleanPathNoQuery.endsWith(".htm") ||
      cleanPathNoQuery === "" ||
      !cleanPathNoQuery.includes(".")
    ) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      const rawText = await response.text();
      const sanitizedHtml = sanitizeAndCleanGameHtml(rawText);
      return res.send(sanitizedHtml);
    }

    // JS scripts: rewrite any embedded CDN domains to proxy
    if (cleanPathNoQuery.endsWith(".js") || cleanPathNoQuery.endsWith(".mjs")) {
      res.setHeader("content-type", "application/javascript; charset=utf-8");
      let jsText = await response.text();
      jsText = jsText.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
      jsText = jsText.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(jsText);
    }

    // CSS files: rewrite any embedded CDN domains to proxy
    if (cleanPathNoQuery.endsWith(".css")) {
      res.setHeader("content-type", "text/css; charset=utf-8");
      let cssText = await response.text();
      cssText = cssText.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
      cssText = cssText.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(cssText);
    }

    // JSON files: rewrite any embedded CDN domains to proxy
    if (cleanPathNoQuery.endsWith(".json")) {
      res.setHeader("content-type", "application/json; charset=utf-8");
      let jsonText = await response.text();
      jsonText = jsonText.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
      jsonText = jsonText.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(jsonText);
    }

    // All binary and media assets: send with correct Content-Type, Content-Length and caching
    const mime = getMimeType(cleanPathNoQuery, response.headers.get("content-type"));
    res.setHeader("content-type", mime);

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(buffer);
  } catch (err) {
    console.error("GN Game proxy error:", err);
    return res.status(500).send("GN Game proxy error");
  }
});

export default router;
