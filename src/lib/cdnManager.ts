import gnZonesData from "../data/gnZones.json";

// Raw Git Hack CDN (rawcdn.githack.com / raw.githack.com) configuration & game URL builders
export type CdnNetwork = "rawgithack" | "rawcdngithack";

export const CDN_DOMAIN = "rawcdn.githack.com";
export const CDN_BASE_URL = "https://rawcdn.githack.com";

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

/**
 * Resolves exact GN-math HTML filename from any identifier (e.g. "467" -> "467-updateef.html", "soniccd" -> "589-f.html")
 */
export function resolveExactGnFilename(identifier: string): string {
  if (!identifier) return "";
  const clean = identifier.replace(/^\/+/, "").replace(/\.html$/i, "");

  // Check if direct ID in zones map
  if (zoneMapById[clean]) {
    return zoneMapById[clean];
  }

  // Check normalized name
  const normName = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (zoneMapByName[normName]) {
    return zoneMapByName[normName];
  }

  // Check numeric prefix (e.g. "467-baldi" -> check 467)
  const numMatch = clean.match(/^(\d+)/);
  if (numMatch && zoneMapById[numMatch[1]]) {
    return zoneMapById[numMatch[1]];
  }

  // If already ends in .html or is direct file name
  if (identifier.endsWith(".html")) {
    return identifier;
  }

  return `${clean}.html`;
}

/**
 * Builds a direct Raw Git Hack CDN URL for a GitHub file
 */
export function buildGhUrl(owner: string, repo: string, ref = "main", path = ""): string {
  const cleanPath = path.replace(/^\/+/, "");
  return `https://rawcdn.githack.com/${owner}/${repo}/${ref}/${cleanPath}`;
}

/**
 * Resolves candidate URLs for loading a given game asset across verified CDN and GitHub endpoints
 */
export function getGameCandidateUrls(
  rawFilename: string,
): { url: string; baseUrl: string; cdnName: string }[] {
  const filename = rawFilename.replace(/^\/+/, "");
  const baseSlug = filename
    .replace(/^games\//, "")
    .replace(/^3kh0\//, "")
    .replace(/^(selenite|truffled|quasar|builtin|sdk)\//, "")
    .replace(/\.html$/i, "");

  const candidates: { url: string; baseUrl: string; cdnName: string }[] = [];

  // Helper to add URL & its base
  const addCandidate = (url: string, cdnName: string) => {
    const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
    candidates.push({ url, baseUrl, cdnName });
  };

  // 1. Resolve exact working HTML file in gn-math
  const exactFile = resolveExactGnFilename(filename) || resolveExactGnFilename(baseSlug);

  if (exactFile) {
    // Primary Raw Git Hack CDN GN-Math
    addCandidate(
      `https://rawcdn.githack.com/gn-math/html/main/${exactFile}`,
      "Raw Git Hack CDN GN-Math",
    );
    // Raw Git Hack mirror
    addCandidate(`https://raw.githack.com/gn-math/html/main/${exactFile}`, "Raw Git Hack GN-Math");
    // Direct GitHub Raw GN-Math
    addCandidate(
      `https://raw.githubusercontent.com/gn-math/html/main/${exactFile}`,
      "GitHub Raw GN-Math",
    );
  }

  // 2. Local Proxy URL for guaranteed shielded execution
  addCandidate(`/api/public/gn/game/${exactFile || filename}`, "Fast Shielded Proxy");

  // Deduplicate candidate URLs
  const seen = new Set<string>();
  return candidates.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
