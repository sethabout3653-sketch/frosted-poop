import { Eye, X, Check, Shield, Gamepad2, Image } from "lucide-react";
import { CLOAK_PRESETS, type CloakPreset, type CoverStyle } from "@/lib/frostedStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentCloak: CloakPreset;
  onSelectCloak: (preset: CloakPreset) => void;
  currentCoverStyle: CoverStyle;
  onSelectCoverStyle: (style: CoverStyle) => void;
  cachedCount?: number;
  onClearCache?: () => void;
}

export function FrostedSettingsModal({
  isOpen,
  onClose,
  currentCloak,
  onSelectCloak,
  currentCoverStyle,
  onSelectCoverStyle,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-[#0d0d0d] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Arcade Settings</h2>
              <p className="text-xs text-neutral-400">Tab cloaking &amp; visual customization</p>
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
          {/* Game Cover Art Style Option */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2 flex items-center gap-2">
              <Image className="h-4 w-4 text-neutral-400" />
              <span>Game Cover Art Style</span>
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              Choose the visual presentation style for the games catalog in your library.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => onSelectCoverStyle("fanart")}
                className={`smooth-btn flex items-center justify-between rounded-xl border p-4 text-left cursor-pointer transition-all ${
                  currentCoverStyle === "fanart"
                    ? "border-neutral-400 bg-neutral-800 text-white shadow-sm"
                    : "border-neutral-800/80 bg-black/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900"
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                    <Image className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">High-Res Fanart</div>
                    <div className="text-[10px] text-neutral-400">Steam, Wiki, and G-N Covers</div>
                  </div>
                </div>
                {currentCoverStyle === "fanart" && (
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 ml-2" />
                )}
              </button>

              <button
                onClick={() => onSelectCoverStyle("sdk")}
                className={`smooth-btn flex items-center justify-between rounded-xl border p-4 text-left cursor-pointer transition-all ${
                  currentCoverStyle === "sdk"
                    ? "border-neutral-400 bg-neutral-800 text-white shadow-sm"
                    : "border-neutral-800/80 bg-black/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900"
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400 shrink-0">
                    <Gamepad2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Classic Icons</div>
                    <div className="text-[10px] text-neutral-400">Classic icons and artwork</div>
                  </div>
                </div>
                {currentCoverStyle === "sdk" && (
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 ml-2" />
                )}
              </button>
            </div>
          </div>

          {/* Tab Cloaking Presets */}
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
