import { useState, useEffect } from "react";
import { IXL_FAVICON, FROSTED_ICON_SVG } from "./favicons";

export type CloakPreset =
  | "none"
  | "ixl"
  | "classroom"
  | "docs"
  | "canvas"
  | "drive"
  | "slides"
  | "desmos"
  | "wikipedia"
  | "khan"
  | "quizlet"
  | "schoology"
  | "clever"
  | "geogebra";

export interface CloakConfig {
  title: string;
  icon: string;
}

export const CLOAK_PRESETS: Record<CloakPreset, CloakConfig> = {
  none: {
    title: "Frosted Games",
    icon: FROSTED_ICON_SVG,
  },
  ixl: {
    title: "IXL | Dashboard",
    icon: IXL_FAVICON,
  },
  classroom: {
    title: "Classes - Google Classroom",
    icon: "https://ssl.gstatic.com/classroom/favicon.png",
  },
  docs: {
    title: "Google Docs",
    icon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico",
  },
  canvas: {
    title: "Dashboard - Canvas LMS",
    icon: "https://du11hjcvx0uqb.cloudfront.net/br/v9.54.0/images/favicon.ico",
  },
  drive: {
    title: "My Drive - Google Drive",
    icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png",
  },
  slides: {
    title: "Google Slides",
    icon: "https://ssl.gstatic.com/docs/presentations/images/favicon5.ico",
  },
  desmos: {
    title: "Desmos | Graphing Calculator",
    icon: "https://www.desmos.com/favicon.ico",
  },
  wikipedia: {
    title: "Wikipedia, the free encyclopedia",
    icon: "https://en.wikipedia.org/static/favicon/wikipedia.ico",
  },
  khan: {
    title: "Khan Academy | Free Online Courses, Lessons & Practice",
    icon: "https://www.khanacademy.org/favicon.ico",
  },
  quizlet: {
    title: "Flashcards & learning tools | Quizlet",
    icon: "https://quizlet.com/favicon.ico",
  },
  schoology: {
    title: "Home | Schoology",
    icon: "https://www.schoology.com/favicon.ico",
  },
  clever: {
    title: "Clever | Portal",
    icon: "https://assets.clever.com/assets/p-favicon.ico",
  },
  geogebra: {
    title: "GeoGebra | Classic Graphing",
    icon: "https://www.geogebra.org/favicon.ico",
  },
};

const FAVORITES_KEY = "frosted_favorites_v1";
const RECENT_KEY = "frosted_recent_v1";
const CLOAK_KEY = "frosted_cloak_v1";

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

export function getCloakPreset(): CloakPreset {
  try {
    return (localStorage.getItem(CLOAK_KEY) as CloakPreset) || "none";
  } catch {
    return "none";
  }
}

export function setCloakPreset(preset: CloakPreset) {
  try {
    localStorage.setItem(CLOAK_KEY, preset);
    applyCloak(preset);
  } catch {
    /* silent */
  }
}

export function applyCloak(preset: CloakPreset) {
  const cfg = CLOAK_PRESETS[preset] || CLOAK_PRESETS.none;
  document.title = cfg.title;

  let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = cfg.icon;
}

export function useFrostedStore() {
  const [favorites, setFavorites] = useState<(number | string)[]>(getFavorites());
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentItem[]>(getRecentlyPlayed());
  const [cloak, setCloakState] = useState<CloakPreset>(getCloakPreset());

  useEffect(() => {
    applyCloak(cloak);
  }, [cloak]);

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

  const updateCloak = (preset: CloakPreset) => {
    setCloakPreset(preset);
    setCloakState(preset);
  };

  return {
    favorites,
    toggleFavorite,
    recentlyPlayed,
    recordPlay,
    cloak,
    updateCloak,
  };
}
