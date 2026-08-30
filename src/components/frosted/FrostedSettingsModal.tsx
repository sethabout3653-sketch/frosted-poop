import { Eye, X, Check, Wifi, Trash2, HardDrive, Megaphone, Save } from "lucide-react";
import { useState } from "react";
import { CLOAK_PRESETS, type CloakPreset } from "@/lib/frostedStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentCloak: CloakPreset;
  onSelectCloak: (preset: CloakPreset) => void;
  cachedCount?: number;
  onClearCache?: () => void;
}

export function FrostedSettingsModal({
  isOpen,
  onClose,
  currentCloak,
  onSelectCloak,
  cachedCount = 0,
  onClearCache,
}: Props) {
  const [adsenseClient, setAdsenseClient] = useState<string>(() => {
    if (typeof localStorage !== "undefined") {
      return (
        localStorage.getItem("frosted_adsense_client") ||
        import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT ||
        "ca-pub-4411579510743309"
      );
    }
    return "ca-pub-4411579510743309";
  });
  const [savedClientNotice, setSavedClientNotice] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveAdsense = () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("frosted_adsense_client", adsenseClient.trim());
      window.dispatchEvent(new Event("frosted_adsense_updated"));
      setSavedClientNotice(true);
      setTimeout(() => setSavedClientNotice(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-in fade-in duration-150 font-sans">
      <div className="w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-[#0d0d0d] shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-black text-white">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Arcade Settings</h2>
              <p className="text-xs text-neutral-400">
                Tab Disguise & Service Worker Offline Storage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="smooth-btn rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {/* Section 1: Cloaking & Disguise */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
              Tab Disguise & Stealth Cloaking
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              Select a preset to disguise the browser tab as an educational or productivity website:
            </p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {(Object.keys(CLOAK_PRESETS) as CloakPreset[]).map((key) => {
                const preset = CLOAK_PRESETS[key];
                const isSelected = currentCloak === key;

                return (
                  <button
                    key={key}
                    onClick={() => onSelectCloak(key)}
                    className={`smooth-btn flex items-center justify-between rounded-xl border px-3.5 py-3 text-left cursor-pointer ${
                      isSelected
                        ? "border-neutral-500 bg-neutral-900 text-white shadow-[0_0_15px_rgba(255,255,255,0.08)]"
                        : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={preset.icon}
                        alt={preset.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-5 w-5 shrink-0 rounded object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <span className="truncate text-xs font-medium">{preset.title}</span>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-white shrink-0 animate-in zoom-in-50 duration-150" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-[1px] bg-neutral-800" />

          {/* Section 2: Service Worker & Offline Storage */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-emerald-400" />
              <span>Offline Game Storage & Service Worker</span>
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              Frosted uses a progressive Service Worker engine to cache core game assets locally so
              you can play without an active internet connection.
            </p>

            <div className="rounded-xl border border-neutral-800 bg-black p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                  Service Worker Engine Status:
                </span>
                <span className="font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  Active & Caching Enabled
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Cached Game Files & Sub-resources:</span>
                <span className="font-mono font-bold text-white bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                  {cachedCount} items
                </span>
              </div>

              {onClearCache && cachedCount > 0 && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={onClearCache}
                    className="smooth-btn flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:border-rose-500/60 hover:bg-rose-500/20 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Offline Game Cache</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="h-[1px] bg-neutral-800" />

          {/* Section 3: Google AdSense Integration */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-sky-400" />
              <span>Google AdSense Publisher Integration</span>
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              Configure your Google AdSense Publisher ID (
              <code className="font-mono text-neutral-300">ca-pub-XXXXXXXXXXXXXXXX</code>) to
              display real Google Ad units across the arcade layout.
            </p>

            <div className="rounded-xl border border-neutral-800 bg-black p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Google AdSense Client / Publisher ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adsenseClient}
                    onChange={(e) => setAdsenseClient(e.target.value)}
                    placeholder="ca-pub-4411579510743309"
                    className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveAdsense}
                    className="smooth-btn flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-400 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              {savedClientNotice && (
                <div className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Publisher ID saved successfully! Google Ads refreshed.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-neutral-800 px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            className="smooth-btn rounded-xl border border-neutral-700 bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-neutral-200 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
