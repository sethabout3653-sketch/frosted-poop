import { Search, Shuffle, SlidersHorizontal, Gamepad2 } from "lucide-react";
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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-900 bg-[#0a0a0a]/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo & Brand (Original Frosted Wordmark) */}
        <button
          onClick={onHome}
          className="group flex items-center gap-2.5 transition-transform active:scale-95 cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-black text-white shadow-sm group-hover:border-neutral-700 transition-all">
            <Gamepad2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-normal tracking-tight text-white font-sans drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]">
              frosted
            </span>
            <span className="rounded-md border border-neutral-800 bg-[#0a0a0a] px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              games
            </span>
          </div>
        </button>

        {/* Global Search Field (Frosted Omnibox Style) */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search games or type to filter..."
            className="w-full rounded-xl border border-neutral-800 bg-[#0a0a0a] pl-10 pr-10 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-neutral-500 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all"
          />
          <kbd className="absolute right-3 top-2.5 pointer-events-none rounded border border-neutral-800 bg-black px-1.5 text-[10px] font-mono text-neutral-500">
            /
          </kbd>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeGame && (
            <button
              onClick={onHome}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-black px-3 py-2 text-xs font-medium text-neutral-300 hover:border-neutral-700 hover:text-white transition-all cursor-pointer"
            >
              <span>Library</span>
            </button>
          )}

          <button
            onClick={onRandomGame}
            title="Play Random Game"
            className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-black px-3 py-2 text-xs font-medium text-neutral-300 hover:border-neutral-700 hover:text-white hover:bg-neutral-900/80 transition-all cursor-pointer"
          >
            <Shuffle className="h-3.5 w-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Random</span>
          </button>

          <button
            onClick={onOpenSettingsModal}
            title="Settings & Cloak"
            className="rounded-xl border border-neutral-800 bg-black p-2 text-neutral-400 hover:border-neutral-700 hover:text-white transition-all cursor-pointer"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="px-4 pb-3 md:hidden">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search games..."
            className="w-full rounded-xl border border-neutral-800 bg-[#0a0a0a] pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-neutral-500 transition-all"
          />
        </div>
      </div>
    </header>
  );
}
