import { AlertCircle, ArrowLeftRight, Check, Globe, Loader2, RefreshCw, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { getFaviconUrl } from "@/lib/favicons";
import {
  chooseProxyEngine,
  cleanProxyUrl,
  getAvailableWispServers,
  getOptimalWisp,
  getProxyUrl,
  initProxy,
  type ProxyEngine,
} from "@/lib/proxy";

type Props = {
  url: string;
  active: boolean;
  onMeta: (meta: { title?: string; url?: string; icon?: string }) => void;
  registerNav: (nav: { back: () => void; forward: () => void; reload: () => void } | null) => void;
};

type AnyRecord = Record<string, unknown>;

export function WebView({ url, active, onMeta, registerNav }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<AnyRecord | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const lastUrl = useRef<string>("");
  const lastReportedTitle = useRef<string>("");
  const lastReportedUrl = useRef<string>("");
  const metaRef = useRef(onMeta);
  metaRef.current = onMeta;

  const [engine, setEngine] = useState<ProxyEngine>(() => chooseProxyEngine(url));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [currentWisp, setCurrentWisp] = useState(() => getOptimalWisp(url));
  const [retryCount, setRetryCount] = useState(0);
  const [showEngineMenu, setShowEngineMenu] = useState(false);

  // Update chosen engine if URL significantly changes
  useEffect(() => {
    if (url && url !== lastUrl.current) {
      setEngine(chooseProxyEngine(url));
    }
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    setError(null);
    setLoading(true);
    setRetrying(false);

    (async () => {
      try {
        const controller = await initProxy(currentWisp);
        if (cancelled || !hostRef.current) return;

        if (engine === "scramjet" && typeof controller?.["createFrame"] === "function") {
          // Scramjet execution via Controller Frame
          const createFrame = controller["createFrame"] as () => AnyRecord;
          const sjFrame = createFrame.call(controller);
          frameRef.current = sjFrame;

          const iframe = sjFrame["frame"] as HTMLIFrameElement;
          iframeRef.current = iframe;
          iframe.className = "h-full w-full border-0 bg-background";
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "0";
          iframe.style.display = "block";
          iframe.setAttribute(
            "allow",
            "fullscreen; autoplay; gamepad; clipboard-read; clipboard-write; encrypted-media; picture-in-picture; camera; microphone; geolocation; midi; accelerometer; gyroscope; xr-spatial-tracking",
          );
          iframe.setAttribute("allowfullscreen", "true");
          hostRef.current.replaceChildren(iframe);

          registerNav({
            back: () => (sjFrame["back"] as () => void).call(sjFrame),
            forward: () => (sjFrame["forward"] as () => void).call(sjFrame),
            reload: () => (sjFrame["reload"] as () => void).call(sjFrame),
          });

          const syncMeta = () => {
            try {
              const doc = iframe.contentDocument;
              if (doc) {
                const docTitle = doc.title?.trim();
                if (docTitle && docTitle !== lastReportedTitle.current) {
                  lastReportedTitle.current = docTitle;
                  metaRef.current({ title: docTitle });
                }
              }

              const frameUrl =
                (sjFrame["url"] as string) || iframe.contentDocument?.location?.href || "";
              const clean = cleanProxyUrl(frameUrl);
              if (
                clean &&
                clean !== lastReportedUrl.current &&
                !clean.startsWith("about:") &&
                !clean.startsWith("blob:")
              ) {
                lastReportedUrl.current = clean;
                metaRef.current({ url: clean, icon: getFaviconUrl(clean) });
              }
            } catch {
              /* cross-origin iframe security */
            }
          };

          iframe.addEventListener("load", () => {
            setLoading(false);
            syncMeta();
          });

          const addEvent = sjFrame["addEventListener"] as
            ((type: string, cb: (e: { url: string }) => void) => void) | undefined;

          if (typeof addEvent === "function") {
            addEvent.call(sjFrame, "urlchange", (event) => {
              if (!event.url) return;
              const clean = cleanProxyUrl(event.url);
              if (clean && clean !== lastReportedUrl.current) {
                lastReportedUrl.current = clean;
                metaRef.current({ url: clean, icon: getFaviconUrl(clean) });
              }
            });
          }

          poll = setInterval(syncMeta, 1500);

          if (url) {
            (sjFrame["go"] as (u: string) => void).call(sjFrame, url);
          }
        } else {
          // Ultraviolet execution via Service Worker
          const iframe = document.createElement("iframe");
          iframeRef.current = iframe;
          iframe.className = "h-full w-full border-0 bg-background";
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "0";
          iframe.style.display = "block";
          iframe.setAttribute(
            "allow",
            "fullscreen; autoplay; gamepad; clipboard-read; clipboard-write; encrypted-media; picture-in-picture; camera; microphone; geolocation; midi; accelerometer; gyroscope; xr-spatial-tracking",
          );
          iframe.setAttribute("allowfullscreen", "true");

          const proxySrc = getProxyUrl(url, "ultraviolet");
          iframe.src = proxySrc;

          hostRef.current.replaceChildren(iframe);

          registerNav({
            back: () => {
              try {
                iframe.contentWindow?.history.back();
              } catch {
                /* cross origin */
              }
            },
            forward: () => {
              try {
                iframe.contentWindow?.history.forward();
              } catch {
                /* cross origin */
              }
            },
            reload: () => {
              iframe.src = getProxyUrl(lastUrl.current || url, "ultraviolet");
            },
          });

          const syncUvMeta = () => {
            try {
              const doc = iframe.contentDocument;
              if (doc) {
                const docTitle = doc.title?.trim();
                if (docTitle && docTitle !== lastReportedTitle.current) {
                  lastReportedTitle.current = docTitle;
                  metaRef.current({ title: docTitle });
                }
              }

              const frameUrl = iframe.contentWindow?.location?.href || "";
              const clean = cleanProxyUrl(frameUrl);
              if (
                clean &&
                clean !== lastReportedUrl.current &&
                !clean.startsWith("about:") &&
                !clean.startsWith("blob:")
              ) {
                lastReportedUrl.current = clean;
                metaRef.current({ url: clean, icon: getFaviconUrl(clean) });
              }
            } catch {
              /* cross origin */
            }
          };

          iframe.addEventListener("load", () => {
            setLoading(false);
            syncUvMeta();
          });

          poll = setInterval(syncUvMeta, 1500);
        }

        metaRef.current({ url, icon: getFaviconUrl(url) });
      } catch (err) {
        console.error("[Frosted Proxy] Engine initialization error:", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Browser initialization failed");
          setLoading(false);
          metaRef.current({ title: "Connection Error" });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      registerNav(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWisp, retryCount, engine]);

  // Navigate when URL updates in the same engine session
  useEffect(() => {
    if (!url || url === lastUrl.current) return;
    lastUrl.current = url;

    const newWisp = getOptimalWisp(url);
    if (newWisp !== currentWisp) {
      setCurrentWisp(newWisp);
      return;
    }

    if (engine === "scramjet" && frameRef.current) {
      (frameRef.current["go"] as (u: string) => void).call(frameRef.current, url);
    } else if (iframeRef.current) {
      iframeRef.current.src = getProxyUrl(url, "ultraviolet");
    }

    metaRef.current({ url, icon: getFaviconUrl(url) });
  }, [url, currentWisp, engine]);

  const handleRetryWithNextRelay = () => {
    setRetrying(true);
    setError(null);
    const available = getAvailableWispServers();
    const curIdx = available.findIndex((s) => s.url === currentWisp);
    const nextIdx = (curIdx + 1) % available.length;
    setCurrentWisp(available[nextIdx].url);
    setRetryCount((c) => c + 1);
  };

  const handleToggleEngine = (newEngine: ProxyEngine) => {
    if (newEngine === engine) return;
    setEngine(newEngine);
    setShowEngineMenu(false);
    setRetryCount((c) => c + 1);
  };

  return (
    <div className="relative h-full w-full bg-black" data-active={active}>
      {/* Primary Webview Host Container */}
      <div ref={hostRef} className={`h-full w-full ${error ? "hidden" : "block"}`} />

      {/* Subtle Loading Glow Indicator */}
      {loading && !error && (
        <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/90 px-3 py-1.5 text-xs text-neutral-400 shadow-lg backdrop-blur-md">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
          <span>Connecting via Browser...</span>
        </div>
      )}

      {/* Error & Fallback Overlay Screen */}
      {error && (
        <div className="frosted-grid flex h-full w-full flex-col items-center justify-center p-6 text-center text-white bg-black">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-white shadow-lg">
              <AlertCircle className="h-6 w-6" />
            </div>

            <h2 className="mt-4 text-lg font-light tracking-tight text-white">
              Unable to Load Destination
            </h2>
            <p className="mt-2 text-xs text-neutral-400">
              Failed to connect to <span className="font-mono text-white font-medium">{url}</span>.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() =>
                  handleToggleEngine(engine === "ultraviolet" ? "scramjet" : "ultraviolet")
                }
                className="flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>
                  Switch to {engine === "ultraviolet" ? "Scramjet" : "Ultraviolet"} Engine
                </span>
              </button>

              <button
                onClick={handleRetryWithNextRelay}
                disabled={retrying}
                className="flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 py-2.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
                <span>{retrying ? "Reconnecting..." : "Switch Wisp Relay & Retry"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
