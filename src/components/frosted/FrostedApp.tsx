import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchGames, type Game } from "@/lib/games";
import { useFrostedStore } from "@/lib/frostedStore";
import { useOfflineStatus } from "@/lib/offlineManager";
import { FrostedNavbar } from "./FrostedNavbar";
import { GamesGrid } from "./GamesGrid";
import { GamePlayer } from "./GamePlayer";
import { DiscordChat } from "@/components/chat/DiscordChat";
import { FrostedInAppNotification } from "@/components/chat/FrostedInAppNotification";
import { applyAdScripts, triggerAdImpression } from "@/lib/adManager";
import { useAppSettings, applyTabCloak } from "@/lib/settingsStore";
import { SettingsDialog } from "./SettingsDialog";

export function FrostedApp() {
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isChatActive, setIsChatActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { settings } = useAppSettings();

  // Periodic tab cloak enforcement to prevent any game iframe or other scripts from altering title/favicon
  useEffect(() => {
    const interval = setInterval(() => {
      applyTabCloak(settings);
    }, 1500);
    return () => clearInterval(interval);
  }, [settings]);

  const { favorites, toggleFavorite, recentlyPlayed, recordPlay } = useFrostedStore();

  const { isOffline, cachedUrls, downloadGameForOffline, clearGameCache } = useOfflineStatus();

  // Listen for open-chat event when a notification is clicked
  useEffect(() => {
    const handleOpenChat = () => {
      setActiveGame(null);
      setIsChatActive(true);
    };
    window.addEventListener("frosted-open-chat", handleOpenChat);
    return () => {
      window.removeEventListener("frosted-open-chat", handleOpenChat);
    };
  }, []);

  // Universal Ad Engine Initialization
  useEffect(() => {
    applyAdScripts();
    const handleUpdate = () => applyAdScripts();
    window.addEventListener("frosted_ad_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("frosted_ad_settings_updated", handleUpdate);
    };
  }, []);

  const { data: gamesList = [], isLoading } = useQuery({
    queryKey: ["frosted-games"],
    queryFn: fetchGames,
    staleTime: 1000 * 60 * 30,
  });

  const handleLaunchGameDirect = (game: Game) => {
    triggerAdImpression();
    setIsChatActive(false);
    setActiveGame(game);
    recordPlay({
      id: game.id,
      name: game.name,
      directory: game.directory,
      image: game.image,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectGame = (game: Game) => {
    handleLaunchGameDirect(game);
  };

  const handleRandomGame = () => {
    if (gamesList.length === 0) return;
    triggerAdImpression();
    setIsChatActive(false);
    const randomIndex = Math.floor(Math.random() * gamesList.length);
    handleSelectGame(gamesList[randomIndex]);
  };

  const handleHome = () => {
    setIsChatActive(false);
    setActiveGame(null);
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 font-sans selection:bg-white selection:text-black overflow-x-hidden relative">
      {/* In-App Floating Notifications (Zero browser permissions required) */}
      <FrostedInAppNotification
        onOpenChat={(channelId) => {
          setActiveGame(null);
          setIsChatActive(true);
          if (channelId && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("frosted-open-chat", { detail: { channelId } }));
          }
        }}
      />

      {/* Navigation Header */}
      {activeGame === null && (
        <FrostedNavbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onHome={handleHome}
          onRandomGame={handleRandomGame}
          onOpenChat={() => {
            setActiveGame(null);
            setIsChatActive(!isChatActive);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          activeGame={activeGame}
          isChatActive={isChatActive}
          isOffline={isOffline}
        />
      )}

      {/* Persistent Discord Chat Container */}
      <div className={isChatActive ? "block" : "hidden"}>
        <DiscordChat onReturnToGames={() => setIsChatActive(false)} />
      </div>

      {/* Main View: Game Player or Library Grid when Chat view is inactive */}
      {!isChatActive && (
        <main>
          {activeGame ? (
            <GamePlayer
              game={activeGame}
              onBack={handleHome}
              onSelectGame={handleSelectGame}
              allGames={gamesList}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              isOffline={isOffline}
              cachedUrls={cachedUrls}
              onDownloadForOffline={downloadGameForOffline}
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
              isOffline={isOffline}
              cachedUrls={cachedUrls}
            />
          )}
        </main>
      )}

      {/* Global Settings & Tab Cloak Panel */}
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
