import { useState, useEffect } from "react";
import {
  IXL_FAVICON,
  CLASSROOM_FAVICON,
  DRIVE_FAVICON,
  DOCS_FAVICON,
  SLIDES_FAVICON,
  CANVAS_FAVICON,
  SCHOOLOGY_FAVICON,
  CLEVER_FAVICON,
  DESMOS_FAVICON,
  KHAN_FAVICON,
  WIKIPEDIA_FAVICON,
  QUIZLET_FAVICON,
  GEOGEBRA_FAVICON,
  FROSTED_ICON_SVG,
} from "./favicons";

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
    icon: CLASSROOM_FAVICON,
  },
  docs: {
    title: "Google Docs",
    icon: DOCS_FAVICON,
  },
  canvas: {
    title: "Dashboard - Canvas LMS",
    icon: CANVAS_FAVICON,
  },
  drive: {
    title: "My Drive - Google Drive",
    icon: DRIVE_FAVICON,
  },
  slides: {
    title: "Google Slides",
    icon: SLIDES_FAVICON,
  },
  desmos: {
    title: "Desmos | Graphing Calculator",
    icon: DESMOS_FAVICON,
  },
  wikipedia: {
    title: "Wikipedia, the free encyclopedia",
    icon: WIKIPEDIA_FAVICON,
  },
  khan: {
    title: "Khan Academy | Free Online Courses, Lessons & Practice",
    icon: KHAN_FAVICON,
  },
  quizlet: {
    title: "Flashcards & learning tools | Quizlet",
    icon: QUIZLET_FAVICON,
  },
  schoology: {
    title: "Home | Schoology",
    icon: SCHOOLOGY_FAVICON,
  },
  clever: {
    title: "Clever | Portal",
    icon: CLEVER_FAVICON,
  },
  geogebra: {
    title: "GeoGebra | Classic Graphing",
    icon: GEOGEBRA_FAVICON,
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

  // Remove existing icon elements to force the browser to update immediately
  const existingIcons = document.querySelectorAll("link[rel*='icon']");
  existingIcons.forEach((el) => el.remove());

  const isSvg = cfg.icon.startsWith("data:image/svg+xml");
  const isPng = cfg.icon.includes("s2/favicons") || cfg.icon.endsWith(".png");

  const link = document.createElement("link");
  link.rel = "icon";
  if (isSvg) {
    link.type = "image/svg+xml";
  } else if (isPng) {
    link.type = "image/png";
  }
  link.href = cfg.icon;
  document.head.appendChild(link);

  const shortcutLink = document.createElement("link");
  shortcutLink.rel = "shortcut icon";
  shortcutLink.href = cfg.icon;
  document.head.appendChild(shortcutLink);
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
