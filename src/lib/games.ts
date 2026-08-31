// Custom games list module
// --- Existing code from your provided snippet ---
export type GameCategory =
  "all" | "popular" | "action" | "driving" | "sports" | "puzzle" | "retro" | "casual";

export type Game = {
  id: number | string;
  name: string;
  directory: string;
  image?: string;
  author?: string;
  authorLink?: string;
  category?: GameCategory;
  featured?: boolean;
  plays?: number;
  rating?: number;
};

export const GN_COVERS_CDN = "https://raw.githubusercontent.com/freebuisness/covers/main";
export const GN_ZONES_URL = "https://raw.githubusercontent.com/freebuisness/assets/main/zones.json";
export const GN_GAME_PROXY = "/api/public/gn/game";
export const SERAPH_GAME_PROXY = "/api/public/seraph";
export const THREE_KH0_GAME_PROXY = "/api/public/3kh0";

export const SERAPH_GAMES: Game[] = [
  {
    id: "slope",
    name: "Slope",
    directory: "games/slope/index.html",
    category: "popular",
    featured: true,
    plays: 984000,
    rating: 4.9,
  },
  {
    id: "1v1lol",
    name: "1v1.LOL",
    directory: "58.html",
    category: "popular",
    featured: true,
    plays: 953000,
    rating: 4.8,
  },
  {
    id: "retrobowl",
    name: "Retro Bowl",
    directory: "games/retrobowl/index.html",
    category: "popular",
    featured: true,
    plays: 882000,
    rating: 4.9,
  },
  {
    id: "subway-surfers",
    name: "Subway Surfers",
    directory: "games/subwaysurfers/index.html",
    category: "popular",
    featured: true,
    plays: 970000,
    rating: 4.9,
  },
  {
    id: "moto-x3m",
    name: "Moto X3M",
    directory: "games/motox3m/index.html",
    category: "driving",
    featured: true,
    plays: 741000,
    rating: 4.7,
  },
  {
    id: "cookie-clicker",
    name: "Cookie Clicker",
    directory: "games/cookieclicker/index.html",
    category: "popular",
    featured: true,
    plays: 919000,
    rating: 4.9,
  },
  {
    id: "geometry-dash",
    name: "Geometry Dash",
    directory: "785-upd3.html",
    category: "popular",
    featured: true,
    plays: 834000,
    rating: 4.8,
  },
  {
    id: "bitlife",
    name: "BitLife",
    directory: "games/bitlife/index.html",
    category: "popular",
    featured: true,
    plays: 798000,
    rating: 4.7,
  },
  {
    id: "basketball-stars",
    name: "Basketball Stars",
    directory: "272-f.html",
    category: "sports",
    featured: true,
    plays: 621000,
    rating: 4.6,
  },
  {
    id: "drift-hunters",
    name: "Drift Hunters",
    directory: "173.html",
    category: "driving",
    featured: true,
    plays: 693000,
    rating: 4.8,
  },
  {
    id: "ovo",
    name: "OvO",
    directory: "games/ovo/index.html",
    category: "action",
    featured: false,
    plays: 541000,
    rating: 4.7,
  },
  {
    id: "run-3",
    name: "Run 3",
    directory: "games/run3/index.html",
    category: "action",
    featured: false,
    plays: 589000,
    rating: 4.8,
  },
  {
    id: "paper-io-2",
    name: "Paper.io 2",
    directory: "games/paperio2/index.html",
    category: "popular",
    featured: false,
    plays: 612000,
    rating: 4.5,
  },
  {
    id: "tunnel-rush",
    name: "Tunnel Rush",
    directory: "206-f.html",
    category: "action",
    featured: false,
    plays: 498000,
    rating: 4.6,
  },
  {
    id: "fnf",
    name: "Friday Night Funkin'",
    directory: "games/fnf/index.html",
    category: "retro",
    featured: true,
    plays: 810000,
    rating: 4.9,
  },
  {
    id: "minecraft",
    name: "Minecraft",
    directory: "182-f.html",
    category: "popular",
    featured: true,
    plays: 999999,
    rating: 5.0,
  },
];

