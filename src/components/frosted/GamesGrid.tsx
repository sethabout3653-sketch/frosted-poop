import { useState, useMemo, useEffect } from "react";
import {
  Flame,
  Grid,
  Swords,
  Car,
  Trophy,
  Puzzle,
  Gamepad2,
  Star,
  Clock,
  Play,
  Sparkles,
  Search,
  Coffee,
  WifiOff,
  CheckCircle2,
} from "lucide-react";
import { gameCover, type Game, type GameCategory } from "@/lib/games";
import { isGameCached } from "@/lib/offlineManager";
import { AdBanner } from "./AdBanner";
import { triggerAdImpression } from "@/lib/adManager";

interface Props {
  games: Game[];
  isLoading: boolean;
  searchQuery: string;
  onSelectGame: (game: Game) => void;
  favorites: (number | string)[];
  toggleFavorite: (id: number | string) => void;
  recentlyPlayed: { id: number | string; name: string; directory: string; image: string }[];
  isOffline?: boolean;
  cachedUrls?: string[];
}

const CATEGORIES: {
  id: GameCategory | "favorites" | "recent" | "offline";
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "all", label: "All Games", icon: <Grid className="h-3.5 w-3.5" /> },
  {
    id: "popular",
    label: "Hot & Trending",
    icon: <Flame className="h-3.5 w-3.5 text-amber-400" />,
  },
  { id: "action", label: "Action", icon: <Swords className="h-3.5 w-3.5 text-rose-400" /> },
  { id: "driving", label: "Driving", icon: <Car className="h-3.5 w-3.5 text-sky-400" /> },
  { id: "sports", label: "Sports", icon: <Trophy className="h-3.5 w-3.5 text-emerald-400" /> },
  { id: "puzzle", label: "Puzzle", icon: <Puzzle className="h-3.5 w-3.5 text-purple-400" /> },
  { id: "retro", label: "Retro", icon: <Gamepad2 className="h-3.5 w-3.5 text-yellow-400" /> },
  { id: "casual", label: "Casual", icon: <Coffee className="h-3.5 w-3.5 text-amber-200" /> },
  {
    id: "offline",
    label: "Offline Ready",
    icon: <WifiOff className="h-3.5 w-3.5 text-emerald-400" />,
  },
  { id: "favorites", label: "My Favorites", icon: <Star className="h-3.5 w-3.5 text-amber-300" /> },
  { id: "recent", label: "Recently Played", icon: <Clock className="h-3.5 w-3.5 text-cyan-400" /> },
];

