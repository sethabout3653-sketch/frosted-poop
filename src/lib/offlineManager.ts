import { useEffect, useState, useCallback } from "react";
import { getGameSources, type Game } from "./games";

export const CACHE_SHELL_NAME = "frosted-shell-v1";
export const CACHE_GAMES_NAME = "frosted-games-v1";

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[Frosted] Service Worker registered with scope:", reg.scope);

        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                console.log("[Frosted] New Service Worker content available; please refresh.");
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn("[Frosted] Service Worker registration failed:", err);
      });
  });
}

// Get helper list of probable target URLs for a given game
export function getGameTargetUrls(game: Game): string[] {
  const sources = getGameSources(game);
  return sources.map((s) => s.url);
}

// Check if a game is stored in offline cache
export function isGameCached(game: Game, cachedUrls: string[]): boolean {
  if (!cachedUrls || cachedUrls.length === 0) return false;
  const targetUrls = getGameTargetUrls(game);
  const dirName = (game.directory || "").toLowerCase().replace(/^\/+/, "");

  return cachedUrls.some((cachedUrl) => {
    const lower = cachedUrl.toLowerCase();
    if (targetUrls.some((t) => lower.includes(t.toLowerCase()))) return true;
    if (dirName && lower.includes(dirName)) return true;
    return false;
  });
}

// Custom React Hook to manage offline state & cached game assets
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const [cachedUrls, setCachedUrls] = useState<string[]>([]);
  const [isCaching, setIsCaching] = useState<boolean>(false);
  const [swActive, setSwActive] = useState<boolean>(false);

  // Read all cached keys directly from CacheStorage API
  const refreshCachedUrls = useCallback(async () => {
    if (typeof window === "undefined" || !("caches" in window)) return;
    try {
      const cache = await caches.open(CACHE_GAMES_NAME);
      const keys = await cache.keys();
      const urls = keys.map((req) => req.url);
      setCachedUrls(urls);
    } catch (err) {
      console.warn("[Frosted] Failed to query cache storage:", err);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      setSwActive(true);
    }

    refreshCachedUrls();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshCachedUrls]);

  // Explicitly download and pre-cache a game's core files for offline play
  const downloadGameForOffline = async (game: Game): Promise<number> => {
    setIsCaching(true);
    const urls = getGameTargetUrls(game);
    let count = 0;

    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const cache = await caches.open(CACHE_GAMES_NAME);
        for (const u of urls) {
          try {
            const req = new Request(u, { mode: "cors" });
            const existing = await cache.match(req);
            if (!existing) {
              const response = await fetch(req);
              if (response.ok || response.type === "opaque") {
                await cache.put(req, response);
                count++;
              }
            } else {
              count++;
            }
          } catch (e) {
            console.warn("[Frosted] Pre-cache fetch error for", u, e);
          }
        }
      }
      await refreshCachedUrls();
    } catch (err) {
      console.error("[Frosted] Download for offline error:", err);
    } finally {
      setIsCaching(false);
    }
    return count;
  };

  // Clear offline cache
  const clearGameCache = async () => {
    if (typeof window !== "undefined" && "caches" in window) {
      await caches.delete(CACHE_GAMES_NAME);
      await refreshCachedUrls();
    }
  };

  return {
    isOffline,
    swActive,
    cachedUrls,
    isCaching,
    downloadGameForOffline,
    clearGameCache,
    refreshCachedUrls,
  };
}
