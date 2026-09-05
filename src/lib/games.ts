// Custom games list module
// --- Existing code from your provided snippet ---
import luminSdkGamesData from "../data/luminSdkGames.json";
import gnZonesData from "../data/gnZones.json";
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
  isGnGame?: boolean;
  isSdkGame?: boolean;
};

export const GN_COVERS_CDN = "https://raw.githubusercontent.com/freebuisness/covers/main";
export const GN_COVERS_RAW = "https://raw.githubusercontent.com/freebuisness/covers/main";

// Authoritative verified covers mapping for accurate representation
export const AUTHORITATIVE_COVERS: Record<string, string> = {
  // Minecraft titles
  minecraft: `${GN_COVERS_CDN}/183.png`,
  minecraft188: `${GN_COVERS_CDN}/181.png`,
  minecraft1122: `${GN_COVERS_CDN}/182.png`,
  minecraft1214: `${GN_COVERS_CDN}/183.png`,
  minecraft152: `${GN_COVERS_CDN}/297.png`,
  minecraftpocketedition: `${GN_COVERS_CDN}/754.png`,
  minecraftwurst: `${GN_COVERS_CDN}/183.png`,
  creepercraft: `${GN_COVERS_CDN}/183.png`,
  mojolauncherminecraft: `${GN_COVERS_CDN}/183.png`,
  eaglercraft: `${GN_COVERS_CDN}/181.png`,

  // Five Nights at Freddy's series
  fnaf: `${GN_COVERS_CDN}/38.png`,
  fivenightsatfreddys: `${GN_COVERS_CDN}/38.png`,
  fnaf1: `${GN_COVERS_CDN}/38.png`,
  fivenightsatfreddys1: `${GN_COVERS_CDN}/38.png`,
  fnaf2: `${GN_COVERS_CDN}/39.png`,
  fivenightsatfreddys2: `${GN_COVERS_CDN}/39.png`,
  fnaf3: `${GN_COVERS_CDN}/40.png`,
  fivenightsatfreddys3: `${GN_COVERS_CDN}/40.png`,
  fnaf4: `${GN_COVERS_CDN}/41.png`,
  fivenightsatfreddys4: `${GN_COVERS_CDN}/41.png`,
  fivenightsatfreddys4halloween: `${GN_COVERS_CDN}/428.png`,
  fivenightsatfreddyssisterlocation: `${GN_COVERS_CDN}/185.png`,
  fivenightsatfreddysworld: `${GN_COVERS_CDN}/190.png`,
  fivenightsatfreddyspizzasimulator: `${GN_COVERS_CDN}/191.png`,
  fivenightsatfreddysultimatecustomnight: `${GN_COVERS_CDN}/192.png`,
  fivenightsatfreddysucn: `${GN_COVERS_CDN}/192.png`,
  fivenightsatcandys: `${GN_COVERS_CDN}/503.png`,
  fivenightsatcandys2: `${GN_COVERS_CDN}/504.png`,

  // Run series
  run: `${GN_COVERS_CDN}/175.png`,
  run1: `${GN_COVERS_CDN}/175.png`,
  run2: `${GN_COVERS_CDN}/176.png`,
  run3: `${GN_COVERS_CDN}/177.png`,
  run3editor: `${GN_COVERS_CDN}/177.png`,

  // Duck Life
  ducklife: `${GN_COVERS_CDN}/234.png`,
  ducklife1: `${GN_COVERS_CDN}/234.png`,
  ducklife2: `${GN_COVERS_CDN}/235.png`,
  ducklife3: `${GN_COVERS_CDN}/236.png`,
  ducklife4: `${GN_COVERS_CDN}/237.png`,
  ducklife5: `${GN_COVERS_CDN}/238.png`,
  ducklife6: `${GN_COVERS_CDN}/695.png`,
  ducklife8: `${GN_COVERS_CDN}/695.png`,

  // Bloons TD
  bloonstd: `${GN_COVERS_CDN}/71.png`,
  bloonstd1: `${GN_COVERS_CDN}/71.png`,
  bloonstd2: `${GN_COVERS_CDN}/72.png`,
  bloontd2: `${GN_COVERS_CDN}/72.png`,
  bloonstd3: `${GN_COVERS_CDN}/73.png`,
  bloonstd4: `${GN_COVERS_CDN}/74.png`,
  bloontd4: `${GN_COVERS_CDN}/74.png`,
  bloonstd5: `${GN_COVERS_CDN}/75.png`,

  // Fancy Pants
  fancypantsadventure: `${GN_COVERS_CDN}/333.png`,
  fancypantsadventures: `${GN_COVERS_CDN}/333.png`,
  fancypantsadventure2: `${GN_COVERS_CDN}/334.png`,
  fancypantsadventures2: `${GN_COVERS_CDN}/334.png`,
  fancypantsadventure3: `${GN_COVERS_CDN}/335.png`,
  fancypantsadventures3: `${GN_COVERS_CDN}/335.png`,
  fancypantsadventure4part1: `${GN_COVERS_CDN}/336.png`,
  fancypantsadventure4part2: `${GN_COVERS_CDN}/337.png`,

  // Riddle School / Transfer
  riddleschool: `${GN_COVERS_CDN}/287.png`,
  riddleschool1: `${GN_COVERS_CDN}/287.png`,
  riddleschool2: `${GN_COVERS_CDN}/288.png`,
  riddleschool3: `${GN_COVERS_CDN}/289.png`,
  riddleschool4: `${GN_COVERS_CDN}/290.png`,
  riddleschool5: `${GN_COVERS_CDN}/291.png`,
  riddletransfer: `${GN_COVERS_CDN}/292.png`,
  riddleschooltransfer: `${GN_COVERS_CDN}/292.png`,
  riddletransfer2: `${GN_COVERS_CDN}/293.png`,
  riddleschooltransfer2: `${GN_COVERS_CDN}/293.png`,

  // Red Ball
  redball: `${GN_COVERS_CDN}/239.png`,
  redball1: `${GN_COVERS_CDN}/239.png`,
  redball2: `${GN_COVERS_CDN}/240.png`,
  redball3: `${GN_COVERS_CDN}/241.png`,
  redball4: `${GN_COVERS_CDN}/242.png`,
  redball4vol2: `${GN_COVERS_CDN}/243.png`,
  redball4vol3: `${GN_COVERS_CDN}/244.png`,

  // Wheely
  wheely: `${GN_COVERS_CDN}/245.png`,
  wheely1: `${GN_COVERS_CDN}/245.png`,
  wheely2: `${GN_COVERS_CDN}/246.png`,
  wheely3: `${GN_COVERS_CDN}/247.png`,
  wheely4: `${GN_COVERS_CDN}/248.png`,
  wheely5: `${GN_COVERS_CDN}/249.png`,
  wheely6: `${GN_COVERS_CDN}/250.png`,
  wheely7: `${GN_COVERS_CDN}/251.png`,
  wheely8: `${GN_COVERS_CDN}/252.png`,

  // Doom
  doom: `${GN_COVERS_CDN}/203.png`,
  doom1: `${GN_COVERS_CDN}/203.png`,
  wasmdoom: `${GN_COVERS_CDN}/203.png`,
  doom2: `${GN_COVERS_CDN}/602.png`,
  doom3: `${GN_COVERS_CDN}/626.png`,

  // Retro Bowl & Slope & Sports
  retrobowl: `${GN_COVERS_CDN}/33.png`,
  retrobowlcollege: `${GN_COVERS_CDN}/34.png`,
  slope: `${GN_COVERS_CDN}/198.png`,
  awesometanks: `${GN_COVERS_CDN}/436.png`,
  awesometanks2: `${GN_COVERS_CDN}/437.png`,
  tanks: `${GN_COVERS_CDN}/436.png`,
  googlebaseball: `${GN_COVERS_CDN}/257.png`,
  baseball: `${GN_COVERS_CDN}/257.png`,
  pool: `${GN_COVERS_CDN}/115.png`,
  "8ballpool": `${GN_COVERS_CDN}/115.png`,

  // Cut the rope
  cuttherope: `${GN_COVERS_CDN}/212.png`,
  cuttheropetimetravel: `${GN_COVERS_CDN}/213.png`,
  cuttheropeholidaygift: `${GN_COVERS_CDN}/214.png`,
  cuttheropeholday: `${GN_COVERS_CDN}/214.png`,

  // Baldi
  baldisbasicsclassic: `${GN_COVERS_CDN}/65.png`,
  baldisbasics: `${GN_COVERS_CDN}/65.png`,
  baldisbasicsremastered: `${GN_COVERS_CDN}/466.png`,
  baldisbasicsplus: `${GN_COVERS_CDN}/467.png`,
  baldisbasicsultradecompile: `${GN_COVERS_CDN}/815.png`,

  // Sonic
  soniccd: `${GN_COVERS_CDN}/589.png`,
  sonicmania: `${GN_COVERS_CDN}/590.png`,
  sonicthehedgehog2: `${GN_COVERS_CDN}/549.png`,
  sonicthehedgehog3: `${GN_COVERS_CDN}/550.png`,
  sonicexe: `${GN_COVERS_CDN}/598.png`,
  sonicroboblast2: `${GN_COVERS_CDN}/770.png`,

  // Mario
  supermariobros: `${GN_COVERS_CDN}/508.png`,
  supermariobros1: `${GN_COVERS_CDN}/508.png`,
  supermario64: `${GN_COVERS_CDN}/588.png`,
  supermario63: `${GN_COVERS_CDN}/314.png`,
  jellymario: `${GN_COVERS_CDN}/315.png`,
  supermariobrosremastered: `${GN_COVERS_CDN}/736.png`,

  // Vex
  vex1: `${GN_COVERS_CDN}/45.png`,
  vex2: `${GN_COVERS_CDN}/46.png`,
  vex3: `${GN_COVERS_CDN}/47.png`,
  vex3xmas: `${GN_COVERS_CDN}/48.png`,
  vex4: `${GN_COVERS_CDN}/49.png`,
  vex5: `${GN_COVERS_CDN}/50.png`,
  vex6: `${GN_COVERS_CDN}/51.png`,
  vex7: `${GN_COVERS_CDN}/52.png`,
  vex8: `${GN_COVERS_CDN}/53.png`,
  vexchallenges: `${GN_COVERS_CDN}/54.png`,
  vexx3m: `${GN_COVERS_CDN}/55.png`,
  vexx3m2: `${GN_COVERS_CDN}/56.png`,

  // Papa's
  papasbakeria: `${GN_COVERS_CDN}/218.png`,
  papasburgeria: `${GN_COVERS_CDN}/219.png`,
  papascheeseria: `${GN_COVERS_CDN}/220.png`,
  papascupcakeria: `${GN_COVERS_CDN}/221.png`,
  papasdonuteria: `${GN_COVERS_CDN}/222.png`,
  papasfreezeria: `${GN_COVERS_CDN}/223.png`,
  papashotdoggeria: `${GN_COVERS_CDN}/224.png`,
  papaspancakeria: `${GN_COVERS_CDN}/225.png`,
  papaspastaria: `${GN_COVERS_CDN}/226.png`,
  papaspizzeria: `${GN_COVERS_CDN}/227.png`,
  papasscooperia: `${GN_COVERS_CDN}/228.png`,
  papassushiria: `${GN_COVERS_CDN}/229.png`,
  papastacomia: `${GN_COVERS_CDN}/230.png`,
  papaswingeria: `${GN_COVERS_CDN}/231.png`,

  // FNF mods
  fridaynightfunkin: `${GN_COVERS_CDN}/8.png`,
  fnf: `${GN_COVERS_CDN}/8.png`,
  fridaynightfunkinvswhitty: `${GN_COVERS_CDN}/474.png`,
  fridaynightfunkinbsides: `${GN_COVERS_CDN}/475.png`,
  fridaynightfunkinvshex: `${GN_COVERS_CDN}/476.png`,
  fridaynightfunkinvshatsunemiku: `${GN_COVERS_CDN}/477.png`,
  fridaynightfunkinxmiku: `${GN_COVERS_CDN}/477.png`,
  fridaynightfunkinneo: `${GN_COVERS_CDN}/478.png`,
  fridaynightfunkinsarventesmidfightmasses: `${GN_COVERS_CDN}/480.png`,
  fridaynightfunkinmidfightmasses: `${GN_COVERS_CDN}/480.png`,
  fridaynightfunkinvstricky: `${GN_COVERS_CDN}/481.png`,
  fridaynightfunkinvsgarcello: `${GN_COVERS_CDN}/485.png`,
  fridaynightfunkinsoniclegacy: `${GN_COVERS_CDN}/486.png`,
  fridaynightfunkinvsqt: `${GN_COVERS_CDN}/487.png`,
  fridaynightfunkinindiecross: `${GN_COVERS_CDN}/489.png`,
  fridaynightfunkinvsbopcity: `${GN_COVERS_CDN}/497.png`,
  bopcity: `${GN_COVERS_CDN}/497.png`,
  fridaynightfunkin17bucks: `${GN_COVERS_CDN}/498.png`,
  fridaynightfunkintwiddlefinger: `${GN_COVERS_CDN}/500.png`,
  fridaynightfunkinsoft: `${GN_COVERS_CDN}/509.png`,
  fridaynightfunkinvskapi: `${GN_COVERS_CDN}/555.png`,
  fridaynightfunkinvssky: `${GN_COVERS_CDN}/556.png`,
  fridaynightfunkinvsshaggy: `${GN_COVERS_CDN}/559.png`,
  fridaynightfunkinmariosmadness: `${GN_COVERS_CDN}/582.png`,
  fridaynightfunkinvshypnolullaby: `${GN_COVERS_CDN}/583.png`,
  fridaynightfunkinvsimpostorv4: `${GN_COVERS_CDN}/608.png`,
  fridaynightfunkinvsimpostorbsides: `${GN_COVERS_CDN}/639.png`,
  fridaynightfunkindsides: `${GN_COVERS_CDN}/636.png`,
  fridaynightfunkinvsundertale: `${GN_COVERS_CDN}/657.png`,
  fnfvssonicexe3040: `${GN_COVERS_CDN}/601.png`,
};
export const GN_ZONES_URL = "https://rawcdn.githack.com/freebuisness/assets/main/zones.json";
export const GN_GAME_PROXY = "/api/public/gn/game";
export const SERAPH_GAME_PROXY = "/api/public/seraph";
export const THREE_KH0_GAME_PROXY = "/api/public/3kh0";

