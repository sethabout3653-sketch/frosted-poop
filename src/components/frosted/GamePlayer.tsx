import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  RotateCw,
  Star,
  Share2,
  Keyboard,
  Sparkles,
  Check,
  Download,
  CheckCircle2,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gameCover, type Game } from "@/lib/games";
import { loadGameSource, type GameLoadResult } from "@/lib/gameLoader";
import { isGameCached } from "@/lib/offlineManager";

interface Props {
  game: Game;
  onBack: () => void;
  onSelectGame: (g: Game) => void;
  allGames: Game[];
  favorites: (number | string)[];
  toggleFavorite: (id: number | string) => void;
  isOffline?: boolean;
  cachedUrls?: string[];
  onDownloadForOffline?: (game: Game) => Promise<number>;
}

export function GamePlayer({
  game,
  onBack,
  onSelectGame,
  allGames,
  favorites,
  toggleFavorite,
  isOffline = false,
  cachedUrls = [],
  onDownloadForOffline,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [showKeybinds, setShowKeybinds] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [activeSrc, setActiveSrc] = useState<string>("");
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const currentBlobUrlRef = useRef<string | null>(null);

  const isFav = favorites.includes(game.id);
  const isCached = isGameCached(game, cachedUrls);

  // Load and sanitize game HTML with multi-tier fallback (Vercel & static host compatible)
  useEffect(() => {
    let cancelled = false;
    setIframeLoading(true);

    // Clean up previous blob URL to prevent memory leaks
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }

    async function initAndLoad() {
      if (cancelled) return;
      if (game.id === "soundboard") {
        setActiveSrc("/api/soundboard/scramjet-proxy");
        setIframeLoading(false);
        return;
      }
      const result = await loadGameSource(game.directory);
      if (cancelled) {
        if (result.blobUrl) URL.revokeObjectURL(result.blobUrl);
        return;
      }
      if (result.blobUrl) {
        currentBlobUrlRef.current = result.blobUrl;
      }
      setActiveSrc(result.src);
    }
    initAndLoad();

    return () => {
      cancelled = true;
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
    };
  }, [game.id, game.directory]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Auto-focus iframe on mount/change so Chromebook keyboard controls (WASD/Arrows) work instantly without clicking
  useEffect(() => {
    const timer = setTimeout(() => {
      iframeRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [game, activeSrc]);

  // Clean up iframe memory on unmount to free Chromebook WebGL/CPU resources
  useEffect(() => {
    const currentIframe = iframeRef.current;
    return () => {
      if (currentIframe) {
        try {
          currentIframe.src = "about:blank";
        } catch {
          // ignore potential cross-origin cleanup error
        }
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleReload = () => {
    setIsReloading(true);
    setIframeLoading(true);
    if (game.id === "soundboard") {
      setActiveSrc("");
      setTimeout(() => {
        setActiveSrc("/api/soundboard/scramjet-proxy");
        setIsReloading(false);
      }, 100);
      return;
    }
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
    async function reloadProxyAndGame() {
      const result = await loadGameSource(game.directory);
      if (result.blobUrl) {
        currentBlobUrlRef.current = result.blobUrl;
      }
      setActiveSrc(result.src);
      if (iframeRef.current) {
        iframeRef.current.src = result.src;
      }
      setTimeout(() => setIsReloading(false), 500);
    }
    reloadProxyAndGame();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Recommendations: exclude current game
  const relatedGames = allGames.filter((g) => g.id !== game.id).slice(0, 6);

  const handleSaveOffline = async () => {
    if (!onDownloadForOffline || isSavingOffline) return;
    setIsSavingOffline(true);
    try {
      await onDownloadForOffline(game);
    } finally {
      setIsSavingOffline(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans animate-in fade-in duration-200">
      {/* Offline Mode Banner */}
      {isOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>Offline Mode:</strong> Core game assets served from local Service Worker
              cache. Previously opened games play completely offline without internet connection.
            </span>
          </div>
        </div>
      )}

      {/* Top Floating Controls Bar */}
      <div className="sticky top-0 z-30 border-b border-neutral-900 bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          {/* Back button & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="smooth-btn flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-[#0d0d0d] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-neutral-600 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Library</span>
            </button>

            <div className="h-4 w-[1px] bg-neutral-800" />

            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-white">{game.name}</h1>
              <span className="block text-[10px] text-neutral-400 capitalize">
                {game.category || "arcade"}
              </span>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2">
            {/* Save for Offline Play Button */}
            {onDownloadForOffline && (
              <button
                onClick={handleSaveOffline}
                disabled={isSavingOffline}
                title={
                  isCached
                    ? "Game cached in Service Worker for offline play"
                    : "Save core game files locally for offline play"
                }
                className={`smooth-btn flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                  isCached
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-neutral-800 bg-[#0d0d0d] text-neutral-300 hover:border-neutral-600 hover:text-white"
                }`}
              >
                {isCached ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="hidden sm:inline">Offline Ready</span>
                  </>
                ) : isSavingOffline ? (
                  <>
                    <RotateCw className="h-3.5 w-3.5 animate-spin text-neutral-400 shrink-0" />
                    <span className="hidden sm:inline">Caching...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <span className="hidden sm:inline">Save Offline</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => toggleFavorite(game.id)}
              title={isFav ? "Remove Favorite" : "Add Favorite"}
              className={`smooth-btn flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium cursor-pointer ${
                isFav
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                  : "border-neutral-800 bg-[#0d0d0d] text-neutral-300 hover:border-neutral-700 hover:text-white"
              }`}
            >
              <Star
                className={`h-3.5 w-3.5 transition-transform duration-200 ${isFav ? "fill-amber-300 scale-110" : ""}`}
              />
              <span className="hidden sm:inline">{isFav ? "Favorited" : "Favorite"}</span>
            </button>

            <button
              onClick={handleReload}
              title="Reload Game (R)"
              className="smooth-btn rounded-xl border border-neutral-800 bg-[#0d0d0d] p-2 text-neutral-300 hover:border-neutral-600 hover:text-white cursor-pointer"
            >
              <RotateCw
                className={`h-4 w-4 transition-transform duration-500 ease-out ${isReloading ? "rotate-360" : ""}`}
              />
            </button>

            <button
              onClick={handleShare}
              title="Copy Share Link"
              className="smooth-btn rounded-xl border border-neutral-800 bg-[#0d0d0d] p-2 text-neutral-300 hover:border-neutral-600 hover:text-white cursor-pointer"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400 animate-in zoom-in-50 duration-150" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen (F)"}
              className="smooth-btn flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:border-neutral-500 cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Screen Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
        <div
          ref={containerRef}
          className="relative w-full max-w-6xl aspect-[16/9] overflow-hidden rounded-2xl border border-neutral-800 bg-black shadow-2xl"
        >
          <iframe
            ref={iframeRef}
            src={activeSrc || undefined}
            title={game.name}
            onLoad={() => setIframeLoading(false)}
            className="h-full w-full border-0 bg-black"
            allow="fullscreen; autoplay; gamepad; pointer-lock; clipboard-write; encrypted-media"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          />
        </div>
      </div>

      {/* Below-Player Info & Recommendations */}
      <div className="border-t border-neutral-900 bg-[#070707] px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Controls & Hints */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-[#0d0d0d] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-black text-neutral-300">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Player Keyboard Shortcuts</h3>
                <p className="text-xs text-neutral-400">F = Fullscreen, R = Reload</p>
              </div>
            </div>

            <button
              onClick={() => setShowKeybinds(!showKeybinds)}
              className="smooth-btn rounded-lg border border-neutral-800 bg-black px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-700 hover:text-white cursor-pointer"
            >
              {showKeybinds ? "Hide Controls Guide" : "View Controls Guide"}
            </button>

            {showKeybinds && (
              <div className="w-full border-t border-neutral-800 pt-3 mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-neutral-300 animate-in fade-in duration-150">
                <div>
                  <kbd className="rounded border border-neutral-800 bg-black px-1.5 py-0.5 font-mono text-white">
                    W A S D / Arrows
                  </kbd>
                  <p className="text-[10px] text-neutral-400 mt-1">Move / Drive</p>
                </div>
                <div>
                  <kbd className="rounded border border-neutral-800 bg-black px-1.5 py-0.5 font-mono text-white">
                    Space
                  </kbd>
                  <p className="text-[10px] text-neutral-400 mt-1">Jump / Action</p>
                </div>
                <div>
                  <kbd className="rounded border border-neutral-800 bg-black px-1.5 py-0.5 font-mono text-white">
                    F
                  </kbd>
                  <p className="text-[10px] text-neutral-400 mt-1">Toggle Fullscreen</p>
                </div>
              </div>
            )}
          </div>

          {/* Related Games Carousel */}
          {relatedGames.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-neutral-300" />
                <h2 className="text-sm font-semibold tracking-wider text-neutral-300 uppercase">
                  More Games
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                {relatedGames.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => onSelectGame(g)}
                    className="chromebook-card group text-left overflow-hidden rounded-xl border border-neutral-800 bg-[#0d0d0d] p-2 hover:border-neutral-600 hover:bg-[#121212] cursor-pointer"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-black">
                      <img
                        src={gameCover(g)}
                        alt={g.name}
                        loading="lazy"
                        decoding="async"
                        className="smooth-image h-full w-full object-cover group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80";
                        }}
                      />
                    </div>
                    <p className="truncate mt-2 text-xs font-semibold text-white group-hover:text-neutral-100 transition-colors duration-200">
                      {g.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
