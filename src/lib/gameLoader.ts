import { buildGhUrl, getGameCandidateUrls } from "./cdnManager";

export interface GameLoadResult {
  type: "blob" | "url";
  src: string;
  blobUrl?: string;
  cdnUsed?: string;
}

/**
 * Prepares and sanitizes game HTML for frictionless in-frame execution.
 * - Injects basic reset styles without forced screen auto-fitting or canvas distortion
 * - Intercepts outdated URLs and replaces them with Raw Git Hack (https://raw.githack.com/)
 * - Fixes Unity WebGL 0% loader hangs and AudioContext auto-unlock
 */
export function prepareGameHtml(rawHtml: string, filename: string, baseUrl?: string): string {
  let html = rawHtml;

  // 1. Strip external popunder/ad networks and tracking
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

  // 4. Neutralize dangerous window.parent calls like maeExportApis_
  html = html.replace(/(?:window\.)?parent\.maeExportApis_\s*\([^)]*\);?/gi, "");

  // 5. Ensure correct <base href="...">
  if (!html.includes("<base ")) {
    let detectedBase = baseUrl || "https://rawcdn.githack.com/gn-math/html/main/";

    if (!baseUrl) {
      const cdnMatch = html.match(
        /https:\/\/(?:raw\.githack\.com|rawcdn\.githack\.com)\/[^\x27" \t\n\r>]+/i,
      );
      if (cdnMatch) {
        const fullMatch = cdnMatch[0];
        const matchRepo = fullMatch.match(
          /(https:\/\/(?:raw\.githack\.com|rawcdn\.githack\.com)\/[^/]+\/[^/]+\/[^/]+\/?)/i,
        );
        if (matchRepo && matchRepo[1]) {
          detectedBase = matchRepo[1];
          if (!detectedBase.endsWith("/")) detectedBase += "/";
        }
      }
    }

    // Safely inject <base> immediately after <head>, or create one
    if (html.match(/<head[^>]*>/i)) {
      html = html.replace(/<head[^>]*>/i, `$&<base href="${detectedBase}">`);
    } else if (html.match(/<html[^>]*>/i)) {
      html = html.replace(/<html[^>]*>/i, `$&<head><base href="${detectedBase}"></head>`);
    } else {
      html = `<head><base href="${detectedBase}"></head>\n` + html;
    }
  }

  // 6. Universal Runtime Polyfill & Asset Interceptor (responsive viewport autofit)
  const runtimeScript = `
<style id="frosted-runtime-style">
  *, *::before, *::after {
    box-sizing: border-box !important;
  }
  html, body {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background-color: #000000 !important;
    color: #ffffff !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
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
<script id="frosted-runtime-shield">
(function() {
  window.__GAME_ASSET_MAP__ = window.__GAME_ASSET_MAP__ || new Map();

  // 1. Safe parent & platform exports and disable external popups/new tabs
  window.maeExportApis_ = window.maeExportApis_ || function() {};
  try {
    if (window.parent && !window.parent.maeExportApis_) {
      window.parent.maeExportApis_ = function() {};
    }
  } catch(e) {}

  // Neutralize popup tabs & link opening attempts
  try {
    window.open = function() {
      console.log("[Frosted] Blocked attempt to open a new tab/window");
      return null;
    };
    document.addEventListener("click", function(e) {
      const targetLink = e.target && e.target.closest ? e.target.closest("a") : null;
      if (targetLink && targetLink.getAttribute("target") === "_blank") {
        targetLink.removeAttribute("target");
        e.preventDefault();
      }
    }, true);
  } catch(e) {}

  // 2. URL Sanitizer / Raw Git Hack CDN rewriter helper
  function resolveSafeUrl(url) {
    if (typeof url !== "string") return url;
    let u = url;

    // Convert any legacy CDN URLs to Raw Git Hack (raw.githack.com)
    const rJsdelivr = new RegExp(
      "https?:\\/\\/(?:cdn|quantil|fastly|gcore|staticdelivr)?\\.?jsdelivr\\.net\\/gh\\/([^/\\s]+)\\/([^/\\s@]+)(?:@([^/\\s]+))?\\/([^\\s]+)",
      "gi",
    );
    u = u.replace(rJsdelivr, "https://raw.githack.com/$1/$2/$3/$4");

    const r1 = new RegExp(
      "https?:\\/\\/(?:cdn\\.staticaly\\.com\\/gh|gitcdn\\.link\\/repo)\\/([^/\\s]+)\\/([^/\\s]+)\\/([^/\\s]+)\\/([^\\s]+)",
      "gi",
    );
    u = u.replace(r1, "https://raw.githack.com/$1/$2/$3/$4");
    const r3 = new RegExp(
      "https?:\\/\\/raw\\.githubusercontent\\.com\\/([^/\\s]+)\\/([^/\\s]+)\\/([^/\\s]+)\\/([^\\s]+)",
      "gi",
    );
    u = u.replace(r3, "https://raw.githack.com/$1/$2/$3/$4");

    // Standardize all mirror variants to default Raw Git Hack
    u = u.replace(new RegExp("https://raw\\.esm\\.sh/([^/@]+)/([^/@]+)/([^/]+)/", "g"), "https://raw.githack.com/$1/$2/$3/");
    u = u.replace(new RegExp("https://cdn\\.statically\\.io/gh/([^/@]+)/([^/@]+)/([^/]+)/", "g"), "https://raw.githack.com/$1/$2/$3/");
    
    // Keep game assets on Raw Git Hack. Static deployments must not depend on
    // an application server or a local proxy route.
    return u;
  }

  // 4. Unity WebGL Loader, WebGL Context & UnityCache Fix
  try {
    window.UnityCache = window.UnityCache || {};
    window.UnityCache.isSupported = false;
    window.UnityCache.enabled = false;
  } catch(e) {}

  // Safe IndexedDB Guard for sandboxed iframe contexts
  try {
    if (window.indexedDB) {
      const _origIDBOpen = window.indexedDB.open;
      window.indexedDB.open = function() {
        try {
          const req = _origIDBOpen.apply(window.indexedDB, arguments);
          if (req && req.addEventListener) {
            req.addEventListener('error', function(errEvt) {
              errEvt.preventDefault && errEvt.preventDefault();
            });
          }
          return req;
        } catch(err) {
          return {
            addEventListener: function(type, fn) { if (type === 'error') setTimeout(fn, 1); },
            removeEventListener: function() {},
            result: null,
            error: err
          };
        }
      };
    }
  } catch(e) {}

  // WebGL Context Fallback Guard
  try {
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, attributes) {
      let ctx = origGetContext.call(this, type, attributes);
      if (!ctx && (type === 'webgl2' || type === 'experimental-webgl2')) {
        ctx = origGetContext.call(this, 'webgl', attributes) || origGetContext.call(this, 'experimental-webgl', attributes);
      }
      return ctx;
    };
  } catch(e) {}

  // UnityProgress DOM Safe Guard
  let _origUnityProgress = window.UnityProgress;
  Object.defineProperty(window, 'UnityProgress', {
    configurable: true,
    enumerable: true,
    get: function() { return _origUnityProgress; },
    set: function(fn) {
      if (typeof fn === 'function') {
        _origUnityProgress = function(unityInstance, progress) {
          try {
            return fn.apply(this, arguments);
          } catch(err) {
            console.warn('[Frosted] UnityProgress template error bypassed:', err);
          }
        };
      } else {
        _origUnityProgress = fn;
      }
    }
  });

  function patchUnityLoader(obj) {
    if (!obj || typeof obj !== 'object') return;
    try {
      if (obj.UnityCache) {
        obj.UnityCache.isSupported = false;
        obj.UnityCache.enabled = false;
      }
      if (obj.XMLHttpRequest) {
        obj.XMLHttpRequest = window.XMLHttpRequest;
      }
      if (obj.compatibilityCheck) {
        obj.compatibilityCheck = function(e, callback) {
          if (typeof callback === 'function') callback();
        };
      }
    } catch(e) {}
  }

  if (window.UnityLoader) {
    patchUnityLoader(window.UnityLoader);
  } else {
    let _unityLoaderVal = undefined;
    Object.defineProperty(window, 'UnityLoader', {
      configurable: true,
      enumerable: true,
      get: function() { return _unityLoaderVal; },
      set: function(v) {
        _unityLoaderVal = v;
        patchUnityLoader(_unityLoaderVal);
      }
    });
  }

  // 5. YouTube Playables Mock & SDK mocks
  if (!window.ytgame) {
    window.ytgame = {
      game: {
        firstFrameReady: function() {},
        gameReady: function() {},
        pause: function() {},
        resume: function() {},
        loadData: function() { return Promise.resolve(null); },
        saveData: function() { return Promise.resolve(); }
      },
      engagement: {
        sendEvent: function() {}
      }
    };
  }

  // 6. AudioContext auto-unlocker
  function unlockAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const testCtx = new AudioCtx();
      if (testCtx.state === 'suspended') {
        const resume = () => {
          testCtx.resume();
          ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(ev => {
            window.removeEventListener(ev, resume);
            document.removeEventListener(ev, resume);
          });
        };
        ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(ev => {
          window.addEventListener(ev, resume, { once: true, passive: true });
          document.addEventListener(ev, resume, { once: true, passive: true });
        });
      }
    }
  }
  unlockAudio();

  // 7. Asset Interception Engine with Raw Git Hack CDN resolving
  const _origFetch = window.fetch;
  window.fetch = async function(input, init) {
    let urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    if (urlStr) {
      urlStr = resolveSafeUrl(urlStr);
      if (typeof input === 'string') {
        input = urlStr;
      } else if (input && input.url) {
        input = new Request(urlStr, input);
      }

      if (urlStr.includes('/pages/home.html') || urlStr.includes('homee.html') || urlStr.includes('marzlib.cc')) {
        return new Response('<html><body></body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      const fileName = urlStr.split('?')[0].split('#')[0].split('/').pop();
      if (fileName && window.__GAME_ASSET_MAP__.has(fileName)) {
        return _origFetch(window.__GAME_ASSET_MAP__.get(fileName), init);
      }
    }
    return _origFetch.apply(this, arguments);
  };

  const _origXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string') {
      url = resolveSafeUrl(url);
      const fileName = url.split('?')[0].split('#')[0].split('/').pop();
      if (fileName && window.__GAME_ASSET_MAP__.has(fileName)) {
        url = window.__GAME_ASSET_MAP__.get(fileName);
      }
      arguments[1] = url;
    }
    return _origXHROpen.apply(this, arguments);
  };

  const mediaTypes = [HTMLImageElement, HTMLAudioElement, HTMLVideoElement, HTMLScriptElement];
  for (const Tag of mediaTypes) {
    const desc = Object.getOwnPropertyDescriptor(Tag.prototype, 'src');
    if (desc && desc.set) {
      Object.defineProperty(Tag.prototype, 'src', {
        configurable: true,
        enumerable: true,
        get: desc.get,
        set: function(val) {
          if (typeof val === 'string') {
            val = resolveSafeUrl(val);
            const fileName = val.split('?')[0].split('#')[0].split('/').pop();
            if (fileName && window.__GAME_ASSET_MAP__.has(fileName)) {
              val = window.__GAME_ASSET_MAP__.get(fileName);
            }
          }
          desc.set.call(this, val);
        }
      });
    }
  }
})();
</script>
`;

  // Inject runtime shield right after <head> or at the very top of HTML
  if (html.match(/<head[^>]*>/i)) {
    html = html.replace(/<head[^>]*>/i, `$&${runtimeScript}`);
  } else {
    html = `${runtimeScript}${html}`;
  }

  // 8. Handle FNAF Multi-part Clickteam games specifically
  const isFnafZipGame =
    filename.startsWith("38-f") ||
    filename.startsWith("39-f") ||
    filename.startsWith("40-f") ||
    filename.startsWith("41-f") ||
    html.includes('runtimecanvas = "resources/FNAF');

  if (isFnafZipGame) {
    const fnafNumMatch = filename.match(/(\d+)-f/);
    const fnafNum = fnafNumMatch && fnafNumMatch[1] ? parseInt(fnafNumMatch[1], 10) - 37 : 1;
    const validNum = fnafNum >= 1 && fnafNum <= 4 ? fnafNum : 1;
    const cchName = `FNAF${validNum}HTML5.cch`;

    const cleanFnafLoader = `
<script id="fnaf-clean-loader">
(async function() {
  const cchFile = "${cchName}";
  const partsCount = 8;
  
  function updateProgress(id, pct) {
    const bar = document.getElementById(id + '-bar');
    const txt = document.getElementById(id + '-text');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.innerText = pct + '%';
  }

  try {
    const buffers = new Array(partsCount);
    let loadedCount = 0;
    
    await Promise.all(
      Array.from({ length: partsCount }, (_, i) => i + 1).map(async (partNum, idx) => {
        const res = await fetch("resources.zip.part" + partNum);
        if (!res.ok) throw new Error("Failed to load part " + partNum);
        const buf = await res.arrayBuffer();
        buffers[idx] = buf;
        loadedCount++;
        updateProgress('download', Math.floor((loadedCount / partsCount) * 100));
      })
    );

    const mergedBlob = new Blob(buffers, { type: "application/zip" });
    const zip = await JSZip.loadAsync(await mergedBlob.arrayBuffer());
    const fileKeys = Object.keys(zip.files).filter(name => !zip.files[name].dir);
    const totalFiles = fileKeys.length;

    for (let i = 0; i < totalFiles; i++) {
      const key = fileKeys[i];
      const blob = await zip.files[key].async("blob");
      const blobUrl = URL.createObjectURL(blob);
      const fileName = key.split('/').pop();
      window.__GAME_ASSET_MAP__.set(fileName, blobUrl);
      window.__GAME_ASSET_MAP__.set(key, blobUrl);
      updateProgress('extract', Math.floor(((i + 1) / totalFiles) * 100));
    }

    const progressEl = document.getElementById('progress-container');
    if (progressEl) progressEl.style.display = 'none';

    const script = document.createElement('script');
    script.src = 'Runtime.js';
    script.onload = () => {
      if (typeof Runtime !== 'undefined') {
        new Runtime("MMFCanvas", "resources/" + cchFile);
      }
    };
    document.head.appendChild(script);
  } catch(err) {
    console.error("FNAF Loader Error:", err);
    const txt = document.getElementById('download-text');
    if (txt) txt.innerText = "Error loading game parts. Please refresh.";
  }
})();
</script>
`;
    html = html.replace(
      /<script\b[^>]*src=["\x27]main\.js["\x27][^>]*><\/script>/gi,
      cleanFnafLoader,
    );
  }

  // 9. Handle Undertale Yellow Multi-part WebAssembly engine specifically
  const isUndertaleYellow =
    filename.startsWith("456-f") ||
    filename.includes("undertale-yellow") ||
    html.includes("UNDERTALE YELLOW") ||
    (html.includes("game.unx") && html.includes("mergeFiles"));

  if (isUndertaleYellow) {
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
    // Replace the old mergeFiles script with the optimized clean loader
    if (html.includes("mergeFiles")) {
      html = html.replace(/<script\b[^>]*>[\s\S]*?mergeFiles[\s\S]*?<\/script>/gi, cleanUtyLoader);
    } else {
      html += cleanUtyLoader;
    }
  }

  return html;
}

