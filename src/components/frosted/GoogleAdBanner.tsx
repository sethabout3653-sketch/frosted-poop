import React, { useEffect, useRef, useState } from "react";
import { Info, ExternalLink } from "lucide-react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export interface GoogleAdProps {
  adClient?: string;
  adSlot?: string;
  adFormat?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  formatType?: "leaderboard" | "rectangle" | "in-grid" | "banner";
  className?: string;
  label?: string;
}

export const GoogleAdBanner: React.FC<GoogleAdProps> = ({
  adClient,
  adSlot,
  adFormat = "auto",
  formatType = "leaderboard",
  className = "",
  label = "ADVERTISEMENT",
}) => {
  const adRef = useRef<HTMLModElement>(null);
  const [adLoaded, setAdLoaded] = useState<boolean>(false);
  const [adError, setAdError] = useState<boolean>(false);
  const pushedRef = useRef<boolean>(false);

  const isPreviewMode = !adLoaded || adError;

  // Client ID fallback logic: prop -> localStorage -> env -> default ca-pub string
  const activeClient =
    adClient ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("frosted_adsense_client") : null) ||
    import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT ||
    "ca-pub-4411579510743309"; // User AdSense Client ID

  const activeSlot =
    adSlot ||
    (formatType === "rectangle"
      ? "6300978111"
      : formatType === "in-grid"
        ? "7458129033"
        : "1038592746");

  useEffect(() => {
    // Inject Google AdSense Script once if client is valid
    if (activeClient && typeof document !== "undefined") {
      const scriptId = "google-adsense-script";
      let existingScript = document.getElementById(scriptId) as HTMLScriptElement;

      if (!existingScript) {
        existingScript = document.createElement("script");
        existingScript.id = scriptId;
        existingScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${activeClient}`;
        existingScript.async = true;
        existingScript.crossOrigin = "anonymous";
        document.head.appendChild(existingScript);
      }
    }

    // Attempt to push ad call to Google Ads queue if not already initialized
    if (typeof window !== "undefined" && !pushedRef.current) {
      const insNode = adRef.current;
      const isAlreadyFilled =
        insNode && (insNode.getAttribute("data-adsbygoogle-status") || insNode.children.length > 0);

      if (!isAlreadyFilled) {
        try {
          pushedRef.current = true;
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
          setAdLoaded(true);
        } catch (err) {
          console.warn("[Frosted Google Ads] AdSense push notice:", err);
          setAdError(true);
        }
      }
    }
  }, [activeClient, activeSlot]);

  // Height and dimensions depending on format type
  const containerDimensions =
    formatType === "rectangle"
      ? "min-h-[250px] w-full max-w-[300px]"
      : formatType === "in-grid"
        ? "h-full min-h-[220px] w-full"
        : formatType === "banner"
          ? "min-h-[90px] w-full"
          : "min-h-[90px] w-full max-w-5xl";

  return (
    <div className={`my-4 flex flex-col items-center justify-center ${className}`}>
      {/* Top Ad Label */}
      <div className="mb-1.5 flex items-center justify-between w-full max-w-5xl px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        <span className="flex items-center gap-1">
          <span className="bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded text-[9px]">
            Google Ad
          </span>
          <span>{label}</span>
        </span>
        <a
          href="https://adsense.google.com"
          target="_blank"
          rel="noreferrer"
          className="hover:text-neutral-300 flex items-center gap-0.5 transition-colors"
          title="Google Ads Policy & Options"
        >
          <span>AdChoices</span>
          <Info className="h-3 w-3" />
        </a>
      </div>

      {/* Main Ad Slot Container */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#080808] p-2 transition-all hover:border-neutral-700/80 ${containerDimensions} flex items-center justify-center`}
      >
        {/* Real Google AdSense Tag */}
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            textAlign: "center",
          }}
          data-ad-client={activeClient}
          data-ad-slot={activeSlot}
          data-ad-format={adFormat}
          data-full-width-responsive="true"
        />

        {/* Development & Sandbox Fallback Display (Shown when running in non-ad-serving environment) */}
        {isPreviewMode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-900/90 via-black to-[#0a0a0a] p-4 text-center">
            <div className="flex items-center gap-2 mb-1">
              {/* Google AdSense Quad-Color Icon SVG */}
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285F4" />
                <path
                  d="M2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="#34A853"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-xs font-bold text-neutral-200 tracking-wide">
                Google AdSense Preview Slot
              </span>
            </div>

            <p className="max-w-md text-[11px] text-neutral-400 leading-tight">
              {formatType === "leaderboard"
                ? "Responsive Leaderboard Banner (728x90 / Auto)"
                : formatType === "rectangle"
                  ? "Medium Rectangle Ad (300x250)"
                  : "Sponsored Arcade Ad Slot"}
            </p>

            <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-300 bg-black/60 px-2.5 py-1 rounded-full border border-neutral-800">
              <span className="font-mono text-emerald-400">ID: {activeClient}</span>
              <span>•</span>
              <span className="font-mono text-cyan-400">Slot: {activeSlot}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