export function gameEntry(directory: string) {
  if (
    directory.startsWith("http://") ||
    directory.startsWith("https://") ||
    directory.startsWith("/api/") ||
    directory.startsWith("/~/")
  ) {
    return directory;
  }
  if (directory.startsWith("games/")) {
    return `${SERAPH_GAME_PROXY}/${directory}`;
  }
  if (directory.startsWith("3kh0/")) {
    return `${THREE_KH0_GAME_PROXY}/${directory.replace("3kh0/", "")}`;
  }
  return `${GN_GAME_PROXY}/${directory}`;
}

export function gameCover(game: Game) {
  if (game.image && game.image.startsWith("http")) {
    return game.image;
  }
  if (typeof game.id === "string" && game.id.startsWith("seraph-")) {
    return "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80";
  }
  if (typeof game.id === "string" && game.id.startsWith("3kh0-")) {
    return "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=80";
  }
  return `${GN_COVERS_CDN}/${game.id}.png`;
}

function assignCategory(name: string, catRaw?: string): GameCategory {
  const c = (catRaw || "").toLowerCase();
  if (c.includes("action") || c.includes("shooter") || c.includes("arcade")) return "action";
  if (c.includes("driving") || c.includes("car") || c.includes("racing")) return "driving";
  if (c.includes("sports") || c.includes("ball")) return "sports";
  if (c.includes("puzzle") || c.includes("board")) return "puzzle";
  if (c.includes("retro") || c.includes("classic") || c.includes("emulator")) return "retro";
  if (c.includes("casual") || c.includes("clicker")) return "casual";
  if (c.includes("popular") || c.includes("featured")) return "popular";

  const n = name.toLowerCase();
  if (
    n.includes("slope") ||
    n.includes("1v1") ||
    n.includes("subway") ||
    n.includes("moto") ||
    n.includes("cookie") ||
    n.includes("geometry") ||
    n.includes("bitlife") ||
    n.includes("retro bowl") ||
    n.includes("drift") ||
    n.includes("paper.io") ||
    n.includes("basket") ||
    n.includes("minecraft")
  ) {
    return "popular";
  }
  if (
    n.includes("drift") ||
    n.includes("moto") ||
    n.includes("drive") ||
    n.includes("car") ||
    n.includes("racing") ||
    n.includes("kart") ||
    n.includes("bike") ||
    n.includes("truck")
  ) {
    return "driving";
  }
  if (
    n.includes("basket") ||
    n.includes("soccer") ||
    n.includes("football") ||
    n.includes("golf") ||
    n.includes("bowl") ||
    n.includes("tennis") ||
    n.includes("pool") ||
    n.includes("sports")
  ) {
    return "sports";
  }
  if (
    n.includes("shot") ||
    n.includes("combat") ||
    n.includes("war") ||
    n.includes("ninja") ||
    n.includes("fight") ||
    n.includes("bullet") ||
    n.includes("gun") ||
    n.includes("zombie") ||
    n.includes("action")
  ) {
    return "action";
  }
  if (
    n.includes("mario") ||
    n.includes("pacman") ||
    n.includes("sonic") ||
    n.includes("tetris") ||
    n.includes("retro") ||
    n.includes("arcade") ||
    n.includes("atari") ||
    n.includes("classic") ||
    n.includes("zelda") ||
    n.includes("pokemon")
  ) {
    return "retro";
  }
  if (
    n.includes("2048") ||
    n.includes("sudoku") ||
    n.includes("chess") ||
    n.includes("checkers") ||
    n.includes("cut the rope") ||
    n.includes("word") ||
    n.includes("puzzle") ||
    n.includes("block") ||
    n.includes("math")
  ) {
    return "puzzle";
  }
  return "casual";
}

export const FEATURED_GAME_IDS = [
  "soundboard",
  "slope",
  "1v1lol",
  "retrobowl",
  "subwaysurfers",
  "motox3m",
  "cookieclicker",
  "geometrydash",
  "bitlife",
  "basketballstars",
  "drifthunters",
];

