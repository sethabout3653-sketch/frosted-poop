// ExoClick Ad Network Utilities: Banner (6015558) & Desktop Fullpage Interstitial (6015562)

export const DEFAULT_BANNER_ZONE = "6015558";
export const DEFAULT_INTERSTITIAL_ZONE = "6015562";

const INTERSTITIAL_ENABLED_KEY = "frosted_interstitial_enabled";
const BANNER_ZONE_KEY = "frosted_banner_zone";
const INTERSTITIAL_ZONE_KEY = "frosted_interstitial_zone";

export function isInterstitialEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  const val = localStorage.getItem(INTERSTITIAL_ENABLED_KEY);
  return val === null ? true : val === "true";
}

export function setInterstitialEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(INTERSTITIAL_ENABLED_KEY, enabled ? "true" : "false");
}

export function getBannerZoneId(): string {
  if (typeof localStorage === "undefined") return DEFAULT_BANNER_ZONE;
  return (
    localStorage.getItem(BANNER_ZONE_KEY) ||
    import.meta.env.VITE_EXOCLICK_BANNER_ZONE ||
    DEFAULT_BANNER_ZONE
  );
}

export function setBannerZoneId(val: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(BANNER_ZONE_KEY, val.trim());
}

export function getInterstitialZoneId(): string {
  if (typeof localStorage === "undefined") return DEFAULT_INTERSTITIAL_ZONE;
  return (
    localStorage.getItem(INTERSTITIAL_ZONE_KEY) ||
    import.meta.env.VITE_EXOCLICK_INTERSTITIAL_ZONE ||
    DEFAULT_INTERSTITIAL_ZONE
  );
}

export function setInterstitialZoneId(val: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(INTERSTITIAL_ZONE_KEY, val.trim());
}

/**
 * Triggers the ExoClick Desktop Fullpage Interstitial (Zone 6015562)
 */
export function triggerExoInterstitial(force = false): void {
  if (!force && !isInterstitialEnabled()) return;

  try {
    const win = window as unknown as { AdProvider?: Array<{ serve: Record<string, unknown> }> };
    if (!win.AdProvider) {
      win.AdProvider = [];
    }
    // Push serve call to trigger fullpage interstitial
    win.AdProvider.push({ serve: {} });

    // Also dispatch custom event for listeners
    window.dispatchEvent(new CustomEvent("frosted_interstitial_triggered"));
  } catch {
    /* silent catch */
  }
}

// Alias for compatibility
export const triggerPopunderOnUserAction = triggerExoInterstitial;
export const isPopupsEnabled = isInterstitialEnabled;
export const setPopupsEnabled = setInterstitialEnabled;
export const getPopupZoneOrUrl = getInterstitialZoneId;
export const setPopupZoneOrUrl = setInterstitialZoneId;
export const getExoClickZone = getBannerZoneId;
