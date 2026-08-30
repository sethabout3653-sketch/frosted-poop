import React, { useEffect, useRef, useState } from "react";
import { Info, ExternalLink, Sparkles, ShieldCheck } from "lucide-react";

export interface GoogleAdProps {
  slotId?: string;
  formatType?: "leaderboard" | "rectangle" | "in-grid" | "banner";
  className?: string;
  label?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export const GoogleAdBanner: React.FC<GoogleAdProps> = ({
  slotId = "1234567890",
  formatType = "leaderboard",
  className = "",
  label = "GOOGLE ADSENSE SPONSOR",
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const [adLoaded, setAdLoaded] = useState<boolean>(false);
  const [adError, setAdError] = useState<boolean>(false);
  const [clientPublisherId, setClientPublisherId] = useState<string>(() => {
    if (typeof localStorage !== "undefined") {
      return (
        localStorage.getItem("frosted_adsense_client") ||
        import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT ||
        "ca-pub-4411579510743309"
      );
    }
    return "ca-pub-4411579510743309";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof localStorage !== "undefined") {
        const id =
          localStorage.getItem("frosted_adsense_client") ||
          import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT ||
          "ca-pub-4411579510743309";
        setClientPublisherId(id);
      }
    };

    window.addEventListener("frosted_adsense_updated", handleStorageChange);
    return () => window.removeEventListener("frosted_adsense_updated", handleStorageChange);
  }, []);

  useEffect(() => {
    // Attempt to initialize Google Adsbygoogle
    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdLoaded(true);
      }
    } catch (e) {
      console.warn("Google AdSense initialization notice:", e);
      setAdError(true);
    }
  }, [clientPublisherId, slotId]);

  // Dimensions depending on format type
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
      {/* Ad Header Label */}
      <div className="mb-1.5 flex items-center justify-between w-full max-w-5xl px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="bg-sky-500/10 border border-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
            <span>GOOGLE AD</span>
          </span>
          <span>{label}</span>
        </span>
        <span className="text-neutral-500 text-[9px] flex items-center gap-1">
          <Info className="h-3 w-3 text-sky-400" />
          <span>Ads by Google</span>
        </span>
      </div>

      {/* Main Google Ad Container */}
      <div
        ref={adRef}
        className={`relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#080808] p-3 transition-all hover:border-neutral-700 ${containerDimensions} flex items-center justify-center`}
      >
        {/* Real Google AdSense <ins> Tag */}
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "100%", minHeight: "90px" }}
          data-ad-client={clientPublisherId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />

        {/* Fallback Display if Google AdSense is waiting for approval or blocked by adblocker */}
        {(!adLoaded || adError) && (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-sky-950/20 via-black to-[#0d0d0d] rounded-xl border border-sky-900/30">
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold text-sm">
                Ad
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">Google Display & Search Ad Unit</h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase bg-sky-500/10 text-sky-400 border-sky-500/30">
                    AdChoices
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5 max-w-xl">
                  Targeted sponsored results powered by Google AdSense Publisher Client ID:{" "}
                  <code className="font-mono text-sky-300">{clientPublisherId}</code>
                </p>
              </div>
            </div>

            <a
              href="https://adsense.google.com"
              target="_blank"
              rel="noreferrer"
              className="smooth-btn shrink-0 flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-400 transition-all shadow-[0_0_15px_rgba(14,165,233,0.25)]"
            >
              <span>Manage Ads</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
