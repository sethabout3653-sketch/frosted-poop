import { Buffer } from "node:buffer";
import { Router } from "express";

const router = Router();

// Cache Entry Interface
interface CacheEntry {
  buffer: Buffer;
  mime: string;
  encoding?: string;
  timestamp: number;
}

// In-Memory cache for supercharging performance of small-to-medium game assets
const cache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE_BYTES = 60 * 1024 * 1024; // 60MB max cache footprint
let currentCacheFootprint = 0;

function getCachedAsset(key: string): CacheEntry | undefined {
  const entry = cache.get(key);
  if (entry) {
    // Keep caching alive
    entry.timestamp = Date.now();
    return entry;
  }
  return undefined;
}

function setCachedAsset(key: string, buffer: Buffer, mime: string, encoding?: string) {
  // Only cache files under 10MB to avoid caching huge chunks
  if (buffer.length > 10 * 1024 * 1024) return;

  // Evict least-recently used/oldest entries if we exceed maximum limit
  while (currentCacheFootprint + buffer.length > MAX_CACHE_SIZE_BYTES && cache.size > 0) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of cache.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      const entryToEvict = cache.get(oldestKey);
      if (entryToEvict) {
        currentCacheFootprint -= entryToEvict.buffer.length;
      }
      cache.delete(oldestKey);
    } else {
      break;
    }
  }

  if (currentCacheFootprint + buffer.length <= MAX_CACHE_SIZE_BYTES) {
    cache.set(key, { buffer, mime, encoding, timestamp: Date.now() });
    currentCacheFootprint += buffer.length;
  }
}

// Helper for fetching CDN assets with GitHub raw fallback
async function fetchGNAsset(subPath: string): Promise<{ response: Response; urlUsed: string } | null> {
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
      if (res.ok) return { response: res, urlUsed: u };
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

  // 3. Remove malicious domain-lock and anti-leech scripts (e.g. scripts checking location.hostname)
  html = html.replace(
    /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*(?:IuySzzpOiISwZDDrwmF|sFfEkK\$fMziBAJZwZbkuvp|UravPbGESYjDUNqxKcf\$Vqza|_0x257e|_0xe8c3)[\s\S]*?<\/script>/gi,
    "",
  );

  // 4. Inject anti-popunder, anti-alert and frame-locking shield script to block third-party annoyances
  const shieldScript = `
<script id="frosted-anti-annoyance">
  (function() {
    try {
      // 1. Block annoying infinite/blocking dialogues
      window.alert = function() { console.log("[Shield] Blocked alert:", arguments); };
      window.confirm = function() { console.log("[Shield] Blocked confirm:", arguments); return true; };
      window.prompt = function() { console.log("[Shield] Blocked prompt:", arguments); return null; };
      
      // 2. Disable window.open to stop redirect ads, popups, and popunders completely
      window.open = function() { console.log("[Shield] Blocked popup window.open:", arguments); return null; };
      
      // 3. Prevent frame-busting redirects (forces game to remain inside iframe sandbox)
      Object.defineProperty(window, 'top', { get: function() { return window.self; } });
      Object.defineProperty(window, 'parent', { get: function() { return window.self; } });
    } catch(e) {
      console.warn("[Shield] Failed to inject protection framework:", e);
    }
  })();
</script>
`;

  if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>${shieldScript}`);
  } else if (html.includes("<head ")) {
    html = html.replace(/<head[^>]*>/i, `$&${shieldScript}`);
  } else {
    html = `${shieldScript}${html}`;
  }

  // 5. Rewrite all CDN links to proxied local API endpoints
  html = html.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
  html = html.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");

  // 6. Rewrite or insert base href tag
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
  let p = cleanPath.toLowerCase();
  // Strip gzip/brotli extension to find true underlying mime type
  if (p.endsWith(".gz")) p = p.slice(0, -3);
  if (p.endsWith(".br")) p = p.slice(0, -3);

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

// Serve asset helper supporting standard features, Caching, and Range Requests (HTTP 206) for smooth audio/video playback
function serveAsset(req: any, res: any, buffer: Buffer, rawPath: string, contentType: string | null, isCompressedGzip = false) {
  const mime = getMimeType(rawPath, contentType);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Type, Accept-Ranges, ETag"
  );
  res.setHeader("Accept-Ranges", "bytes");

  if (isCompressedGzip || rawPath.toLowerCase().endsWith(".gz")) {
    res.setHeader("Content-Encoding", "gzip");
  } else if (rawPath.toLowerCase().endsWith(".br")) {
    res.setHeader("Content-Encoding", "br");
  }

  // Handle Range Requests (important for seamless HTML5 Audio streaming in Safari and Chrome)
  const rangeHeader = req.headers.range;
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;

    if (start < buffer.length && end < buffer.length && start <= end) {
      const chunk = buffer.subarray(start, end + 1);
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${buffer.length}`);
      res.setHeader("Content-Length", chunk.length);
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(chunk);
    }
  }

  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.send(buffer);
}

