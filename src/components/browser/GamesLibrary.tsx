import { useQuery } from "@tanstack/react-query";
import { Gamepad2, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { fetchGames, gameCover, type Game } from "@/lib/games";
import { useSettings } from "@/lib/settings";

export function GamesLibrary({ onLaunch }: { onLaunch: (game: Game) => void }) {
  const [query, setQuery] = useState("");
  const { settings } = useSettings();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["games"],
    queryFn: fetchGames,
    staleTime: 1000 * 60 * 30,
  });

  const games = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q ? list.filter((g) => g.name.toLowerCase().includes(q)) : list;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [data, query]);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-foreground">Games</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading ? "Loading library…" : `${games.length} titles`}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games"
              className="w-56 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {isError && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            The game source could not be reached. Check your connection and try again.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {isLoading &&
            Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-xl border border-border bg-card"
              />
            ))}

          {games.map((game) => (
            <button
              key={game.directory}
              onClick={() => onLaunch(game)}
              className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-foreground/40"
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <img
                  src={gameCover(game)}
                  alt={`${game.name} cover art`}
                  loading="lazy"
                  className="h-full w-full object-cover grayscale transition duration-300 group-hover:scale-105 group-hover:grayscale-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <Gamepad2 className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground opacity-40" />
              </div>
              <p className="truncate px-3 py-2 text-xs text-foreground">{game.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
