import { Clapperboard, Gamepad2, Globe, Music, Plus, Search, Sparkles, Tv, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { useSettings } from "@/lib/settings";
import { useBookmarks } from "@/lib/bookmarks";
import { getFaviconUrl } from "@/lib/favicons";

type Props = {
  onNavigate: (input: string) => void;
  onOpenGames: () => void;
  onOpenSettings?: () => void;
};

export function NewTabPage({ onNavigate, onOpenGames }: Props) {
  const [value, setValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ label: "", url: "" });
  const [isFocused, setIsFocused] = useState(false);
  const { settings, update } = useSettings();
  const { bookmarks, addBookmark, removeBookmark } = useBookmarks();

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-black bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:52px_52px] text-neutral-200 font-sans px-4 py-8 select-none overflow-y-auto">
      {/* Center content container */}
      <div className="flex flex-col items-center justify-center w-full max-w-2xl py-8">
        {/* Large wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col items-center group cursor-default"
        >
          <motion.span
            whileHover={{ scale: 1.05, tracking: "0.02em" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-[76px] font-normal leading-none font-sans transition-colors group-hover:text-white text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            frosted
          </motion.span>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="w-full max-w-[580px] mb-8"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (value.trim()) onNavigate(value);
            }}
            className={`flex items-center gap-3 rounded-xl border bg-black/90 px-4 py-3 transition-all ${
              isFocused
                ? "border-neutral-500 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                : "border-neutral-800/80 hover:border-neutral-700"
            }`}
          >
            <Search className="h-4 w-4 shrink-0 text-neutral-400" />
            <input
              value={value}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Search or type a URL"
              spellCheck={false}
              autoFocus
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500 font-light"
            />

            {/* Dropdown Selector Badge */}
            <select
              value={settings.searchEngine}
              onChange={(e) => update({ searchEngine: e.target.value })}
              className="rounded-lg bg-[#0a0a0a] border border-neutral-800/80 px-2.5 py-1 text-xs text-neutral-300 outline-none hover:text-white cursor-pointer hover:border-neutral-700 transition-colors"
            >
              <option value="https://duckduckgo.com/?q=%s">DuckDuckGo</option>
              <option value="https://www.google.com/search?q=%s">Google</option>
              <option value="https://www.bing.com/search?q=%s">Bing</option>
              <option value="https://search.brave.com/search?q=%s">Brave</option>
              <option value="https://search.yahoo.com/search?p=%s">Yahoo</option>
            </select>
          </form>
        </motion.div>

        {/* Dynamic Quick Access Bookmarks Grid */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 max-w-lg w-full">
          {bookmarks.map((b) => {
            const isGames = b.url === "frosted://games" || b.title.toLowerCase() === "games";
            const isMovies = b.title.toLowerCase() === "movies";
            const isMusic = b.title.toLowerCase() === "music";
            const isAI = b.title.toLowerCase() === "ai";
            const isVMs = b.title.toLowerCase() === "vms";

            let renderIcon;
            if (isGames) {
              renderIcon = <Gamepad2 className="h-6 w-6 text-white" />;
            } else if (isMovies) {
              renderIcon = <Clapperboard className="h-6 w-6 text-white" />;
            } else if (isMusic) {
              renderIcon = <Music className="h-6 w-6 text-white" />;
            } else if (isAI) {
              renderIcon = <Sparkles className="h-6 w-6 text-white" />;
            } else if (isVMs) {
              renderIcon = <Tv className="h-6 w-6 text-white" />;
            } else {
              renderIcon = (
                <>
                  <img
                    src={getFaviconUrl(b.url)}
                    alt=""
                    className="h-7 w-7 object-contain rounded-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                      if (sibling) sibling.style.display = "block";
                    }}
                  />
                  <Globe className="h-6 w-6 text-neutral-400 hidden" />
                </>
              );
            }

            return (
              <div key={b.id} className="group relative flex flex-col items-center w-16">
                <button
                  onClick={() => {
                    if (isGames) {
                      onOpenGames();
                    } else {
                      onNavigate(b.url);
                    }
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-800/80 bg-black hover:bg-neutral-900/80 hover:border-neutral-700 transition-all cursor-pointer relative shadow-sm"
                >
                  {renderIcon}
                </button>
                <span className="mt-2 text-[10px] text-neutral-500 font-normal group-hover:text-neutral-300 transition-colors truncate max-w-full text-center opacity-0 group-hover:opacity-100">
                  {b.title}
                </span>

                {/* Delete button on hover */}
                <button
                  aria-label={`Delete ${b.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBookmark(b.id);
                  }}
                  className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white shadow-sm transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}

          {/* Add custom bookmark button */}
          <div className="flex flex-col items-center w-16">
            <button
              onClick={() => setAdding(!adding)}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-800/80 bg-black hover:bg-neutral-900/80 hover:border-neutral-700 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="h-6 w-6 text-neutral-200" />
            </button>
            <span className="mt-2 text-xs text-neutral-300 font-normal">Add</span>
          </div>
        </div>

        {/* Add Bookmark form overlay */}
        {adding && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.label.trim() || !draft.url.trim()) return;
              addBookmark(draft.label.trim(), draft.url.trim());
              setDraft({ label: "", url: "" });
              setAdding(false);
            }}
            className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-neutral-800 bg-[#0d0d0d] p-3 shadow-md"
          >
            <input
              autoFocus
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="Name (e.g. Wiki)"
              className="w-32 rounded bg-black border border-neutral-800 px-3 py-1.5 text-xs text-white outline-none focus:border-neutral-600"
            />
            <input
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="URL (e.g. wikipedia.org)"
              className="w-48 rounded bg-black border border-neutral-800 px-3 py-1.5 text-xs text-white outline-none focus:border-neutral-600"
            />
            <button
              type="submit"
              className="rounded bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition-opacity"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </motion.form>
        )}
      </div>
    </div>
  );
}
