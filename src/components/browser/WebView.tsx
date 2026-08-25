import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { getFaviconUrl } from "@/lib/favicons";
import {
  cleanProxyUrl,
  extractYouTubeVideoId,
  getAvailableWispServers,
  getBypassYouTubeUrl,
  getOptimalWisp,
  getProxyUrl,
  initProxy,
  type ScramjetFrame,
} from "@/lib/proxy";
import { useSettings } from "@/lib/settings";

type Props = {
  url: string;
  active: boolean;
  onMeta: (meta: { title?: string; url?: string; icon?: string }) => void;
  registerNav: (nav: { back: () => void; forward: () => void; reload: () => void } | null) => void;
};

export function WebView({ url, active, onMeta, registerNav }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const scramjetFrameRef = useRef<ScramjetFrame | null>(null);
  const { settings } = useSettings();

  const lastUrl = useRef<string>("");
  const lastReportedTitle = useRef<string>("");
  const lastReportedUrl = useRef<string>("");
  const metaRef = useRef(onMeta);
  metaRef.current = onMeta;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [currentWisp, setCurrentWisp] = useState(() => getOptimalWisp(url));
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    setError(null);
    setLoading(true);
    setRetrying(false);

    (async () => {
      try {
        const proxyRes = await initProxy(currentWisp);
        if (cancelled || !hostRef.current) return;

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

        hostRef.current.replaceChildren(iframe);

        let sjFrame: ScramjetFrame | null = null;
        if (settings.defaultEngine === "scramjet" && proxyRes.scramjet) {
          try {
            sjFrame = proxyRes.scramjet.createFrame(iframe);
            scramjetFrameRef.current = sjFrame;
            sjFrame.go(url);
          } catch (err) {
            iframe.src = getProxyUrl(url, "scramjet");
          }
        } else {
          scramjetFrameRef.current = null;
          iframe.src = getProxyUrl(url, settings.defaultEngine);
        }

        registerNav({
          back: () => {
            try {
              if (scramjetFrameRef.current) scramjetFrameRef.current.back();
              else iframe.contentWindow?.history.back();
            } catch {
              /* cross origin */
            }
          },
          forward: () => {
            try {
              if (scramjetFrameRef.current) scramjetFrameRef.current.forward();
              else iframe.contentWindow?.history.forward();
            } catch {
              /* cross origin */
            }
          },
          reload: () => {
            try {
              if (scramjetFrameRef.current) {
                scramjetFrameRef.current.reload();
              } else {
                iframe.src = getProxyUrl(lastUrl.current || url, settings.defaultEngine);
              }
            } catch {
              /* cross origin */
            }
          },
        });

        const safetyTimer = setTimeout(() => {
          setLoading(false);
        }, 6000);

        const clearLoadingSafely = () => {
          setLoading(false);
          clearTimeout(safetyTimer);
        };

        const syncMeta = () => {
          try {
            const doc = iframe.contentDocument;
            if (doc) {
              if (
                doc.readyState === "interactive" ||
                doc.readyState === "complete" ||
                (doc.body && doc.body.children.length > 0)
              ) {
                clearLoadingSafely();
              }
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
              const videoId = extractYouTubeVideoId(clean);
              if (videoId && !clean.includes("/embed/")) {
                const autoEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
                lastReportedUrl.current = clean;
                lastUrl.current = clean;
                if (scramjetFrameRef.current) {
                  try {
                    scramjetFrameRef.current.go(autoEmbedUrl);
                  } catch {
                    if (iframeRef.current) {
                      iframeRef.current.src = getProxyUrl(autoEmbedUrl, settings.defaultEngine);
                    }
                  }
                } else if (iframeRef.current) {
                  iframeRef.current.src = getProxyUrl(autoEmbedUrl, settings.defaultEngine);
                }
                metaRef.current({ url: clean, icon: getFaviconUrl(clean) });
                return;
              }

              lastReportedUrl.current = clean;
              lastUrl.current = clean;
              metaRef.current({ url: clean, icon: getFaviconUrl(clean) });
            }
          } catch {
            /* cross origin */
          }
        };

        iframe.addEventListener("load", () => {
          clearLoadingSafely();
          syncMeta();
        });

        poll = setInterval(syncMeta, 1200);

        metaRef.current({ url, icon: getFaviconUrl(url) });
      } catch (err) {
        if (!cancelled) {
          const rawMsg = err instanceof Error ? err.message : String(err || "");
          if (
            rawMsg.includes("closure invoked") ||
            rawMsg.includes("wasm-bindgen") ||
            rawMsg.includes("CAUGHT ERROR")
          ) {
            console.warn("[Frosted Proxy] Suppressed non-fatal WASM warning:", rawMsg);
          } else if (
            rawMsg.includes("WebSocket") ||
            rawMsg.includes("hyper_util") ||
            rawMsg.includes("Wisp")
          ) {
            setError(
              "Proxy relay connection failed. Click 'Switch Wisp Relay & Retry' below to use an alternative server.",
            );
            setLoading(false);
            metaRef.current({ title: "Connection Error" });
          } else {
            setError(rawMsg || "Browser initialization failed");
            setLoading(false);
            metaRef.current({ title: "Connection Error" });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      registerNav(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWisp, retryCount, settings.defaultEngine]);

  // Navigate when URL updates
  useEffect(() => {
    const cleanTarget = cleanProxyUrl(url);
    const cleanLast = cleanProxyUrl(lastUrl.current);
    if (!cleanTarget || cleanTarget === cleanLast) return;
    lastUrl.current = cleanTarget;
    setLoading(true);

    const autoBypassTarget = getBypassYouTubeUrl(cleanTarget);

    const newWisp = getOptimalWisp(autoBypassTarget);
    if (newWisp !== currentWisp) {
      setCurrentWisp(newWisp);
      return;
    }

    if (scramjetFrameRef.current && settings.defaultEngine === "scramjet") {
      try {
        scramjetFrameRef.current.go(autoBypassTarget);
      } catch {
        if (iframeRef.current) {
          iframeRef.current.src = getProxyUrl(autoBypassTarget, "scramjet");
        }
      }
    } else if (iframeRef.current) {
      iframeRef.current.src = getProxyUrl(autoBypassTarget, settings.defaultEngine);
    }

    const timer = setTimeout(() => setLoading(false), 6000);
    metaRef.current({ url: cleanTarget, icon: getFaviconUrl(cleanTarget) });

    return () => clearTimeout(timer);
  }, [url, currentWisp, settings.defaultEngine]);

  // Listen for switch relay messages from iframe error pages
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data && e.data.type === "SWITCH_WISP_RELAY") {
        setRetrying(true);
        setError(null);
        const available = getAvailableWispServers();
        const curIdx = available.findIndex((s) => s.url === currentWisp);
        const nextIdx = (curIdx + 1) % available.length;
        setCurrentWisp(available[nextIdx].url);
        setRetryCount((c) => c + 1);
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [currentWisp]);

  const handleRetryWithNextRelay = () => {
    setRetrying(true);
    setError(null);
    const available = getAvailableWispServers();
    const curIdx = available.findIndex((s) => s.url === currentWisp);
    const nextIdx = (curIdx + 1) % available.length;
    setCurrentWisp(available[nextIdx].url);
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
          <span>
            Connecting via {settings.defaultEngine === "scramjet" ? "Scramjet v2" : "Ultraviolet"}
            ...
          </span>
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
                onClick={handleRetryWithNextRelay}
                disabled={retrying}
                className="flex items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-50"
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
