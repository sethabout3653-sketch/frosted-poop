import {
  Eye,
  X,
  Check,
  Wifi,
  Trash2,
  HardDrive,
  Megaphone,
  Save,
  ShieldCheck,
  Sparkles,
  Code2,
} from "lucide-react";
import { useState } from "react";
import { CLOAK_PRESETS, type CloakPreset } from "@/lib/frostedStore";
import { getAdSettings, saveAdSettings, type AdSettings } from "@/lib/adManager";

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
  const [adConfig, setAdConfig] = useState<AdSettings>(() => getAdSettings());
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveAds = () => {
    saveAdSettings(adConfig);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-[#0d0d0d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Arcade Settings</h2>
              <p className="text-xs text-neutral-400">Stealth cloaking, offline storage & ads</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="smooth-btn rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
          {/* Section 1: Tab Cloaking Presets */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2 flex items-center gap-2">
              <Eye className="h-4 w-4 text-neutral-400" />
              <span>Stealth Tab Cloak</span>
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              Change browser tab title and favicon to look like standard school or work apps.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(
                Object.entries(CLOAK_PRESETS) as [
                  CloakPreset,
                  (typeof CLOAK_PRESETS)[CloakPreset],
                ][]
              ).map(([presetKey, config]) => {
                const isSelected = currentCloak === presetKey;
                const displayName =
                  presetKey === "none" ? "Default (Frosted)" : config.title.split(/[-|]/)[0].trim();

                return (
                  <button
                    key={presetKey}
                    onClick={() => onSelectCloak(presetKey)}
                    className={`smooth-btn flex items-center justify-between rounded-xl border p-3 text-left cursor-pointer transition-all ${
                      isSelected
                        ? "border-neutral-400 bg-neutral-800 text-white shadow-sm"
                        : "border-neutral-800/80 bg-black/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900"
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={config.icon}
                        alt={displayName}
                        className="h-5 w-5 shrink-0 rounded object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div className="truncate">
                        <div className="text-xs font-medium truncate text-white">{displayName}</div>
                        <div className="text-[10px] text-neutral-400 truncate">{config.title}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-[1px] bg-neutral-800" />

          {/* Section 2: Offline Storage Management */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2 flex items-center gap-2">
              <Wifi className="h-4 w-4 text-emerald-400" />
              <span>Offline Game Storage</span>
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              Play cached games without an active internet connection on Chromebooks or laptops.
            </p>

            <div className="rounded-xl border border-neutral-800 bg-black p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-neutral-300">
                  <HardDrive className="h-4 w-4 text-neutral-400" />
                  <span>Cached Games in Storage:</span>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                  {cachedCount} {cachedCount === 1 ? "game" : "games"} cached
                </span>
              </div>

              {cachedCount > 0 && onClearCache && (
                <div className="pt-2 border-t border-neutral-800 flex justify-end">
                  <button
                    onClick={onClearCache}
                    className="smooth-btn flex items-center gap-1.5 rounded-xl border border-rose-900/50 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/60 hover:text-white cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Offline Game Cache</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="h-[1px] bg-neutral-800" />

          {/* Section 3: Universal Reliable Ad Monetization (Google AdSense & Custom) */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-blue-400" />
              <span>Ad Monetization (Google AdSense)</span>
              <span className="rounded bg-blue-950/80 px-2 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-800/50">
                100% Reliable
              </span>
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              Monetize your arcade with <strong>Google AdSense</strong> (the most reliable ad
              network globally with 100% fill rate and zero broken popunders) or paste any custom
              script tag.
            </p>

            <div className="rounded-xl border border-neutral-800 bg-black p-4 space-y-4">
              {/* Enable / Disable Switch */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                  <div>
                    <span className="text-xs font-medium text-white block">Enable Ad Units</span>
                    <span className="text-[11px] text-neutral-500 block">
                      Toggle banner display and responsive arcade monetization
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdConfig({ ...adConfig, enabled: !adConfig.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    adConfig.enabled ? "bg-blue-600" : "bg-neutral-800"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      adConfig.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {adConfig.enabled && (
                <>
                  {/* Provider Selector */}
                  <div className="pt-2 border-t border-neutral-800">
                    <label className="block text-xs font-medium text-neutral-300 mb-2">
                      Ad Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdConfig({ ...adConfig, provider: "adsense" })}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                          adConfig.provider === "adsense"
                            ? "border-blue-500/80 bg-blue-950/40 text-blue-300 shadow-sm"
                            : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Google AdSense (Easy)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdConfig({ ...adConfig, provider: "custom" })}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                          adConfig.provider === "custom"
                            ? "border-purple-500/80 bg-purple-950/40 text-purple-300 shadow-sm"
                            : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        <span>Custom Tag / Script</span>
                      </button>
                    </div>
                  </div>

                  {adConfig.provider === "adsense" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          AdSense Publisher ID
                        </label>
                        <input
                          type="text"
                          value={adConfig.adsensePublisherId}
                          onChange={(e) =>
                            setAdConfig({ ...adConfig, adsensePublisherId: e.target.value })
                          }
                          placeholder="ca-pub-1234567890123456"
                          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-neutral-500 mt-1 block">
                          Found in your Google AdSense dashboard under{" "}
                          <em>Account &gt; Settings</em>.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          Responsive Ad Unit Slot ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={adConfig.adsenseSlotId}
                          onChange={(e) =>
                            setAdConfig({ ...adConfig, adsenseSlotId: e.target.value })
                          }
                          placeholder="e.g. 9876543210"
                          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:border-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Auto Ads Checkbox */}
                      <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-800/80 bg-neutral-900/50">
                        <div>
                          <span className="text-xs font-medium text-white block">
                            Enable Google Auto Ads
                          </span>
                          <span className="text-[10px] text-neutral-400 block">
                            Google automatically optimizes banners and interstitials between game
                            plays.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={adConfig.autoAdsEnabled}
                          onChange={(e) =>
                            setAdConfig({ ...adConfig, autoAdsEnabled: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Custom Ad Tag / Script Code
                      </label>
                      <textarea
                        rows={3}
                        value={adConfig.customScriptCode}
                        onChange={(e) =>
                          setAdConfig({ ...adConfig, customScriptCode: e.target.value })
                        }
                        placeholder="<script async src='https://...'></script>"
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:border-purple-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        Supports Monetag, Adsterra, GameDistribution, or custom HTML/JS snippets.
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Google Ad Network Clean Integration</span>
                </div>

                <button
                  onClick={handleSaveAds}
                  className="smooth-btn flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 cursor-pointer shadow-lg shadow-blue-900/30"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Settings</span>
                </button>
              </div>

              {savedNotice && (
                <div className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Ad configuration updated and applied instantly!</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
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
