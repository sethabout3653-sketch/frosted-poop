import fs from "fs";

// Helper for delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isHighlySimilarWordShare(a, b) {
  const getWords = (str) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(
        (w) => w.length > 1 && w !== "video" && w !== "game" && w !== "series" && w !== "app",
      );
  };

  const wordsA = getWords(a);
  const wordsB = getWords(b);

  if (wordsA.length === 0 || wordsB.length === 0) return false;

  let matches = 0;
  for (const w of wordsA) {
    if (wordsB.includes(w)) matches++;
  }

  const ratioA = matches / wordsA.length;
  const ratioB = matches / wordsB.length;

  return ratioA >= 0.5 || ratioB >= 0.5;
}

async function resolveSingleGame(g, index, total) {
  // Check if the game already has a high-res cover (e.g., Steam, App Store, Wiki, GN)
  const isSvg = !g.image || g.image.startsWith("data:image/svg+xml");
  const isLuminIcon = g.image && g.image.includes("a.luminsdk.com");

  if (!isSvg && !isLuminIcon) {
    return null;
  }

  console.log(`[${index + 1}/${total}] Searching for: ${g.name}...`);
  let foundCover = null;

  // 1. Try Steam first (PC games)
  if (g.name && g.name.length > 2) {
    try {
      const sRes = await fetch(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
          g.name,
        )}&l=english&cc=US`,
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.items && sData.items.length > 0) {
          const item = sData.items[0];
          if (isHighlySimilarWordShare(g.name, item.name)) {
            foundCover = `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/header.jpg`;
            console.log(`  -> Found on Steam: ${item.name}`);
          }
        }
      }
    } catch (e) {
      // Silent
    }
  }

  // 2. Try App Store (Mobile, Casual, Flash, and Indie games)
  if (!foundCover && g.name && g.name.length > 2) {
    try {
      const appStoreUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
        g.name,
      )}&entity=software&limit=1`;
      const aRes = await fetch(appStoreUrl);
      if (aRes.ok) {
        const aData = await aRes.json();
        if (aData.results && aData.results.length > 0) {
          const item = aData.results[0];
          if (isHighlySimilarWordShare(g.name, item.trackName)) {
            // Get 512x512 or original image URL
            const highRes = (item.artworkUrl512 || item.artworkUrl100 || "")
              .replace("/100x100bb.jpg", "/512x512bb.jpg")
              .replace("/100x100bb.png", "/512x512bb.png");
            if (highRes) {
              foundCover = highRes;
              console.log(`  -> Found on App Store: ${item.trackName}`);
            }
          }
        }
      }
    } catch (e) {
      // Silent
    }
  }

  // 3. Try Wikipedia Search API if not found on Steam/App Store
  if (!foundCover && g.name && g.name.length > 2) {
    try {
      const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        g.name + " video game",
      )}&format=json&origin=*`;

      const wRes = await fetch(wikiSearchUrl, {
        headers: {
          "User-Agent": "LuminArcadeCoverResolver/1.0 (sethabout3653@gmail.com) Node-fetch",
        },
      });

      if (wRes.ok) {
        const wData = await wRes.json();
        const firstHit = wData.query?.search?.[0];

        if (firstHit && isHighlySimilarWordShare(g.name, firstHit.title)) {
          // Get summary of this page to get the image
          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            firstHit.title.replace(/\s+/g, "_"),
          )}`;
          const sumRes = await fetch(summaryUrl, {
            headers: {
              "User-Agent": "LuminArcadeCoverResolver/1.0 (sethabout3653@gmail.com) Node-fetch",
            },
          });

          if (sumRes.ok) {
            const sumData = await sumRes.json();
            const img = sumData.thumbnail?.source || sumData.originalimage?.source;
            if (img) {
              foundCover = img;
              console.log(`  -> Found on Wikipedia (Search): ${firstHit.title}`);
            }
          }
        }
      }
    } catch (e) {
      // Silent
    }
  }

  // 4. Try direct Wikipedia page fallback
  if (!foundCover && g.name && g.name.length > 2) {
    try {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        g.name.replace(/\s+/g, "_"),
      )}`;
      const sumRes = await fetch(summaryUrl, {
        headers: {
          "User-Agent": "LuminArcadeCoverResolver/1.0 (sethabout3653@gmail.com) Node-fetch",
        },
      });
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        const img = sumData.thumbnail?.source || sumData.originalimage?.source;
        if (img) {
          foundCover = img;
          console.log(`  -> Found on Wikipedia (Direct): ${g.name}`);
        }
      }
    } catch (e) {
      // Silent
    }
  }

  if (foundCover) {
    return { index, cover: foundCover };
  }
  return null;
}

async function resolveAllCovers() {
  const sdkPath = "src/data/luminSdkGames.json";
  const sdk = JSON.parse(fs.readFileSync(sdkPath, "utf-8"));
  console.log("Analyzing", sdk.length, "games concurrently with multi-source matching...");

  let updatedCount = 0;
  let alreadyHasCover = 0;

  const concurrency = 20;
  const unresolvedIndices = [];

  for (let i = 0; i < sdk.length; i++) {
    const g = sdk[i];
    const isSvg = !g.image || g.image.startsWith("data:image/svg+xml");
    const isLuminIcon = g.image && g.image.includes("a.luminsdk.com");
    if (!isSvg && !isLuminIcon) {
      alreadyHasCover++;
    } else {
      unresolvedIndices.push(i);
    }
  }

  console.log(
    `Already resolved: ${alreadyHasCover}, Remaining to resolve: ${unresolvedIndices.length}`,
  );

  for (let i = 0; i < unresolvedIndices.length; i += concurrency) {
    const chunk = unresolvedIndices.slice(i, i + concurrency);

    // Process a chunk concurrently
    const chunkResults = await Promise.all(
      chunk.map((gameIndex) => resolveSingleGame(sdk[gameIndex], gameIndex, sdk.length)),
    );

    // Apply results
    for (const result of chunkResults) {
      if (result) {
        sdk[result.index].image = result.cover;
        updatedCount++;
      }
    }

    // Save and wait slightly to respect API rate limits
    fs.writeFileSync(sdkPath, JSON.stringify(sdk, null, 2));
    console.log(
      `Done chunk ${i + chunk.length}/${unresolvedIndices.length}... Newly updated: ${updatedCount}`,
    );
    await delay(350);
  }

  console.log(`FINISHED BATCH RESOLUTION! Total newly updated: ${updatedCount}`);
}

resolveAllCovers();
