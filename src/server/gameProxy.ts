import { Buffer } from "node:buffer";
import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import gnZonesData from "../data/gnZones.json";

const router = Router();

// Build fast static lookup maps from gnZones
const zoneMapById: Record<string, string> = {};
const zoneMapByName: Record<string, string> = {};

for (const z of gnZonesData as Array<{ id?: number; name?: string; url?: string }>) {
  if (z.url) {
    const fn = z.url.replace("{HTML_URL}/", "").replace(/^https?:\/\/[^/]+\//, "");
    if (z.id !== undefined && z.id !== null) {
      zoneMapById[String(z.id)] = fn;
    }
    if (z.name) {
      const cleanN = z.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      zoneMapByName[cleanN] = fn;
    }
  }
}

/**
 * Resolves exact GN-math HTML filename from any identifier (e.g. "467" -> "467-updateef.html", "soniccd" -> "589-f.html")
 */
function resolveExactGnFile(identifier: string): string | null {
  if (!identifier) return null;
  const clean = identifier.replace(/^\/+/, "").replace(/\.html$/i, "");

  if (zoneMapById[clean]) {
    return zoneMapById[clean];
  }

  const normName = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (zoneMapByName[normName]) {
    return zoneMapByName[normName];
  }

  const numMatch = clean.match(/^(\d+)/);
  if (numMatch && zoneMapById[numMatch[1]]) {
    return zoneMapById[numMatch[1]];
  }

  return null;
}

const VERCEL_PAYLOAD_LIMIT = 100 * 1024 * 1024; // 100MB limit for rich WebGL game assets

// Helper to safely download response bodies up to a maximum size.
// Avoids Vercel OOM and Payload limit crashes by aborting large streams.
async function safeDownload(response: Response, maxSize: number): Promise<Buffer | null> {
  const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
  if (contentLength > maxSize) {
    return null; // indicates too large
  }

  if (!response.body) {
    return Buffer.alloc(0);
  }

  // Node.js native fetch provides a Web Stream with getReader
  if (typeof (response.body as any).getReader === "function") {
    const reader = (response.body as any).getReader();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalSize += value.length;
          if (totalSize > maxSize) {
            reader.cancel();
            return null;
          }
        }
      }
      return Buffer.concat(chunks);
    } catch (err) {
      reader.cancel();
      throw err;
    }
  } else {
    // Fallback if no getReader
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > maxSize) {
      return null;
    }
    return Buffer.from(arrayBuffer);
  }
}

