/**
 * Proxy Engine & Transport Layer.
 * Supports both Ultraviolet (UV) and Scramjet, backed by BareMux, Epoxy, and Wisp relays.
 */

export type ProxyEngine = "ultraviolet" | "scramjet";

export const UV_PREFIX = "/~/uv/";
export const SCRAMJET_PREFIX = "/~/scramjet/";

/** Alternates to fall back on when one relay refuses a site (TLS handshake eof). */
export const WISP_SERVERS = [
  { name: "Self-Hosted Local (Fastest)", url: "" },
  { name: "Mercury Workshop", url: "wss://wisp.mercurywork.shop/" },
  { name: "TitaniumNetwork", url: "wss://wisp.terbiumon.top/wisp/" },
  { name: "Nebula Public", url: "wss://anura.pro/" },
  { name: "PyDodge Relay", url: "wss://wisp.pydodge.com/" },
];

export function getAvailableWispServers(): { name: string; url: string }[] {
  const isBrowser = typeof window !== "undefined";
  const localWisp = isBrowser
    ? `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/wisp/`
    : "";

  const list: { name: string; url: string }[] = [];
  if (localWisp) {
    list.push({ name: "Self-Hosted Local (Fastest)", url: localWisp });
  }

  WISP_SERVERS.forEach((s) => {
    if (s.url && s.url !== localWisp) {
      list.push(s);
    }
  });

  return list;
}

export function getOptimalWisp(url?: string): string {
  const servers = getAvailableWispServers();
  if (servers.length === 0) return "wss://wisp.mercurywork.shop/";
  if (!url) return servers[0].url;

  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    let hash = 0;
    for (let i = 0; i < host.length; i++) {
      hash = (hash << 5) - hash + host.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % servers.length;
    return servers[idx].url;
  } catch {
    return servers[0].url;
  }
}

/**
 * Ultraviolet XOR codec implementation
 */
export function encodeXor(str: string): string {
  if (!str) return "";
  return encodeURIComponent(
    str
      .toString()
      .split("")
      .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char))
      .join(""),
  );
}

export function decodeXor(str: string): string {
  if (!str) return "";
  const [input, ...search] = str.split("?");
  try {
    const decodedInput = decodeURIComponent(input);
    const unmasked = decodedInput
      .split("")
      .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char))
      .join("");
    return unmasked + (search.length ? "?" + search.join("?") : "");
  } catch {
    return str;
  }
}

/**
 * Automatically chooses the best proxy engine based on target site architecture
 */
export function chooseProxyEngine(inputUrl: string): ProxyEngine {
  try {
    const parsed = new URL(inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    // Scramjet excels at heavy single-page apps, complex WebAssembly/streaming media apps, and Google services
    const scramjetDomains = [
      "youtube.com",
      "youtu.be",
      "tiktok.com",
      "twitch.tv",
      "spotify.com",
      "google.com",
      "google.co",
      "accounts.google.com",
      "docs.google.com",
      "drive.google.com",
      "mail.google.com",
      "netflix.com",
      "hulu.com",
      "soundcloud.com",
    ];

    if (scramjetDomains.some((d) => host === d || host.endsWith(`.${d}`))) {
      return "scramjet";
    }

    // Ultraviolet excels at canvas/WebGL games, Discord, Reddit, Wikipedia, GitHub, DuckDuckGo, news, and general web
    return "ultraviolet";
  } catch {
    return "ultraviolet";
  }
}

/**
 * Encodes a URL for the specified proxy engine
 */
export function getProxyUrl(url: string, engine: ProxyEngine): string {
  if (!url) return "";
  if (engine === "ultraviolet") {
    return `${UV_PREFIX}${encodeXor(url)}`;
  }
  return `${SCRAMJET_PREFIX}${encodeURIComponent(url)}`;
}

/**
 * Strips proxy prefixes to return the clean user-facing URL
 */
export function cleanProxyUrl(raw: string): string {
  if (!raw) return "";
  if (raw.includes(UV_PREFIX)) {
    const part = raw.split(UV_PREFIX)[1];
    return decodeXor(part);
  }
  if (raw.includes(SCRAMJET_PREFIX)) {
    const part = raw.split(SCRAMJET_PREFIX)[1];
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  }
  return raw;
}

type AnyRecord = Record<string, unknown>;

const scriptPromises: Record<string, Promise<void>> = {};
let controllerPromise: Promise<AnyRecord> | null = null;
let currentWisp = "";
let connection: AnyRecord | null = null;

function loadScript(src: string): Promise<void> {
  if (scriptPromises[src]) return scriptPromises[src];

  scriptPromises[src] = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.dataset["src"] = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(el);
  });

  return scriptPromises[src];
}