export const SERAPH_GAMES: Game[] = [];
const DEPRECATED_SERAPH_LIST: Game[] = [];

export interface GameSource {
  id: string;
  name: string;
  url: string;
  badge?: string;
  isCdn?: boolean;
}

// Build fast static lookup maps from gnZones
const zoneMapById: Record<string, string> = {};
const zoneMapByName: Record<string, string> = {};

for (const z of gnZonesData as Array<{ id?: number; name?: string; url?: string }>) {
  if (z.url) {
    const fn = z.url.replace("{HTML_URL}/", "").replace(/^https?:\/\/[^/]+\//, "");
    if (z.id !== undefined && z.id !== null) {
      zoneMapById[String(z.id)] = fn;
    }
    if (z.name) {
      const cleanN = z.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      zoneMapByName[cleanN] = fn;
    }
  }
}

const GN_ALIASES: Record<string, string> = {
  papaspizza: "227.html",
  papaspizzeria: "227.html",
  papaspizzaeria: "227.html",
  sonic2: "549.html",
  "2sonic": "549.html",
  geometrydashremastered: "785-upd3.html",
  geodashrm: "785-upd3.html",
  geometrydash: "785-upd3.html",
  pokemonblue: "505.html",
  pokemoncrystal: "506-f.html",
  pokemonfirered: "694.html",
  pokemonheartgold: "696-f.html",
  undertale: "456-f.html",
  run3: "177.html",
  run3editor: "177.html",
  editor: "177.html",
  gravityrun: "177.html",
  bloonsplayerpack5: "74.html",
  wheely1: "201.html",
  tanks: "225.html",
  extremerun3d: "233.html",
  extremerun: "233.html",
  soniccd: "589-f.html",
};

/**
 * Resolves exact GN-math HTML filename from any identifier (e.g. "467" -> "467-updateef.html", "soniccd" -> "589-f.html")
 */
export function resolveExactGnFilename(identifier: string): string {
  if (!identifier) return "";
  const clean = identifier
    .replace(/^\/+/, "")
    .replace(/^(selenite|truffled|quasar|builtin|sdk|games|3kh0)\//, "")
    .replace(/\.html$/i, "");

  if (zoneMapById[clean]) {
    return zoneMapById[clean];
  }

  const normName = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (GN_ALIASES[normName]) {
    return GN_ALIASES[normName];
  }
  if (zoneMapByName[normName]) {
    return zoneMapByName[normName];
  }

  const numMatch = clean.match(/^(\d+)/);
  if (numMatch && zoneMapById[numMatch[1]]) {
    return zoneMapById[numMatch[1]];
  }

  return "";
}

export function getGameSources(game: Game): GameSource[] {
  if (!game) return [];
  const dir = String(game.directory || "").trim();
  const idStr = String(game.id || "");
  const baseSlug = dir
    .replace(/^games\//, "")
    .replace(/^3kh0\//, "")
    .replace(/^(selenite|truffled|quasar|builtin|sdk)\//, "")
    .replace(/\.html$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const sources: GameSource[] = [];

  // 1. Direct external / special links
  if (
    dir.startsWith("http://") ||
    dir.startsWith("https://") ||
    dir.startsWith("/api/") ||
    dir.startsWith("/~/")
  ) {
    return [{ id: "direct", name: "Direct", url: dir, isCdn: true }];
  }

  // Slope & Slope 3 custom URL
  if (
    dir === "sdk/selenite/slope" ||
    dir === "sdk/selenite/slope3" ||
    dir === "198.html" ||
    dir.includes("slope-game_2025_v3") ||
    (game.name &&
      (game.name.toLowerCase() === "slope" ||
        game.name.toLowerCase() === "slope 3" ||
        game.name.toLowerCase() === "slope3"))
  ) {
    return [
      {
        id: "gn-proxy",
        name: "GN Fast Proxy (Shielded)",
        url: "/api/public/gn/game/198.html",
      },
      {
        id: "gn-cdn",
        name: "GN-Math CDN",
        url: "https://rawcdn.githack.com/gn-math/html/main/198.html",
        isCdn: true,
      },
      {
        id: "y8-slope",
        name: "Official Y8 WebGL",
        url: "https://storage.y8.com/y8-studio/unity_webgl/Gani/slope-game_2025_v3/",
        badge: "Official",
      },
    ];
  }

  // Check if cover image contains a numeric zone ID (e.g. /467.png -> zone 467)
  let coverNum = "";
  const coverMatch = (game.image || "").match(/\/(\d+)\.png/);
  if (coverMatch && coverMatch[1]) {
    coverNum = coverMatch[1];
  }

  // Extract numeric filename if any
  let numStr = coverNum;
  if (!numStr) {
    const dirNumMatch = dir.match(/^(\d+(?:-[a-z0-9]+)?)(?:\.html)?$/i);
    if (dirNumMatch && dirNumMatch[1]) {
      numStr = dirNumMatch[1];
    } else {
      const idNumMatch = idStr.match(/^(?:gn-)?(\d+(?:-[a-z0-9]+)?)$/i);
      if (idNumMatch && idNumMatch[1]) {
        numStr = idNumMatch[1];
      }
    }
  }

  // Resolve exact working filename in GN catalog
  const exactGnFile =
    resolveExactGnFilename(numStr) ||
    resolveExactGnFilename(game.name) ||
    resolveExactGnFilename(dir) ||
    resolveExactGnFilename(baseSlug);

  // If we found a verified GN file, add shielded proxy and CDN sources as FIRST PRIORITY
  if (exactGnFile) {
    sources.push({
      id: "gn-proxy",
      name: "Shielded Proxy (Fast)",
      url: `/api/public/gn/game/${exactGnFile}`,
    });
    sources.push({
      id: "gn-cdn",
      name: "GN-Math CDN",
      url: `https://rawcdn.githack.com/gn-math/html/main/${exactGnFile}`,
      isCdn: true,
    });
    sources.push({
      id: "gn-gh-raw",
      name: "GitHub Raw Mirror",
      url: `https://raw.githubusercontent.com/gn-math/html/main/${exactGnFile}`,
    });
  }

  // Also add Seraph & Selenite authentic mirrors if slug is known
  if (baseSlug) {
    sources.push({
      id: "seraph-proxy",
      name: "Seraph Library Mirror",
      url: `/api/public/seraph/games/${baseSlug}/index.html`,
    });
    sources.push({
      id: "selenite-proxy",
      name: "Selenite Mirror",
      url: `/api/public/g/${baseSlug}/index.html`,
    });
  }

  // If still no sources, fallback to GN proxy with directory
  if (sources.length === 0) {
    sources.push({
      id: "gn-proxy",
      name: "Shielded Proxy",
      url: `/api/public/gn/game/${dir}`,
    });
  }

  return sources;
}

export function getGameEmbedUrl(game: Game): string {
  if (!game) return "";
  const sources = getGameSources(game);
  if (sources.length === 0) return "";
  return sources[0]?.url || "";
}

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
    return `https://rawcdn.githack.com/a456pur/seraph/main/${directory}/index.html`;
  }
  if (directory.startsWith("3kh0/")) {
    return `https://rawcdn.githack.com/3kh0/3kh0-Assets/main/${directory.replace("3kh0/", "")}/index.html`;
  }

  const numMatch = directory.match(/^(\d+(?:-[a-z0-9]+)?)(?:\.html)?$/i);
  if (numMatch && numMatch[1]) {
    return `https://rawcdn.githack.com/gn-math/html/main/${numMatch[1]}.html`;
  }

  if (directory.endsWith(".html")) {
    return `https://rawcdn.githack.com/gn-math/html/main/${directory}`;
  }

  return `https://rawcdn.githack.com/gn-math/html/main/${directory}.html`;
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
  if (!game) return createStyledSvgCover("Game", "game");

  const nameClean = (game.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Check authoritative covers dictionary first
  if (AUTHORITATIVE_COVERS[nameClean]) {
    return AUTHORITATIVE_COVERS[nameClean];
  }

  // 2. If valid existing image that is not broken/placeholder
  if (
    game.image &&
    !game.image.startsWith("data:image/svg+xml") &&
    !game.image.includes("luminsdk.com")
  ) {
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
  "retrobowl",
  "retrobowlcollege",
  "sm64",
  "holeio",
  "slope",
  "1v1lol",
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
  let gnMathGames: Game[] = [];
  const gnCoverLookup = new Map<string, string>();
  const gnCoverList: Array<{ clean: string; urlSlug: string; cover: string }> = [];

  let rawData: any = gnZonesData;
  try {
    const res = await fetch(GN_ZONES_URL);
    if (res.ok) {
      const fetched = await res.json();
      if (Array.isArray(fetched) && fetched.length > 0) {
        rawData = fetched;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live gn-math games, using built-in catalog:", err);
  }

  if (Array.isArray(rawData)) {
    // Collect covers for image resolution lookup across the library
    for (const item of rawData) {
      if (item && item["name"] && item["cover"]) {
        const clean = String(item["name"])
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const coverUrl = String(item["cover"]).replace("{COVER_URL}", GN_COVERS_CDN);
        gnCoverLookup.set(clean, coverUrl);

        const rawUrl = String(item["url"] || "");
        const filename = rawUrl.replace("{HTML_URL}/", "").replace(/^https?:\/\/[^/]+\//, "");
        const parts = filename.split("/");
        const dirSlug = (parts[parts.length - 1] || parts[parts.length - 2] || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .replace(/\.html$/, "");

        gnCoverList.push({ clean, urlSlug: dirSlug, cover: coverUrl });
      }
    }

    // Include all valid games from the GN catalog
    gnMathGames = rawData
      .filter((item: Record<string, unknown>) => {
        if (
          !item ||
          typeof item["id"] !== "number" ||
          item["id"] <= 0 ||
          !item["url"] ||
          !item["name"]
        ) {
          return false;
        }
        const name = String(item["name"]);
        if (name.includes("SUGGEST GAMES") || name.includes("JOIN DISCORD")) {
          return false;
        }
        return true;
      })
      .map((item: Record<string, unknown>) => {
        const rawUrl = String(item["url"] || "");
        const filename = rawUrl.replace("{HTML_URL}/", "").replace(/^https?:\/\/[^/]+\//, "");
        const coverUrl = String(item["cover"] || "").replace("{COVER_URL}", GN_COVERS_CDN);
        const name = String(item["name"]);
        const category = assignCategory(name);

        return {
          id: `gn-${item["id"]}`,
          name,
          directory: filename,
          image: coverUrl,
          author: item["author"] ? String(item["author"]) : undefined,
          authorLink: item["authorLink"] ? String(item["authorLink"]) : undefined,
          category,
          featured: false,
          plays: Math.floor(Math.random() * 50000) + 12000,
          rating: Number((4.5 + Math.random() * 0.4).toFixed(1)),
          isGnGame: true,
        };
      });
  }

  function resolveCoverForSdkGame(g: Game): string {
    const nameClean = (g.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    // 1. Authoritative verified cover
    if (AUTHORITATIVE_COVERS[nameClean]) {
      return AUTHORITATIVE_COVERS[nameClean];
    }

    // 2. Use already resolved high-res images from our JSON (Steam, Wiki, CDN)
    if (g.image && !g.image.startsWith("data:image/svg+xml") && !g.image.includes("luminsdk.com")) {
      return g.image;
    }

    // 3. Exact clean name match in GN math list
    if (gnCoverLookup.has(nameClean)) {
      return gnCoverLookup.get(nameClean)!;
    }

    let dirSlug = "";
    if (g.directory) {
      const parts = g.directory.split("/");
      dirSlug = (parts[parts.length - 1] || parts[parts.length - 2] || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .replace(/\.html$/, "");
    }

    const sdkId = (g as any).sdkGameId || "";
    const sdkIdSlug = sdkId
      .replace(/^[^/]+\//, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    // 4. Exact dir / sdkId slug match in GN math list
    if (dirSlug && dirSlug.length > 2) {
      const hit = gnCoverList.find((x) => x.urlSlug === dirSlug || x.clean === dirSlug);
      if (hit) return hit.cover;
    }
    if (sdkIdSlug && sdkIdSlug.length > 2) {
      const hit = gnCoverList.find((x) => x.urlSlug === sdkIdSlug || x.clean === sdkIdSlug);
      if (hit) return hit.cover;
    }

    // 5. Default high-res SVG cover
    return createStyledSvgCover(g.name || "Game", g.category);
  }

  const sdkGames: Game[] = (luminSdkGamesData as Array<Record<string, unknown>>).map((item) => {
    const raw: Game = {
      id: String(item["id"] || `sdk-${item["name"]}`),
      name: String(item["name"] || "Game"),
      directory: String(item["directory"] || ""),
      image: item["image"] ? String(item["image"]) : undefined,
      author: item["author"] ? String(item["author"]) : undefined,
      category: (item["category"] as GameCategory) || assignCategory(String(item["name"])),
      featured: Boolean(item["featured"]),
      plays: Number(item["plays"]) || 10000,
      rating: Number(item["rating"]) || 4.8,
      isSdkGame: true,
    };
    (raw as any).sdkGameId = item["sdkGameId"];
    (raw as any).imageToken = item["imageToken"];
    raw.image = resolveCoverForSdkGame(raw);
    return raw;
  });

  const allList = [...gnMathGames, ...sdkGames];

  // Smart normalization & deduplication engine
  const gameMap = new Map<string, Game>();

  function getNormalizedKey(game: Game): string {
    const nameLower = (game.name || "").toLowerCase();
    const dirLower = String(game.directory || "").toLowerCase();
    const isFnf =
      nameLower.includes("funkin") ||
      nameLower.includes("fnf") ||
      dirLower.includes("fnf") ||
      dirLower.includes("funkin");

    // Explicit FNF/Mod normalization mapping
    if (isFnf) {
      if (nameLower.includes("redux") || nameLower.includes("heartbreak")) {
        return "fnf_sky_redux";
      }
      if (nameLower.includes("sky")) {
        return "fnf_sky";
      }
      if (
        nameLower.includes("sarvente") ||
        nameLower.includes("mid-fight masses") ||
        nameLower.includes("midfight") ||
        nameLower.includes("masses")
      ) {
        return "fnf_sarventes";
      }
      if (nameLower.includes("miku")) {
        return "fnf_miku";
      }
      if (nameLower.includes("whitty")) {
        return "fnf_whitty";
      }
      if (nameLower.includes("hex")) {
        return "fnf_hex";
      }
      if (nameLower.includes("tricky")) {
        return "fnf_tricky";
      }
      if (nameLower.includes("neo")) {
        return "fnf_neo";
      }
      if (nameLower.includes("undertale")) {
        return "fnf_undertale";
      }
      if (nameLower.includes("soft")) {
        return "fnf_soft";
      }
      if (nameLower.includes("garcello")) {
        return "fnf_garcello";
      }
      if (nameLower.includes("shaggy")) {
        return "fnf_shaggy";
      }
      if (nameLower.includes("kapi")) {
        return "fnf_kapi";
      }
      if (nameLower.includes("impostor") && nameLower.includes("alternated")) {
        return "fnf_impostor_alternated";
      }
      if (nameLower.includes("impostor") && nameLower.includes("b-sides")) {
        return "fnf_impostor_bsides";
      }
      if (nameLower.includes("impostor")) {
        return "fnf_impostor_v4";
      }
      if (nameLower.includes("d-sides") || nameLower.includes("dsides")) {
        return "fnf_dsides";
      }
      if (nameLower.includes("b-sides") || nameLower.includes("bsides")) {
        return "fnf_bsides";
      }

      const nameWithoutSpecial = nameLower.replace(/[^a-z0-9]/g, "");
      if (nameWithoutSpecial === "fridaynightfunkin" || nameWithoutSpecial === "fnf") {
        return "fnf_base";
      }

      return `fnf_${game.id || game.name}`.toLowerCase().replace(/[^a-z0-9_]/g, "");
    }

    // Explicit Undertale normalization mapping
    if (nameLower.includes("undertale")) {
      if (nameLower.includes("yellow")) {
        return "undertaleyellow";
      }
      if (nameLower.includes("last breath") || nameLower.includes("lastbreath")) {
        if (nameLower.includes("phase three") || nameLower.includes("phase 3")) {
          return "undertale_lastbreath_phase3";
        }
        return "undertale_lastbreath";
      }
      return "undertale";
    }

    // Explicit Baldi normalization mapping
    if (
      nameLower.includes("baldi") ||
      dirLower.includes("baldi") ||
      dirLower.includes("bfs") ||
      dirLower.includes("bbcr") ||
      game.id === 65 ||
      game.id === 466 ||
      game.id === 467 ||
      game.id === 815
    ) {
      if (
        nameLower.includes("fun new school") ||
        nameLower.includes("ultimate") ||
        dirLower.includes("bfs") ||
        nameLower.includes("bfns")
      ) {
        return "baldis_fun_new_school_plus_ultimate";
      }
      if (nameLower.includes("remastered") || dirLower.includes("bbcr") || game.id === 466) {
        return "baldis_basics_remastered";
      }
      if (nameLower.includes("plus") || dirLower.includes("baldi-plus") || game.id === 467) {
        return "baldis_basics_plus";
      }
      if (nameLower.includes("ultra decompile") || game.id === 815) {
        return "baldis_basics_ultra_decompile";
      }
      return "baldis_basics_classic";
    }

    // Explicit Retro Bowl normalization mapping
    if (
      nameLower === "retro bowl" ||
      (dirLower.includes("retrobowl") &&
        !dirLower.includes("college") &&
        !nameLower.includes("college")) ||
      game.id === 33
    ) {
      return "retrobowl";
    }
    if (
      nameLower.includes("retro bowl college") ||
      dirLower.includes("retrobowlcollege") ||
      game.id === 34 ||
      game.id === "sdk-selenite-retrobowlcollege"
    ) {
      return "retrobowlcollege";
    }

    const cleanName = (game.name || String(game.id)).toLowerCase().replace(/[^a-z0-9]/g, "");

    return cleanName || String(game.id);
  }

  for (const g of allList) {
    const key = getNormalizedKey(g);
    if (!gameMap.has(key)) {
      gameMap.set(key, g);
    } else {
      const existing = gameMap.get(key)!;
      const bestImage =
        (existing.image && existing.image.startsWith("http") ? existing.image : null) ||
        (g.image && g.image.startsWith("http") ? g.image : null) ||
        existing.image ||
        g.image;

      if (key === "slope") {
        // User explicitly requested embedding https://storage.y8.com/y8-studio/unity_webgl/Gani/slope-game_2025_v3/ for Slope
        const gnVersion = (g as any).isGnGame ? g : existing;
        const sdkVersion = (g as any).isSdkGame ? g : existing;
        gameMap.set(key, {
          ...sdkVersion,
          ...gnVersion,
          directory: "https://storage.y8.com/y8-studio/unity_webgl/Gani/slope-game_2025_v3/",
          image: bestImage,
          featured: existing.featured || g.featured,
          rating: Math.max(existing.rating || 0, g.rating || 0),
        });
      } else if ((existing as any).isGnGame && (g as any).isSdkGame) {
        // Keep GN math authentic verified directory, inherit metadata
        gameMap.set(key, {
          ...g,
          ...existing,
          image: bestImage,
          featured: existing.featured || g.featured,
          rating: Math.max(existing.rating || 0, g.rating || 0),
        });
      } else if ((existing as any).isSdkGame && (g as any).isGnGame) {
        // Switch to GN math authentic verified directory
        gameMap.set(key, {
          ...existing,
          ...g,
          image: bestImage,
          featured: existing.featured || g.featured,
          rating: Math.max(existing.rating || 0, g.rating || 0),
        });
      } else if (!existing.featured && g.featured) {
        gameMap.set(key, { ...existing, ...g, image: bestImage, featured: true });
      } else {
        gameMap.set(key, { ...existing, ...g, image: bestImage });
      }
    }
  }

  const resultList = Array.from(gameMap.values());

  const getPriorityScore = (g: Game) => {
    const nameLower = (g.name || "").toLowerCase();
    if (nameLower === "retro bowl") return 100;
    if (nameLower === "retro bowl college") return 99;
    if (nameLower === "slope") return 97;
    if (nameLower.includes("1v1")) return 96;
    if (nameLower.includes("subway surfers")) return 95;
    if (g.featured) return 50;
    return 0;
  };

  return resultList.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
}
