// Custom games list module
// --- Existing code from your provided snippet ---
import { getCoverStyle } from "./frostedStore";

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

export const GN_COVERS_CDN = "https://cdn.jsdelivr.net/gh/freebuisness/covers@main";
export const GN_ZONES_URL = "https://cdn.jsdelivr.net/gh/freebuisness/assets@latest/zones.json";
export const GN_GAME_PROXY = "/api/public/gn/game";
export const SERAPH_GAME_PROXY = "/api/public/seraph";
export const THREE_KH0_GAME_PROXY = "/api/public/3kh0";

export const SERAPH_GAMES: Game[] = [];
const DEPRECATED_SERAPH_LIST: Game[] = [];

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

export function createStyledSvgCover(title: string, category: string = "game"): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colorPairs = [
    ["#4f46e5", "#7c3aed"],
    ["#2563eb", "#0284c7"],
    ["#0d9488", "#059669"],
    ["#d97706", "#dc2626"],
    ["#c026d3", "#e11d48"],
    ["#7c3aed", "#c026d3"],
    ["#0284c7", "#4f46e5"],
    ["#059669", "#0d9488"],
    ["#e11d48", "#d97706"],
    ["#9333ea", "#4f46e5"],
  ];

  const pair = colorPairs[Math.abs(hash) % colorPairs.length];
  const color1 = pair[0];
  const color2 = pair[1];

  const cleanTitle = title.length > 28 ? title.slice(0, 26) + "..." : title;
  const escapeXml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const upperCat = (category || "game").toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}" />
        <stop offset="100%" stop-color="${color2}" />
      </linearGradient>
      <linearGradient id="overlay" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="rgba(15,23,42,0.85)" />
        <stop offset="60%" stop-color="rgba(15,23,42,0.2)" />
        <stop offset="100%" stop-color="rgba(15,23,42,0.4)" />
      </linearGradient>
    </defs>
    <rect width="400" height="250" fill="url(#bg)" />
    <g opacity="0.08" stroke="#ffffff" stroke-width="1">
      <line x1="0" y1="50" x2="400" y2="50" />
      <line x1="0" y1="100" x2="400" y2="100" />
      <line x1="0" y1="150" x2="400" y2="150" />
      <line x1="0" y1="200" x2="400" y2="200" />
      <line x1="100" y1="0" x2="100" y2="250" />
      <line x1="200" y1="0" x2="200" y2="250" />
      <line x1="300" y1="0" x2="300" y2="250" />
    </g>
    <rect width="400" height="250" fill="url(#overlay)" />
    <g transform="translate(260, 30) scale(1.6)" opacity="0.15" fill="#ffffff">
      <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5-1.5z"/>
    </g>
    <g transform="translate(176, 50)" fill="rgba(255,255,255,0.9)">
      <path d="M43.2 8H4.8C2.15 8 0 10.15 0 12.8v22.4C0 37.85 2.15 40 4.8 40h38.4c2.65 0 4.8-2.15 4.8-4.8V12.8C48 10.15 45.85 8 43.2 8zm-22.4 18h-4.8v4.8h-4.8v-4.8H6.4v-4.8h4.8v-4.8h4.8v4.8h4.8v4.8zm11.4 4.8c-1.99 0-3.6-1.61-3.6-3.6s1.61-3.6 3.6-3.6 3.6 1.61 3.6 3.6-1.61 3.6-3.6 3.6zm7.2-7.2c-1.99 0-3.6-1.61-3.6-3.6s1.61-3.6 3.6-3.6 3.6 1.61 3.6 3.6-1.61 3.6-3.6 3.6z" opacity="0.85"/>
    </g>
    <rect x="24" y="145" width="${upperCat.length * 8 + 16}" height="20" rx="10" fill="rgba(255,255,255,0.2)" />
    <text x="32" y="159" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" fill="#ffffff" letter-spacing="1">${upperCat}</text>
    <text x="24" y="195" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" fill="#ffffff">${escapeXml(cleanTitle)}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function gameCover(game: Game) {
  if (game.image) {
    return game.image;
  }

  if (typeof game.id === "number" || (typeof game.id === "string" && !isNaN(Number(game.id)))) {
    return `${GN_COVERS_CDN}/${game.id}.png`;
  }

  return createStyledSvgCover(game.name || "Game", game.category);
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
    n.includes("minecraft") ||
    n.includes("hole.io") ||
    n.includes("among us")
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
    n.includes("smash karts")
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
    n.includes("action") ||
    n.includes("happy wheels") ||
    n.includes("baldi")
  ) {
    return "action";
  }
  if (
    n.includes("mario") ||
    n.includes("pacman") ||
    n.includes("pac-man") ||
    n.includes("sonic") ||
    n.includes("tetris") ||
    n.includes("retro") ||
    n.includes("arcade") ||
    n.includes("atari") ||
    n.includes("classic") ||
    n.includes("zelda") ||
    n.includes("pokemon") ||
    n.includes("punch-out") ||
    n.includes("punchout") ||
    n.includes("sm64") ||
    n.includes("fnf")
  ) {
    return "retro";
  }
  if (
    n.includes("2048") ||
    n.includes("sudoku") ||
    n.includes("chess") ||
    n.includes("checkers") ||
    n.includes("cut the rope") ||
    n.includes("bad piggies") ||
    n.includes("bloons") ||
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
  "sm64",
  "holeio",
  "slope",
  "1v1lol",
  "retrobowl",
  "subwaysurfers",
  "motox3m",
  "cookieclicker",
  "mariokart64",
  "pokemonemerald",
  "badicecream3",
  "pandemic2",
  "happywheels",
  "amongus",
  "geometrydash",
  "bitlife",
  "basketballstars",
  "drifthunters",
  "crossyroad",
  "supermarioworld",
  "tetris",
  "ocarinaoftime",
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
    slope2: "Slope 2",
    retrobowl: "Retro Bowl",
    subwaysurfers: "Subway Surfers",
    motox3m: "Moto X3M",
    motox3mpool: "Moto X3M Pool",
    motox3mspooky: "Moto X3M Spooky",
    motox3mwinter: "Moto X3M Winter",
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
    sm64ds: "Super Mario 64 DS",
    holeio: "Hole.io",
    pandemic2: "Pandemic 2",
    punchout: "Punch-Out!!",
    badicecream: "Bad Ice Cream",
    badicecream2: "Bad Ice Cream 2",
    badicecream3: "Bad Ice Cream 3",
    badpiggies: "Bad Piggies",
    baldisbasics: "Baldi's Basics",
    bloonstd4: "Bloons TD 4",
    bloonstd5: "Bloons TD 5",
    crossyroad: "Crossy Road",
    cuttherope: "Cut the Rope",
    doodlejump: "Doodle Jump",
    happywheels: "Happy Wheels",
    mariokart64: "Mario Kart 64",
    mariokartds: "Mario Kart DS",
    papermario: "Paper Mario",
    pokemonemerald: "Pokemon Emerald",
    pokemonfirered: "Pokemon FireRed",
    pokemonsoulsilver: "Pokemon SoulSilver",
    pokemonplatinum: "Pokemon Platinum",
    supermarioworld: "Super Mario World",
    supermariobros: "Super Mario Bros.",
    supermariobros3: "Super Mario Bros. 3",
    supermariokart: "Super Mario Kart",
    thelegendofzelda: "The Legend of Zelda",
    ocarinaoftime: "The Legend of Zelda: Ocarina of Time",
    pacman: "Pac-Man",
    pacmanworld: "Pac-Man World",
    tetris: "Tetris Classic",
    worldshardestgame: "World's Hardest Game",
    stickmanhook: "Stickman Hook",
    amongus: "Among Us",
    alteredbeast: "Altered Beast",
    aquaparkslides: "Aquapark Slides",
    amazingropepolice: "Amazing Rope Police",
    advancewars: "Advance Wars",
    advancewars2: "Advance Wars 2",
    sonicthehedgehog: "Sonic the Hedgehog",
    sonicthehedgehog2: "Sonic the Hedgehog 2",
    sonicadvance: "Sonic Advance",
    smashkarts: "Smash Karts",
    deathrun3d: "Death Run 3D",
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
              isGnGame: true,
            };
          });
      }
    }
  } catch (err) {
    console.warn("Failed to fetch gn-math games:", err);
  }

  const gnCoverLookup = new Map<string, string>();
  const gnCoverList: Array<{ clean: string; urlSlug: string; cover: string }> = [];

  for (const g of gnMathGames) {
    if (g.image && g.image.startsWith("http")) {
      const clean = (g.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      gnCoverLookup.set(clean, g.image);

      let urlSlug = "";
      if (g.directory) {
        const parts = g.directory.split("/");
        urlSlug = (parts[parts.length - 1] || parts[parts.length - 2] || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .replace(/\.html$/, "");
      }
      gnCoverList.push({ clean, urlSlug, cover: g.image });
    }
  }

  const allList = [customGame, ...gnMathGames];

  return allList;
}
