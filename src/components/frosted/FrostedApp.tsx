import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchGames, type Game } from "@/lib/games";
import { useFrostedStore } from "@/lib/frostedStore";
import { useOfflineStatus } from "@/lib/offlineManager";
import { FrostedNavbar } from "./FrostedNavbar";
import { GamesGrid } from "./GamesGrid";
import { GamePlayer } from "./GamePlayer";
import { FrostedSettingsModal } from "./FrostedSettingsModal";
import { VerificationGate } from "./VerificationGate";
import { DiscordChat } from "@/components/chat/DiscordChat";
import { FrostedInAppNotification } from "@/components/chat/FrostedInAppNotification";
import { applyAdScripts, triggerAdImpression } from "@/lib/adManager";
import { LuminGames } from "./LuminGames";

export function FrostedApp() {
  const [isVerified, setIsVerified] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem("frosted_verified_permanent") === "true" ||
        sessionStorage.getItem("frosted_verified") === "true"
      );
    } catch {
      return false;
    }
  });

  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isLuminActive, setIsLuminActive] = useState(false);

  const {
    favorites,
    toggleFavorite,
    recentlyPlayed,
    recordPlay,
    cloak,
    updateCloak,
    coverStyle,
    updateCoverStyle,
  } = useFrostedStore();

  const { isOffline, cachedUrls, downloadGameForOffline, clearGameCache } = useOfflineStatus();

  // Listen for open-chat event when a notification is clicked
  useEffect(() => {
    const handleOpenChat = () => {
      setActiveGame(null);
      setIsLuminActive(false);
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

  const handleVerify = () => {
    try {
      localStorage.setItem("frosted_verified_permanent", "true");
      sessionStorage.setItem("frosted_verified", "true");
    } catch {
      /* silent */
    }
    setIsVerified(true);
  };

  const { data: gamesList = [], isLoading } = useQuery({
    queryKey: ["frosted-games"],
    queryFn: fetchGames,
    staleTime: 1000 * 60 * 30,
  });

  const handleLaunchGameDirect = (game: Game) => {
    triggerAdImpression();
    setIsChatActive(false);
    setIsLuminActive(false);
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
    setIsLuminActive(false);
    const randomIndex = Math.floor(Math.random() * gamesList.length);
    handleSelectGame(gamesList[randomIndex]);
  };

  const handleHome = () => {
    setIsChatActive(false);
    setIsLuminActive(false);
    setActiveGame(null);
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isVerified) {
    return <VerificationGate onVerified={handleVerify} />;
  }

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
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenChat={() => {
            setActiveGame(null);
            setIsLuminActive(false);
            setIsChatActive(!isChatActive);
          }}
          onOpenLumin={() => {
            setActiveGame(null);
            setIsChatActive(false);
            setIsLuminActive(!isLuminActive);
          }}
          activeGame={activeGame}
          isChatActive={isChatActive}
          isLuminActive={isLuminActive}
          isOffline={isOffline}
        />
      )}

      {/* Persistent Discord Chat Container */}
      <div className={isChatActive && !isLuminActive ? "block" : "hidden"}>
        <DiscordChat onReturnToGames={() => setIsChatActive(false)} />
      </div>

      {/* Persistent Lumin Games Container */}
      <div className={isLuminActive && !isChatActive ? "block" : "hidden"}>
        <LuminGames />
      </div>

      {/* Main View: Game Player or Library Grid when Chat and Lumin views are inactive */}
      {!isChatActive && !isLuminActive && (
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

      <FrostedSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentCloak={cloak}
        onSelectCloak={updateCloak}
        currentCoverStyle={coverStyle}
        onSelectCoverStyle={updateCoverStyle}
        cachedCount={cachedUrls.length}
        onClearCache={clearGameCache}
      />
    </div>
  );
}
