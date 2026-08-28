import { Router, Request, Response } from "express";
import { Buffer } from "node:buffer";

const router = Router();

// Primary Target Proxy URL Configuration (Single source of truth)
const TARGET_URL = "https://www.myinstants.com";
const TARGET_ORIGIN = new URL(TARGET_URL).origin;
const TARGET_REFERER = `${TARGET_ORIGIN}/`;

/**
 * Scramjet-inspired Traffic Rewriter & Scraper Helper
 * Parses HTML responses from target URL and extracts sound button items, title, and media mp3 paths.
 */
function parseMyinstantsHtml(html: string): Array<{
  id: string;
  title: string;
  mp3: string;
  color: string;
  category: string;
}> {
  const items: Array<{
    id: string;
    title: string;
    mp3: string;
    color: string;
    category: string;
  }> = [];

  try {
    // Regex matching play('...') onclick calls inside small-button divs
    // Pattern: play('/media/sounds/filename.mp3', 'title') or onclick="play('...')"
    const buttonRegex = /play\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\)/gi;
    let match;

    const colors = [
      "#f43f5e",
      "#8b5cf6",
      "#06b6d4",
      "#eab308",
      "#ef4444",
      "#10b981",
      "#6366f1",
      "#ec4899",
      "#a855f7",
      "#3b82f6",
    ];

    while ((match = buttonRegex.exec(html)) !== null) {
      const mediaPath = match[1];
      const soundTitle = match[2] || "Instant Sound";

      if (mediaPath && soundTitle) {
        let fullMp3 = mediaPath;
        if (mediaPath.startsWith("/")) {
          fullMp3 = `${TARGET_URL}${mediaPath}`;
        }

        const id =
          mediaPath
            .split("/")
            .pop()
            ?.replace(/\.[^/.]+$/, "") || `sound-${items.length}`;
        const color = colors[items.length % colors.length] || "#3b82f6";

        items.push({
          id,
          title: soundTitle.trim(),
          mp3: fullMp3,
          color,
          category: "Instant",
        });
      }
    }

    // Secondary fallback matching: href="/instant/sound-name/" + onclick="play(...)"
    if (items.length === 0) {
      const altRegex = /class="instant-link"[^>]*>([^<]+)<\/a>/gi;
      const mp3Regex = /\/media\/sounds\/[a-zA-Z0-9_\-.]+\.mp3/gi;

      const titles: string[] = [];
      let tMatch;
      while ((tMatch = altRegex.exec(html)) !== null) {
        if (tMatch[1]) titles.push(tMatch[1].trim());
      }

      const mp3s: string[] = [];
      let mMatch;
      while ((mMatch = mp3Regex.exec(html)) !== null) {
        mp3s.push(`${TARGET_URL}${mMatch[0]}`);
      }

      const count = Math.min(titles.length, mp3s.length);
      for (let i = 0; i < count; i++) {
        const title = titles[i] || `Instant ${i + 1}`;
        const mp3 = mp3s[i] || "";
        const id =
          mp3
            .split("/")
            .pop()
            ?.replace(/\.[^/.]+$/, "") || `sound-${i}`;
        const color = colors[i % colors.length] || "#8b5cf6";

        items.push({
          id,
          title,
          mp3,
          color,
          category: "Trending",
        });
      }
    }
  } catch (err) {
    console.error("Error parsing target HTML:", err);
  }

  return items;
}

// 1. Audio CORS Proxy Streamer (Scramjet traffic proxy for audio files)
router.get("/stream", async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    res.status(400).json({ error: "Missing sound audio URL parameter" });
    return;
  }

  try {
    // Validate target URL domain safety (must be valid HTTP/HTTPS)
    const parsedUrl = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      res.status(400).json({ error: "Invalid protocol" });
      return;
    }

    // Scramjet Headers Rewriting: Spoof browser headers to bypass CORS & anti-hotlinking locks
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "audio/mpeg, audio/mp3, audio/wav, audio/*;q=0.9, */*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: TARGET_REFERER,
      Origin: TARGET_ORIGIN,
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const proxyRes = await fetch(targetUrl, {
      method: "GET",
      headers,
    });

    if (!proxyRes.ok) {
      res.redirect(targetUrl);
      return;
    }

    // Inject CORS Headers so browser Audio Context can play without restrictions
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", proxyRes.headers.get("content-type") || "audio/mpeg");

    if (proxyRes.headers.get("content-length")) {
      res.setHeader("Content-Length", proxyRes.headers.get("content-length")!);
    }
    if (proxyRes.headers.get("content-range")) {
      res.setHeader("Content-Range", proxyRes.headers.get("content-range")!);
    }

    const arrayBuffer = await proxyRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.status(proxyRes.status).send(buffer);
  } catch (err) {
    console.error("Scramjet Sound Proxy Stream Error:", err);
    res.redirect(targetUrl);
  }
});

// 2. Target Search & Trending Scramjet API Route
router.get("/search", async (req: Request, res: Response) => {
  const query = ((req.query.q as string) || "").trim();

  try {
    let targetUrl = `${TARGET_URL}/en/index/us/`;
    if (query) {
      targetUrl = `${TARGET_URL}/en/search/?name=${encodeURIComponent(query)}`;
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: TARGET_REFERER,
        Origin: TARGET_ORIGIN,
      },
    });

    if (response.ok) {
      const htmlText = await response.text();
      const scraped = parseMyinstantsHtml(htmlText);

      if (scraped.length > 0) {
        res.json({
          source: `${TARGET_URL} (Proxied via Scramjet)`,
          targetUrl: TARGET_URL,
          query,
          count: scraped.length,
          sounds: scraped,
        });
        return;
      }
    }
  } catch (err) {
    console.warn("Target live scraping note:", err);
  }

  res.json({
    source: `${TARGET_URL} (Proxied via Scramjet)`,
    targetUrl: TARGET_URL,
    query,
    count: 0,
    sounds: [],
  });
});

// 3. Scramjet Generic Traffic Proxy endpoint
router.get("/scramjet-proxy", async (req: Request, res: Response) => {
  const target = (req.query.target as string) || TARGET_URL;
  try {
    const fetchRes = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: TARGET_REFERER,
        Origin: TARGET_ORIGIN,
      },
    });
    const content = await fetchRes.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: "Scramjet proxy request failed", details: String(err) });
  }
});

export default router;
