import { useEffect, useState } from "react";

export type TabCloakPreset =
  "none" | "docs" | "classroom" | "drive" | "canvas" | "edpuzzle" | "custom";

export interface AppSettings {
  tabCloak: TabCloakPreset;
  customTitle: string;
  customFavicon: string;
}

export const CLOAK_PRESETS: Record<
  Exclude<TabCloakPreset, "none" | "custom">,
  { title: string; favicon: string }
> = {
  docs: {
    title: "Google Docs",
    favicon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon-2023q4.ico",
  },
  classroom: {
    title: "Classes",
    favicon: "https://ssl.gstatic.com/classroom/favicon.png",
  },
  drive: {
    title: "My Drive - Google Drive",
    favicon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png",
  },
  canvas: {
    title: "Dashboard",
    favicon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico",
  },
  edpuzzle: {
    title: "Edpuzzle",
    favicon: "https://edpuzzle.imgix.net/favicons/favicon-32.png",
  },
};

const SETTINGS_LOCAL_STORAGE_KEY = "frosted_app_settings_v2";

export const DEFAULT_SETTINGS: AppSettings = {
  tabCloak: "none",
  customTitle: "",
  customFavicon: "",
};

export function getStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_LOCAL_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_LOCAL_STORAGE_KEY, JSON.stringify(settings));
    // Trigger custom event for state sync across components/tabs
    window.dispatchEvent(new CustomEvent("frosted_app_settings_updated", { detail: settings }));
  } catch {
    /* silent */
  }
}

/**
 * Applies the tab cloak settings dynamically to the document
 */
export function applyTabCloak(settings: AppSettings): void {
  if (typeof document === "undefined") return;

  let title = "Frosted";
  let favicon =
    "https://play-lh.googleusercontent.com/QbPwdx7u46tJLd6SBJ6cCPajEKgiA620fYNSZb1VsdlKIBPs4m6itZRDmu9SWPo8vbV77H1H42cNefPDtoYM"; // Default Frosted favicon

  if (settings.tabCloak === "custom") {
    title = settings.customTitle || "Frosted";
    favicon = settings.customFavicon || favicon;
  } else if (settings.tabCloak !== "none") {
    const preset = CLOAK_PRESETS[settings.tabCloak];
    if (preset) {
      title = preset.title;
      favicon = preset.favicon;
    }
  }

  // Update Title
  document.title = title;

  // Update Favicon (create or update link rel="icon")
  let iconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (!iconLink) {
    iconLink = document.createElement("link");
    iconLink.rel = "icon";
    document.head.appendChild(iconLink);
  }
  iconLink.href = favicon;
}

/**
 * Custom React hook to use settings reactively
 */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => getStoredSettings());

  useEffect(() => {
    // Initial apply
    applyTabCloak(settings);

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AppSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
        applyTabCloak(customEvent.detail);
      }
    };

    window.addEventListener("frosted_app_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("frosted_app_settings_updated", handleUpdate);
    };
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    saveStoredSettings(merged);
    applyTabCloak(merged);
  };

  return { settings, updateSettings };
}