// Loads a game source asynchronously using default Raw Git Hack CDN and server proxy fallback
export async function loadGameSource(directory: string): Promise<GameLoadResult> {
  if (
    directory === "sdk/selenite/slope" ||
    directory === "sdk/selenite/slope3" ||
    directory === "198.html" ||
    directory.includes("slope-game_2025_v3")
  ) {
    return {
      type: "url",
      src: "https://rawcdn.githack.com/gn-math/html/main/198.html",
    };
  }

  if (
    directory.startsWith("http://") ||
    directory.startsWith("https://") ||
    directory.startsWith("/~/")
  ) {
    return { type: "url", src: directory };
  }

  const filename = directory.replace(/^\/+/, "");
  const candidates = getGameCandidateUrls(filename);

  // Try direct client-side fetching from open-source game repositories first
  for (const { url, baseUrl, cdnName } of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (
          text &&
          text.length > 50 &&
          !text.includes("Couldn't find the requested file") &&
          !text.includes("WhittierSchool") &&
          !text.includes("Whittier School")
        ) {
          const html = prepareGameHtml(text, filename, baseUrl);
          const blob = new Blob([html], { type: "text/html; charset=utf-8" });
          const blobUrl = URL.createObjectURL(blob);
          return { type: "blob", src: blobUrl, blobUrl, cdnUsed: cdnName };
        }
      }
    } catch {
      // Continue to next fallback
    }
  }

  // Handle games from Lumin SDK proxy if client direct fetches miss
  if (directory.startsWith("sdk/")) {
    const sdkGameId = directory.replace(/^sdk\//, "");
    const token = "1788211172-El2IJ3-0d2qA8GNweoYW_Ln0tuGcYY85UjOrol418vU";
    const directSdkUrl = `/api/public/sdk/game/${token}/${sdkGameId}`;
    return { type: "url", src: directSdkUrl, cdnUsed: "Lumin SDK Direct Proxy" };
  }

  // Final fallback to the proxy if client-side direct fetches fail
  return {
    type: "url",
    src: `/api/public/gn/game/${filename}`,
  };
}
