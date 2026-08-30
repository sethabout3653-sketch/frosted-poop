// Client-side game loading, sanitization, and runtime execution engine
// Ensures 100% compatibility across Vercel, Cloud Run, static hosts, and Chromebooks.

export interface GameLoadResult {
  type: "blob" | "url" | "srcdoc";
  src: string;
  blobUrl?: string;
}

const HTML_CDN_PRIMARY = "https://cdn.jsdelivr.net/gh/freebuisness/html@main";
const HTML_CDN_FALLBACK = "https://raw.githubusercontent.com/freebuisness/html/main";

// Sanitizes and enhances game HTML for safe, full-speed iframe execution
export function prepareGameHtml(rawHtml: string, filename: string): string {
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
  html = html.replace(/<div\b[^>]*class=["\x27]sidebar-close["\x27][\s\S]*?<\/div>/gi, "");

  // 3. Remove malicious domain-lock and anti-embed scripts
  html = html.replace(
    /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*(?:IuySzzpOiISwZDDrwmF|sFfEkK\$fMziBAJZwZbkuvp|UravPbGESYjDUNqxKcf\$Vqza|_0x257e|_0xe8c3|document\.body\.remove)[\s\S]*?<\/script>/gi,
    "",
  );

  // 4. Ensure correct <base href="...">
  if (!html.includes("<base ")) {
    let detectedBase = "https://cdn.jsdelivr.net/gh/freebuisness/html@main/";
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
    html = html.replace(/<head[^>]*>/i, `$&<base href="${detectedBase}">`);
  }

  // 5. Universal Runtime Polyfill & Asset Interceptor
  // Solves Clickteam/FNAF resource mapping, YouTube playables, Web Audio autoplay unlocking, and safe styling
  const runtimeScript = `
<style id="frosted-runtime-style">
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    background-color: #000000 !important;
    color: #ffffff !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  }
  canvas, #canvas, #MMFCanvas, #game-canvas, #unity-canvas, #ruffle {
    display: block !important;
    margin: 0 auto !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: contain !important;
  }
</style>
<script id="frosted-runtime-shield">
(function() {
  window.__GAME_ASSET_MAP__ = window.__GAME_ASSET_MAP__ || new Map();
  
  // 1. YouTube Playables Mock (PlayCanvas compatibility)
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

  // 2. AudioContext auto-unlocker for Chromebooks and modern browsers
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

  // 3. Asset Interception Engine (Handles both relative and base-resolved absolute URLs)
  const _origFetch = window.fetch;
  window.fetch = async function(input, init) {
    let urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    if (urlStr) {
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
      const fileName = url.split('?')[0].split('#')[0].split('/').pop();
      if (fileName && window.__GAME_ASSET_MAP__.has(fileName)) {
        arguments[1] = window.__GAME_ASSET_MAP__.get(fileName);
      }
    }
    return _origXHROpen.apply(this, arguments);
  };

  // Intercept Media elements (img, audio, video)
  const mediaTypes = [HTMLImageElement, HTMLAudioElement, HTMLVideoElement];
  for (const Tag of mediaTypes) {
    const desc = Object.getOwnPropertyDescriptor(Tag.prototype, 'src');
    if (desc && desc.set) {
      Object.defineProperty(Tag.prototype, 'src', {
        configurable: true,
        enumerable: true,
        get: desc.get,
        set: function(val) {
          if (typeof val === 'string') {
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

  // Inject our runtime shield right after <head> or at the very top of HTML
  if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>${runtimeScript}`);
  } else if (html.includes("<head ")) {
    html = html.replace(/<head[^>]*>/i, `$&${runtimeScript}`);
  } else {
    html = `${runtimeScript}${html}`;
  }

  // 6. Handle FNAF Multi-part Clickteam games specifically
  // FNAF 1-4 use resources.zip split into 8 parts with JSZip extraction.
  // We replace the buggy main.js with our optimized, rock-solid loader.
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
    // Replace <script src="main.js"></script> with our clean, optimized in-memory loader
    html = html.replace(
      /<script\b[^>]*src=["\x27]main\.js["\x27][^>]*><\/script>/gi,
      cleanFnafLoader,
    );
  }

  return html;
}

// Loads a game source asynchronously with multi-tier fallback
export async function loadGameSource(directory: string): Promise<GameLoadResult> {
  // If already an absolute URL or proxy URL, return directly
  if (
    directory.startsWith("http://") ||
    directory.startsWith("https://") ||
    directory.startsWith("/~/")
  ) {
    return { type: "url", src: directory };
  }

  const filename = directory.replace(/^\/+/, "");

  // Try fetching raw HTML from primary jsDelivr CDN
  const urlsToTry = [
    `${HTML_CDN_PRIMARY}/${filename}`,
    `${HTML_CDN_FALLBACK}/${filename}`,
    `/api/public/gn/game/${filename}`,
  ];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 50 && !text.includes("Couldn't find the requested file")) {
          const prepared = prepareGameHtml(text, filename);
          const blob = new Blob([prepared], { type: "text/html; charset=utf-8" });
          const blobUrl = URL.createObjectURL(blob);
          return { type: "blob", src: blobUrl, blobUrl };
        }
      }
    } catch {
      // Continue to next fallback URL
    }
  }

  // Fallback to direct proxy or CDN path
  return { type: "url", src: `/api/public/gn/game/${filename}` };
}
