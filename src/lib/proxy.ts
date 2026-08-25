/**
 * Proxy Engine & Transport Layer.
 * Supports Scramjet v2 (default) and Ultraviolet (UV), backed by Epoxy WebAssembly transport and Wisp relays.
 */

export type ProxyEngine = "scramjet" | "ultraviolet";

export const UV_PREFIX = "/~/uv/";
export const SCRAMJET_PREFIX = "/~/sj/";

/** Alternates to fall back on when one relay refuses a site (TLS handshake eof). */
export const WISP_SERVERS = [
  { name: "Mercury Workshop (Global)", url: "wss://wisp.mercurywork.shop/" },
  { name: "Ruby Network (Unrestricted)", url: "wss://ruby.rubynetwork.co/wisp/" },
  { name: "Terbium Relay (Fast)", url: "wss://wisp.terbiumon.top/wisp/" },
];

export function getAvailableWispServers(): { name: string; url: string }[] {
  const localWisp =
    typeof location !== "undefined" && location.host
      ? `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/wisp/`
      : "";

  const list: { name: string; url: string }[] = [];
  if (localWisp) {
    list.push({ name: "Built-in Server Relay", url: localWisp });
  }
  list.push(...WISP_SERVERS);
  return list;
}

export function getOptimalWisp(url?: string): string {
  const servers = getAvailableWispServers();
  if (servers.length === 0) return "wss://wisp.mercurywork.shop/";
  return servers[0].url;
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
 * Chooses the proxy engine
 */
export function chooseProxyEngine(_inputUrl?: string): ProxyEngine {
  return "scramjet";
}

/**
 * Encodes a URL for the specified proxy engine
 */
export function getProxyUrl(url: string, engine: ProxyEngine = "scramjet"): string {
  if (!url) return "";
  if (engine === "scramjet") {
    // If scramjet controller frame is available, frame.go(url) will navigate directly.
    // For direct src generation:
    return `${SCRAMJET_PREFIX}${encodeURIComponent(url)}`;
  }
  return `${UV_PREFIX}${encodeXor(url)}`;
}

export function extractYouTubeVideoId(urlStr: string): string | null {
  if (!urlStr) return null;
  try {
    const isFull = urlStr.startsWith("http://") || urlStr.startsWith("https://");
    const u = new URL(urlStr, isFull ? undefined : "https://www.youtube.com");
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      if (u.searchParams.has("v")) return u.searchParams.get("v");
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "v" || parts[0] === "shorts")
        return parts[1] || null;
      if (u.hostname.includes("youtu.be") && parts[0]) return parts[0];
    }
  } catch {
    /* silent */
  }
  return null;
}

export function getBypassYouTubeUrl(urlStr: string): string {
  const videoId = extractYouTubeVideoId(urlStr);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
  }
  if (urlStr.includes("youtube.com") && !urlStr.includes("m.youtube.com")) {
    return urlStr.replace("www.youtube.com", "m.youtube.com");
  }
  return urlStr;
}

export function stripScramjetInternalParams(urlStr: string): string {
  if (!urlStr) return "";
  try {
    const isFull = urlStr.startsWith("http://") || urlStr.startsWith("https://");
    const dummyBase = "https://placeholder.internal";
    const u = new URL(urlStr, isFull ? undefined : dummyBase);
    const internalKeys = ["$io", "$rfs", "$csr", "$fs", "$cred", "$dest", "$fakedataurl"];
    let modified = false;
    for (const k of internalKeys) {
      if (u.searchParams.has(k)) {
        u.searchParams.delete(k);
        modified = true;
      }
    }
    if (!modified) return urlStr;
    if (isFull) {
      return u.toString();
    } else {
      return u.pathname + u.search + u.hash;
    }
  } catch {
    return urlStr;
  }
}

/**
 * Strips proxy prefixes to return the clean user-facing URL
 */
