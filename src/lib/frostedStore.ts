import { useState, useEffect } from "react";

const FAVORITES_KEY = "frosted_favorites_v1";
const RECENT_KEY = "frosted_recent_v1";
const COVER_STYLE_KEY = "frosted_cover_style_v1";

export type CoverStyle = "fanart" | "sdk";

export function getCoverStyle(): CoverStyle {
  try {
    return (localStorage.getItem(COVER_STYLE_KEY) as CoverStyle) || "fanart";
  } catch {
    return "fanart";
  }
}

export function setCoverStyle(style: CoverStyle) {
  try {
    localStorage.setItem(COVER_STYLE_KEY, style);
    window.dispatchEvent(new Event("frosted_cover_style_updated"));
  } catch {
    /* silent */
  }
}

export function getFavorites(): (number | string)[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favs: (number | string)[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  } catch {
    /* silent */
  }
}

export function toggleFavoriteId(id: number | string): (number | string)[] {
  const current = getFavorites();
  const exists = current.includes(id);
  const updated = exists ? current.filter((item) => item !== id) : [...current, id];
  saveFavorites(updated);
  return updated;
}

export interface RecentItem {
  id: number | string;
  name: string;
  directory: string;
  image: string;
  timestamp: number;
}

export function getRecentlyPlayed(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentlyPlayed(game: {
  id: number | string;
  name: string;
  directory: string;
  image: string;
}) {
  try {
    const list = getRecentlyPlayed().filter((g) => g.id !== game.id);
    const updated = [{ ...game, timestamp: Date.now() }, ...list].slice(0, 20);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    /* silent */
  }
}

export function useFrostedStore() {
  const [favorites, setFavorites] = useState<(number | string)[]>(getFavorites());
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentItem[]>(getRecentlyPlayed());
  const [coverStyle, setCoverStyleState] = useState<CoverStyle>(getCoverStyle());

  useEffect(() => {
    const handleUpdate = () => {
      setCoverStyleState(getCoverStyle());
    };
    window.addEventListener("frosted_cover_style_updated", handleUpdate);
    return () => {
      window.removeEventListener("frosted_cover_style_updated", handleUpdate);
    };
  }, []);

  const toggleFavorite = (id: number | string) => {
    const updated = toggleFavoriteId(id);
    setFavorites(updated);
  };

  const recordPlay = (game: {
    id: number | string;
    name: string;
    directory: string;
    image: string;
  }) => {
    addRecentlyPlayed(game);
    setRecentlyPlayed(getRecentlyPlayed());
  };

  const updateCoverStyle = (style: CoverStyle) => {
    setCoverStyle(style);
    setCoverStyleState(style);
  };

  return {
    favorites,
    toggleFavorite,
    recentlyPlayed,
    recordPlay,
    coverStyle,
    updateCoverStyle,
  };
}
