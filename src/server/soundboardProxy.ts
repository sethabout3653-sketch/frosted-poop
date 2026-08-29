import { Router, Request, Response } from "express";

const router = Router();

const TARGET_URL = "https://myinstants.com";

function getTargetDetails(inputUrl?: string) {
  let raw = (inputUrl || TARGET_URL).trim();
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    raw = `https://${raw}`;
  }
  raw = raw.replace(/\/+$/, "");

  let origin = raw;
  try {
    origin = new URL(raw).origin;
  } catch {
    /* silent fallback */
  }

  return {
    baseUrl: raw,
    origin,
    referer: `${origin}/`,
  };
}

// Enhanced stealth headers with rotation
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Routes remain the same until scramjet-proxy

router.all("/scramjet-proxy", async (req: Request, res: Response) => {
  const target = (req.query.target as string) || TARGET_URL;
  const { origin, referer } = getTargetDetails(target);

  try {
    const stealthHeaders = {
      "User-Agent": getRandomUserAgent(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: referer,
      Origin: origin,
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
      Pragma: "no-cache",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(target, {
      method: req.method,
      headers: stealthHeaders,
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const status = response.status;
    const finalUrl = response.url;
    const contentType = response.headers.get("content-type");
    const contentBuffer = Buffer.from(await response.arrayBuffer());

    res.status(status || 200);

    if (typeof contentType === "string" && !contentType.includes("text/html")) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (contentType) res.setHeader("Content-Type", contentType);
      return res.send(contentBuffer);
    }

    let content = contentBuffer.toString("utf-8");

    // Remove all meta refresh tags completely
    content = content.replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, "");

    // Remove CSP meta tags that could contain frame-ancestors or block our scripts
    content = content.replace(
      /<meta[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/gi,
      "",
    );

    // Strip subresource integrity and crossorigin constraints so proxied assets don't fail CORS
    content = content.replace(/\bintegrity=["'][^"']*["']/gi, "");
    content = content.replace(/\bcrossorigin=["']?(?:anonymous|use-credentials)?["']?/gi, "");

    // More aggressive anti-framebusting
    content = content.replace(/top\.location/g, "window.self.location");
    content = content.replace(/parent\.location/g, "window.self.location");
    content = content.replace(/window\.top/g, "window.self");
    content = content.replace(/window\.parent/g, "window.self");
    content = content.replace(/if\s*\(top\s*!=\s*self\)/g, "if(false)");
    content = content.replace(/if\s*\(parent\s*!=\s*self\)/g, "if(false)");

    // Fix base URL
    const baseUrl = finalUrl.endsWith("/") ? finalUrl : `${finalUrl}/`;

    // Enhanced proxy script with better interception
    const proxyScript = `
<script>
// Nuclear option: override everything that could break the frame
try { Object.defineProperty(window, 'top', { get: () => window.self, configurable: false }); } catch(e) {}
try { Object.defineProperty(window, 'parent', { get: () => window.self, configurable: false }); } catch(e) {}
try { Object.defineProperty(window, 'frameElement', { get: () => null, configurable: false }); } catch(e) {}

// Block Service Workers to prevent SPA crashes (like YouTube uses)
try {
  if ('serviceWorker' in navigator) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: function() { return Promise.reject(new Error('Blocked')); },
        getRegistrations: function() { return Promise.resolve([]); },
        getRegistration: function() { return Promise.resolve(null); },
        ready: new Promise(function() {}) 
      },
      configurable: true
    });
  }
} catch (e) {}


// Kill any existing framebuster scripts
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    var scripts = document.querySelectorAll('script');
    scripts.forEach(function(script) {
      var scriptText = script.textContent || script.innerText;
      if (scriptText.includes('top.location') || 
          scriptText.includes('parent.location') ||
          scriptText.includes('window.top') ||
          scriptText.includes('window.parent') ||
          scriptText.includes('framebuster')) {
        script.remove();
      }
    });
  }, 100);
});

// Mock History API to prevent cross-origin DOMExceptions that cause SPA routers (like YouTube) to fallback to hard navigations
try {
  var origPushState = window.history.pushState;
  window.history.pushState = function(state, unused, url) {
    if (typeof url === 'string' && url.startsWith('http')) {
      // Just rewrite the URL silently without throwing
      var proxied = '/api/soundboard/scramjet-proxy?target=' + encodeURIComponent(url);
      return origPushState.call(this, state, unused, proxied);
    }
    return origPushState.call(this, state, unused, url);
  };
  
  var origReplaceState = window.history.replaceState;
  window.history.replaceState = function(state, unused, url) {
    if (typeof url === 'string' && url.startsWith('http')) {
      var proxied = '/api/soundboard/scramjet-proxy?target=' + encodeURIComponent(url);
      return origReplaceState.call(this, state, unused, proxied);
    }
    return origReplaceState.call(this, state, unused, url);
  };
} catch(e) {}

// Hijack location assignments if possible
try {
  var originalAssign = window.location.assign;
  window.location.assign = function(url) {
    if (typeof url === 'string' && url.startsWith('http')) {
      return originalAssign.call(this, '/api/soundboard/scramjet-proxy?target=' + encodeURIComponent(url));
    }
    return originalAssign.call(this, url);
  };
  var originalReplace = window.location.replace;
  window.location.replace = function(url) {
    if (typeof url === 'string' && url.startsWith('http')) {
      return originalReplace.call(this, '/api/soundboard/scramjet-proxy?target=' + encodeURIComponent(url));
    }
    return originalReplace.call(this, url);
  };
} catch(e) {}

// Intercept ALL clicks
document.addEventListener('click', function(e) {
  var target = e.target;
  while (target && target.nodeName !== 'A') {
    target = target.parentElement;
  }
  if (target && target.href && target.href.startsWith('http')) {
    e.preventDefault();
    e.stopImmediatePropagation();
    window.location.href = '/api/soundboard/scramjet-proxy?target=' + 
      encodeURIComponent(target.href);
    return false;
  }
}, true);

// Hijack forms
document.addEventListener('submit', function(e) {
  var form = e.target;
  if (form && form.tagName === 'FORM') {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    var action = form.getAttribute('action') || form.action;
    if (action && action.startsWith('http')) {
      var method = (form.method || 'get').toLowerCase();
      var targetUrl = action;
      
      if (method === 'get') {
        var params = new URLSearchParams(new FormData(form));
        if (params.toString()) {
          targetUrl += (targetUrl.includes('?') ? '&' : '?') + params.toString();
        }
        window.location.href = '/api/soundboard/scramjet-proxy?target=' + 
          encodeURIComponent(targetUrl);
      } else {
        // For POST, create a hidden form that submits through proxy
        var hiddenForm = document.createElement('form');
        hiddenForm.method = 'post';
        hiddenForm.action = '/api/soundboard/scramjet-proxy?target=' + 
          encodeURIComponent(action);
        hiddenForm.style.display = 'none';
        
        var formData = new FormData(form);
        for (var pair of formData.entries()) {
          var input = document.createElement('input');
          input.type = 'hidden';
          input.name = pair[0];
          input.value = pair[1];
          hiddenForm.appendChild(input);
        }
        
        document.body.appendChild(hiddenForm);
        hiddenForm.submit();
      }
    }
  }
}, true);

// URL Resolver for proxying
var baseStr = "${baseUrl}";
if (baseStr.endsWith('/')) baseStr = baseStr.slice(0, -1);

function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return window.location.protocol + url;
  if (url.startsWith('/')) return baseStr + url;
  return baseStr + '/' + url;
}

// Override fetch and XHR
if (window.fetch) {
  var originalFetch = window.fetch;
  window.fetch = function() {
    var args = arguments;
    if (typeof args[0] === 'string') {
      var resolved = resolveUrl(args[0]);
      if (resolved.startsWith('http')) {
        args[0] = '/api/soundboard/scramjet-proxy?target=' + encodeURIComponent(resolved);
      }
    } else if (args[0] && args[0].url) {
      // Very basic Request object intercept
      var resolved = resolveUrl(args[0].url);
      if (resolved.startsWith('http')) {
        Object.defineProperty(args[0], 'url', { value: '/api/soundboard/scramjet-proxy?target=' + encodeURIComponent(resolved), configurable: true });
      }
    }
    return originalFetch.apply(this, args);
  };
}

if (window.XMLHttpRequest) {
  var originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    if (typeof arguments[1] === 'string') {
      var resolved = resolveUrl(arguments[1]);
      if (resolved.startsWith('http')) {
        arguments[1] = '/api/soundboard/scramjet-proxy?target=' + encodeURIComponent(resolved);
      }
    }
    return originalOpen.apply(this, arguments);
  };
}

// Block console errors about refused connections
var originalConsoleError = console.error;
console.error = function() {
  var args = Array.prototype.slice.call(arguments);
  var msg = args.join(' ');
  if (msg.includes('Refused') || 
      msg.includes('frame') || 
      msg.includes('top') || 
      msg.includes('parent')) {
    return;
  }
  originalConsoleError.apply(console, args);
};
</script>
    `;

    // Inject into head
    const headInjection = `<head><base href="${baseUrl}">${proxyScript}`;

    if (content.toLowerCase().includes("<head>")) {
      content = content.replace(/<head>/i, headInjection);
    } else if (content.toLowerCase().includes("<head ")) {
      content = content.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}">${proxyScript}`);
    } else {
      content = `${headInjection}</head>${content}`;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.send(content);
  } catch (err: any) {
    console.error("Proxy error:", err);
    res.status(500).json({
      error: err.message,
      note: "Target site might be actively blocking proxies. Try different user agents.",
    });
  }
});

export default router;
