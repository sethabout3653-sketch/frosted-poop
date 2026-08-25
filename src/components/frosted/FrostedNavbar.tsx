import { Search, Shuffle, Plus, Settings, Shield, Snowflake, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Game } from "@/lib/games";

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onHome: () => void;
  onRandomGame: () => void;
  onOpenCustomModal: () => void;
  onOpenSettingsModal: () => void;
  onPanic: () => void;
  activeGame: Game | null;
}

export function FrostedNavbar({
  searchQuery,
  onSearchChange,
  onHome,
  onRandomGame,
  onOpenCustomModal,
  onOpenSettingsModal,
  onPanic,
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo & Brand */}
        <button
          onClick={onHome}
          className="group flex items-center gap-2.5 transition-transform active:scale-95"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-sky-400 p-[1px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/35 transition-all">
            <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-slate-950/90">
              <Snowflake className="h-5 w-5 text-cyan-300 transition-transform group-hover:rotate-45 duration-300" />
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold tracking-tight text-white">FROSTED</span>
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <span className="block text-[10px] font-medium tracking-wider text-slate-400 uppercase">
              Games Arcade
            </span>
          </div>
        </button>

        {/* Global Search Field */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search unblocked games..."
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:bg-slate-900/90 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          />
          <kbd className="absolute right-3 top-2.5 pointer-events-none rounded border border-white/10 bg-slate-800 px-1.5 text-[10px] font-mono text-slate-400">
            /
          </kbd>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeGame && (
            <button
              onClick={onHome}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
            >
              <span>Library</span>
            </button>
          )}

          <button
            onClick={onRandomGame}
            title="Play Random Game"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-300 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-300 transition-all"
          >
            <Shuffle className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Random</span>
          </button>

          <button
            onClick={onOpenCustomModal}
            title="Play Custom Game URL"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-300 hover:border-indigo-500/40 hover:bg-slate-800 hover:text-indigo-300 transition-all"
          >
            <Plus className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Add Link</span>
          </button>

          <button
            onClick={onPanic}
            title="Panic Button (Esc)"
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-900/50 hover:text-white transition-all"
          >
            <Shield className="h-3.5 w-3.5 text-rose-400" />
            <span className="hidden sm:inline">Panic</span>
          </button>

          <button
            onClick={onOpenSettingsModal}
            title="Settings & Cloak"
            className="rounded-xl border border-white/10 bg-slate-900/60 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="px-4 pb-3 md:hidden">
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search games..."
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>
      </div>
    </header>
  );
}
