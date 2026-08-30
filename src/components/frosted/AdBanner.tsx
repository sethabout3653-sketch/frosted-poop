import { useEffect, useRef, useState } from "react";
import { getAdSettings, type AdSettings } from "@/lib/adManager";
import { Sparkles, Megaphone, ShieldCheck } from "lucide-react";

interface Props {
  slotId?: string;
  format?: "auto" | "horizontal" | "rectangle";
  className?: string;
}

export function AdBanner({ slotId, format = "auto", className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<AdSettings>(() => getAdSettings());
  const [adLoaded, setAdLoaded] = useState<boolean>(false);

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getAdSettings());
    };
    window.addEventListener("frosted_ad_settings_updated", handleUpdate);
    return () => window.removeEventListener("frosted_ad_settings_updated", handleUpdate);
  }, []);

  const activePubId = settings.adsensePublisherId.trim();
  const cleanPubId = activePubId.startsWith("ca-pub-")
    ? activePubId
    : activePubId
      ? `ca-pub-${activePubId.replace(/^pub-/, "")}`
      : "";

  const activeSlot = slotId || settings.adsenseSlotId.trim();

  useEffect(() => {
    if (!settings.enabled || !cleanPubId || !containerRef.current) return;

    try {
      // Clear previous ad element inside container
      containerRef.current.innerHTML = "";

      const ins = document.createElement("ins");
      ins.className = "adsbygoogle";
      ins.style.display = "block";
      ins.setAttribute("data-ad-client", cleanPubId);
      if (activeSlot) {
        ins.setAttribute("data-ad-slot", activeSlot);
      }
      ins.setAttribute("data-ad-format", format);
      ins.setAttribute("data-full-width-responsive", "true");

      containerRef.current.appendChild(ins);

      const win = window as unknown as { adsbygoogle?: Array<Record<string, unknown>> };
      win.adsbygoogle = win.adsbygoogle || [];
      win.adsbygoogle.push({});
      setAdLoaded(true);
    } catch {
      setAdLoaded(false);
    }
  }, [settings.enabled, cleanPubId, activeSlot, format]);

  if (!settings.enabled) return null;

  return (
    <div
      className={`my-6 flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#0a0a0a]/90 p-3 text-center backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.5)] transition-all ${className}`}
    >
      <div className="mb-2 flex items-center justify-between w-full max-w-4xl px-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          <Megaphone className="h-3 w-3 text-neutral-400" />
          <span>Advertisement</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-600 font-mono">
          <ShieldCheck className="h-3 w-3 text-emerald-500/80" />
          <span>Brand Safe • 100% Uptime</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="min-h-[90px] w-full max-w-4xl flex items-center justify-center overflow-hidden"
      >
        {!cleanPubId && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 p-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-neutral-200">
                  Google AdSense Ready • Instant Setup
                </h4>
                <p className="text-[11px] text-neutral-500">
                  Open Arcade Settings (⚙️) to enter your Google AdSense Publisher ID (
                  <code className="font-mono text-neutral-400">ca-pub-XXXXXXXXXX</code>) or custom
                  ad tag.
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-lg bg-neutral-900 px-2.5 py-1 text-[11px] font-mono text-neutral-400 border border-neutral-800">
              Responsive Leaderboard
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
