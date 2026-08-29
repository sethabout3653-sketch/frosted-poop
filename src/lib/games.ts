// Custom games list module
// --- Existing code from your provided snippet ---
export type GameCategory =
  | "all"
  | "popular"
  | "action"
  | "driving"
  | "sports"
  | "puzzle"
  | "retro"
  | "casual"
  | "ckv"
  | "lumin";

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
// Use the server-side proxy to avoid client-side CORS issues and blockages
export const GN_ZONES_URL = "/api/public/gn/cdn/freebuisness/assets@latest/zones.json";
export const SERAPH_DATA_URL = "/api/public/gn/gh/a456pur/seraph/main/storage/js/directories.json";
export const CKV_DATA_URL = "https://raw.githubusercontent.com/WanoCapy/ChickenKingsVault/main/games.js";
export const GN_GAME_PROXY = "/api/public/gn/game";

export function gameEntry(directory: string) {
  if (
    directory.startsWith("http://") ||
    directory.startsWith("https://") ||
    directory.startsWith("/api/") ||
    directory.startsWith("/~/")
  ) {
    return directory;
  }
  if (directory.startsWith("gh/")) {
    return `/api/public/gn/${directory}`;
  }
  return `${GN_GAME_PROXY}/${directory}`;
}

export function gameCover(game: Game) {
  if (game.image && game.image.startsWith("http")) {
    return game.image;
  }
  if (game.image && (game.image.startsWith("/api/") || game.image.startsWith("gh/"))) {
    return game.image.startsWith("gh/") ? `/api/public/gn/${game.image}` : game.image;
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
    n.includes("basket") ||
    n.includes("ovo") ||
    n.includes("temple run") ||
    n.includes("stickman hook") ||
    n.includes("jetpack") ||
    n.includes("fnf") ||
    n.includes("friday night") ||
    n.includes("angry birds") ||
    n.includes("cut the rope") ||
    n.includes("among us") ||
    n.includes("roblox") ||
    n.includes("minecraft") ||
    n.includes("bottle flip") ||
    n.includes("happy wheels")
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
    n.includes("truck") ||
    n.includes("simulator") ||
    n.includes("park") ||
    n.includes("stunt") ||
    n.includes("traffic") ||
    n.includes("highway") ||
    n.includes("taxi") ||
    n.includes("bus")
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
    n.includes("sports") ||
    n.includes("baseball") ||
    n.includes("hockey") ||
    n.includes("billiard") ||
    n.includes("skate") ||
    n.includes("surf") ||
    n.includes("box") ||
    n.includes("wrestle") ||
    n.includes("ufc")
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
    n.includes("action") ||
    n.includes("sniper") ||
    n.includes("assassin") ||
    n.includes("battle") ||
    n.includes("strike") ||
    n.includes("army") ||
    n.includes("hero") ||
    n.includes("adventure") ||
    n.includes("quest")
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
    n.includes("pokemon") ||
    n.includes("pixel") ||
    n.includes("8-bit") ||
    n.includes("nes") ||
    n.includes("snes") ||
    n.includes("gameboy")
  ) {
    return "retro";
  }
  if (
    n.includes("2048") ||
    n.includes("sudoku") ||
    n.includes("chess") ||
    n.includes("checkers") ||
    n.includes("word") ||
    n.includes("puzzle") ||
    n.includes("block") ||
    n.includes("math") ||
    n.includes("logic") ||
    n.includes("brain") ||
    n.includes("match 3") ||
    n.includes("tile") ||
    n.includes("connect") ||
    n.includes("escape") ||
    n.includes("maze") ||
    n.includes("quiz") ||
    n.includes("trivia")
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
    image:
      "https://play-lh.googleusercontent.com/QbPwdx7u46tJLd6SBJ6cCPajEKgiA620fYNSZb1VsdlKIBPs4m6itZRDmu9SWPo8vbV77H1H42cNefPDtoYM",
    category: "popular",
    featured: true,
    plays: 50000,
    rating: 4.8,
  };

  const results: Game[] = [customGame];

  try {
    const gnRes = await fetch(GN_ZONES_URL).catch((err) => {
      console.error("GN fetch error:", err);
      return null;
    });

    if (gnRes && gnRes.ok) {
      const rawData = await gnRes.json();
      if (Array.isArray(rawData)) {
        const gnGames = rawData
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
        results.push(...gnGames);
      }
    }

    // Fetch Seraph Games
    const seraphRes = await fetch(SERAPH_DATA_URL).catch((err) => {
      console.error("Seraph fetch error:", err);
      return null;
    });

    if (seraphRes && seraphRes.ok) {
      const seraphData = await seraphRes.json();
      if (typeof seraphData === "object" && seraphData !== null) {
        const seraphGames = Object.entries(seraphData).map(([key, data]: [string, any]) => {
          // Key is like "slope/index.html"
          const name = key
            .split("/")[0]
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
          const category = assignCategory(name);

          return {
            id: `seraph-${key}`,
            name,
            directory: `gh/a456pur/seraph/main/games/${key}`,
            image: `gh/a456pur/seraph/main${data.thumbnail}`,
            category,
            featured: FEATURED_GAME_IDS.some((fid) => name.toLowerCase().includes(fid)),
            plays: Math.floor(Math.random() * 30000) + 5000,
            rating: Number((4.3 + Math.random() * 0.6).toFixed(1)),
          };
        });
        results.push(...seraphGames);
      }
    }

    // Fetch CKV Games
    const ckvRes = await fetch(CKV_DATA_URL).catch((err) => {
      console.error("CKV fetch error:", err);
      return null;
    });

    if (ckvRes && ckvRes.ok) {
      const ckvHtml = await ckvRes.text();
      // Match <a class="game-link" href="gamefiles/fnaf3.html"> <img src="gameimages/fnaf3.jpg" alt="Five Nights at Freddy's 3 Cover"> <div>Five Nights at Freddy's 3</div></a>
      const regex = /<a class="game-link" href="([^"]+)">\s*<img src="([^"]+)" alt="([^"]*)">\s*<div>([^<]+)<\/div><\/a>/g;
      let match;
      const ckvGames: Game[] = [];
      while ((match = regex.exec(ckvHtml)) !== null) {
        const [, href, imgSrc, , title] = match;
        ckvGames.push({
          id: `ckv-${href}`,
          name: title.trim(),
          directory: `gh/WanoCapy/ChickenKingsVault/main/${href}`,
          image: `gh/WanoCapy/ChickenKingsVault/main/${imgSrc}`,
          category: "ckv",
          featured: FEATURED_GAME_IDS.some((fid) => title.toLowerCase().includes(fid)),
          plays: Math.floor(Math.random() * 20000) + 8000,
          rating: Number((4.4 + Math.random() * 0.5).toFixed(1)),
        });
      }
      results.push(...ckvGames);
    }

    // Fetch Lumin Games
    if (typeof window !== "undefined") {
      let luminEngine = (window as any).LuminEngine;

      // Wait a bit for initialization if needed
      if (!luminEngine) {
        for (let i = 0; i < 50; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          // Check if it's ready AND it's a constructor
          if ((window as any).Lumin && typeof (window as any).Lumin === "function") {
            // It might already be initialized by main.tsx
            luminEngine = (window as any).LuminEngine;
            if (luminEngine) break;

            // If not initialized yet, do it here if possible (as a backup)
            try {
              (window as any).LuminEngine = new (window as any).Lumin({
                provider: "gn-math-mirror",
                fallbackProxy: "https://cherrion.top",
                sandboxMode: false,
              });
              luminEngine = (window as any).LuminEngine;
              break;
            } catch (e) {
              // Not a constructor yet or failed
            }
          }
        }
      }

      if (luminEngine && typeof luminEngine.fetchGames === "function") {
        try {
          const luminGamesRaw = await luminEngine.fetchGames();
          if (Array.isArray(luminGamesRaw)) {
            const luminGames: Game[] = luminGamesRaw.map((game: any) => ({
              id: `lumin-${game.id}`,
              name: game.title,
              directory: `lumin-id-${game.id}`,
              image: game.icon,
              category: "lumin",
              plays: Math.floor(Math.random() * 40000) + 10000,
              rating: Number((4.6 + Math.random() * 0.3).toFixed(1)),
            }));
            results.push(...luminGames);
          }
        } catch (err) {
          console.error("Failed to stream inventory from Lumin engine:", err);
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch games list:", err);
  }

  return results;
}
