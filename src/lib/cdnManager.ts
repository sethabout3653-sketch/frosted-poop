// Default jsDelivr CDN configuration & game URL builders
export type CdnNetwork = "githack";

export const CDN_DOMAIN = "raw.githack.com";
export const CDN_BASE_URL = "https://raw.githack.com";

/**
 * Builds a direct jsDelivr CDN URL for a GitHub file
 */
export function buildGhUrl(owner: string, repo: string, ref = "main", path = ""): string {
  const cleanPath = path.replace(/^\/+/, "");
  return `https://raw.githack.com/${owner}/${repo}/${ref}/${cleanPath}`;
}

/**
 * Resolves candidate URLs for loading a given game asset across multiple open-source repositories and CDNs
 */
export function getGameCandidateUrls(
  rawFilename: string,
): { url: string; baseUrl: string; cdnName: string }[] {
  const filename = rawFilename.replace(/^\/+/, "");
  const baseSlug = filename
    .replace(/^games\//, "")
    .replace(/^3kh0\//, "")
    .replace(/^(selenite|truffled|quasar|builtin)\//, "")
    .replace(/\.html$/i, "");

  const candidates: { url: string; baseUrl: string; cdnName: string }[] = [];

  // Helper to add URL & its base
  const addCandidate = (url: string, cdnName: string) => {
    const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
    candidates.push({ url, baseUrl, cdnName });
  };

  // 1. Primary GN-math / freebuisness html repo
  if (filename.endsWith(".html")) {
    addCandidate(
      `https://raw.githack.com/freebuisness/html/main/${filename}`,
      "jsDelivr GN-Math",
    );
    addCandidate(
      `https://raw.githubusercontent.com/freebuisness/html/main/${filename}`,
      "GitHub Raw GN-Math",
    );
  } else {
    addCandidate(
      `https://raw.githack.com/freebuisness/html/main/${baseSlug}.html`,
      "jsDelivr GN-Math",
    );
    addCandidate(
      `https://raw.githubusercontent.com/freebuisness/html/main/${baseSlug}.html`,
      "GitHub Raw GN-Math",
    );
  }

  // 2. Seraph Games repo
  addCandidate(
    `https://raw.githack.com/a456pur/seraph/main/games/${baseSlug}/index.html`,
    "jsDelivr Seraph",
  );
  addCandidate(
    `https://raw.githubusercontent.com/a456pur/seraph/main/games/${baseSlug}/index.html`,
    "GitHub Raw Seraph",
  );

  // 3. Selenite Repo
  addCandidate(
    `https://raw.githack.com/Selenite-CC/Selenite/main/public/games/${baseSlug}/index.html`,
    "jsDelivr Selenite",
  );

  // 4. 3kh0 Assets Repo
  addCandidate(
    `https://raw.githack.com/3kh0/3kh0-Assets/main/${baseSlug}/index.html`,
    "jsDelivr 3kh0",
  );

  // 5. Classroom Repo
  addCandidate(
    `https://raw.githack.com/classroom-google-com/classroom-google-com.github.io/main/${baseSlug}/index.html`,
    "jsDelivr Classroom",
  );

  // Deduplicate candidate URLs
  const seen = new Set<string>();
  return candidates.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
