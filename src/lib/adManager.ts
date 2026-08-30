// Universal Ad Engine & Network Embedder

export interface AdSettings {
  enabled: boolean;
  customScriptCode: string; // Raw script snippet from any ad network (Monetag, Adsterra, Ezoic, GameDistribution, etc.)
}

const AD_SETTINGS_KEY = "frosted_ad_settings_v4";

export const DEFAULT_AD_SETTINGS: AdSettings = {
  enabled: true,
  customScriptCode: `<script src="https://quge5.com/88/tag.min.js" data-zone="274813" async data-cfasync="false"></script>`,
};

export function getAdSettings(): AdSettings {
  if (typeof localStorage === "undefined") return DEFAULT_AD_SETTINGS;
  try {
    const raw = localStorage.getItem(AD_SETTINGS_KEY);
    if (!raw) return DEFAULT_AD_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_AD_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_AD_SETTINGS;
  }
}

export function saveAdSettings(settings: AdSettings): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(AD_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("frosted_ad_settings_updated", { detail: settings }));
    applyAdScripts(settings);
  } catch {
    /* silent */
  }
}

/**
 * Injects custom ad scripts safely into document body/head
 */
export function applyAdScripts(settings?: AdSettings): void {
  if (typeof document === "undefined") return;

  const current = settings || getAdSettings();

  const existingCustom = document.getElementById("frosted-custom-ad-container");
  if (existingCustom) existingCustom.remove();

  if (!current.enabled || !current.customScriptCode.trim()) return;

  const container = document.createElement("div");
  container.id = "frosted-custom-ad-container";
  container.style.display = "none";
  container.innerHTML = current.customScriptCode;
  document.body.appendChild(container);
}

export function triggerAdImpression(): void {
  /* Triggered on game loads / navigation */
}
