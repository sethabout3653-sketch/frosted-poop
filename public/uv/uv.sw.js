"use strict";
(() => {
  var h = self.Ultraviolet,
    O = [
      "cross-origin-embedder-policy",
      "cross-origin-opener-policy",
      "cross-origin-resource-policy",
      "content-security-policy",
      "content-security-policy-report-only",
      "expect-ct",
      "feature-policy",
      "origin-isolation",
      "strict-transport-security",
      "upgrade-insecure-requests",
      "x-content-type-options",
      "x-download-options",
      "x-frame-options",
      "x-permitted-cross-domain-policies",
      "x-powered-by",
      "x-xss-protection",
    ],
    C = ["GET", "HEAD"],
    g = class extends h.EventEmitter {
      constructor(e = __uv$config) {
        (super(),
          e.prefix || (e.prefix = "/service/"),
          (this.config = e),
          (this.bareClient = new h.BareClient()));
      }
      route({ request: e }) {
        return !!e.url.startsWith(location.origin + this.config.prefix);
      }
      async fetch({ request: e }) {
        let s;
        try {
          if (!e.url.startsWith(location.origin + this.config.prefix)) return await fetch(e);
          let t = new h(this.config);
          typeof this.config.construct == "function" && this.config.construct(t, "service");
          let w = await t.cookie.db();
          ((t.meta.origin = location.origin),
            (t.meta.base = t.meta.url = new URL(t.sourceUrl(e.url))));
          let o = new v(e, t, C.includes(e.method.toUpperCase()) ? null : await e.blob());
          if (
            (t.meta.url.protocol === "blob:" &&
              ((o.blob = !0), (o.base = o.url = new URL(o.url.pathname))),
            e.referrer && e.referrer.startsWith(location.origin))
          ) {
            let i = new URL(t.sourceUrl(e.referrer));
            ((o.headers.origin || (t.meta.url.origin !== i.origin && e.mode === "cors")) &&
              (o.headers.origin = i.origin),
              (o.headers.referer = i.href));
          }
          let f = (await t.cookie.getCookies(w)) || [],
            x = t.cookie.serialize(f, t.meta, !1);

          o.headers["user-agent"] = navigator.userAgent;
          if (!o.headers["accept-language"]) {
            o.headers["accept-language"] = "en-US,en;q=0.9";
          }
          if (!o.headers["sec-ch-ua"]) {
            o.headers["sec-ch-ua"] =
              '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"';
          }
          if (!o.headers["sec-ch-ua-mobile"]) {
            o.headers["sec-ch-ua-mobile"] = "?0";
          }
          if (!o.headers["sec-ch-ua-platform"]) {
            o.headers["sec-ch-ua-platform"] = '"Windows"';
          }

          // Anti-bot & consent bypass for Google, YouTube, and Cloudflare challenges
          const host = t.meta.url.hostname.toLowerCase();
          if (
            host.includes("google.") ||
            host.includes("youtube.") ||
            host.includes("googlevideo.")
          ) {
            let cookieStr = x || "";
            if (!cookieStr.includes("SOCS=")) {
              cookieStr +=
                (cookieStr ? "; " : "") + "SOCS=CAESEwgDEgk2OTQ0NTMwOTQaAmVuIAEaBgoBMhIA";
            }
            if (!cookieStr.includes("CONSENT=")) {
              cookieStr += (cookieStr ? "; " : "") + "CONSENT=YES+cb.20210720-07-p0.en+FX+999";
            }
            if (!cookieStr.includes("PREF=")) {
              cookieStr += (cookieStr ? "; " : "") + "PREF=f4=4000000&f6=400&f7=100&hl=en";
            }
            x = cookieStr;
          }

          if (x) o.headers.cookie = x;
          let p = new u(o, null, null);
          if ((this.emit("request", p), p.intercepted)) return p.returnValue;
          s = o.blob ? "blob:" + location.origin + o.url.pathname : o.url;
          let c = await this.bareClient.fetch(s, {
              headers: o.headers,
              method: o.method,
              body: o.body,
              credentials: o.credentials,
              mode: o.mode,
              cache: o.cache,
              redirect: o.redirect,
            }),
            r = new y(o, c),
            l = new u(r, null, null);
          if (c.finalURL) {
            try {
              t.meta.url = t.meta.base = new URL(c.finalURL);
            } catch {}
          }
          if ((this.emit("beforemod", l), l.intercepted)) return l.returnValue;
          for (let i of O) r.headers[i] && delete r.headers[i];
          if (r.headers.location) {
            r.headers.location = t.rewriteUrl(r.headers.location);
            if (
              (r.status >= 300 && r.status < 400) ||
              ["document", "iframe"].includes(e.destination)
            ) {
              return Response.redirect(r.headers.location, 302);
            }
          }
          if (
            (r.headers["set-cookie"] &&
              (Promise.resolve(t.cookie.setCookies(r.headers["set-cookie"], w, t.meta)).then(() => {
                self.clients.matchAll().then(function (i) {
                  i.forEach(function (n) {
                    n.postMessage({ msg: "updateCookies", url: t.meta.url.href });
                  });
                });
              }),
              delete r.headers["set-cookie"]),
            r.body)
          ) {
            const contentType = (r.getHeader("content-type") || "").toLowerCase();
            if (
              e.destination === "script" ||
              contentType.includes("javascript") ||
              contentType.includes("ecmascript")
            ) {
              r.body = t.js.rewrite(await c.text());
              delete r.headers["content-length"];
              delete r.headers["content-encoding"];
              r.headers["content-type"] = "application/javascript; charset=utf-8";
            } else if (e.destination === "worker") {
              let i = [t.bundleScript, t.clientScript, t.configScript, t.handlerScript]
                .map((n) => JSON.stringify(n))
                .join(",");
              r.body =
                `if (!self.__uv) {
                            ${t.createJsInject(t.cookie.serialize(f, t.meta, !0), e.referrer)}
                        importScripts(${i});
                        }
` + t.js.rewrite(await c.text());
              delete r.headers["content-length"];
              delete r.headers["content-encoding"];
              r.headers["content-type"] = "application/javascript; charset=utf-8";
            } else if (e.destination === "style" || contentType.includes("text/css")) {
              r.body = t.rewriteCSS(await c.text());
              delete r.headers["content-length"];
              delete r.headers["content-encoding"];
              r.headers["content-type"] = "text/css; charset=utf-8";
            } else if (
              ["document", "iframe"].includes(e.destination) ||
              contentType.startsWith("text/html")
            ) {
              let i = await c.text();
              if (Array.isArray(this.config.inject)) {
                let n = i.indexOf("<head>"),
                  m = i.indexOf("<HEAD>"),
                  b = i.indexOf("<body>"),
                  k = i.indexOf("<BODY>"),
                  S = new URL(s),
                  U = this.config.inject;
                for (let d of U)
                  new RegExp(d.host).test(S.host) &&
                    (d.injectTo === "head"
                      ? (n !== -1 || m !== -1) && (i = i.slice(0, n) + `${d.html}` + i.slice(n))
                      : d.injectTo === "body" &&
                        (b !== -1 || k !== -1) &&
                        (i = i.slice(0, b) + `${d.html}` + i.slice(b)));
              }
              r.body = t.rewriteHtml(i, {
                document: !0,
                injectHead: t.createHtmlInject(
                  t.handlerScript,
                  t.bundleScript,
                  t.clientScript,
                  t.configScript,
                  t.cookie.serialize(f, t.meta, !0),
                  e.referrer,
                ),
              });
              delete r.headers["content-length"];
              delete r.headers["content-encoding"];
              r.headers["content-type"] = "text/html; charset=utf-8";
            }
          }
          if (r.getHeader("content-range")) {
            r.headers["accept-ranges"] = "bytes";
            if (r.status === 200) {
              r.status = 206;
              r.statusText = "Partial Content";
            }
          }
          if (r.status === 206 && !r.statusText) {
            r.statusText = "Partial Content";
          }
          return (
            o.headers.accept === "text/event-stream" &&
              (r.headers["content-type"] = "text/event-stream"),
            crossOriginIsolated && (r.headers["Cross-Origin-Embedder-Policy"] = "require-corp"),
            this.emit("response", l),
            l.intercepted
              ? l.returnValue
              : new Response(r.body, {
                  headers: r.headers,
                  status: r.status,
                  statusText: r.statusText || (r.status === 200 ? "OK" : ""),
                })
          );
        } catch (t) {
          return ["document", "iframe"].includes(e.destination)
            ? (console.error(t), T(t, s))
            : new Response(void 0, { status: 500 });
        }
      }
      static Ultraviolet = h;
    };
  self.UVServiceWorker = g;
  var y = class {
      constructor(e, s) {
        ((this.request = e),
          (this.raw = s),
          (this.ultraviolet = e.ultraviolet),
          (this.headers = {}));
        for (let t in s.rawHeaders) this.headers[t.toLowerCase()] = s.rawHeaders[t];
        ((this.status = s.status), (this.statusText = s.statusText), (this.body = s.body));
      }
      get url() {
        return this.request.url;
      }
      get base() {
        return this.request.base;
      }
      set base(e) {
        this.request.base = e;
      }
      getHeader(e) {
        return Array.isArray(this.headers[e]) ? this.headers[e][0] : this.headers[e];
      }
    },
    v = class {
      constructor(e, s, t = null) {
        ((this.ultraviolet = s),
          (this.request = e),
          (this.headers = Object.fromEntries(e.headers.entries())),
          (this.method = e.method),
          (this.body = t || null),
          (this.cache = e.cache),
          (this.redirect = e.redirect),
          (this.credentials = "omit"),
          (this.mode = e.mode === "cors" ? e.mode : "same-origin"),
          (this.blob = !1));
      }
      get url() {
        return this.ultraviolet.meta.url;
      }
      set url(e) {
        this.ultraviolet.meta.url = e;
      }
      get base() {
        return this.ultraviolet.meta.base;
      }
      set base(e) {
        this.ultraviolet.meta.base = e;
      }
    },
    u = class {
      #e;
      #t;
      constructor(e = {}, s = null, t = null) {
        ((this.#e = !1), (this.#t = null), (this.data = e), (this.target = s), (this.that = t));
      }
      get intercepted() {
        return this.#e;
      }
      get returnValue() {
        return this.#t;
      }
      respondWith(e) {
        ((this.#t = e), (this.#e = !0));
      }
    };
  function E(a, e) {
    let s = `
        errorTrace.value = ${JSON.stringify(a)};
        fetchedURL.textContent = ${JSON.stringify(e)};
        reload.addEventListener("click", () => location.reload());
        const switchBtn = document.getElementById("switchRelay");
        if (switchBtn) {
          switchBtn.addEventListener("click", () => {
            window.parent.postMessage({ type: "SWITCH_WISP_RELAY" }, "*");
            switchBtn.textContent = "Switching Relay...";
            setTimeout(() => location.reload(), 400);
          });
        }
    `;
    return `<!DOCTYPE html>
        <html>
        <head>
        <meta charset='utf-8' />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Connection Error</title>
        <style>
          * { box-sizing: border-box; }
          body { 
            background-color: #09090b; 
            color: #e4e4e7; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
          }
          .card {
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 16px;
            max-width: 520px;
            width: 100%;
            padding: 28px;
            box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
          }
          h1 { font-size: 18px; font-weight: 600; margin: 0 0 8px; color: #fafafa; }
          p { font-size: 13px; line-height: 1.5; color: #a1a1aa; margin: 0 0 16px; word-break: break-word; }
          .url-badge { color: #f43f5e; font-family: monospace; font-size: 12px; }
          textarea {
            width: 100%;
            background: #09090b;
            border: 1px solid #27272a;
            border-radius: 8px;
            color: #f87171;
            font-family: monospace;
            font-size: 11px;
            padding: 10px;
            resize: none;
            margin-bottom: 20px;
          }
          .actions { display: flex; gap: 10px; }
          button {
            cursor: pointer;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            border: none;
            transition: all 0.15s;
          }
          .btn-primary { background: #ffffff; color: #09090b; }
          .btn-primary:hover { opacity: 0.9; }
          .btn-secondary { background: #27272a; color: #e4e4e7; border: 1px solid #3f3f46; }
          .btn-secondary:hover { background: #3f3f46; }
        </style>
        </head>
        <body>
          <div class="card">
            <h1>Connection Interrupted</h1>
            <p>The destination website terminated the connection or refused TLS handshake: <span id="fetchedURL" class="url-badge"></span></p>
            <textarea id="errorTrace" rows="4" readonly></textarea>
            <div class="actions">
              <button id="switchRelay" class="btn-primary">Switch Relay & Retry</button>
              <button id="reload" class="btn-secondary">Reload</button>
            </div>
          </div>
          <script src="${"data:application/javascript," + encodeURIComponent(s)}"><\/script>
        </body>
        </html>`;
  }
  function T(a, e) {
    let s = { "content-type": "text/html" };
    return (
      crossOriginIsolated && (s["Cross-Origin-Embedder-Policy"] = "require-corp"),
      new Response(E(String(a), e), { status: 500, headers: s })
    );
  }
})();
//# sourceMappingURL=uv.sw.js.map
