import { buildGhUrl, getGameCandidateUrls } from "./cdnManager";

export interface GameLoadResult {
  type: "blob" | "url";
  src: string;
  blobUrl?: string;
  cdnUsed?: string;
}

/**
 * Prepares and sanitizes game HTML for frictionless in-frame execution.
 * - Injects universal CSS reset to ensure full viewport fill without cropping, side cutoffs, or top clipping on Chromebooks
 * - Handles auto-scaling for fixed-dimension canvas games (Clickteam, Flash/Ruffle, Unity WebGL, Phaser, Construct)
 * - Intercepts outdated URLs and replaces them with jsDelivr CDN links
 * - Fixes Unity WebGL 0% loader hangs and AudioContext auto-unlock
 */
export function prepareGameHtml(rawHtml: string, filename: string, baseUrl?: string): string {
  let html = rawHtml;

  // 1. Strip external popunder/ad networks
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
  html = html.replace(/<div\b[^>]*class=["\x27]sidebar-close["\x27][\s\S]*?<\/div>/gi, "");

  // 3. Remove malicious domain-lock and anti-embed scripts
  html = html.replace(
    /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*(?:IuySzzpOiISwZDDrwmF|sFfEkK\$fMziBAJZwZbkuvp|UravPbGESYjDUNqxKcf\$Vqza|_0x257e|_0xe8c3|document\.body\.remove)[\s\S]*?<\/script>/gi,
    "",
  );

  // 4. Neutralize dangerous window.parent calls like maeExportApis_
  html = html.replace(/(?:window\.)?parent\.maeExportApis_\s*\([^)]*\);?/gi, "");

  // 5. Ensure correct <base href="...">
  if (!html.includes("<base ")) {
    let detectedBase = baseUrl || "https://cdn.jsdelivr.net/gh/freebuisness/html@main/";

    if (!baseUrl) {
      const cdnMatch = html.match(/https:\/\/cdn\.jsdelivr\.net\/gh\/[^\x27" \t\n\r>]+/i);
      if (cdnMatch) {
        const fullMatch = cdnMatch[0];
        const matchRepo = fullMatch.match(
          /(https:\/\/cdn\.jsdelivr\.net\/gh\/[^/]+\/[^/]+(?:@[^/]+)?\/?)/i,
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

  // 6. Universal Runtime Polyfill, Perfect Responsive Auto-Scaler & Asset Interceptor
  // Eliminates top/side cutoffs on Chromebooks & monitors by dynamically fitting canvas to viewport
  const runtimeScript = `
<style id="frosted-runtime-style">
  *, *::before, *::after {
    box-sizing: border-box !important;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    overflow: hidden !important;
    background-color: #000000 !important;
    color: #ffffff !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  }
  #gameContainer, #unityContainer, #unity-container, #game-container, #unity-canvas-container, .webgl-content, #canvas, #unity-canvas, canvas, #MMFCanvas, #ruffle, .unity-desktop, embed, object {
    display: block !important;
    margin: auto !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
  }
  .webgl-content .footer, #unity-footer, .unity-footer {
    display: none !important;
  }
</style>
<script id="frosted-runtime-shield">
(function() {
  window.__GAME_ASSET_MAP__ = window.__GAME_ASSET_MAP__ || new Map();

  // 1. Responsive Canvas Auto-Fitter for Chromebooks
  function fitCanvases() {
    try {
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (!vw || !vh) return;

      const elements = document.querySelectorAll('canvas, #gameContainer, #unityContainer, #unity-container, #game-container, #MMFCanvas, #ruffle');
      elements.forEach(function(el) {
        el.style.maxWidth = '100vw';
        el.style.maxHeight = '100vh';
      });
    } catch(e) {}
  }

  window.addEventListener('resize', fitCanvases, { passive: true });
  window.addEventListener('load', function() {
    fitCanvases();
    setTimeout(fitCanvases, 250);
    setTimeout(fitCanvases, 1000);
  });

  // 2. Safe parent & platform exports
  window.maeExportApis_ = window.maeExportApis_ || function() {};
  try {
    if (window.parent && !window.parent.maeExportApis_) {
      window.parent.maeExportApis_ = function() {};
    }
  } catch(e) {}

  // 3. URL Sanitizer / jsDelivr CDN rewriter helper
  function resolveSafeUrl(url) {
    if (typeof url !== "string") return url;
    let u = url;
    const r1 = new RegExp(
      "https?:\\/\\/(?:rawcdn\\.githack\\.com|raw\\.githack\\.com|cdn\\.staticaly\\.com\\/gh|gitcdn\\.link\\/repo)\\/([^/\\s]+)\\/([^/\\s]+)\\/([^/\\s]+)\\/([^\\s]+)",
      "gi",
    );
    u = u.replace(r1, "https://cdn.jsdelivr.net/gh/$1/$2@$3/$4");
    const r2 = new RegExp(
      "https?:\\/\\/(?:rawcdn\\.githack\\.com|raw\\.githack\\.com)\\/([^/\\s]+)\\/([^/\\s]+)\\/([^\\s]+)",
      "gi",
    );
    u = u.replace(r2, "https://cdn.jsdelivr.net/gh/$1/$2@main/$3");
    const r3 = new RegExp(
      "https?:\\/\\/raw\\.githubusercontent\\.com\\/([^/\\s]+)\\/([^/\\s]+)\\/([^/\\s]+)\\/([^\\s]+)",
      "gi",
    );
    u = u.replace(r3, "https://cdn.jsdelivr.net/gh/$1/$2@$3/$4");

    // Standardize all mirror variants to default jsDelivr
    u = u.replace(new RegExp("https://(?:quantil|fastly|gcore)\\.jsdelivr\\.net/gh/", "g"), "https://cdn.jsdelivr.net/gh/");
    u = u.replace(new RegExp("https://raw\\.esm\\.sh/([^/@]+)/([^/@]+)/([^/]+)/", "g"), "https://cdn.jsdelivr.net/gh/$1/$2@$3/");
    u = u.replace(new RegExp("https://cdn\\.statically\\.io/gh/([^/@]+)/([^/@]+)/([^/]+)/", "g"), "https://cdn.jsdelivr.net/gh/$1/$2@$3/");
    u = u.replace(new RegExp("https://cdn\\.staticdelivr\\.com/gh/", "g"), "https://cdn.jsdelivr.net/gh/");

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

  // 7. Asset Interception Engine with jsDelivr CDN resolving
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

  return html;
}

// Loads a game source asynchronously using default jsDelivr CDN and server proxy fallback
export async function loadGameSource(directory: string): Promise<GameLoadResult> {
  if (
    directory.startsWith("http://") ||
    directory.startsWith("https://") ||
    directory.startsWith("/~/")
  ) {
    return { type: "url", src: directory };
  }

  // Handle games from Lumin SDK
  if (directory.startsWith("sdk/")) {
    const sdkGameId = directory.replace(/^sdk\//, "");
    if (typeof window !== "undefined") {
      try {
        if (!(window as any).Lumin) {
          await new Promise<void>((resolve) => {
            const script = document.createElement("script");
            script.src = "/lumin.js";
            script.onload = () => resolve();
            script.onerror = () => resolve();
            document.body.appendChild(script);
          });
        }

        if ((window as any).Lumin) {
          const l = (window as any).Lumin;
          if (!l._initPromise) {
            let div = document.getElementById("lumin-sdk-hidden");
            if (!div) {
              div = document.createElement("div");
              div.id = "lumin-sdk-hidden";
              div.style.display = "none";
              document.body.appendChild(div);
            }
            l._initPromise = l.init({ container: "#lumin-sdk-hidden", theme: "dark" });
          }
          await l._initPromise;

          if (typeof l.getGameUrl === "function") {
            const gameData = await l.getGameUrl(sdkGameId);
            if (gameData && gameData.url) {
              let finalUrl = gameData.url;
              // Proxy Lumin Cloud URLs through our server to bypass CORS/CSP issues on Vercel
              if (finalUrl.includes("a.luminsdk.com/api/v1/game/")) {
                const relPath = finalUrl.split("a.luminsdk.com/api/v1/game/")[1];
                finalUrl = `/api/public/sdk/${relPath}`;
              }
              return { type: "url", src: finalUrl, cdnUsed: "Lumin Cloud" };
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load via Lumin SDK launcher:", err);
      }
    }

    // Fallback for SDK games to Seraph repository
    const slug = sdkGameId.replace(/^(selenite|truffled|quasar|builtin)\//, "");
    return loadGameSource(`games/${slug}/index.html`);
  }

  const filename = directory.replace(/^\/+/, "");
  const candidates = getGameCandidateUrls(filename);

  for (const { url, baseUrl, cdnName } of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 50 && !text.includes("Couldn't find the requested file")) {
          const html = prepareGameHtml(text, filename, baseUrl);
          const blob = new Blob([html], { type: "text/html; charset=utf-8" });
          const blobUrl = URL.createObjectURL(blob);
          return { type: "blob", src: blobUrl, blobUrl, cdnUsed: cdnName };
        }
      }
    } catch {
      // Continue to origin fallback
    }
  }

  // Final fallback to the proxy if client-side direct fetches fail
  return {
    type: "url",
    src: `/api/public/gn/game/${filename}`,
  };
}
