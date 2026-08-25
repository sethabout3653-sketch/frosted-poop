import { useState } from "react";
import { Gamepad2, Link2, X } from "lucide-react";
import type { Game } from "@/lib/games";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLaunchCustom: (game: Game) => void;
}

export function CustomGameModal({ isOpen, onClose, onLaunchCustom }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Please enter a valid game URL");
      return;
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = "https://" + formattedUrl;
    }

    try {
      new URL(formattedUrl);
    } catch {
      setError("Invalid URL format");
      return;
    }

    const customGame: Game = {
      id: "custom-" + Date.now(),
      name: title.trim() || "Custom Game",
      directory: formattedUrl,
      image:
        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80",
      category: "casual",
    };

    onLaunchCustom(customGame);
    onClose();
    setTitle("");
    setUrl("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0a0a] shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-black text-white">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Play Custom Game</h2>
              <p className="text-xs text-neutral-400">
                Launch any web or HTML5 game URL directly in Frosted
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Game Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. My Custom Game"
              className="w-full rounded-xl border border-neutral-800 bg-black px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Game Web URL / Embed Link
            </label>
            <div className="relative">
              <Link2 className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/game.html"
                className="w-full rounded-xl border border-neutral-800 bg-black pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all"
              />
            </div>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl border border-neutral-700 bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition-all cursor-pointer"
            >
              Launch Game
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
