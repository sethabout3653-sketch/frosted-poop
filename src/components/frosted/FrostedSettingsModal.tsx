import { useState, useEffect } from "react";
import { Eye, X, Check, Megaphone, Save } from "lucide-react";
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

export function FrostedSettingsModal({ isOpen, onClose, currentCloak, onSelectCloak }: Props) {
  const [adSettings, setAdSettings] = useState<AdSettings>(() => getAdSettings());
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAdSettings(getAdSettings());
      setSavedNotice(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAds = () => {
    saveAdSettings(adSettings);
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
              <p className="text-xs text-neutral-400">Stealth tab cloaking &amp; Ad Networks</p>
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

          <hr className="border-neutral-800/80" />

          {/* Section 2: Ad Network Setup */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-amber-400" />
                <span>Ad Network Setup</span>
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={adSettings.enabled}
                  onChange={(e) => setAdSettings({ ...adSettings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <p className="text-xs text-neutral-400 mb-3">
              Paste your ad network script tag or HTML embed snippet (HilltopAds, Monetag, Adsterra,
              Ezoic, etc.).
            </p>

            {adSettings.enabled && (
              <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                    Ad Script / Tag Snippet
                  </label>
                  <textarea
                    rows={4}
                    placeholder={`<script src="https://example.com/tag.js" data-zone="12345"></script>`}
                    value={adSettings.customScriptCode}
                    onChange={(e) =>
                      setAdSettings({ ...adSettings, customScriptCode: e.target.value })
                    }
                    className="w-full font-mono rounded-xl border border-neutral-800 bg-black p-3 text-xs text-white placeholder-neutral-600 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={handleSaveAds}
                    className="smooth-btn flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Ad Settings</span>
                  </button>
                  {savedNotice && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Saved!
                    </span>
                  )}
                </div>
              </div>
            )}
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
