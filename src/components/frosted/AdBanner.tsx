import { useEffect, useRef, useState } from "react";
import { getAdSettings, applyAdScripts, type AdSettings } from "@/lib/adManager";
import { Megaphone, ShieldCheck } from "lucide-react";

interface Props {
  className?: string;
  adSlot?: string;
  format?: "auto" | "horizontal" | "rectangle";
}

export function AdBanner({ className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<AdSettings>(() => getAdSettings());

  useEffect(() => {
    applyAdScripts();
    const handleUpdate = () => {
      const updated = getAdSettings();
      setSettings(updated);
      applyAdScripts(updated);
    };
    window.addEventListener("frosted_ad_settings_updated", handleUpdate);
    return () => window.removeEventListener("frosted_ad_settings_updated", handleUpdate);
  }, []);

  const hasCustomCode = !!settings.customScriptCode.trim();

  useEffect(() => {
    if (!settings.enabled || !hasCustomCode || !containerRef.current) return;

    try {
      containerRef.current.innerHTML = "";
      const adDiv = document.createElement("div");
      adDiv.className = "universal-ad-unit flex items-center justify-center w-full";
      adDiv.innerHTML = settings.customScriptCode;

      const scripts = adDiv.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value),
        );
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });

      containerRef.current.appendChild(adDiv);
    } catch {
      /* silent */
    }
  }, [settings.enabled, settings.customScriptCode, hasCustomCode]);

  if (!settings.enabled || !hasCustomCode) return null;

  return (
    <div
      className={`my-6 flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-neutral-800/80 bg-[#0a0a0a]/90 p-3 text-center backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.5)] transition-all ${className}`}
    >
      <div className="mb-2 flex items-center justify-between w-full max-w-4xl px-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          <Megaphone className="h-3 w-3 text-neutral-400" />
          <span>Sponsored Advertisement</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-600 font-mono">
          <ShieldCheck className="h-3 w-3 text-emerald-500/80" />
          <span>Ad Network</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="min-h-[90px] w-full max-w-4xl flex items-center justify-center overflow-hidden"
      />
    </div>
  );
}
