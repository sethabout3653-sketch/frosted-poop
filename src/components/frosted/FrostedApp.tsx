import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchGames, type Game } from "@/lib/games";
import { useFrostedStore } from "@/lib/frostedStore";
import { FrostedNavbar } from "./FrostedNavbar";
import { GamesGrid } from "./GamesGrid";
import { GamePlayer } from "./GamePlayer";
import { CustomGameModal } from "./CustomGameModal";
import { FrostedSettingsModal } from "./FrostedSettingsModal";
import { PanicDisguise } from "./PanicDisguise";

export function FrostedApp() {
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPanicActive, setIsPanicActive] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { favorites, toggleFavorite, recentlyPlayed, recordPlay, cloak, updateCloak } =
    useFrostedStore();

  const { data: gamesList = [], isLoading } = useQuery({
    queryKey: ["frosted-games"],
    queryFn: fetchGames,
    staleTime: 1000 * 60 * 30,
  });

  // Panic hotkey handler (Esc key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsPanicActive((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  if (isPanicActive) {
    return <PanicDisguise onUnlock={() => setIsPanicActive(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Navigation Header */}
      <FrostedNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onHome={() => setActiveGame(null)}
        onRandomGame={handleRandomGame}
        onOpenCustomModal={() => setIsCustomModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onPanic={() => setIsPanicActive(true)}
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
            onPanic={() => setIsPanicActive(true)}
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
      <CustomGameModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onLaunchCustom={handleSelectGame}
      />

      <FrostedSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentCloak={cloak}
        onSelectCloak={updateCloak}
      />
    </div>
  );
}
