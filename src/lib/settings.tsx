import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  FROSTED_ICON_SVG,
} from "./favicons";

export type Settings = {
  defaultEngine: "auto" | "ultraviolet" | "scramjet";
  antiDeleado: boolean;
  searchEngine: string;
};

const DEFAULTS: Settings = {
  defaultEngine: "auto",
  antiDeleado: true,
  searchEngine: "https://duckduckgo.com/?q=%s",
};

const STORAGE_KEY = "frosted.settings";

type Ctx = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  ready: boolean;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) });
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, update, ready }), [settings, update, ready]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

/** Applies anti-deleado tab protection. */
export function useBrowserChrome() {
  const { settings, ready } = useSettings();

  useEffect(() => {
    if (!ready || !settings.antiDeleado) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [ready, settings.antiDeleado]);
}
