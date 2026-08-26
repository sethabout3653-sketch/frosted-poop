import { Search, Shuffle, SlidersHorizontal, Gamepad2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Game } from "@/lib/games";

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onHome: () => void;
  onRandomGame: () => void;
  onOpenSettingsModal: () => void;
  activeGame: Game | null;
}

export function FrostedNavbar({
  searchQuery,
  onSearchChange,
  onHome,
  onRandomGame,
  onOpenSettingsModal,
  activeGame,
}: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        onSearchChange("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchChange]);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-900 bg-[#0a0a0a]/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo & Brand (Original Frosted Wordmark) */}
        <button
          onClick={onHome}
          className="group flex items-center gap-2.5 cursor-pointer smooth-btn"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-black text-white shadow-sm group-hover:border-neutral-600 transition-colors duration-200">
            <Gamepad2 className="h-5 w-5 text-white transition-transform duration-200 group-hover:scale-105" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-normal tracking-tight text-white font-sans drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] group-hover:text-neutral-100 transition-colors">
              frosted
            </span>
            <span className="rounded-md border border-neutral-800 bg-[#0f0f0f] px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 uppercase tracking-wider group-hover:border-neutral-700 transition-colors">
              games
            </span>
          </div>
        </button>

        {/* Global Search Field (Frosted Omnibox Style) */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-500 transition-colors pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search games or press '/' to search..."
            className="w-full rounded-xl border border-neutral-800 bg-[#0d0d0d] pl-10 pr-10 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-neutral-500 focus:bg-[#121212] focus:shadow-[0_0_15px_rgba(255,255,255,0.06)] transition-all duration-200"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                onSearchChange("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-2 rounded p-0.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-2.5 pointer-events-none rounded border border-neutral-800 bg-black px-1.5 text-[10px] font-mono text-neutral-500">
              /
            </kbd>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/create-checkout-session", {
                  method: "POST",
                });
                const data = await res.json();
                if (data.url) {
                  window.location.href = data.url;
                } else if (data.error) {
                  alert("Checkout Error: " + data.error + "\n\nMake sure STRIPE_SECRET_KEY is set in your Vercel Environment Variables!");
                }
              } catch (err) {
                console.error("Failed to start checkout", err);
                alert("Failed to reach checkout. Check console.");
              }
            }}
            title="Get VIP"
            className="smooth-btn flex items-center gap-1.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs font-medium text-yellow-500 hover:border-yellow-500 hover:bg-yellow-500/20 cursor-pointer"
          >
            <span>Get VIP</span>
          </button>
          
          {activeGame && (
            <button
              onClick={onHome}
              className="smooth-btn hidden sm:flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-[#0d0d0d] px-3 py-2 text-xs font-medium text-neutral-300 hover:border-neutral-600 hover:text-white cursor-pointer"
            >
              <span>Library</span>
            </button>
          )}

          <button
            onClick={onRandomGame}
            title="Play Random Game"
            className="smooth-btn flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-[#0d0d0d] px-3 py-2 text-xs font-medium text-neutral-300 hover:border-neutral-600 hover:text-white cursor-pointer"
          >
            <Shuffle className="h-3.5 w-3.5 text-neutral-400 transition-transform group-hover:rotate-45" />
            <span className="hidden sm:inline">Random</span>
          </button>

          <button
            onClick={onOpenSettingsModal}
            title="Tab Disguise & Cloaking"
            className="smooth-btn rounded-xl border border-neutral-800 bg-[#0d0d0d] p-2 text-neutral-400 hover:border-neutral-600 hover:text-white cursor-pointer"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="px-4 pb-3 md:hidden">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search games..."
            className="w-full rounded-xl border border-neutral-800 bg-[#0d0d0d] pl-10 pr-9 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-neutral-500 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
