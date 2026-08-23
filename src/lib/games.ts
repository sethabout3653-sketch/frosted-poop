export type Game = {
  id: number | string;
  name: string;
  directory: string;
  image: string;
  author?: string;
  authorLink?: string;
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

export async function fetchGames(): Promise<Game[]> {
  try {
    const res = await fetch(GN_ZONES_URL);
    if (res.ok) {
      const rawData = await res.json();
      if (Array.isArray(rawData)) {
        return rawData
          .filter(
            (item: Record<string, unknown>) =>
              item && typeof item.id === "number" && item.id >= 0 && item.url && item.name,
          )
          .map((item: Record<string, unknown>) => {
            const rawUrl = String(item.url || "");
            const filename = rawUrl.replace("{HTML_URL}/", "").replace(/^https?:\/\/[^/]+\//, "");
            const coverUrl = String(item.cover || "").replace("{COVER_URL}", GN_COVERS_CDN);
            return {
              id: item.id,
              name: String(item.name),
              directory: filename,
              image: coverUrl,
              author: item.author ? String(item.author) : undefined,
              authorLink: item.authorLink ? String(item.authorLink) : undefined,
            };
          });
      }
    }
  } catch (err) {
    console.error("Failed to fetch gn-math games:", err);
  }

  return [];
}
