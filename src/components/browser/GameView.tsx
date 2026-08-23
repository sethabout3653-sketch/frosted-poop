import { ArrowLeft, Expand, Maximize2, Minimize2, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { gameEntry } from "@/lib/games";

type Props = {
  directory: string;
  name: string;
  onBack: () => void;
  registerNav?: (nav: { back: () => void; forward: () => void; reload: () => void } | null) => void;
};

export function GameView({ directory, name, onBack, registerNav }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (registerNav) {
      registerNav({
        back: onBack,
        forward: () => {},
        reload: () => {
          if (frameRef.current) {
            frameRef.current.src = gameEntry(directory);
          }
        },
      });
    }
    return () => {
      if (registerNav) registerNav(null);
    };
  }, [directory, onBack, registerNav]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      className="relative flex h-full w-full flex-col bg-background"
    >
      {/* Sleek Minimalist Floating Overlay Pill (Eliminating stacked duplicate toolbars) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: showControls || isFullscreen ? 1 : 0.4, y: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-2 py-1 shadow-xl backdrop-blur-md transition-opacity hover:opacity-100"
      >
        <button
          onClick={onBack}
          title="Back to Games Library"
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-3 w-3" />
          <span className="hidden sm:inline">Library</span>
        </button>

        <div className="h-3 w-[1px] bg-border" />

        <button
          aria-label="Reload game"
          title="Reload Game"
          onClick={() => {
            if (frameRef.current) frameRef.current.src = gameEntry(directory);
          }}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        <button
          aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          onClick={toggleFullscreen}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </motion.div>

      {/* Main Game Frame filling the full window view cleanly */}
      <iframe
        ref={frameRef}
        src={gameEntry(directory)}
        title={name}
        className="h-full w-full flex-1 border-0 bg-background"
        allow="fullscreen; autoplay; gamepad; pointer-lock; clipboard-write; encrypted-media"
      />
    </div>
  );
}