function formatGameName(folderName: string): string {
  const customMap: Record<string, string> = {
    "10minutestilldawn": "10 Minutes Till Dawn",
    "1on1soccer": "1on1 Soccer",
    "1v1lol": "1v1.LOL",
    "2048": "2048",
    abudathealien: "Abuda The Alien",
    aceattorney: "Ace Attorney",
    achievementunlocked: "Achievement Unlocked",
    achievementunlocked2: "Achievement Unlocked 2",
    achievementunlocked3: "Achievement Unlocked 3",
    slope: "Slope",
    retrobowl: "Retro Bowl",
    subwaysurfers: "Subway Surfers",
    motox3m: "Moto X3M",
    cookieclicker: "Cookie Clicker",
    geometrydash: "Geometry Dash",
    bitlife: "BitLife",
    basketballstars: "Basketball Stars",
    drifthunters: "Drift Hunters",
    ovo: "OvO",
    run3: "Run 3",
    paperio2: "Paper.io 2",
    tunnelrush: "Tunnel Rush",
    fnf: "Friday Night Funkin'",
    minecraft: "Minecraft Eaglercraft",
    sm64: "Super Mario 64",
    happywheels: "Happy Wheels",
  };
  const mapped = customMap[folderName.toLowerCase()];
  if (mapped) {
    return mapped;
  }
  const spaced = folderName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([0-9]+)([a-zA-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])([0-9]+)/g, "$1 $2")
    .replace(/[-_]/g, " ");
  return spaced
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function fetchGames(): Promise<Game[]> {
  const customGame: Game = {
    id: "soundboard",
    name: "Soundboard",
    directory: "https://myinstants.com",
    image:
      "https://play-lh.googleusercontent.com/QbPwdx7u46tJLd6SBJ6cCPajEKgiA620fYNSZb1VsdlKIBPs4m6itZRDmu9SWPo8vbV77H1H42cNefPDtoYM",
    category: "popular",
    featured: true,
    plays: 99999,
    rating: 5.0,
  };

  let seraphGames: Game[] = [];
  try {
    const res = await fetch("https://api.github.com/repos/a456pur/seraph/contents/games", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        seraphGames = data
          .filter((item: any) => item && item.name && item.name !== ".DS_Store")
          .map((item: any, idx: number) => {
            const folderName = String(item.name);
            const name = formatGameName(folderName);
            const directory = `games/${folderName}/index.html`;
            const image = `https://raw.githubusercontent.com/a456pur/seraph/main/images/thumbnails/${folderName}.jpg`;
            const category = assignCategory(name);
            const featured =
              idx < 25 ||
              category === "popular" ||
              name.toLowerCase().includes("slope") ||
              name.toLowerCase().includes("1v1") ||
              name.toLowerCase().includes("retro bowl") ||
              name.toLowerCase().includes("subway surfers") ||
              name.toLowerCase().includes("moto x3m");

            return {
              id: `seraph-${folderName}`,
              name,
              directory,
              image,
              category,
              featured,
              plays: Math.floor(Math.random() * 800000) + 150000,
              rating: Number((4.6 + Math.random() * 0.3).toFixed(1)),
            };
          });
      }
    }
  } catch (err) {
    console.warn(
      "Failed to fetch full Seraph games list from GitHub API (rate limit likely). Proceeding with fallback list.",
    );
  }

  if (seraphGames.length === 0) {
    seraphGames = SERAPH_GAMES;
  }

  let gnMathGames: Game[] = [];
  try {
    const res = await fetch(GN_ZONES_URL);
    if (res.ok) {
      const rawData = await res.json();
      if (Array.isArray(rawData)) {
        gnMathGames = rawData
          .filter(
            (item: Record<string, unknown>) =>
              item &&
              typeof item["id"] === "number" &&
              item["id"] >= 0 &&
              item["url"] &&
              item["name"],
          )
          .map((item: Record<string, unknown>) => {
            const rawUrl = String(item["url"] || "");
            const filename = rawUrl.replace("{HTML_URL}/", "").replace(/^https?:\/\/[^/]+\//, "");
            const coverUrl = String(item["cover"] || "").replace("{COVER_URL}", GN_COVERS_CDN);
            const name = String(item["name"]);
            const category = assignCategory(name);
            const featured =
              category === "popular" ||
              name.toLowerCase().includes("slope") ||
              name.toLowerCase().includes("1v1");

            return {
              id: item["id"] as number,
              name,
              directory: filename,
              image: coverUrl,
              author: item["author"] ? String(item["author"]) : undefined,
              authorLink: item["authorLink"] ? String(item["authorLink"]) : undefined,
              category,
              featured,
              plays: Math.floor(Math.random() * 50000) + 12000,
              rating: Number((4.5 + Math.random() * 0.4).toFixed(1)),
            };
          });
      }
    }
  } catch (err) {
    console.warn("Failed to fetch gn-math games:", err);
  }

  return [customGame, ...gnMathGames, ...seraphGames];
}
