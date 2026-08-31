// Client-side game loading, sanitization, and runtime execution engine
// Ensures 100% compatibility across Vercel, Cloud Run, static hosts, and Chromebooks.

export interface GameLoadResult {
  type: "blob" | "url" | "srcdoc";
  src: string;
  blobUrl?: string;
}

// Rewrites dead/blocked CDN URLs to raw GitHub URLs
export function rewriteCdnUrls(str: string): string {
  if (!str) return str;
  let result = str.replace(
    /https?:\/\/(?:cdn\.jsdelivr\.net\/gh|rawcdn\.githack\.com|raw\.githack\.com|cdn\.staticaly\.com\/gh|gitcdn\.link\/repo)\/([^/'"\s]+)\/([^/'"\s]+)@([^/'"\s]+)\/([^'"\s]+)/gi,
    "https://raw.githubusercontent.com/$1/$2/$3/$4",
  );
  result = result.replace(
    /https?:\/\/(?:cdn\.jsdelivr\.net\/gh|rawcdn\.githack\.com|raw\.githack\.com)\/([^/'"\s]+)\/([^/'"\s]+)\/([^/'"\s]+)\/([^'"\s]+)/gi,
    "https://raw.githubusercontent.com/$1/$2/$3/$4",
  );
  result = result.replace(
    /https?:\/\/(?:cdn\.jsdelivr\.net\/gh|rawcdn\.githack\.com|raw\.githack\.com)\/([^/'"\s]+)\/([^/'"\s]+)\/([^'"\s]+)/gi,
    "https://raw.githubusercontent.com/$1/$2/main/$3",
  );
  return result;
}

// Sanitizes and enhances game HTML for safe, full-speed iframe execution
export function prepareGameHtml(rawHtml: string, filename: string, baseUrl?: string): string {
  let html = rawHtml;

  // 1. Rewrite dead or blocked CDN hostnames immediately
  html = rewriteCdnUrls(html);

  // 2. Remove Google Tag Manager, analytics, and advertising scripts
  html = html.replace(/<script\b[^>]*googletagmanager\.com[^>]*><\/script>/gi, "");
  html = html.replace(/<script\b[^>]*googlesyndication\.com[^>]*><\/script>/gi, "");
  html = html.replace(/<script\b[^>]*adservice\.google[^>]*><\/script>/gi, "");
  html = html.replace(
    /<script\b[^>]*>\s*(?:window\.dataLayer|\(function\([^)]*\)\s*\{\s*dataLayer)[\s\S]*?<\/script>/gi,
    "",
  );

  // 3. Remove third-party ad blocks & floating sidebar ad overlays
  html = html.replace(/<div\b[^>]*id=["\x27]sidebarad\d*["\x27][\s\S]*?<\/div>/gi, "");
  html = html.replace(/<style[^>]*>[\s\S]*?#sidebarad[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<div\b[^>]*class=["\x27]sidebar-close["\x27][\s\S]*?<\/div>/gi, "");

  // 4. Remove malicious domain-lock and anti-embed scripts
  html = html.replace(
    /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*(?:IuySzzpOiISwZDDrwmF|sFfEkK\$fMziBAJZwZbkuvp|UravPbGESYjDUNqxKcf\$Vqza|_0x257e|_0xe8c3|document\.body\.remove)[\s\S]*?<\/script>/gi,
    "",
  );

  // 5. Neutralize dangerous window.parent calls like maeExportApis_
  html = html.replace(/(?:window\.)?parent\.maeExportApis_\s*\([^)]*\);?/gi, "");

  // 6. Ensure correct <base href="...">
  if (!html.includes("<base ")) {
    let detectedBase = baseUrl || "https://raw.githubusercontent.com/freebuisness/html/main/";

    if (!baseUrl) {
      const ghMatch = html.match(/https:\/\/raw\.githubusercontent\.com\/[^\x27" \t\n\r>]+/i);
      if (ghMatch) {
        const fullMatch = ghMatch[0];
        const matchRepo = fullMatch.match(
          /(https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/?)/i,
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

  // 6.5. Ensure responsive viewport meta tag is present to prevent zoomed-in/clipped views
  if (
    !html.toLowerCase().includes('name="viewport"') &&
    !html.toLowerCase().includes("name='viewport'")
  ) {
    const viewportMeta =
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">';
    if (html.match(/<head[^>]*>/i)) {
      html = html.replace(/<head[^>]*>/i, `$&${viewportMeta}`);
    } else {
      html = `${viewportMeta}${html}`;
    }
  }

  // 7. Universal Runtime Polyfill & Asset Interceptor
  // Solves Unity WebGL 0% hangs, Clickteam/FNAF resource mapping, Web Audio unlocking, and full-bleed layout
  const runtimeScript = `
<style id="frosted-runtime-style">
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    background-color: #000000 !important;
    color: #ffffff !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    overflow: hidden !important;
    box-sizing: border-box !important;
  }
  *, *:before, *:after {
    box-sizing: border-box !important;
  }
  body > * {
    margin: auto !important;
  }
  #gameContainer, #unityContainer, #unity-container, #game-container, #unity-canvas-container, .webgl-content, #canvas-container, #canvas-holder, #canvas-wrapper, #MMFCanvas, #ruffle, .unity-desktop, .game-holder, #c2canvasdiv, #cr-stage, #game-stage, #root, #app, #game, .game-container, #view-holder, #canvas_container, #content, .content, #main, div[id*="game"], div[id*="canvas"], div[class*="game"], div[class*="canvas"] {
    position: relative !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    width: 100% !important;
    height: 100% !important;
    left: 0 !important;
    top: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    transform: none !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    margin: auto !important;
    overflow: hidden !important;
  }
  canvas, #canvas, #unity-canvas, #c2canvas, #glcanvas, #gameCanvas, #game-canvas, canvas#canvas {
    position: relative !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    width: 100% !important;
    height: 100% !important;
    display: block !important;
    margin: auto !important;
    left: 0 !important;
    top: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    transform: none !important;
    object-fit: contain !important;
  }
  ruffle-player, ruffle-embed, object, embed {
    width: 100% !important;
    height: 100% !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    display: block !important;
    margin: auto !important;
    object-fit: contain !important;
  }
</style>
<script id="frosted-runtime-shield">
(function() {
  window.__GAME_ASSET_MAP__ = window.__GAME_ASSET_MAP__ || new Map();

  // 1. Safe parent & platform exports
  window.maeExportApis_ = window.maeExportApis_ || function() {};
  try {
    if (window.parent && !window.parent.maeExportApis_) {
      window.parent.maeExportApis_ = function() {};
    }
  } catch(e) {}

  // 2. URL Sanitizer / CDN rewriter helper
  function resolveSafeUrl(url) {
    if (typeof url !== "string") return url;
    let u = url;
    const r1 = new RegExp(
      "https?:\\/\\/(?:cdn\\.jsdelivr\\.net\\/gh|rawcdn\\.githack\\.com|raw\\.githack\\.com|cdn\\.staticaly\\.com\\/gh|gitcdn\\.link\\/repo)\\/([^/\\s]+)\\/([^/\\s]+)@([^/\\s]+)\\/([^\\s]+)",
      "gi",
    );
    u = u.replace(r1, "https://raw.githubusercontent.com/$1/$2/$3/$4");
    const r2 = new RegExp(
      "https?:\\/\\/(?:cdn\\.jsdelivr\\.net\\/gh|rawcdn\\.githack\\.com|raw\\.githack\\.com)\\/([^/\\s]+)\\/([^/\\s]+)\\/([^/\\s]+)\\/([^\\s]+)",
      "gi",
    );
    u = u.replace(r2, "https://raw.githubusercontent.com/$1/$2/$3/$4");
    const r3 = new RegExp(
      "https?:\\/\\/(?:cdn\\.jsdelivr\\.net\\/gh|rawcdn\\.githack\\.com|raw\\.githack\\.com)\\/([^/\\s]+)\\/([^/\\s]+)\\/([^\\s]+)",
      "gi",
    );
    u = u.replace(r3, "https://raw.githubusercontent.com/$1/$2/main/$3");
    return u;
  }

  // 3. Unity WebGL Loader, WebGL Context & UnityCache Fix
  // Fixes games hanging at "Loading 0%" caused by UnityCache IndexedDB / HEAD requests
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

  // WebGL Context Fallback Guard (webgl2 -> webgl fallback)
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

  // 4. YouTube Playables Mock & SDK mocks (PlayCanvas / WebGL games)
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

  // 5. AudioContext auto-unlocker for Chromebooks and modern browsers
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

  // 6. Asset Interception Engine (Handles both relative and base-resolved absolute URLs)
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

      // Neutralize anti-tamper honeypot checks
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

  // Intercept Media elements (img, audio, video) & Script elements
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

  // 8. Auto-Centering and Full-Fit Viewport Enforcer
  try {
    function centerAndFit() {
      const allElements = document.querySelectorAll('canvas, #gameContainer, #unityContainer, #unity-container, #game-container, #c2canvasdiv, #cr-stage, #game-stage, #canvas, #unity-canvas, ruffle-player, embed, object, iframe');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        if (el) {
          el.style.setProperty('margin-left', 'auto', 'important');
          el.style.setProperty('margin-right', 'auto', 'important');
          el.style.setProperty('margin-top', 'auto', 'important');
          el.style.setProperty('margin-bottom', 'auto', 'important');
          el.style.setProperty('object-fit', 'contain', 'important');
          el.style.setProperty('max-width', '100vw', 'important');
          el.style.setProperty('max-height', '100vh', 'important');
        }
      }
      if (document.body) {
        document.body.style.setProperty('display', 'flex', 'important');
        document.body.style.setProperty('flex-direction', 'column', 'important');
        document.body.style.setProperty('align-items', 'center', 'important');
        document.body.style.setProperty('justify-content', 'center', 'important');
        document.body.style.setProperty('margin', '0', 'important');
        document.body.style.setProperty('padding', '0', 'important');
        document.body.style.setProperty('width', '100vw', 'important');
        document.body.style.setProperty('height', '100vh', 'important');
        document.body.style.setProperty('overflow', 'hidden', 'important');
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', centerAndFit);
    } else {
      centerAndFit();
    }
    window.addEventListener('load', centerAndFit);
    window.addEventListener('resize', centerAndFit);

    if (window.MutationObserver) {
      const obs = new MutationObserver(function() {
        centerAndFit();
      });
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: false });
    }
  } catch(e) {}
})();
</script>
`;

  // Inject our runtime shield right after <head> or at the very top of HTML
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
    // 1. Download all 8 parts in parallel for maximum speed
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

    // 2. Merge parts into resources.zip and extract
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

    // 3. Hide progress UI and launch Runtime
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

// Loads a game source asynchronously with multi-tier fallback
export async function loadGameSource(directory: string): Promise<GameLoadResult> {
  if (
    directory.startsWith("http://") ||
    directory.startsWith("https://") ||
    directory.startsWith("/~/")
  ) {
    return { type: "url", src: directory };
  }

  const filename = directory.replace(/^\/+/, "");

  let githubUrl = "";
  let fallbackGithubUrl = "";

  if (filename.startsWith("games/")) {
    githubUrl = `https://raw.githubusercontent.com/a456pur/seraph/main/${filename}`;
    fallbackGithubUrl = `https://raw.githubusercontent.com/a456pur/seraph/master/${filename}`;
  } else if (filename.startsWith("3kh0/")) {
    const rawFilename = filename.replace("3kh0/", "");
    githubUrl = `https://raw.githubusercontent.com/3kh0/3kh0-Assets/main/${rawFilename}`;
    fallbackGithubUrl = `https://raw.githubusercontent.com/3kh0/3kh0-Assets/master/${rawFilename}`;
  } else {
    githubUrl = `https://raw.githubusercontent.com/freebuisness/html/main/${filename}`;
    fallbackGithubUrl = `https://raw.githubusercontent.com/freebuisness/html/master/${filename}`;
  }

  const urlsToTry = [
    { url: githubUrl, baseUrl: githubUrl.substring(0, githubUrl.lastIndexOf("/") + 1) },
    {
      url: fallbackGithubUrl,
      baseUrl: fallbackGithubUrl.substring(0, fallbackGithubUrl.lastIndexOf("/") + 1),
    },
  ];

  for (const { url, baseUrl } of urlsToTry) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 50 && !text.includes("Couldn't find the requested file")) {
          const html = prepareGameHtml(text, filename, baseUrl);
          const blob = new Blob([html], { type: "text/html; charset=utf-8" });
          const blobUrl = URL.createObjectURL(blob);
          return { type: "blob", src: blobUrl, blobUrl };
        }
      }
    } catch {
      // Continue to next fallback URL
    }
  }

  // Final fallback to the proxy if both client-side fetches fail
  return { type: "url", src: `/api/public/gn/game/${filename}` };
}