async function ensureScripts() {
  await loadScript("/uv/uv.bundle.js");
  await Promise.all([loadScript("/uv/uv.config.js"), loadScript("/proxy/scramjet.all.js")]);
}

async function ensureTransport(wisp: string) {
  if (currentWisp === wisp && connection) return;
  const dynamicImport = new Function("p", "return import(p)") as (p: string) => Promise<AnyRecord>;
  const mod = await dynamicImport(`${location.origin}/proxy/baremux.mjs`);
  const BareMuxConnection = mod["BareMuxConnection"] as new (worker: string) => AnyRecord;
  if (!connection) {
    connection = new BareMuxConnection(`${location.origin}/proxy/baremux-worker.js`);
  }
  const setTransport = connection["setTransport"] as (
    path: string,
    options: unknown[],
  ) => Promise<void>;

  const allServers = getAvailableWispServers().map((s) => s.url);
  const candidates = [wisp, ...allServers.filter((u) => u !== wisp)];
  let lastError: unknown = null;

  for (const targetWisp of candidates) {
    try {
      await setTransport.call(connection, `${location.origin}/proxy/epoxy.mjs`, [
        { wisp: targetWisp },
      ]);
      currentWisp = targetWisp;
      return;
    } catch (err) {
      console.warn(`[Frosted Proxy] Failed setting transport with wisp ${targetWisp}:`, err);
      lastError = err;
    }
  }

  if (lastError) throw lastError;
}

/** Boots both Ultraviolet & Scramjet, registers the Service Worker, and sets Wisp transport. */
export async function initProxy(wisp: string): Promise<AnyRecord> {
  await ensureScripts();

  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        const handler = () => {
          navigator.serviceWorker.removeEventListener("controllerchange", handler);
          resolve();
        };
        navigator.serviceWorker.addEventListener("controllerchange", handler);
        setTimeout(resolve, 800);
      });
    }
  }

  await ensureTransport(wisp);

  if (!controllerPromise) {
    controllerPromise = (async () => {
      try {
        const loader = (window as unknown as AnyRecord)["$scramjetLoadController"] as
          (() => { ScramjetController: new (config: AnyRecord) => AnyRecord }) | undefined;
        if (loader) {
          const { ScramjetController } = loader();
          const controller = new ScramjetController({
            prefix: SCRAMJET_PREFIX,
            files: {
              wasm: "/proxy/scramjet.wasm.wasm",
              all: "/proxy/scramjet.all.js",
              sync: "/proxy/scramjet.sync.js",
            },
          });
          await (controller["init"] as () => Promise<void>).call(controller);
          return controller;
        }
        return {};
      } catch (err) {
        console.warn("[Scramjet controller init warn]:", err);
        return {};
      }
    })();
  }

  const controller = await controllerPromise;
  return controller;
}

/** Turns whatever the user typed into a real URL. */
export function toUrl(input: string, searchEngineTemplate?: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const looksLikeHost =
    /^[^\s./]+(\.[^\s./]+)+(\/.*)?$/.test(value) || value.startsWith("localhost");
  if (looksLikeHost) return `https://${value}`;

  const template = searchEngineTemplate || "https://duckduckgo.com/?q=%s";
  if (template.includes("%s")) {
    return template.replace("%s", encodeURIComponent(value));
  }
  return template + encodeURIComponent(value);
}
