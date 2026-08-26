import { Eye, X, Check } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0a0a] shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-black text-white">
              <Eye className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Tab Disguise & Cloaking</h2>
              <p className="text-xs text-neutral-400">Mask browser tab title and favicon</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-xs text-neutral-400">
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
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-neutral-600 bg-neutral-900 text-white shadow-[0_0_12px_rgba(255,255,255,0.06)]"
                      : "border-neutral-800 bg-black text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={preset.icon}
                      alt={preset.title}
                      referrerPolicy="no-referrer"
                      className="h-5 w-5 shrink-0 rounded object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <span className="truncate text-xs font-medium">{preset.title}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-white shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-neutral-800 px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            className="rounded-xl border border-neutral-700 bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
