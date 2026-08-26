import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchGames, type Game } from "@/lib/games";
import { useFrostedStore } from "@/lib/frostedStore";
import { FrostedNavbar } from "./FrostedNavbar";
import { GamesGrid } from "./GamesGrid";
import { GamePlayer } from "./GamePlayer";
import { FrostedSettingsModal } from "./FrostedSettingsModal";

export function FrostedApp() {
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { favorites, toggleFavorite, recentlyPlayed, recordPlay, cloak, updateCloak } =
    useFrostedStore();

  const { data: gamesList = [], isLoading } = useQuery({
    queryKey: ["frosted-games"],
    queryFn: fetchGames,
    staleTime: 1000 * 60 * 30,
  });

  const handleSelectGame = (game: Game) => {
    setActiveGame(game);
    recordPlay({
      id: game.id,
      name: game.name,
      directory: game.directory,
      image: game.image,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRandomGame = () => {
    if (gamesList.length === 0) return;
    const randomIndex = Math.floor(Math.random() * gamesList.length);
    handleSelectGame(gamesList[randomIndex]);
  };

  return (
    <div className="min-h-screen bg-black bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:52px_52px] text-neutral-200 font-sans selection:bg-white selection:text-black">
      {/* Navigation Header */}
      <FrostedNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onHome={() => setActiveGame(null)}
        onRandomGame={handleRandomGame}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        activeGame={activeGame}
      />

      {/* Main View: Player or Library Grid */}
      <main>
        {activeGame ? (
          <GamePlayer
            game={activeGame}
            onBack={() => setActiveGame(null)}
            onSelectGame={handleSelectGame}
            allGames={gamesList}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
          />
        ) : (
          <GamesGrid
            games={gamesList}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSelectGame={handleSelectGame}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            recentlyPlayed={recentlyPlayed}
          />
        )}
      </main>

      {/* Modals */}
      <FrostedSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentCloak={cloak}
        onSelectCloak={updateCloak}
      />
    </div>
  );
}