// Route 1: Legacy Game Assets Proxy
router.get("/g/*", async (req, res) => {
  try {
    const rawPath = (req.params as Record<string, string>)[0] || "";
    const cacheKey = `g:${rawPath}`;

    // Return fast if cached
    const cached = getCachedAsset(cacheKey);
    if (cached) {
      return serveAsset(req, res, cached.buffer, rawPath, cached.mime, cached.encoding === "gzip");
    }

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

    const buffer = Buffer.from(await response.arrayBuffer());
    const mime = getMimeType(rawPath, response.headers.get("content-type"));
    const encoding = response.headers.get("content-encoding") || undefined;

    setCachedAsset(cacheKey, buffer, mime, encoding);
    return serveAsset(req, res, buffer, rawPath, mime, encoding === "gzip");
  } catch (err) {
    console.error("Game proxy error:", err);
    return res.status(500).send("Game proxy error");
  }
});

// Route 2: Upgraded GN Math Games Proxy (Supercharged with LRU Caching, Range Requests & Anti-Annoyance Shield)
router.get("/gn/*", async (req, res) => {
  try {
    const rawPath = (req.params as Record<string, string>)[0] || "";
    const cacheKey = `gn:${rawPath}`;

    // Serve from memory cache instantly if available
    const cached = getCachedAsset(cacheKey);
    if (cached) {
      return serveAsset(req, res, cached.buffer, rawPath, cached.mime, cached.encoding === "gzip");
    }

    let response: Response | null = null;
    let cleanPathNoQuery = rawPath.split("?")[0] || "";
    let isHtmlType = false;

    if (rawPath.startsWith("cdn/")) {
      const cdnSubPath = rawPath.replace(/^cdn\//, "");
      const resData = await fetchGNAsset(cdnSubPath);
      if (resData) response = resData.response;
      cleanPathNoQuery = cdnSubPath.split("?")[0] || "";
    } else if (rawPath.startsWith("gh/")) {
      const ghSubPath = rawPath.replace(/^gh\//, "");
      const ghUrl = `https://raw.githubusercontent.com/${ghSubPath}`;
      try {
        const r = await fetch(ghUrl, { redirect: "follow" });
        if (r.ok) response = r;
      } catch {}
      cleanPathNoQuery = ghSubPath.split("?")[0] || "";
    } else if (rawPath.startsWith("http:/") || rawPath.startsWith("https:/")) {
      const fullUrl = rawPath.replace(/^(https?:)\/*/, "$1//");
      try {
        const r = await fetch(fullUrl, { redirect: "follow" });
        if (r.ok) response = r;
      } catch {}
    } else if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      try {
        const r = await fetch(rawPath, { redirect: "follow" });
        if (r.ok) response = r;
      } catch {}
    } else {
      const cleanGamePath = rawPath.replace(/^game\//, "");
      cleanPathNoQuery = cleanGamePath.split("?")[0] || "";
      const primaryUrl = `https://raw.githubusercontent.com/freebuisness/html/main/${cleanGamePath}`;
      try {
        const r = await fetch(primaryUrl, { redirect: "follow" });
        if (r.ok) {
          response = r;
        } else {
          const resData = await fetchGNAsset(`freebuisness/html@main/${cleanGamePath}`);
          if (resData) response = resData.response;
        }
      } catch {
        const resData = await fetchGNAsset(`freebuisness/html@main/${cleanGamePath}`);
        if (resData) response = resData.response;
      }
    }

    if (!response || !response.ok) {
      return res.status(404).send("GN Game asset not found");
    }

    // HTML Sanitization & Rewriting
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

    // JS/CSS/JSON Rewrites (can also be cached to save bandwidth and compute)
    if (cleanPathNoQuery.endsWith(".js") || cleanPathNoQuery.endsWith(".mjs")) {
      let jsText = await response.text();
      jsText = jsText.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
      jsText = jsText.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");
      const buffer = Buffer.from(jsText, "utf-8");
      setCachedAsset(cacheKey, buffer, "application/javascript");
      return serveAsset(req, res, buffer, rawPath, "application/javascript");
    }

    if (cleanPathNoQuery.endsWith(".css")) {
      let cssText = await response.text();
      cssText = cssText.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
      cssText = cssText.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");
      const buffer = Buffer.from(cssText, "utf-8");
      setCachedAsset(cacheKey, buffer, "text/css");
      return serveAsset(req, res, buffer, rawPath, "text/css");
    }

    if (cleanPathNoQuery.endsWith(".json")) {
      let jsonText = await response.text();
      jsonText = jsonText.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "/api/public/gn/cdn/");
      jsonText = jsonText.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");
      const buffer = Buffer.from(jsonText, "utf-8");
      setCachedAsset(cacheKey, buffer, "application/json");
      return serveAsset(req, res, buffer, rawPath, "application/json");
    }

    // Binary Assets
    const mime = getMimeType(cleanPathNoQuery, response.headers.get("content-type"));
    const encoding = response.headers.get("content-encoding") || undefined;
    const buffer = Buffer.from(await response.arrayBuffer());

    setCachedAsset(cacheKey, buffer, mime, encoding);
    return serveAsset(req, res, buffer, rawPath, mime, encoding === "gzip");
  } catch (err) {
    console.error("GN Game proxy error:", err);
    return res.status(500).send("GN Game proxy error");
  }
});

export default router;