export function GamesGrid({
  games,
  isLoading,
  searchQuery,
  onSelectGame,
  favorites,
  toggleFavorite,
  recentlyPlayed,
  isOffline = false,
  cachedUrls = [],
}: Props) {
  const [activeCategory, setActiveCategory] = useState<
    GameCategory | "favorites" | "recent" | "offline"
  >(isOffline ? "offline" : "all");

  // Lazy loading pagination to render 830+ games fast and fluid without crashing lower-end browsers
  const [visibleCount, setVisibleCount] = useState(48);

  // Reset pagination on category or search change
  useEffect(() => {
    setVisibleCount(48);
  }, [activeCategory, searchQuery]);

  // Filter games according to search & category
  const filteredGames = useMemo(() => {
    let list = games;

    if (activeCategory === "favorites") {
      list = games.filter((g) => favorites.includes(g.id));
    } else if (activeCategory === "recent") {
      const recentIds = recentlyPlayed.map((r) => r.id);
      list = games.filter((g) => recentIds.includes(g.id));
    } else if (activeCategory === "offline") {
      list = games.filter((g) => isGameCached(g, cachedUrls));
    } else if (activeCategory !== "all") {
      list = games.filter((g) => g.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }

    return list;
  }, [games, activeCategory, searchQuery, favorites, recentlyPlayed, cachedUrls]);

  // Sliced games list for progressive rendering
  const visibleGames = useMemo(() => {
    return filteredGames.slice(0, visibleCount);
  }, [filteredGames, visibleCount]);

  // Top featured games for the hero section
  const featuredGames = useMemo(() => {
    return games.filter((g) => g.featured || g.category === "popular").slice(0, 4);
  }, [games]);

  const handleGameCardClick = (game: Game) => {
    triggerAdImpression();
    onSelectGame(game);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Category Pills Bar */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-4">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => {
                triggerAdImpression();
                setActiveCategory(cat.id);
              }}
              className={`smooth-btn flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium cursor-pointer ${
                isActive
                  ? "border-neutral-500 bg-neutral-900 text-white shadow-[0_0_15px_rgba(255,255,255,0.08)]"
                  : "border-neutral-800 bg-[#0d0d0d] text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900/60 hover:text-neutral-200"
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
              {cat.id === "favorites" && favorites.length > 0 && (
                <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                  {favorites.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Top Responsive Leaderboard Banner */}
      <AdBanner className="my-4" />

      {/* Featured Showcase Hero (Only shown when no search query and in 'all' or 'popular' tab) */}
      {!searchQuery &&
        (activeCategory === "all" || activeCategory === "popular") &&
        featuredGames.length > 0 && (
          <div className="mb-10 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-neutral-300" />
              <h2 className="text-sm font-semibold tracking-wider text-neutral-300 uppercase font-sans">
                Featured & Trending
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredGames.map((game) => {
                const isFav = favorites.includes(game.id);

                return (
                  <div
                    key={"featured-" + game.id}
                    onClick={() => handleGameCardClick(game)}
                    className="chromebook-card group relative cursor-pointer overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0a0a] shadow-md hover:-translate-y-1.5 hover:border-neutral-600 hover:bg-[#111111] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-black">
                      <img
                        src={gameCover(game)}
                        alt={game.name}
                        loading="lazy"
                        decoding="async"
                        className="smooth-image h-full w-full object-cover group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300 ease-out" />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(game.id);
                        }}
                        className="smooth-btn absolute right-3 top-3 rounded-xl bg-black/80 p-2 text-neutral-300 hover:text-amber-400"
                      >
                        <Star
                          className={`h-4 w-4 transition-transform duration-200 ${isFav ? "fill-amber-400 text-amber-400 scale-110" : ""}`}
                        />
                      </button>

                      <div className="absolute left-3 top-3 rounded-lg border border-neutral-700 bg-black/90 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        Featured
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out pointer-events-none">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg transform transition-transform duration-200 group-hover:scale-105">
                          <Play className="h-6 w-6 fill-black ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="truncate text-base font-bold text-white group-hover:text-neutral-100 transition-colors duration-200">
                        {game.name}
                      </h3>
                      <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
                        <span className="capitalize">{game.category || "arcade"}</span>
                        {game.rating && (
                          <span className="flex items-center gap-1 text-amber-300">
                            <Star className="h-3 w-3 fill-amber-300" />
                            {game.rating}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Main Grid Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-wider text-neutral-400 uppercase font-sans">
          {searchQuery
            ? `Search Results (${filteredGames.length})`
            : `${activeCategory.toUpperCase()} GAMES (${filteredGames.length})`}
        </h2>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-2xl border border-neutral-800 bg-[#0d0d0d]"
            />
          ))}
        </div>
      )}

      {/* Empty States */}
      {!isLoading && filteredGames.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black border border-neutral-800 text-neutral-500 mb-4">
            <Search className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-white">No games found</h3>
          <p className="mt-1 text-xs text-neutral-400 max-w-sm">
            {searchQuery
              ? `We couldn't find any games matching "${searchQuery}".`
              : activeCategory === "favorites"
                ? "You haven't added any favorites yet. Star a game to save it here!"
                : "No games available in this category."}
          </p>
        </div>
      )}

      {/* Game Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visibleGames.map((game) => {
          const isFav = favorites.includes(game.id);
          const isCached = isGameCached(game, cachedUrls);

          return (
            <div
              key={game.id}
              onClick={() => handleGameCardClick(game)}
              className="chromebook-card group relative cursor-pointer overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0a0a] shadow-sm hover:-translate-y-1 hover:border-neutral-600 hover:bg-[#111111] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-black">
                <img
                  src={gameCover(game)}
                  alt={game.name}
                  loading="lazy"
                  decoding="async"
                  className="smooth-image h-full w-full object-cover group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300 ease-out" />

                {/* Offline Cached Indicator */}
                {isCached && (
                  <div
                    title="Cached in Service Worker for Offline Play"
                    className="absolute left-2 top-2 flex items-center gap-1 rounded-md border border-emerald-500/40 bg-black/90 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 backdrop-blur-sm"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span className="hidden sm:inline">Offline</span>
                  </div>
                )}

                {/* Favorite Toggle Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(game.id);
                  }}
                  className="smooth-btn absolute right-2 top-2 rounded-lg bg-black/80 p-1.5 text-neutral-300 hover:text-amber-400"
                >
                  <Star
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${isFav ? "fill-amber-400 text-amber-400 scale-110" : ""}`}
                  />
                </button>
              </div>

              <div className="p-3">
                <h3 className="truncate text-xs font-semibold text-white group-hover:text-neutral-100 transition-colors duration-200">
                  {game.name}
                </h3>
                <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="capitalize">{game.category || "game"}</span>
                  {game.rating && (
                    <span className="flex items-center gap-0.5 text-amber-300">
                      <Star className="h-2.5 w-2.5 fill-amber-300" />
                      {game.rating}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern Load More Controller */}
      {filteredGames.length > visibleCount && (
        <div className="mt-12 flex flex-col items-center justify-center gap-3">
          <button
            onClick={() => {
              triggerAdImpression();
              setVisibleCount((prev) => prev + 48);
            }}
            className="smooth-btn group cursor-pointer flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-6 py-3.5 text-sm font-semibold text-white hover:border-neutral-500 hover:bg-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_20px_rgba(255,255,255,0.06)]"
          >
            <span>Load More Games</span>
            <span className="text-neutral-500 font-normal">|</span>
            <span className="text-amber-300 font-mono text-xs bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
              +{Math.min(48, filteredGames.length - visibleCount)}
            </span>
          </button>
          <p className="text-[11px] text-neutral-500 tracking-wide">
            Showing {visibleCount} of {filteredGames.length} available titles
          </p>
        </div>
      )}

      {/* Footer Responsive Banner */}
      <AdBanner className="mt-12 mb-4" />
    </div>
  );
}
