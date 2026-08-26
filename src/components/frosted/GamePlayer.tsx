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
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gameEntry, gameCover, type Game } from "@/lib/games";

interface Props {
  game: Game;
  onBack: () => void;
  onSelectGame: (g: Game) => void;
  allGames: Game[];
  favorites: (number | string)[];
  toggleFavorite: (id: number | string) => void;
}

export function GamePlayer({
  game,
  onBack,
  onSelectGame,
  allGames,
  favorites,
  toggleFavorite,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKeybinds, setShowKeybinds] = useState(false);

  const isFav = favorites.includes(game.id);

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
  }, [game]);

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
    if (iframeRef.current) {
      iframeRef.current.src = gameEntry(game.directory);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Recommendations: exclude current game
  const relatedGames = allGames.filter((g) => g.id !== game.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Top Floating Controls Bar */}
      <div className="sticky top-0 z-30 border-b border-neutral-900 bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          {/* Back button & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-black px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-neutral-700 hover:text-white transition-all cursor-pointer"
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
            <button
              onClick={() => toggleFavorite(game.id)}
              title={isFav ? "Remove Favorite" : "Add Favorite"}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                isFav
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                  : "border-neutral-800 bg-black text-neutral-300 hover:border-neutral-700 hover:text-white"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${isFav ? "fill-amber-300" : ""}`} />
              <span className="hidden sm:inline">{isFav ? "Favorited" : "Favorite"}</span>
            </button>

            <button
              onClick={handleReload}
              title="Reload Game (R)"
              className="rounded-xl border border-neutral-800 bg-black p-2 text-neutral-300 hover:border-neutral-700 hover:text-white transition-all cursor-pointer"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              onClick={handleShare}
              title="Copy Share Link"
              className="rounded-xl border border-neutral-800 bg-black p-2 text-neutral-300 hover:border-neutral-700 hover:text-white transition-all cursor-pointer"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen (F)"}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:border-neutral-500 transition-all cursor-pointer"
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
            src={gameEntry(game.directory)}
            title={game.name}
            className="h-full w-full border-0 bg-black"
            allow="fullscreen; autoplay; gamepad; pointer-lock; clipboard-write; encrypted-media"
          />
        </div>
      </div>

      {/* Below-Player Info & Recommendations */}
      <div className="border-t border-neutral-900 bg-black/90 px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Controls & Hints */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-4">
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
              className="text-xs font-medium text-neutral-300 hover:text-white hover:underline cursor-pointer"
            >
              {showKeybinds ? "Hide Controls Guide" : "View Controls Guide"}
            </button>

            {showKeybinds && (
              <div className="w-full border-t border-neutral-800 pt-3 mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-neutral-300">
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
                    className="group text-left overflow-hidden rounded-xl border border-neutral-800 bg-[#0a0a0a] p-2 transition-all hover:border-neutral-600 hover:bg-neutral-900/80 cursor-pointer"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-black">
                      <img
                        src={gameCover(g)}
                        alt={g.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80";
                        }}
                      />
                    </div>
                    <p className="truncate mt-2 text-xs font-semibold text-white group-hover:text-neutral-200">
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