export function cleanProxyUrl(raw: string): string {
  if (!raw) return "";
  let result = raw;
  if (raw.includes(UV_PREFIX)) {
    const part = raw.split(UV_PREFIX)[1];
    result = decodeXor(part);
  } else if (raw.includes(SCRAMJET_PREFIX) || raw.includes("/~/scramjet/")) {
    const sjMatch = raw.match(/\/~\/(?:sj|scramjet)\/(?:[^/]+\/[^/]+\/)?(.*)$/);
    if (sjMatch && sjMatch[1]) {
      try {
        result = decodeURIComponent(sjMatch[1]);
      } catch {
        result = sjMatch[1];
      }
    }
  }
  return stripScramjetInternalParams(result);
}

type AnyRecord = Record<string, unknown>;

export interface ScramjetFrame {
  id: string;
  prefix: string;
  element: HTMLIFrameElement;
  go: (url: string) => void;
  back: () => void;
  forward: () => void;
  reload: () => void;
}

export interface ScramjetController {
  id: string;
  prefix: string;
  createFrame: (element?: HTMLIFrameElement, options?: unknown) => ScramjetFrame;
  setTransport: (transport: unknown) => void;
  wait: () => Promise<void>;
}

declare global {
  interface Window {
    $scramjet?: AnyRecord;
    $scramjetController?: {
      Controller: new (options: {
        serviceworker: ServiceWorker;
        transport: unknown;
        config?: Record<string, unknown>;
        scramjetConfig?: Record<string, unknown>;
      }) => ScramjetController;
    };
  }
}

const scriptPromises: Record<string, Promise<void>> = {};
let currentWisp = "";
let connection: AnyRecord | null = null;
let scramjetControllerInstance: ScramjetController | null = null;
let currentEpoxyTransport: AnyRecord | null = null;

const dynamicImport = new Function("p", "return import(p)") as (p: string) => Promise<AnyRecord>;

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
  await loadScript("/scramjet/scramjet.js");
  await loadScript("/controller/controller.api.js");
  await loadScript("/uv/uv.bundle.js");
  await loadScript("/uv/uv.config.js");
}

async function ensureTransport(wisp: string) {
  if (currentWisp === wisp && currentEpoxyTransport && connection) return;

  const epoxyMod = await dynamicImport(`${location.origin}/proxy/epoxy.mjs`);
  const EpoxyTransport = epoxyMod["default"] as new (opts: { wisp: string }) => AnyRecord;

  const bareMuxMod = await dynamicImport(`${location.origin}/proxy/baremux.mjs`);
  const BareMuxConnection = bareMuxMod["BareMuxConnection"] as new (worker: string) => AnyRecord;
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
      // 1. BareMux worker transport
      await setTransport.call(connection, `${location.origin}/proxy/epoxy.mjs`, [
        { wisp: targetWisp },
      ]);

      // 2. Direct Epoxy transport instance for Scramjet controller
      const transportInstance = new EpoxyTransport({ wisp: targetWisp });
      const initFn = transportInstance["init"] as () => Promise<void>;
      if (typeof initFn === "function") {
        await initFn.call(transportInstance);
      }

      currentEpoxyTransport = transportInstance;
      currentWisp = targetWisp;

      if (scramjetControllerInstance) {
        scramjetControllerInstance.setTransport(transportInstance);
      }
      return;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) throw lastError;
}

/** Boots Scramjet & Ultraviolet, registers the Service Worker, and sets Wisp transport. */
export async function initProxy(wisp: string): Promise<{ scramjet?: ScramjetController }> {
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

  if (window.$scramjetController && navigator.serviceWorker.controller && currentEpoxyTransport) {
    if (!scramjetControllerInstance) {
      scramjetControllerInstance = new window.$scramjetController.Controller({
        serviceworker: navigator.serviceWorker.controller,
        transport: currentEpoxyTransport,
      });
      await scramjetControllerInstance.wait();
    }
  }

  return { scramjet: scramjetControllerInstance || undefined };
}

export function getScramjetController(): ScramjetController | null {
  return scramjetControllerInstance;
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
