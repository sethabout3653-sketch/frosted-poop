import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  RotateCw,
  Star,
  Share2,
  Shield,
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
  onPanic: () => void;
}

export function GamePlayer({
  game,
  onBack,
  onSelectGame,
  allGames,
  favorites,
  toggleFavorite,
  onPanic,
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Floating Controls Bar */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Back button & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Library</span>
            </button>

            <div className="h-4 w-[1px] bg-white/10" />

            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-white">{game.name}</h1>
              <span className="block text-[10px] text-slate-400 capitalize">
                {game.category || "arcade"}
              </span>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFavorite(game.id)}
              title={isFav ? "Remove Favorite" : "Add Favorite"}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                isFav
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                  : "border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${isFav ? "fill-amber-300" : ""}`} />
              <span className="hidden sm:inline">{isFav ? "Favorited" : "Favorite"}</span>
            </button>

            <button
              onClick={handleReload}
              title="Reload Game (R)"
              className="rounded-xl border border-white/10 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              onClick={handleShare}
              title="Copy Share Link"
              className="rounded-xl border border-white/10 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
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
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Fullscreen</span>
            </button>

            <button
              onClick={onPanic}
              title="Panic Key (Esc)"
              className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-2 text-rose-300 hover:bg-rose-900/50 hover:text-white transition-all"
            >
              <Shield className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Screen Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4">
        <div
          ref={containerRef}
          className="relative w-full max-w-6xl aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
        >
          <iframe
            ref={iframeRef}
            src={gameEntry(game.directory)}
            title={game.name}
            className="h-full w-full border-0 bg-slate-950"
            allow="fullscreen; autoplay; gamepad; pointer-lock; clipboard-write; encrypted-media"
          />
        </div>
      </div>

      {/* Below-Player Info & Recommendations */}
      <div className="border-t border-white/10 bg-slate-950/80 px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Controls & Hints */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Player Keyboard Shortcuts</h3>
                <p className="text-xs text-slate-400">
                  Esc = Panic Stealth, F = Fullscreen, R = Reload
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowKeybinds(!showKeybinds)}
              className="text-xs font-medium text-cyan-400 hover:underline"
            >
              {showKeybinds ? "Hide Controls Guide" : "View Controls Guide"}
            </button>

            {showKeybinds && (
              <div className="w-full border-t border-white/10 pt-3 mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
                <div>
                  <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-300">
                    W A S D / Arrows
                  </kbd>
                  <p className="text-[10px] text-slate-400 mt-1">Move / Drive</p>
                </div>
                <div>
                  <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-300">
                    Space
                  </kbd>
                  <p className="text-[10px] text-slate-400 mt-1">Jump / Action</p>
                </div>
                <div>
                  <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-300">
                    Esc
                  </kbd>
                  <p className="text-[10px] text-slate-400 mt-1">Instant Panic Screen</p>
                </div>
                <div>
                  <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-300">
                    F
                  </kbd>
                  <p className="text-[10px] text-slate-400 mt-1">Toggle Fullscreen</p>
                </div>
              </div>
            )}
          </div>

          {/* Related Games Carousel */}
          {relatedGames.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold tracking-wider text-slate-300 uppercase">
                  More Unblocked Games
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                {relatedGames.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => onSelectGame(g)}
                    className="group text-left overflow-hidden rounded-xl border border-white/10 bg-slate-900/40 p-2 transition-all hover:border-cyan-500/40 hover:bg-slate-900/80"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-950">
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
                    <p className="truncate mt-2 text-xs font-semibold text-white group-hover:text-cyan-300">
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
