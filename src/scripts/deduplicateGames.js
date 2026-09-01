import fs from "fs";

function deduplicate() {
  const sdkPath = "src/data/luminSdkGames.json";
  if (!fs.existsSync(sdkPath)) {
    console.error("Games file not found!");
    return;
  }

  const games = JSON.parse(fs.readFileSync(sdkPath, "utf-8"));
  console.log("Original games count:", games.length);

  const uniqueMap = new Map();

  const isHighRes = (url) => {
    if (!url) return false;
    if (url.startsWith("data:image/svg+xml")) return false;
    if (url.includes("a.luminsdk.com")) return false;
    return true;
  };

  for (const g of games) {
    const existing = uniqueMap.get(g.id);
    if (!existing) {
      uniqueMap.set(g.id, g);
    } else {
      const existingHasHighRes = isHighRes(existing.image);
      const currentHasHighRes = isHighRes(g.image);

      // Prefer the one that has a high-res cover
      if (!existingHasHighRes && currentHasHighRes) {
        uniqueMap.set(g.id, g);
      }
    }
  }

  const uniqueGames = Array.from(uniqueMap.values());
  fs.writeFileSync(sdkPath, JSON.stringify(uniqueGames, null, 2));
  console.log("Deduplicated games count:", uniqueGames.length);
}

deduplicate();
