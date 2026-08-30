// Universal Ad Network Manager

export interface AdSettings {
  enabled: boolean;
  provider: "custom" | "adsense";
  customScriptCode: string; // Raw HTML / JS snippet from any ad network (Monetag, Adsterra, Ezoic, etc.)
  clientPublisherId?: string;
  adSlot?: string;
}

const AD_SETTINGS_KEY = "frosted_ad_settings_v7";

export const DEFAULT_AD_SETTINGS: AdSettings = {
  enabled: true,
  provider: "custom",
  customScriptCode: `<script>
(function(mfpva){
var d = document,
    s = d.createElement('script'),
    l = d.scripts[d.scripts.length - 1];
s.settings = mfpva || {};
s.src = "//quarrelsomebitter.com/bGX/V.sEdoGIl/0/YJWdcK/neumE9/u/ZoUSllkQPsTJcCzCNMjYgv3KMezLcVtoNJz/M_2cO/DNcX0nMQQc";
s.async = true;
s.referrerPolicy = 'no-referrer-when-downgrade';
l.parentNode.insertBefore(s, l);
})({})
</script>`,
  clientPublisherId: "",
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

  if (!current.enabled || !current.customScriptCode.trim()) return;

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

export function triggerAdImpression(): void {
  /* Triggered on game loads or page navigation */
}
