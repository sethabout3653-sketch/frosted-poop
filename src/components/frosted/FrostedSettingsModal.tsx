import { Shield, Eye, Key, X, Check } from "lucide-react";
import { CLOAK_PRESETS, type CloakPreset } from "@/lib/frostedStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentCloak: CloakPreset;
  onSelectCloak: (preset: CloakPreset) => void;
}

export function FrostedSettingsModal({ isOpen, onClose, currentCloak, onSelectCloak }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Frosted Settings & Stealth</h2>
              <p className="text-xs text-slate-400">Manage tab cloaking and panic controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Tab Cloaking Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-medium text-white">Tab Disguise / Cloak Preset</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Changes the browser tab title and favicon to look like an educational or productivity
              website.
            </p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {(Object.keys(CLOAK_PRESETS) as CloakPreset[]).map((key) => {
                const preset = CLOAK_PRESETS[key];
                const isSelected = currentCloak === key;

                return (
                  <button
                    key={key}
                    onClick={() => onSelectCloak(key)}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-all ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-500/10 text-white shadow-lg shadow-cyan-500/10"
                        : "border-white/10 bg-slate-800/40 text-slate-300 hover:border-white/20 hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={preset.icon}
                        alt={preset.title}
                        className="h-5 w-5 shrink-0 rounded object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <span className="truncate text-xs font-medium">{preset.title}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-cyan-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panic Hotkey Info */}
          <div className="rounded-xl border border-white/10 bg-slate-800/40 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Key className="h-4 w-4 text-amber-400" />
              <h4 className="text-xs font-semibold text-white">Instant Panic Key: ESC</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pressing the{" "}
              <kbd className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-white">
                Esc
              </kbd>{" "}
              key at any time while playing a game immediately activates your Stealth Disguise
              screen or redirects to IXL.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-white/10 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
