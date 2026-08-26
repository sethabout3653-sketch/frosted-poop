export type GameCategory =
  "all" | "popular" | "action" | "driving" | "sports" | "puzzle" | "retro" | "casual";

export type Game = {
  id: number | string;
  name: string;
  directory: string;
  image: string;
  author?: string;
  authorLink?: string;
  category?: GameCategory;
  featured?: boolean;
  plays?: number;
  rating?: number;
};

export const GN_COVERS_CDN = "https://cdn.jsdelivr.net/gh/freebuisness/covers@main";
export const GN_ZONES_URL = "https://cdn.jsdelivr.net/gh/freebuisness/assets@latest/zones.json";
export const GN_GAME_PROXY = "/api/public/gn/game";

export function gameEntry(directory: string) {
  if (
    directory.startsWith("http://") ||
    directory.startsWith("https://") ||
    directory.startsWith("/api/")
  ) {
    return directory;
  }
  return `${GN_GAME_PROXY}/${directory}`;
}

export function gameCover(game: Game) {
  if (game.image && game.image.startsWith("http")) {
    return game.image;
  }
  return `${GN_COVERS_CDN}/${game.id}.png`;
}

function assignCategory(name: string): GameCategory {
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
    n.includes("basket")
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

export async function fetchGames(): Promise<Game[]> {
  const customGame: Game = {
    id: "soundboard",
    name: "Soundboard",
    directory: "https://MyInstants.com",
    image: "https://play-lh.googleusercontent.com/QbPwdx7u46tJLd6SBJ6cCPajEKgiA620fYNSZb1VsdlKIBPs4m6itZRDmu9SWPo8vbV77H1H42cNefPDtoYM",
    category: "popular",
    featured: true,
    plays: 99999,
    rating: 5.0,
  };

  try {
    const res = await fetch(GN_ZONES_URL);
    if (res.ok) {
      const rawData = await res.json();
      if (Array.isArray(rawData)) {
        const fetchedGames = rawData
          .filter(
            (item: Record<string, unknown>) =>
              item && typeof item.id === "number" && item.id >= 0 && item.url && item.name,
          )
          .map((item: Record<string, unknown>) => {
            const rawUrl = String(item.url || "");
            const filename = rawUrl.replace("{HTML_URL}/", "").replace(/^https?:\/\/[^/]+\//, "");
            const coverUrl = String(item.cover || "").replace("{COVER_URL}", GN_COVERS_CDN);
            const name = String(item.name);
            const category = assignCategory(name);
            const featured =
              category === "popular" ||
              name.toLowerCase().includes("slope") ||
              name.toLowerCase().includes("1v1") ||
              name.toLowerCase().includes("retro bowl") ||
              name.toLowerCase().includes("subway surfers") ||
              name.toLowerCase().includes("moto x3m");

            return {
              id: item.id,
              name,
              directory: filename,
              image: coverUrl,
              author: item.author ? String(item.author) : undefined,
              authorLink: item.authorLink ? String(item.authorLink) : undefined,
              category,
              featured,
              plays: Math.floor(Math.random() * 50000) + 12000,
              rating: Number((4.5 + Math.random() * 0.4).toFixed(1)),
            };
          });
        return [customGame, ...fetchedGames];
      }
    }
  } catch (err) {
    console.error("Failed to fetch gn-math games:", err);
  }

  return [customGame];
}
