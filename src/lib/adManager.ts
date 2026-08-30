// Universal Ad Network Manager

export interface AdSettings {
  enabled: boolean;
  provider: "custom" | "adsense";
  customScriptCode: string; // Raw HTML / JS snippet from any ad network (Monetag, Adsterra, Ezoic, etc.)
  clientPublisherId?: string;
  adSlot?: string;
}

const AD_SETTINGS_KEY = "frosted_ad_settings_v9";

export const DEFAULT_AD_SETTINGS: AdSettings = {
  enabled: true,
  provider: "adsense",
  customScriptCode: "",
  clientPublisherId: "ca-pub-4411579510743309",
  adSlot: "",
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
 * Injects global header ad scripts dynamically if provided
 */
export function applyAdScripts(settings?: AdSettings): void {
  if (typeof document === "undefined") return;

  const current = settings || getAdSettings();

  const existingContainer = document.getElementById("frosted-global-ad-script");
  if (existingContainer) existingContainer.remove();

  if (!current.enabled) return;

  if (current.provider === "adsense") {
    const client = current.clientPublisherId || "ca-pub-4411579510743309";
    const script = document.createElement("script");
    script.id = "frosted-global-ad-script";
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  } else if (current.provider === "custom" && current.customScriptCode.trim()) {
    // If the script contains head tags or global tags, parse and append scripts to head/body
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(current.customScriptCode, "text/html");
      const scripts = doc.querySelectorAll("script");

      if (scripts.length > 0) {
        const wrapper = document.createElement("div");
        wrapper.id = "frosted-global-ad-script";
        wrapper.style.display = "none";

        scripts.forEach((oldScript) => {
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes).forEach((attr) =>
            newScript.setAttribute(attr.name, attr.value),
          );
          newScript.textContent = oldScript.textContent;
          wrapper.appendChild(newScript);
        });

        document.body.appendChild(wrapper);
      }
    } catch {
      /* silent */
    }
  }
}

export function triggerAdImpression(): void {
  /* Triggered on game loads or page navigation */
}
