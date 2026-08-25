import { useState, useMemo } from "react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { gameCover, type Game, type GameCategory } from "@/lib/games";

interface Props {
  games: Game[];
  isLoading: boolean;
  searchQuery: string;
  onSelectGame: (game: Game) => void;
  favorites: (number | string)[];
  toggleFavorite: (id: number | string) => void;
  recentlyPlayed: { id: number | string; name: string; directory: string; image: string }[];
}

const CATEGORIES: {
  id: GameCategory | "favorites" | "recent";
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
}: Props) {
  const [activeCategory, setActiveCategory] = useState<GameCategory | "favorites" | "recent">(
    "all",
  );

  // Filter games according to search & category
  const filteredGames = useMemo(() => {
    let list = games;

    if (activeCategory === "favorites") {
      list = games.filter((g) => favorites.includes(g.id));
    } else if (activeCategory === "recent") {
      const recentIds = recentlyPlayed.map((r) => r.id);
      list = games.filter((g) => recentIds.includes(g.id));
    } else if (activeCategory !== "all") {
      list = games.filter((g) => g.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }

    return list;
  }, [games, activeCategory, searchQuery, favorites, recentlyPlayed]);

  // Top featured games for the hero section
  const featuredGames = useMemo(() => {
    return games.filter((g) => g.featured || g.category === "popular").slice(0, 4);
  }, [games]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Category Pills Bar */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-4">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "border-neutral-600 bg-neutral-900 text-white shadow-[0_0_12px_rgba(255,255,255,0.08)]"
                  : "border-neutral-800 bg-[#0a0a0a] text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900/60 hover:text-neutral-200"
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
                  <motion.div
                    key={"featured-" + game.id}
                    whileHover={{ y: -4 }}
                    onClick={() => onSelectGame(game)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0a0a] shadow-lg backdrop-blur-md transition-all hover:border-neutral-600 hover:shadow-[0_0_15px_rgba(255,255,255,0.08)]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-black">
                      <img
                        src={gameCover(game)}
                        alt={game.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(game.id);
                        }}
                        className="absolute right-3 top-3 rounded-xl bg-black/70 p-2 text-neutral-300 backdrop-blur-md hover:text-amber-400 transition-colors"
                      >
                        <Star
                          className={`h-4 w-4 ${isFav ? "fill-amber-400 text-amber-400" : ""}`}
                        />
                      </button>

                      <div className="absolute left-3 top-3 rounded-lg border border-neutral-700 bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-md">
                        Featured
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onSelectGame(game)}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg hover:scale-110 transition-transform"
                        >
                          <Play className="h-6 w-6 fill-black ml-0.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="truncate text-base font-bold text-white group-hover:text-neutral-200 transition-colors">
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
                  </motion.div>
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
              className="aspect-[4/5] animate-pulse rounded-2xl border border-neutral-800 bg-[#0a0a0a]"
            />
          ))}
        </div>
      )}

      {/* Empty States */}
      {!isLoading && filteredGames.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
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
        <AnimatePresence>
          {filteredGames.map((game) => {
            const isFav = favorites.includes(game.id);

            return (
              <motion.div
                key={game.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => onSelectGame(game)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0a0a] shadow-md backdrop-blur-md transition-all hover:border-neutral-600 hover:bg-[#0f0f0f] hover:shadow-[0_0_15px_rgba(255,255,255,0.06)] hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-black">
                  <img
                    src={gameCover(game)}
                    alt={game.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                  {/* Favorite Toggle Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(game.id);
                    }}
                    className="absolute right-2 top-2 rounded-lg bg-black/70 p-1.5 text-neutral-300 backdrop-blur-md hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${isFav ? "fill-amber-400 text-amber-400" : ""}`}
                    />
                  </button>
                </div>

                <div className="p-3">
                  <h3 className="truncate text-xs font-semibold text-white group-hover:text-neutral-200 transition-colors">
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
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
