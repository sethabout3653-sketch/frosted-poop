import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Monitor, Sliders, RotateCcw, Save } from "lucide-react";
import {
  useAppSettings,
  CLOAK_PRESETS,
  DEFAULT_SETTINGS,
  type TabCloakPreset,
} from "@/lib/settingsStore";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { settings, updateSettings } = useAppSettings();
  const [localSettings, setLocalSettings] = useState(settings);

  // Synchronize local settings when store settings change
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  // Handle outside click / Esc key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      setLocalSettings(DEFAULT_SETTINGS);
    }
  };

  const handlePresetSelect = (preset: TabCloakPreset) => {
    setLocalSettings((prev) => ({
      ...prev,
      tabCloak: preset,
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-2xl rounded-2xl border border-neutral-800 bg-[#0c0c0c] p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-neutral-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
              <div className="flex items-center gap-2.5">
                <Sliders className="h-5 w-5 text-neutral-400" />
                <h2 className="text-xl font-normal tracking-tight text-white font-sans">
                  Frosted Settings
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-900 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 custom-scrollbar">
              {/* Section: Tab Cloaking */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-neutral-300">
                  <Monitor className="h-4 w-4 text-neutral-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
                    Tab Cloak (Stealth Mode)
                  </h3>
                </div>
                <p className="text-xs text-neutral-500">
                  Disguise your browser tab instantly to bypass teacher inspections. Choosing a
                  preset changes your tab title and icon to match safe educational sites.
                </p>

                {/* Preset Picker */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePresetSelect("none")}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      localSettings.tabCloak === "none"
                        ? "border-white bg-[#151515] text-white font-bold"
                        : "border-neutral-900 bg-[#070707] text-neutral-400 hover:border-neutral-800"
                    }`}
                  >
                    <span className="text-lg">🚫</span>
                    <span>Disabled</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect("docs")}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      localSettings.tabCloak === "docs"
                        ? "border-blue-500 bg-blue-950/20 text-white font-bold"
                        : "border-neutral-900 bg-[#070707] text-neutral-400 hover:border-neutral-800"
                    }`}
                  >
                    <img
                      src={CLOAK_PRESETS.docs.favicon}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                    <span>Google Docs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect("classroom")}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      localSettings.tabCloak === "classroom"
                        ? "border-emerald-500 bg-emerald-950/20 text-white font-bold"
                        : "border-neutral-900 bg-[#070707] text-neutral-400 hover:border-neutral-800"
                    }`}
                  >
                    <img
                      src={CLOAK_PRESETS.classroom.favicon}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                    <span>Classroom</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect("drive")}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      localSettings.tabCloak === "drive"
                        ? "border-amber-500 bg-amber-950/20 text-white font-bold"
                        : "border-neutral-900 bg-[#070707] text-neutral-400 hover:border-neutral-800"
                    }`}
                  >
                    <img
                      src={CLOAK_PRESETS.drive.favicon}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                    <span>Google Drive</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect("canvas")}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      localSettings.tabCloak === "canvas"
                        ? "border-red-500 bg-red-950/20 text-white font-bold"
                        : "border-neutral-900 bg-[#070707] text-neutral-400 hover:border-neutral-800"
                    }`}
                  >
                    <img
                      src={CLOAK_PRESETS.canvas.favicon}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                    <span>Canvas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect("edpuzzle")}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      localSettings.tabCloak === "edpuzzle"
                        ? "border-cyan-500 bg-cyan-950/20 text-white font-bold"
                        : "border-neutral-900 bg-[#070707] text-neutral-400 hover:border-neutral-800"
                    }`}
                  >
                    <img
                      src={CLOAK_PRESETS.edpuzzle.favicon}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                    <span>Edpuzzle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetSelect("custom")}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs col-span-2 cursor-pointer transition-all ${
                      localSettings.tabCloak === "custom"
                        ? "border-purple-500 bg-purple-950/20 text-white font-bold"
                        : "border-neutral-900 bg-[#070707] text-neutral-400 hover:border-neutral-800"
                    }`}
                  >
                    <span className="text-lg">⚙️</span>
                    <span>Custom Title & Favicon</span>
                  </button>
                </div>

                {/* Custom Options Panel */}
                {localSettings.tabCloak === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-neutral-900 bg-[#060606]"
                  >
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                        Custom Tab Title
                      </label>
                      <input
                        type="text"
                        value={localSettings.customTitle}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({ ...prev, customTitle: e.target.value }))
                        }
                        placeholder="e.g. Google Docs"
                        className="w-full rounded-lg border border-neutral-800 bg-[#090909] px-3 py-2 text-xs text-white outline-none focus:border-neutral-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                        Custom Favicon Link (URL)
                      </label>
                      <input
                        type="text"
                        value={localSettings.customFavicon}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({ ...prev, customFavicon: e.target.value }))
                        }
                        placeholder="e.g. https://google.com/favicon.ico"
                        className="w-full rounded-lg border border-neutral-800 bg-[#090909] px-3 py-2 text-xs text-white outline-none focus:border-neutral-500"
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-neutral-900 pt-4 mt-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-900 bg-black/40 px-3.5 py-2 text-xs font-medium text-neutral-400 hover:border-neutral-800 hover:text-white transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-400 hover:bg-neutral-950 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-xl bg-white text-black px-4 py-2 text-xs font-semibold hover:bg-neutral-200 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
