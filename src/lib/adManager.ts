// Universal Reliable Ad Monetization Engine (Google AdSense & Custom Ad Networks)

export interface AdSettings {
  enabled: boolean;
  provider: "adsense" | "custom";
  adsensePublisherId: string; // e.g. "ca-pub-1234567890123456"
  adsenseSlotId: string; // e.g. "9876543210" (optional responsive unit)
  autoAdsEnabled: boolean; // Enables Google Auto Ads + vignette interstitials
  customScriptCode: string; // Raw script or html snippet for any other network
}

const AD_SETTINGS_KEY = "frosted_ad_settings_v2";

export const DEFAULT_AD_SETTINGS: AdSettings = {
  enabled: true,
  provider: "adsense",
  adsensePublisherId: "ca-pub-4411579510743309",
  adsenseSlotId: "",
  autoAdsEnabled: true,
  customScriptCode: "",
};

export function getAdSettings(): AdSettings {
  if (typeof localStorage === "undefined") return DEFAULT_AD_SETTINGS;
  try {
    const raw = localStorage.getItem(AD_SETTINGS_KEY);
    if (!raw) {
      const envPublisher = import.meta.env.VITE_ADSENSE_PUB_ID || "ca-pub-4411579510743309";
      return {
        ...DEFAULT_AD_SETTINGS,
        adsensePublisherId: envPublisher,
      };
    }
    const parsed = JSON.parse(raw);
    if (!parsed.adsensePublisherId) {
      parsed.adsensePublisherId = "ca-pub-4411579510743309";
    }
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
 * Injects Google AdSense or Custom Network scripts safely into document head
 */
export function applyAdScripts(settings?: AdSettings): void {
  if (typeof document === "undefined") return;

  const current = settings || getAdSettings();

  // Clean up any old script tags
  const existingAdsense = document.getElementById("frosted-adsense-script");
  if (existingAdsense) existingAdsense.remove();

  const existingCustom = document.getElementById("frosted-custom-ad-container");
  if (existingCustom) existingCustom.remove();

  if (!current.enabled) return;

  if (current.provider === "adsense") {
    const pubId = current.adsensePublisherId.trim();
    if (!pubId) return;

    // Normalize ca-pub- prefix
    const cleanPubId = pubId.startsWith("ca-pub-") ? pubId : `ca-pub-${pubId.replace(/^pub-/, "")}`;

    const script = document.createElement("script");
    script.id = "frosted-adsense-script";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(cleanPubId)}`;

    if (current.autoAdsEnabled) {
      script.setAttribute("data-ad-client", cleanPubId);
    }

    document.head.appendChild(script);
  } else if (current.provider === "custom" && current.customScriptCode.trim()) {
    const container = document.createElement("div");
    container.id = "frosted-custom-ad-container";
    container.style.display = "none";
    container.innerHTML = current.customScriptCode;
    document.body.appendChild(container);
  }
}

/**
 * Triggers responsive interstitial or ad refresh on user actions (game select, tab change, etc.)
 */
export function triggerAdImpression(): void {
  const settings = getAdSettings();
  if (!settings.enabled) return;

  try {
    if (settings.provider === "adsense") {
      const win = window as unknown as { adsbygoogle?: Array<Record<string, unknown>> };
      if (win.adsbygoogle) {
        win.adsbygoogle.push({});
      }
    }
  } catch {
    /* silent */
  }
}
