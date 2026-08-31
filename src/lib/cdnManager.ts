// Default jsDelivr CDN configuration & game URL builders
export type CdnNetwork = "jsdelivr";

export const CDN_DOMAIN = "cdn.jsdelivr.net";
export const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh";

/**
 * Builds a direct jsDelivr CDN URL for a GitHub file
 */
export function buildGhUrl(owner: string, repo: string, ref = "main", path = ""): string {
  const cleanPath = path.replace(/^\/+/, "");
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${ref}/${cleanPath}`;
}

/**
 * Resolves candidate URLs for loading a given game asset
 */
export function getGameCandidateUrls(
  rawFilename: string,
): { url: string; baseUrl: string; cdnName: string }[] {
  const filename = rawFilename.replace(/^\/+/, "");
  const owner = filename.startsWith("games/")
    ? "a456pur"
    : filename.startsWith("3kh0/")
      ? "3kh0"
      : "freebuisness";
  const repo = filename.startsWith("games/")
    ? "seraph"
    : filename.startsWith("3kh0/")
      ? "3kh0-Assets"
      : "html";
  const ref = "main";
  const path = filename.startsWith("3kh0/") ? filename.replace(/^3kh0\//, "") : filename;

  const results: { url: string; baseUrl: string; cdnName: string }[] = [];

  // Primary jsDelivr CDN URL
  const jsdelivrUrl = buildGhUrl(owner, repo, ref, path);
  results.push({
    url: jsdelivrUrl,
    baseUrl: jsdelivrUrl.substring(0, jsdelivrUrl.lastIndexOf("/") + 1),
    cdnName: "jsDelivr (Default)",
  });

  // Secondary GitHub Raw fallback (Origin)
  const rawGhUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  results.push({
    url: rawGhUrl,
    baseUrl: rawGhUrl.substring(0, rawGhUrl.lastIndexOf("/") + 1),
    cdnName: "GitHub Raw (Origin)",
  });

  return results;
}