// Cache Entry Interface
interface CacheEntry {
  buffer: Buffer;
  mime: string;
  encoding?: string | undefined;
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

// Helper for fetching CDN assets across multiple CDN networks with GitHub raw fallback
async function fetchGNAsset(
  subPath: string,
  preferredCdn: string = "rawgithack",
): Promise<{ response: Response; urlUsed: string } | null> {
  const parts = subPath.split("/");
  let userRepo = "";
  let branch = "main";
  let rest = "";

  if (subPath.includes("@")) {
    const atIdx = subPath.indexOf("@");
    const slashAfterAt = subPath.indexOf("/", atIdx);
    const repoPart = subPath.substring(0, atIdx);
    branch = slashAfterAt !== -1 ? subPath.substring(atIdx + 1, slashAfterAt) : "main";
    rest = slashAfterAt !== -1 ? subPath.substring(slashAfterAt + 1) : "";
    userRepo = repoPart;
  } else if (parts.length >= 2) {
    userRepo = parts.slice(0, 2).join("/");
    rest = parts.slice(2).join("/");
  }

  const urlsToTry: string[] = [];

  // Build URLs for specific CDN
  const addCdnUrl = (cdn: string) => {
    if (cdn === "rawgithack" || cdn === "githack") {
      if (userRepo) {
        urlsToTry.push(`https://raw.githack.com/${userRepo}/${branch}/${rest}`);
        urlsToTry.push(`https://rawcdn.githack.com/${userRepo}/${branch}/${rest}`);
      } else {
        urlsToTry.push(`https://raw.githack.com/${subPath.replace("@", "/")}`);
        urlsToTry.push(`https://rawcdn.githack.com/${subPath.replace("@", "/")}`);
      }
    } else if (cdn === "esm") {
      if (userRepo) urlsToTry.push(`https://raw.esm.sh/${userRepo}/${branch}/${rest}`);
    } else if (cdn === "statically") {
      if (userRepo) urlsToTry.push(`https://cdn.statically.io/gh/${userRepo}/${branch}/${rest}`);
    } else if (cdn === "staticdelivr") {
      urlsToTry.push(`https://cdn.staticdelivr.com/gh/${subPath}`);
      if (userRepo) urlsToTry.push(`https://cdn.staticdelivr.com/gh/${userRepo}@${branch}/${rest}`);
    }
  };

  // 1. Add preferred CDN first
  addCdnUrl(preferredCdn);

  // 2. Add all other CDN networks
  const allCdns = ["rawgithack", "esm", "statically", "staticdelivr"];
  for (const cdn of allCdns) {
    if (cdn !== preferredCdn) {
      addCdnUrl(cdn);
    }
  }

  // 3. Add GitHub raw fallbacks
  if (userRepo) {
    urlsToTry.push(`https://raw.githubusercontent.com/${userRepo}/${branch}/${rest}`);
    urlsToTry.push(`https://raw.githubusercontent.com/${userRepo}/master/${rest}`);
  }
  urlsToTry.push(`https://raw.githubusercontent.com/${subPath.replace("@", "/")}`);

  const dedupedUrls = Array.from(new Set(urlsToTry));

  for (const u of dedupedUrls) {
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

  // 2. Remove malicious domain-lock, anti-embed, anti-leech, and obfuscated ad scripts
  html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (match, body) => {
    if (
      body.includes("sFfEkK") ||
      body.includes("IuySzzp") ||
      body.includes("UravPb") ||
      body.includes("_0x257e") ||
      body.includes("_0xe8c3") ||
      body.includes("googletagmanager") ||
      body.includes("dataLayer") ||
      body.includes("google-analytics") ||
      body.includes("googlesyndication") ||
      body.includes("adservice.google") ||
      body.includes("document.body.remove") ||
      body.includes("document['body']['remove']")
    ) {
      return "<!-- [Frosted] Blocked third-party script -->";
    }
    return match;
  });

  // 3. Remove third-party ad blocks & floating sidebar ad overlays
  html = html.replace(/<div\b[^>]*id=["\x27]sidebarad\d*["\x27][\s\S]*?<\/div>/gi, "");
  html = html.replace(/<style[^>]*>[\s\S]*?#sidebarad[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<div\b[^>]*class=["\x27]sidebar-close["\x27][\s\S]*?<\/div>/gi, "");

  // 4. Inject anti-popunder, anti-alert, frame-locking shield script and responsive viewport auto-fit styles
  const shieldScript = `
<style id="frosted-viewport-fit">
  html, body {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background-color: #000000 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  #unity-container, #gameContainer, #canvas-container, .unity-desktop, .webgl-content, #unity-canvas-container, div#gameContainer, div#unity-container {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    margin: auto !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  canvas, #unity-canvas, #canvas, .game-canvas, canvas#canvas, div#gameContainer canvas {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    display: block !important;
    object-fit: contain !important;
    margin: 0 auto !important;
    position: relative !important;
    top: 0 !important;
    left: 0 !important;
  }
  .webgl-content .footer, #unity-footer, .unity-footer, [id^="sidebarad"], .sidebarad, .sidebar-close {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    opacity: 0 !important;
    height: 0 !important;
    width: 0 !important;
  }
</style>
<script id="frosted-anti-annoyance">
  (function() {
    try {
      // 1. Block annoying infinite/blocking dialogues
      window.alert = function() { console.log("[Shield] Blocked alert:", arguments); };
      window.confirm = function() { console.log("[Shield] Blocked confirm:", arguments); return true; };
      window.prompt = function() { console.log("[Shield] Blocked prompt:", arguments); return null; };

      // 2. Disable window.open to stop redirect ads, popups, and popunders completely
      window.open = function() { console.log("[Shield] Blocked popup window.open:", arguments); return null; };
      document.addEventListener("click", function(e) {
        const targetLink = e.target && e.target.closest ? e.target.closest("a") : null;
        if (targetLink && targetLink.getAttribute("target") === "_blank") {
          targetLink.removeAttribute("target");
          e.preventDefault();
        }
      }, true);

      // 3. Prevent frame-busting redirects (forces game to remain inside iframe sandbox)
      Object.defineProperty(window, 'top', { get: function() { return window.self; } });
      Object.defineProperty(window, 'parent', { get: function() { return window.self; } });

      // 4. Intercept Lumin SDK fetches to bypass CORS/CSP through our proxy
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        let [resource, config] = args;
        if (typeof resource === "string") {
          if (resource.includes("a.luminsdk.com/api/v1/")) {
            const relPath = resource.split("a.luminsdk.com/api/v1/")[1];
            resource = "/api/public/sdk/" + relPath;
          } else if (resource.startsWith("/api/v1/")) {
            const relPath = resource.split("/api/v1/")[1];
            resource = "/api/public/sdk/" + relPath;
          }
        }
        return originalFetch(resource, config);
      };

      // 5. Intercept XMLHttpRequest for same reasons
      const originalOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        if (typeof url === "string") {
          if (url.includes("a.luminsdk.com/api/v1/")) {
            const relPath = url.split("a.luminsdk.com/api/v1/")[1];
            url = "/api/public/sdk/" + relPath;
          } else if (url.startsWith("/api/v1/")) {
            const relPath = url.split("/api/v1/")[1];
            url = "/api/public/sdk/" + relPath;
          }
        }
        return originalOpen.apply(this, [method, url].concat(Array.prototype.slice.call(arguments, 2)));
      };
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

  // 5. Rewrite all CDN links to Raw Git Hack / proxied local API endpoints
  html = html.replace(
    /https:\/\/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)(?:@[^/]+)?\//g,
    "https://raw.githack.com/$1/$2/main/",
  );
  html = html.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "https://raw.githack.com/");
  html = html.replace(/https:\/\/cdn\.jsdelivr\.net\//g, "https://raw.githack.com/");
  html = html.replace(/https:\/\/(?:raw|rawcdn)\.githack\.com\//g, "/api/public/gn/cdn/");
  html = html.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");

  // 6. Rewrite or insert base href tag
  if (!html.includes("<base ")) {
    let detectedBase = "/api/public/gn/game/";
    const cdnMatch = html.match(/\/api\/public\/gn\/cdn\/[^\x27" \t\n\r>]+/i);
    if (cdnMatch) {
      const fullMatch = cdnMatch[0];
      const matchRepo = fullMatch.match(/(\/api\/public\/gn\/cdn\/[^/]+\/[^/]+(?:@[^/]+)?\/?)/i);
      if (matchRepo && matchRepo[1]) {
        detectedBase = matchRepo[1];
        if (!detectedBase.endsWith("/")) detectedBase += "/";
      }
    }
    html = html.replace(/<head[^>]*>/i, `$&<base href="${detectedBase}">`);
  } else {
    // If a base tag was already present, rewrite it to proxy
    html = html.replace(
      /<base([^>]*)\bhref=["\x27]https:\/\/(?:raw|rawcdn)\.githack\.com\/([^"\x27]+)["\x27]/gi,
      '<base$1href="/api/public/gn/cdn/$2"',
    );
    html = html.replace(
      /<base([^>]*)\bhref=["\x27]https:\/\/cdn\.jsdelivr\.net\/gh\/([^"\x27]+)["\x27]/gi,
      '<base$1href="/api/public/gn/cdn/$2"',
    );
    html = html.replace(
      /<base([^>]*)\bhref=["\x27]https:\/\/raw\.githubusercontent\.com\/([^"\x27]+)["\x27]/gi,
      '<base$1href="/api/public/gn/gh/$2"',
    );
  }

  // 7. Undertale Yellow Multi-part WebAssembly engine handler
  if (
    html.includes("UNDERTALE YELLOW") ||
    (html.includes("game.unx") && html.includes("mergeFiles"))
  ) {
    const cleanUtyLoader = `
<script id="undertale-yellow-clean-loader">
(async function() {
  const cdnBase = "https://raw.githack.com/giorgirick2-gif/game-webports-onawebsite/main/undertale-yellow/";
  const totalParts = 12;
  const statusEl = document.getElementById("status");
  const progressEl = document.getElementById("progress");
  const spinnerEl = document.getElementById("spinner");
  const canvasEl = document.getElementById("canvas");
  const loadingContainer = document.querySelector(".loading");

  if (progressEl) {
    progressEl.removeAttribute("hidden");
    progressEl.value = 0;
    progressEl.max = 100;
  }

  function setStatus(text, pct) {
    if (statusEl) statusEl.textContent = text;
    if (progressEl && typeof pct === "number") {
      progressEl.value = pct;
    }
  }

  setStatus("Downloading Undertale Yellow game assets (0%)...", 0);

  // Helper with automatic retry for reliable chunk downloading
  async function fetchWithRetry(url, maxRetries = 3) {
    let lastErr;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.arrayBuffer();
      } catch (err) {
        lastErr = err;
        console.warn("[Undertale Yellow] Retrying " + url + " (attempt " + attempt + "):", err);
        await new Promise(r => setTimeout(r, 600 * attempt));
      }
    }
    throw lastErr;
  }

  try {
    const buffers = new Array(totalParts);
    let loadedCount = 0;

    // Download chunks in parallel streams with real-time progress
    const concurrency = 4;
    const partIndices = Array.from({ length: totalParts }, (_, i) => i);
    
    async function worker() {
      while (partIndices.length > 0) {
        const idx = partIndices.shift();
        if (typeof idx !== "number") break;
        const partNum = idx + 1;
        const url = cdnBase + "game.unx.part" + partNum;
        const buf = await fetchWithRetry(url);
        buffers[idx] = buf;
        loadedCount++;
        const pct = Math.floor((loadedCount / totalParts) * 90);
        setStatus("Downloading Undertale Yellow: " + loadedCount + "/" + totalParts + " parts (" + pct + "%)...", pct);
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    setStatus("Assembling game files (95%)...", 95);
    const mergedBlob = new Blob(buffers, { type: "application/octet-stream" });
    const mergedUrl = URL.createObjectURL(mergedBlob);
    window.gameUnxUrl = mergedUrl;

    // Robust fetch and XMLHttpRequest interceptors for game.unx
    const originalFetch = window.fetch;
    window.fetch = async function(resource, ...rest) {
      let targetUrl = "";
      if (typeof resource === "string") targetUrl = resource;
      else if (resource && typeof resource.url === "string") targetUrl = resource.url;
      else if (resource && typeof resource.href === "string") targetUrl = resource.href;
      else if (resource) targetUrl = String(resource);

      if (targetUrl.includes("game.unx")) {
        if (resource instanceof Request) {
          return originalFetch.call(this, new Request(window.gameUnxUrl, resource), ...rest);
        }
        return originalFetch.call(this, window.gameUnxUrl, ...rest);
      }
      return originalFetch.call(this, resource, ...rest);
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      let urlStr = "";
      if (typeof url === "string") urlStr = url;
      else if (url && typeof url.href === "string") urlStr = url.href;
      else if (url) urlStr = String(url);

      if (urlStr.includes("game.unx")) {
        return originalOpen.call(this, method, window.gameUnxUrl, ...rest);
      }
      return originalOpen.call(this, method, url, ...rest);
    };

    setStatus("Starting game engine (100%)...", 100);

    // Make canvas visible and active
    if (canvasEl) {
      canvasEl.style.display = "block";
      canvasEl.style.opacity = "1";
      canvasEl.classList.add("active");
    }

    // Load index.js first, then runner.js sequentially
    await new Promise((resolve, reject) => {
      const indexScript = document.createElement("script");
      indexScript.src = cdnBase + "index.js";
      indexScript.onload = () => resolve();
      indexScript.onerror = (e) => reject(new Error("Failed to load index.js"));
      document.body.appendChild(indexScript);
    });

    // Ensure Module locateFile redirects game.unx and handles wasm
    if (window.Module) {
      const origLocate = window.Module.locateFile;
      window.Module.locateFile = function(path, prefix) {
        if (path && path.includes("game.unx")) return window.gameUnxUrl;
        if (origLocate) return origLocate(path, prefix);
        return cdnBase + path;
      };
    }

    await new Promise((resolve, reject) => {
      const runnerScript = document.createElement("script");
      runnerScript.src = cdnBase + "runner.js";
      runnerScript.onload = () => {
        resolve();
        setTimeout(() => {
          if (loadingContainer) loadingContainer.style.display = "none";
          if (canvasEl) {
            canvasEl.style.opacity = "1";
            canvasEl.focus();
          }
        }, 1200);
      };
      runnerScript.onerror = (e) => reject(new Error("Failed to load runner.js"));
      document.body.appendChild(runnerScript);
    });

  } catch (err) {
    console.error("[Undertale Yellow] Loader Error:", err);
    setStatus("Error loading Undertale Yellow. Please refresh to retry.", 0);
  }
})();
</script>
`;
    if (html.includes("mergeFiles")) {
      html = html.replace(/<script\b[^>]*>[\s\S]*?mergeFiles[\s\S]*?<\/script>/gi, cleanUtyLoader);
    } else {
      html += cleanUtyLoader;
    }
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

// Helper for reading raw request body as a buffer with safety timeout
async function readRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (req.body && Buffer.isBuffer(req.body)) return resolve(req.body);
    if (req.body && typeof req.body === "string") return resolve(Buffer.from(req.body));
    if (req.body && typeof req.body === "object") {
      try {
        return resolve(Buffer.from(JSON.stringify(req.body)));
      } catch {
        return resolve(Buffer.alloc(0));
      }
    }

    // Set a safety timeout to prevent hanging the serverless function
    const timeout = setTimeout(() => {
      resolve(Buffer.alloc(0));
    }, 5000);

    const chunks: any[] = [];
    req.on("data", (chunk: any) => chunks.push(chunk));
    req.on("end", () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks));
    });
    req.on("error", (err: any) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Serve asset helper supporting standard features, Caching, and Range Requests (HTTP 206) for smooth audio/video playback
function serveAsset(
  req: any,
  res: any,
  buffer: Buffer,
  rawPath: string,
  contentType: string | null,
  isCompressedGzip = false,
  originalUrl?: string,
) {
  const mime = getMimeType(rawPath, contentType);

  // If the asset exceeds Vercel's payload limit, we MUST redirect
  // to avoid a "Serverless Function Payload Too Large" error.
  if (buffer.length > VERCEL_PAYLOAD_LIMIT && originalUrl) {
    console.log(
      `[Proxy] Redirecting large asset (${(buffer.length / 1024 / 1024).toFixed(2)}MB) to: ${originalUrl}`,
    );
    return res.redirect(302, originalUrl);
  }

  // Detect GZIP magic bytes (0x1F 0x8B) or compressed extensions (.unityweb, .gz)
  const isGzip =
    isCompressedGzip ||
    (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) ||
    rawPath.toLowerCase().endsWith(".gz") ||
    rawPath.toLowerCase().endsWith(".unityweb");

  const isBrotli = rawPath.toLowerCase().endsWith(".br");

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Type, Content-Encoding, Accept-Ranges, ETag, Last-Modified",
  );
  res.setHeader("Accept-Ranges", "bytes");

  // Provide deterministic ETag and Last-Modified so UnityCache and browser cache validate instantly
  const etag = `"${buffer.length}-${buffer.subarray(0, Math.min(16, buffer.length)).toString("hex")}"`;
  res.setHeader("ETag", etag);
  res.setHeader("Last-Modified", "Wed, 01 Jan 2025 00:00:00 GMT");

  if (isGzip) {
    res.setHeader("Content-Encoding", "gzip");
  } else if (isBrotli) {
    res.setHeader("Content-Encoding", "br");
  }

  // Handle HEAD requests explicitly without sending body (crucial for UnityCache HEAD checks)
  if (req.method === "HEAD") {
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).end();
  }

  // Handle Range Requests (important for seamless HTML5 Audio streaming in Safari and Chrome)
  const rangeHeader = req.headers.range;
  if (rangeHeader && buffer.length > 0) {
    const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : buffer.length - 1;

      if (
        !isNaN(start) &&
        start < buffer.length &&
        (isNaN(end) || (end < buffer.length && start <= end))
      ) {
        const finalEnd = isNaN(end) ? buffer.length - 1 : end;
        const chunk = buffer.subarray(start, finalEnd + 1);
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${finalEnd}/${buffer.length}`);
        res.setHeader("Content-Length", chunk.length);
        res.setHeader("Content-Type", mime);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(chunk);
      }
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

