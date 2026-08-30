import { useEffect, useState } from "react";
import { Play, X, ExternalLink, ShieldCheck, Sparkles, Zap, Info } from "lucide-react";
import { GoogleAdBanner } from "./GoogleAdBanner";
import type { Game } from "@/lib/games";

interface GoogleVignetteModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function GoogleVignetteModal({
  game,
  isOpen,
  onClose,
  onContinue,
}: GoogleVignetteModalProps) {
  const [countdown, setCountdown] = useState<number>(3);
  const [canSkip, setCanSkip] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(3);
      setCanSkip(false);
      return;
    }

    setCountdown(3);
    setCanSkip(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, game?.id]);

  if (!isOpen || !game) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Top Header / Skip Control */}
        <div className="w-full flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold tracking-wider text-sky-400 uppercase flex items-center gap-1">
              <Info className="h-3 w-3 text-sky-400" />
              <span>GOOGLE ADSENSE VIGNETTE</span>
            </span>
            <span className="text-xs text-neutral-400 hidden sm:inline">
              Full Screen Interstitial
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canSkip ? (
              <button
                onClick={onContinue}
                className="smooth-btn flex items-center gap-1.5 rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-black hover:bg-neutral-200 cursor-pointer shadow-lg animate-bounce"
              >
                <span>Play {game.name}</span>
                <Play className="h-3.5 w-3.5 fill-black ml-0.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400">
                <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                <span>Skip in {countdown}s...</span>
              </div>
            )}

            <button
              onClick={onClose}
              title="Close Ad"
              className="smooth-btn rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Game Title Preview */}
        <div className="mb-4">
          <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
            <span>Loading</span>
            <span className="text-sky-400">{game.name}</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Sponsored advertisement powered by Google AdSense
          </p>
        </div>

        {/* Ad Banner Content Container */}
        <div className="w-full my-2 bg-neutral-950 rounded-xl border border-neutral-800 p-3 flex flex-col items-center min-h-[220px] justify-center">
          <GoogleAdBanner formatType="rectangle" label="GOOGLE VIGNETTE AD" />
        </div>

        {/* Bottom Footer Action */}
        <div className="w-full border-t border-neutral-800 pt-4 mt-4 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Google AdSense Publisher Active</span>
          </div>

          <button
            onClick={onContinue}
            className="text-xs font-medium text-neutral-300 hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Skip directly to game &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