    const cdnUrl = `https://raw.githack.com/selenite-cc/selenite-old/main/${rawPath}`;
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

    const mime = getMimeType(rawPath, response.headers.get("content-type"));
    const encoding = response.headers.get("content-encoding") || undefined;
    const buffer = await safeDownload(response, VERCEL_PAYLOAD_LIMIT);
    if (!buffer) {
      return res.redirect(302, cdnUrl);
    }

    setCachedAsset(cacheKey, buffer, mime, encoding);
    return serveAsset(req, res, buffer, rawPath, mime, encoding === "gzip", cdnUrl);
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
    let originalUrl = "";

    if (rawPath.startsWith("cdn/")) {
      const cdnSubPath = rawPath.replace(/^cdn\//, "");
      originalUrl = `https://raw.githack.com/${cdnSubPath.replace("@", "/")}`;
      const resData = await fetchGNAsset(cdnSubPath);
      if (resData) response = resData.response;
      cleanPathNoQuery = cdnSubPath.split("?")[0] || "";
    } else if (rawPath.startsWith("gh/")) {
      const ghSubPath = rawPath.replace(/^gh\//, "");
      originalUrl = `https://raw.githubusercontent.com/${ghSubPath}`;
      try {
        const r = await fetch(originalUrl, { redirect: "follow" });
        if (r.ok) response = r;
      } catch (err) {
        console.warn("Proxy gh fallback error:", err);
      }
      cleanPathNoQuery = ghSubPath.split("?")[0] || "";
    } else if (rawPath.startsWith("http:/") || rawPath.startsWith("https:/")) {
      originalUrl = rawPath.replace(/^(https?:)\/*/, "$1//");
      try {
        const r = await fetch(originalUrl, { redirect: "follow" });
        if (r.ok) response = r;
      } catch (err) {
        console.warn("Proxy fullUrl error:", err);
      }
    } else if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      originalUrl = rawPath;
      try {
        const r = await fetch(originalUrl, { redirect: "follow" });
        if (r.ok) response = r;
      } catch (err) {
        console.warn("Proxy rawPath error:", err);
      }
    } else {
      const cleanGamePath = rawPath.replace(/^game\//, "");
      cleanPathNoQuery = cleanGamePath.split("?")[0] || "";

      // Resolve exact filename in gn-math catalog (e.g. 467 -> 467-updateef.html, 65 -> 65-fixed.html)
      const mappedGnFile =
        resolveExactGnFile(cleanGamePath) || resolveExactGnFile(cleanPathNoQuery);
      const targetPath = mappedGnFile || cleanGamePath;

      originalUrl = `https://raw.githubusercontent.com/gn-math/html/main/${targetPath}`;
      try {
        const r = await fetch(originalUrl, { redirect: "follow" });
        if (r.ok) {
          response = r;
        } else {
          const resData = await fetchGNAsset(`gn-math/html@main/${targetPath}`);
          if (resData) response = resData.response;
        }
      } catch {
        const resData = await fetchGNAsset(`gn-math/html@main/${targetPath}`);
        if (resData) response = resData.response;
      }
    }

    if (!response || !response.ok) {
      const authenticHtml = await fetchAuthenticGameFallback(rawPath);
      if (authenticHtml) {
        res.setHeader("content-type", "text/html; charset=utf-8");
        return res.send(authenticHtml);
      }
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
      jsText = jsText.replace(
        /https:\/\/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)(?:@[^/]+)?\//g,
        "https://raw.githack.com/$1/$2/main/",
      );
      jsText = jsText.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "https://raw.githack.com/");
      jsText = jsText.replace(/https:\/\/cdn\.jsdelivr\.net\//g, "https://raw.githack.com/");
      jsText = jsText.replace(/https:\/\/(?:raw|rawcdn)\.githack\.com\//g, "/api/public/gn/cdn/");
      jsText = jsText.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");
      const buffer = Buffer.from(jsText, "utf-8");
      setCachedAsset(cacheKey, buffer, "application/javascript");
      return serveAsset(req, res, buffer, rawPath, "application/javascript");
    }

    if (cleanPathNoQuery.endsWith(".css")) {
      let cssText = await response.text();
      cssText = cssText.replace(
        /https:\/\/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)(?:@[^/]+)?\//g,
        "https://raw.githack.com/$1/$2/main/",
      );
      cssText = cssText.replace(/https:\/\/cdn\.jsdelivr\.net\/gh\//g, "https://raw.githack.com/");
      cssText = cssText.replace(/https:\/\/cdn\.jsdelivr\.net\//g, "https://raw.githack.com/");
      cssText = cssText.replace(/https:\/\/(?:raw|rawcdn)\.githack\.com\//g, "/api/public/gn/cdn/");
      cssText = cssText.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");
      const buffer = Buffer.from(cssText, "utf-8");
      setCachedAsset(cacheKey, buffer, "text/css");
      return serveAsset(req, res, buffer, rawPath, "text/css");
    }

    if (cleanPathNoQuery.endsWith(".json")) {
      let jsonText = await response.text();
      jsonText = jsonText.replace(
        /https:\/\/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)(?:@[^/]+)?\//g,
        "https://raw.githack.com/$1/$2/main/",
      );
      jsonText = jsonText.replace(
        /https:\/\/cdn\.jsdelivr\.net\/gh\//g,
        "https://raw.githack.com/",
      );
      jsonText = jsonText.replace(/https:\/\/cdn\.jsdelivr\.net\//g, "https://raw.githack.com/");
      jsonText = jsonText.replace(
        /https:\/\/(?:raw|rawcdn)\.githack\.com\//g,
        "/api/public/gn/cdn/",
      );
      jsonText = jsonText.replace(/https:\/\/raw\.githubusercontent\.com\//g, "/api/public/gn/gh/");
      const buffer = Buffer.from(jsonText, "utf-8");
      setCachedAsset(cacheKey, buffer, "application/json");
      return serveAsset(req, res, buffer, rawPath, "application/json");
    }

    // Binary Assets
    const mime = getMimeType(cleanPathNoQuery, response.headers.get("content-type"));
    const encoding = response.headers.get("content-encoding") || undefined;
    const buffer = await safeDownload(response, VERCEL_PAYLOAD_LIMIT);
    if (!buffer) {
      return res.redirect(302, originalUrl);
    }

    setCachedAsset(cacheKey, buffer, mime, encoding);
    return serveAsset(req, res, buffer, rawPath, mime, encoding === "gzip", originalUrl);
  } catch (err) {
    console.error("GN Game proxy error:", err);
    return res.status(500).send("GN Game proxy error");
  }
});

// Route 3: Seraph Game Library Proxy (a456pur/seraph)
router.get("/seraph/*", async (req, res) => {
  try {
    const rawPath = (req.params as Record<string, string>)[0] || "";
    const cacheKey = `seraph:${rawPath}`;

    const cached = getCachedAsset(cacheKey);
    if (cached) {
      return serveAsset(req, res, cached.buffer, rawPath, cached.mime, cached.encoding === "gzip");
    }

    const seraphUrl = `https://raw.githack.com/a456pur/seraph/main/${rawPath}`;
    let response = await fetch(seraphUrl, { redirect: "follow" });
    if (!response.ok) {
      const cdnFallback = `https://rawcdn.githack.com/a456pur/seraph/main/${rawPath}`;
      const rFallback = await fetch(cdnFallback, { redirect: "follow" });
      if (rFallback.ok) {
        response = rFallback;
      } else {
        const rawSeraphUrl = `https://raw.githubusercontent.com/a456pur/seraph/main/${rawPath}`;
        const r2 = await fetch(rawSeraphUrl, { redirect: "follow" });
        if (!r2.ok) {
          return res.status(404).send("Seraph game asset not found");
        }
        response = r2;
      }
    }

    const cleanPathNoQuery = rawPath.split("?")[0] || "";
    if (
      cleanPathNoQuery.endsWith(".html") ||
      cleanPathNoQuery.endsWith(".htm") ||
      cleanPathNoQuery === "" ||
      !cleanPathNoQuery.includes(".")
    ) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      const rawText = await response.text();
      let sanitizedHtml = sanitizeAndCleanGameHtml(rawText);
      sanitizedHtml = sanitizedHtml.replace(
        /https:\/\/(?:raw|rawcdn)\.githack\.com\/a456pur\/seraph\/main/g,
        "/api/public/seraph",
      );
      sanitizedHtml = sanitizedHtml.replace(
        /https:\/\/cdn\.jsdelivr\.net\/gh\/a456pur\/seraph(?:@main)?/g,
        "/api/public/seraph",
      );
      return res.send(sanitizedHtml);
    }

    if (cleanPathNoQuery.endsWith(".js") || cleanPathNoQuery.endsWith(".mjs")) {
      let jsText = await response.text();
      jsText = jsText.replace(
        /https:\/\/(?:raw|rawcdn)\.githack\.com\/a456pur\/seraph\/main/g,
        "/api/public/seraph",
      );
      jsText = jsText.replace(
        /https:\/\/cdn\.jsdelivr\.net\/gh\/a456pur\/seraph(?:@main)?/g,
        "/api/public/seraph",
      );
      const buffer = Buffer.from(jsText, "utf-8");
      setCachedAsset(cacheKey, buffer, "application/javascript");
      return serveAsset(req, res, buffer, rawPath, "application/javascript");
    }

    if (cleanPathNoQuery.endsWith(".css")) {
      let cssText = await response.text();
      cssText = cssText.replace(
        /https:\/\/(?:raw|rawcdn)\.githack\.com\/a456pur\/seraph\/main/g,
        "/api/public/seraph",
      );
      cssText = cssText.replace(
        /https:\/\/cdn\.jsdelivr\.net\/gh\/a456pur\/seraph(?:@main)?/g,
        "/api/public/seraph",
      );
      const buffer = Buffer.from(cssText, "utf-8");
      setCachedAsset(cacheKey, buffer, "text/css");
      return serveAsset(req, res, buffer, rawPath, "text/css");
    }

    const mime = getMimeType(cleanPathNoQuery, response.headers.get("content-type"));
    const encoding = response.headers.get("content-encoding") || undefined;
    const originalUrl = response.url;

    const buffer = await safeDownload(response, VERCEL_PAYLOAD_LIMIT);
    if (!buffer) {
      return res.redirect(302, originalUrl);
    }

    setCachedAsset(cacheKey, buffer, mime, encoding);
    return serveAsset(req, res, buffer, rawPath, mime, encoding === "gzip", originalUrl);
  } catch (err) {
    console.error("Seraph proxy error:", err);
    return res.status(500).send("Seraph proxy error");
  }
});

// Route 4: 3kh0 Game Library Proxy
router.get("/3kh0/*", async (req, res) => {
  try {
    const rawPath = (req.params as Record<string, string>)[0] || "";
    const cacheKey = `3kh0:${rawPath}`;

    const cached = getCachedAsset(cacheKey);
    if (cached) {
      return serveAsset(req, res, cached.buffer, rawPath, cached.mime, cached.encoding === "gzip");
    }

    const primaryUrl = `https://raw.githack.com/3kh0/3kh0-Assets/main/${rawPath}`;
    let response = await fetch(primaryUrl, { redirect: "follow" });
    if (!response.ok) {
      const cdnFallback = `https://rawcdn.githack.com/3kh0/3kh0-Assets/main/${rawPath}`;
      const rFallback = await fetch(cdnFallback, { redirect: "follow" });
      if (rFallback.ok) {
        response = rFallback;
      } else {
        const fallbackUrl = `https://raw.githubusercontent.com/3kh0/3kh0-Assets/main/${rawPath}`;
        const r2 = await fetch(fallbackUrl, { redirect: "follow" });
        if (!r2.ok) {
          return res.status(404).send("3kh0 game asset not found");
        }
        response = r2;
      }
    }

    const cleanPathNoQuery = rawPath.split("?")[0] || "";
    if (
      cleanPathNoQuery.endsWith(".html") ||
      cleanPathNoQuery.endsWith(".htm") ||
      cleanPathNoQuery === "" ||
      !cleanPathNoQuery.includes(".")
    ) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      const rawText = await response.text();
      let sanitizedHtml = sanitizeAndCleanGameHtml(rawText);
      sanitizedHtml = sanitizedHtml.replace(
        /https:\/\/(?:raw|rawcdn)\.githack\.com\/3kh0\/3kh0-Assets\/main/g,
        "/api/public/3kh0",
      );
      sanitizedHtml = sanitizedHtml.replace(
        /https:\/\/cdn\.jsdelivr\.net\/gh\/3kh0\/3kh0-Assets(?:@main)?/g,
        "/api/public/3kh0",
      );
      return res.send(sanitizedHtml);
    }

    if (cleanPathNoQuery.endsWith(".js") || cleanPathNoQuery.endsWith(".mjs")) {
      let jsText = await response.text();
      jsText = jsText.replace(
        /https:\/\/(?:raw|rawcdn)\.githack\.com\/3kh0\/3kh0-Assets\/main/g,
        "/api/public/3kh0",
      );
      jsText = jsText.replace(
        /https:\/\/cdn\.jsdelivr\.net\/gh\/3kh0\/3kh0-Assets(?:@main)?/g,
        "/api/public/3kh0",
      );
      const buffer = Buffer.from(jsText, "utf-8");
      setCachedAsset(cacheKey, buffer, "application/javascript");
      return serveAsset(req, res, buffer, rawPath, "application/javascript");
    }

    const mime = getMimeType(cleanPathNoQuery, response.headers.get("content-type"));
    const encoding = response.headers.get("content-encoding") || undefined;
    const originalUrl = response.url;

    const buffer = await safeDownload(response, VERCEL_PAYLOAD_LIMIT);
    if (!buffer) {
      return res.redirect(302, originalUrl);
    }

    setCachedAsset(cacheKey, buffer, mime, encoding);
    return serveAsset(req, res, buffer, rawPath, mime, encoding === "gzip", originalUrl);
  } catch (err) {
    console.error("3kh0 proxy error:", err);
    return res.status(500).send("3kh0 proxy error");
  }
});

// Helper to fetch authentic game fallback from open-source GitHub repositories
async function fetchAuthenticGameFallback(rawPath: string): Promise<string | null> {
  const cleanSlug = rawPath
    .replace(/^game\//, "")
    .replace(/^1788211172[^/]+\//, "")
    .replace(/^(selenite|truffled|quasar|builtin|sdk)\//, "")
    .split("?")[0];

  if (!cleanSlug) return null;

  const baseSlug = cleanSlug.replace(/\.html$/i, "");
  const cleanNormSlug = baseSlug.toLowerCase().replace(/[^a-z0-9]/g, "");

  const candidates: { url: string; baseHref: string }[] = [];

  // Static alias overrides for games with unique filenames
  const ALIASES: Record<string, string> = {
    papaspizza: "227.html",
    papaspizzeria: "227.html",
    papaspizzaeria: "227.html",
    sonic2: "549.html",
    "2sonic": "549.html",
    geometrydashremastered: "785-upd3.html",
    geodashrm: "785-upd3.html",
    geometrydash: "785-upd3.html",
    pokemonblue: "505.html",
    pokemoncrystal: "506-f.html",
    pokemonfirered: "694.html",
    pokemonheartgold: "696-f.html",
    undertale: "456-f.html",
    run3: "177.html",
    run3editor: "177.html",
    editor: "177.html",
    gravityrun: "177.html",
    bloonsplayerpack5: "74.html",
    wheely1: "201.html",
    tanks: "225.html",
    extremerun3d: "233.html",
    extremerun: "233.html",
    soniccd: "589-f.html",
  };

  if (ALIASES[cleanNormSlug]) {
    const fn = ALIASES[cleanNormSlug];
    candidates.push({
      url: `https://raw.githubusercontent.com/gn-math/html/main/${fn}`,
      baseHref: "https://rawcdn.githack.com/gn-math/html/main/",
    });
    candidates.push({
      url: `https://rawcdn.githack.com/gn-math/html/main/${fn}`,
      baseHref: "https://rawcdn.githack.com/gn-math/html/main/",
    });
  }

  // 1. Check static GN zones map for exact file match
  const mappedGnFile =
    resolveExactGnFile(cleanSlug) ||
    resolveExactGnFile(baseSlug) ||
    resolveExactGnFile(cleanNormSlug);
  if (mappedGnFile) {
    candidates.push({
      url: `https://raw.githubusercontent.com/gn-math/html/main/${mappedGnFile}`,
      baseHref: "https://rawcdn.githack.com/gn-math/html/main/",
    });
    candidates.push({
      url: `https://rawcdn.githack.com/gn-math/html/main/${mappedGnFile}`,
      baseHref: "https://rawcdn.githack.com/gn-math/html/main/",
    });
  }

  // 2. Check Seraph authentic game catalog (raw.githubusercontent.com & rawcdn.githack.com)
  if (cleanNormSlug) {
    candidates.push({
      url: `https://raw.githubusercontent.com/a456pur/seraph/main/games/${cleanNormSlug}/index.html`,
      baseHref: `/api/public/seraph/games/${cleanNormSlug}/`,
    });
    candidates.push({
      url: `https://rawcdn.githack.com/a456pur/seraph/main/games/${cleanNormSlug}/index.html`,
      baseHref: `/api/public/seraph/games/${cleanNormSlug}/`,
    });
  }
  if (baseSlug && baseSlug !== cleanNormSlug) {
    candidates.push({
      url: `https://raw.githubusercontent.com/a456pur/seraph/main/games/${baseSlug}/index.html`,
      baseHref: `/api/public/seraph/games/${baseSlug}/`,
    });
  }

  // 3. Check Selenite-old authentic game catalog
  if (cleanNormSlug) {
    candidates.push({
      url: `https://raw.githubusercontent.com/selenite-cc/selenite-old/main/${cleanNormSlug}/index.html`,
      baseHref: `/api/public/g/${cleanNormSlug}/`,
    });
    candidates.push({
      url: `https://rawcdn.githack.com/selenite-cc/selenite-old/main/${cleanNormSlug}/index.html`,
      baseHref: `/api/public/g/${cleanNormSlug}/`,
    });
  }
  if (baseSlug && baseSlug !== cleanNormSlug) {
    candidates.push({
      url: `https://raw.githubusercontent.com/selenite-cc/selenite-old/main/${baseSlug}/index.html`,
      baseHref: `/api/public/g/${baseSlug}/`,
    });
  }

  // 4. Check 3kh0 assets catalog
  if (cleanNormSlug) {
    candidates.push({
      url: `https://raw.githubusercontent.com/3kh0/3kh0-Assets/main/${cleanNormSlug}/index.html`,
      baseHref: `/api/public/3kh0/${cleanNormSlug}/`,
    });
  }

  // 5. Direct file matches in gn-math
  const targetFile = cleanSlug.endsWith(".html") ? cleanSlug : `${baseSlug}.html`;
  candidates.push({
    url: `https://raw.githubusercontent.com/gn-math/html/main/${targetFile}`,
    baseHref: "https://rawcdn.githack.com/gn-math/html/main/",
  });
  candidates.push({
    url: `https://rawcdn.githack.com/gn-math/html/main/${targetFile}`,
    baseHref: "https://rawcdn.githack.com/gn-math/html/main/",
  });

  for (const c of candidates) {
    try {
      const res = await fetch(c.url);
      if (res.ok) {
        let html = await res.text();
        if (
          !html.includes("WhittierSchool") &&
          !html.includes("Whittier School") &&
          !html.includes("Empowering K-12 Students") &&
          !html.includes("Page Not Found") &&
          !html.includes("broken game") &&
          !html.includes("request a bug") &&
          !html.includes("searched the proxy the first time") &&
          !html.includes("Couldn't find the requested file") &&
          html.length > 100
        ) {
          if (html.includes("<base href=")) {
            html = html.replace(/<base href="[^"]*">/, `<base href="${c.baseHref}">`);
          } else {
            html = html.replace("<head>", `<head><base href="${c.baseHref}">`);
          }
          return sanitizeAndCleanGameHtml(html);
        }
      }
    } catch {}
  }

  return null;
}

function renderInteractiveErrorHtml(rawPath: string): string {
  const cleanName = rawPath.replace(/^.*[/\\]/, "").replace(/\.html$/i, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Game Mirror Standby - Frosted Arcade</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #000000;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(18, 18, 18, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(12px);
    }
    .icon {
      width: 52px;
      height: 52px;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: #38bdf8;
    }
    h2 { font-size: 20px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.02em; }
    p { font-size: 13px; color: #a3a3a3; line-height: 1.5; margin-bottom: 24px; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: #1e1e1e;
      border: 1px solid #333;
      border-radius: 100px;
      font-size: 11px;
      color: #38bdf8;
      font-family: monospace;
      margin-bottom: 16px;
    }
    .btn-group { display: flex; flex-direction: column; gap: 10px; }
    .btn {
      padding: 12px 18px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
    }
    .btn-primary { background: #ffffff; color: #000000; }
    .btn-primary:hover { background: #e5e5e5; }
    .btn-secondary { background: #1a1a1a; color: #ffffff; border: 1px solid #333; }
    .btn-secondary:hover { background: #262626; border-color: #555; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
    </div>
    <span class="badge">Target: ${cleanName}</span>
    <h2>Connecting Authentic Mirror</h2>
    <p>The primary game source is reconnecting. Click below to refresh or switch to the verified authentic mirror.</p>
    <div class="btn-group">
      <button class="btn btn-primary" onclick="window.location.reload()">
        <span>Auto-Reload Game</span>
      </button>
      <button class="btn btn-secondary" onclick="window.history.back()">
        <span>Return to Arcade</span>
      </button>
    </div>
  </div>
</body>
</html>`;
}

// Route 5: Lumin SDK Proxy
router.all("/sdk/*", async (req, res) => {
  try {
    const rawPath = (req.params as Record<string, string>)[0] || "";
    const method = req.method;

    // Special case: serve local lumin.js if requested to avoid external fetch for the core script
    if (rawPath === "lumin.js" && method === "GET") {
      try {
        const localPath = path.join(process.cwd(), "public", "lumin.js");
        if (fs.existsSync(localPath)) {
          const content = fs.readFileSync(localPath);
          return serveAsset(req, res, content, "lumin.js", "application/javascript");
        }
      } catch (e) {
        console.warn("Local lumin.js serve failed, falling back to proxy:", e);
      }
    }

    // Proactively check authentic GitHub open-source repositories for game HTML requests
    if (method === "GET") {
      const authenticHtml = await fetchAuthenticGameFallback(rawPath);
      if (authenticHtml) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(authenticHtml);
      }
    }

    const cacheKey = `${method}:sdk:${rawPath}`;

    // Only cache GET requests
    if (method === "GET") {
      const cached = getCachedAsset(cacheKey);
      if (cached) {
        return serveAsset(
          req,
          res,
          cached.buffer,
          rawPath,
          cached.mime,
          cached.encoding === "gzip",
        );
      }
    }

    const sdkDomains = ["a.luminsdk.com", "a.truffled.lol", "a.selenite.cc"];

    let response: any = null;
    let selectedDomain = "a.luminsdk.com";
    let sdkUrl = "";
    let finalBuffer: Buffer | null = null;
    let finalContentType: string | null = null;

    let reqBody: Buffer | null = null;
    if (method !== "GET" && method !== "HEAD") {
      reqBody = await readRawBody(req);
    }

    for (const domain of sdkDomains) {
      try {
        sdkUrl = `https://${domain}/api/v1/${rawPath}`;
        const headers: Record<string, string> = {
          "User-Agent": req.headers["user-agent"] || "",
          Referer: `https://${domain}/`,
        };

        if (method !== "GET" && method !== "HEAD") {
          if (req.headers["content-type"]) {
            headers["Content-Type"] = req.headers["content-type"];
          }
        }

        const fetchOptions: any = {
          method,
          redirect: "follow",
          headers,
        };

        if (reqBody && reqBody.length > 0) {
          fetchOptions.body = reqBody;
        }

        let resObj = await fetch(sdkUrl, fetchOptions);

        if (!resObj.ok && !rawPath.startsWith("game/") && method === "GET") {
          const gameUrl = `https://${domain}/api/v1/game/${rawPath}`;
          const secondResponse = await fetch(gameUrl, fetchOptions);
          if (secondResponse.ok) {
            resObj = secondResponse;
            sdkUrl = gameUrl;
          }
        }

        if (resObj.ok) {
          const buffer = await safeDownload(resObj, VERCEL_PAYLOAD_LIMIT);
          if (buffer) {
            const bufferStr = buffer.toString("utf8");
            if (
              bufferStr.includes("WhittierSchool") ||
              bufferStr.includes("Whittier School") ||
              bufferStr.includes("Empowering K-12 Students") ||
              bufferStr.includes("Page Not Found") ||
              bufferStr.includes("broken game") ||
              bufferStr.includes("request a bug") ||
              bufferStr.includes("searched the proxy the first time")
            ) {
              console.warn(
                `[Proxy] Detected broken proxy or school block on ${domain} for ${rawPath}`,
              );
              continue;
            }
            response = resObj;
            finalBuffer = buffer;
            selectedDomain = domain;
            finalContentType = resObj.headers.get("content-type");
            break;
          }
        }
      } catch (err) {
        console.warn(`[Proxy] Mirror ${domain} failed for path ${rawPath}:`, err);
      }
    }

    if (response && finalBuffer) {
      if (method === "GET") {
        const cleanPathNoQuery = rawPath.split("?")[0] || "";
        const mime = getMimeType(cleanPathNoQuery, finalContentType);
        const encoding = response.headers.get("content-encoding") || undefined;
        setCachedAsset(cacheKey, finalBuffer, mime, encoding);
        return serveAsset(req, res, finalBuffer, rawPath, mime, encoding === "gzip", sdkUrl);
      }

      res.setHeader("Content-Type", finalContentType || "application/json");
      return res.send(finalBuffer);
    }

    if (method === "GET") {
      const authenticHtml = await fetchAuthenticGameFallback(rawPath);
      if (authenticHtml) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(authenticHtml);
      }
    }

    return res.status(200).send(renderInteractiveErrorHtml(rawPath));
  } catch (err) {
    console.error("Lumin SDK proxy error:", err);
    return res.status(500).send("Lumin SDK proxy error");
  }
});

export default router;
