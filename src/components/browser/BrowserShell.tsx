import {
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  Globe,
  Maximize2,
  Plus,
  RotateCw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { FROSTED_ICON_SVG, getFaviconUrl } from "@/lib/favicons";
import { toUrl } from "@/lib/proxy";
import { useBrowserChrome, useSettings } from "@/lib/settings";
import { useBookmarks } from "@/lib/bookmarks";
import type { Game } from "@/lib/games";
import { GameView } from "./GameView";
import { GamesLibrary } from "./GamesLibrary";
import { NewTabPage } from "./NewTabPage";
import { SettingsPanel } from "./SettingsPanel";
import { WebView } from "./WebView";
import { newTab, type Tab, type TabHistoryEntry } from "./types";

type Nav = { back: () => void; forward: () => void; reload: () => void } | null;

export function BrowserShell() {
  const [tabs, setTabs] = useState<Tab[]>(() => [newTab()]);
  const [activeId, setActiveId] = useState(() => tabs[0]!.id);
  const [showSettings, setShowSettings] = useState(false);
  const [omnibox, setOmnibox] = useState("");
  const [isOmniboxFocused, setIsOmniboxFocused] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const navs = useRef<Record<string, Nav>>({});
  const ignoreMetaUrlRef = useRef(false);
  const { settings, update } = useSettings();
  const { bookmarks, toggleUrlBookmark, isBookmarked } = useBookmarks();

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]!;
  useBrowserChrome();

  const isCurrentBookmarked = active.url ? isBookmarked(active.url) : false;

  const patchTab = useCallback((id: string, patch: Partial<Tab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const pushTabEntry = (tab: Tab, newEntry: TabHistoryEntry): Tab => {
    const currentHistory =
      tab.history && tab.history.length > 0
        ? tab.history
        : [
            {
              kind: tab.kind,
              title: tab.title,
              icon: tab.icon,
              url: tab.url,
              target: tab.target,
              gameDir: tab.gameDir,
              gameName: tab.gameName,
            },
          ];
    const currentIndex = tab.historyIndex ?? currentHistory.length - 1;
    const newHistory = [...currentHistory.slice(0, currentIndex + 1), newEntry];
    const newIndex = newHistory.length - 1;

    return {
      ...tab,
      kind: newEntry.kind,
      title: newEntry.title,
      icon: newEntry.icon,
      url: newEntry.url,
      target: newEntry.target ?? newEntry.url,
      gameDir: newEntry.gameDir,
      gameName: newEntry.gameName,
      history: newHistory,
      historyIndex: newIndex,
    };
  };

  const addTab = (patch: Partial<Tab> = {}) => {
    const tab = { ...newTab(), ...patch };
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
    if (tab.kind === "new") {
      setOmnibox("");
      ignoreMetaUrlRef.current = true;
    } else {
      setOmnibox(tab.url ?? "");
      ignoreMetaUrlRef.current = false;
    }
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh = newTab();
        setActiveId(fresh.id);
        setOmnibox("");
        ignoreMetaUrlRef.current = true;
        return [fresh];
      }
      if (id === activeId) {
        const targetTab = next[next.length - 1]!;
        setActiveId(targetTab.id);
        if (targetTab.kind === "new") {
          setOmnibox("");
          ignoreMetaUrlRef.current = true;
        } else {
          setOmnibox(targetTab.url ?? "");
          ignoreMetaUrlRef.current = false;
        }
      }
      return next;
    });
    delete navs.current[id];
  };

  const navigate = (input: string, id = activeId) => {
    if (!input.trim()) return;

    if (input.trim() === "frosted://games") {
      openGames(id);
      return;
    }

    const url = toUrl(input, settings.searchEngine);
    if (!url) return;

    const newEntry: TabHistoryEntry = {
      kind: "web",
      url,
      target: url,
      title: hostOf(url),
      icon: getFaviconUrl(url),
    };

    setTabs((prev) => prev.map((t) => (t.id === id ? pushTabEntry(t, newEntry) : t)));

    if (id === activeId) {
      setOmnibox(url);
      ignoreMetaUrlRef.current = false;
    }
  };

  const openGames = (id = activeId) => {
    const newEntry: TabHistoryEntry = {
      kind: "games",
      title: "Games Library",
      url: "frosted://games",
      icon: "",
    };

    setTabs((prev) => prev.map((t) => (t.id === id ? pushTabEntry(t, newEntry) : t)));

    if (id === activeId) {
      setOmnibox("");
      ignoreMetaUrlRef.current = true;
    }
  };

  const launchGame = (game: Game) => {
    const gameUrl = `frosted://games/${game.directory}`;
    const newEntry: TabHistoryEntry = {
      kind: "game",
      title: game.name,
      url: gameUrl,
      gameDir: game.directory,
      gameName: game.name,
      icon: "",
    };

    setTabs((prev) => prev.map((t) => (t.id === activeId ? pushTabEntry(t, newEntry) : t)));
    setOmnibox(gameUrl);
  };

  const handleBack = () => {
    setOmnibox("");
    ignoreMetaUrlRef.current = true;

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeId) return t;

        const currentHistory =
          t.history && t.history.length > 0
            ? t.history
            : [
                {
                  kind: t.kind,
                  title: t.title,
                  icon: t.icon,
                  url: t.url,
                  target: t.target,
                  gameDir: t.gameDir,
                  gameName: t.gameName,
                },
              ];
        const currentIndex = t.historyIndex ?? currentHistory.length - 1;

        if (currentIndex > 0) {
          const prevIndex = currentIndex - 1;
          const prevEntry = currentHistory[prevIndex]!;

          if (t.kind === "web" && prevEntry.kind === "web") {
            navs.current[activeId]?.back();
          }

          return {
            ...t,
            kind: prevEntry.kind,
            title: prevEntry.title,
            icon: prevEntry.icon,
            url: prevEntry.url,
            target: prevEntry.target ?? prevEntry.url,
            gameDir: prevEntry.gameDir,
            gameName: prevEntry.gameName,
            historyIndex: prevIndex,
          };
        } else {
          // Going back beyond first history entry reverts tab to New Tab page
          return {
            ...t,
            kind: "new",
            title: "New Tab",
            icon: FROSTED_ICON_SVG,
            url: "",
            target: "",
            historyIndex: 0,
          };
        }
      }),
    );
  };

  const handleForward = () => {
    setOmnibox("");
    ignoreMetaUrlRef.current = true;

    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== activeId) return t;

        const currentHistory =
          t.history && t.history.length > 0
            ? t.history
            : [
                {
                  kind: t.kind,
                  title: t.title,
                  icon: t.icon,
                  url: t.url,
                  target: t.target,
                  gameDir: t.gameDir,
                  gameName: t.gameName,
                },
              ];
        const currentIndex = t.historyIndex ?? currentHistory.length - 1;

        if (currentIndex < currentHistory.length - 1) {
          const nextIndex = currentIndex + 1;
          const nextEntry = currentHistory[nextIndex]!;

          if (t.kind === "web" && nextEntry.kind === "web") {
            navs.current[activeId]?.forward();
          }

          return {
            ...t,
            kind: nextEntry.kind,
            title: nextEntry.title,
            icon: nextEntry.icon,
            url: nextEntry.url,
            target: nextEntry.target ?? nextEntry.url,
            gameDir: nextEntry.gameDir,
            gameName: nextEntry.gameName,
            historyIndex: nextIndex,
          };
        }
        return t;
      }),
    );
  };

  const handleReload = () => {
    setIsReloading(true);
    navs.current[activeId]?.reload();
    setTimeout(() => setIsReloading(false), 600);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleStarClick = () => {
    if (!active.url) return;
    toggleUrlBookmark(active.title || hostOf(active.url), active.url);
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-black text-white font-sans select-none">
      {/* 1. Pitch-Black Top Tab Bar */}
      <div className="flex h-11 items-center bg-black px-3 pt-1.5 border-b border-neutral-900">
        {/* Tab Strip */}
        <div className="flex flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
          <AnimatePresence initial={false}>
            {tabs.map((tab) => {
              const isActive = tab.id === activeId;
              return (
                <div key={tab.id} className="relative flex items-center">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => {
                      setActiveId(tab.id);
                      if (tab.kind === "new") {
                        setOmnibox("");
                        ignoreMetaUrlRef.current = true;
                      } else {
                        setOmnibox(tab.url ?? "");
                        ignoreMetaUrlRef.current = false;
                      }
                    }}
                    className={`group relative flex h-8 min-w-[120px] max-w-[200px] cursor-pointer items-center gap-2 rounded-lg px-3 text-xs transition-all ${
                      isActive
                        ? "bg-neutral-900 text-white shadow-sm border border-neutral-800"
                        : "bg-transparent text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    {/* Tab Icon */}
                    {tab.kind === "games" || tab.kind === "game" ? (
                      <Gamepad2 className="h-3.5 w-3.5 shrink-0 text-white" />
                    ) : tab.kind === "new" ? (
                      <Globe className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                    ) : tab.icon ? (
                      <img
                        src={tab.icon}
                        alt=""
                        className="h-3.5 w-3.5 shrink-0 rounded-sm object-contain"
                        onError={(e) => {
                          e.currentTarget.src = FROSTED_ICON_SVG;
                        }}
                      />
                    ) : (
                      <Globe className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                    )}

                    {/* Tab Title */}
                    <span className="flex-1 truncate font-normal text-xs">
                      {tab.title || "New Tab"}
                    </span>

                    {/* Tab Close Button */}
                    <button
                      aria-label="Close tab"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>

          {/* New Tab "+" Button */}
          <button
            aria-label="New tab"
            onClick={() => addTab()}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-950 hover:text-white transition-colors ml-1"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Navigation & Omnibar Toolbar */}
      <div className="flex h-12 items-center gap-2.5 bg-black px-3 border-b border-neutral-900">
        {/* Navigation buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            title="Back"
            onClick={handleBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <button
            title="Forward"
            onClick={handleForward}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            title="Reload"
            onClick={handleReload}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <RotateCw className={`h-4 w-4 ${isReloading ? "animate-spin text-white" : ""}`} />
          </button>
        </div>

        {/* Omnibox input area */}
        <form
          className="flex-1 max-w-none"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(omnibox);
          }}
        >
          <div
            className={`flex h-[34px] items-center gap-2.5 rounded-lg bg-[#0d0d0d] border px-3 text-xs transition-all ${
              isOmniboxFocused
                ? "border-neutral-500 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                : "border-neutral-800 hover:border-neutral-700"
            }`}
          >
            <Search className="h-3.5 w-3.5 text-neutral-500" />
            <input
              value={omnibox}
              onFocus={(e) => {
                setIsOmniboxFocused(true);
                e.currentTarget.select();
              }}
              onBlur={() => setIsOmniboxFocused(false)}
              onChange={(e) => setOmnibox(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder="Search or type a URL"
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-neutral-500"
            />

            {/* Star Toggle in Address Bar */}
            {active.url && (
              <button
                type="button"
                onClick={handleStarClick}
                title={isCurrentBookmarked ? "Remove bookmark" : "Bookmark this page"}
                className="ml-1 text-neutral-500 hover:text-white transition-colors"
              >
                <Star
                  className={`h-4 w-4 ${
                    isCurrentBookmarked ? "fill-white text-white" : "text-neutral-500"
                  }`}
                />
              </button>
            )}
          </div>
        </form>

        {/* Control actions on the right of URL box */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Fullscreen Button */}
          <button
            title="Toggle Fullscreen"
            onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {/* Settings Button */}
          <button
            title="Settings"
            onClick={() => setShowSettings(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3. Bookmarks bar */}
      <div className="flex h-9 items-center gap-1.5 bg-black px-4 text-xs text-neutral-400 border-b border-neutral-900 overflow-x-auto no-scrollbar">
        {bookmarks.map((b) => {
          return (
            <button
              key={b.id}
              onClick={() => {
                if (b.url === "frosted://games") {
                  openGames(activeId);
                } else {
                  navigate(b.url);
                }
              }}
              className="flex items-center gap-1.5 rounded px-2.5 py-1 hover:bg-neutral-900 hover:text-white transition-colors"
            >
              <img
                src={getFaviconUrl(b.url)}
                alt=""
                className="h-3.5 w-3.5 rounded-sm object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                  if (sibling) sibling.style.display = "block";
                }}
              />
              <Globe className="h-3.5 w-3.5 text-neutral-500 hidden" />
              <span className="truncate max-w-[120px]">{b.title}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Main Content Viewport */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="absolute inset-0"
            style={{ visibility: tab.id === activeId ? "visible" : "hidden" }}
          >
            {tab.kind === "new" && (
              <NewTabPage
                onNavigate={(input) => navigate(input, tab.id)}
                onOpenGames={() => openGames(tab.id)}
                onOpenSettings={() => setShowSettings(true)}
              />
            )}
            {tab.kind === "games" && <GamesLibrary onLaunch={launchGame} />}
            {tab.kind === "game" && (
              <GameView
                directory={tab.gameDir!}
                name={tab.gameName ?? tab.title}
                onBack={() => openGames(tab.id)}
                registerNav={(nav) => {
                  navs.current[tab.id] = nav;
                }}
              />
            )}
            {tab.kind === "web" && (
              <WebView
                url={tab.target}
                active={tab.id === activeId}
                onMeta={(meta) => {
                  setTabs((prev) =>
                    prev.map((t) => {
                      if (t.id !== tab.id) return t;

                      let updatedTab = {
                        ...t,
                        ...(meta.title ? { title: meta.title } : {}),
                        ...(meta.icon ? { icon: meta.icon } : {}),
                        ...(meta.url ? { url: meta.url } : {}),
                      };

                      if (meta.url && meta.url !== t.url && !meta.url.startsWith("about:")) {
                        const newEntry: TabHistoryEntry = {
                          kind: "web",
                          url: meta.url,
                          target: meta.url,
                          title: meta.title || hostOf(meta.url),
                          icon: meta.icon || getFaviconUrl(meta.url),
                        };
                        updatedTab = pushTabEntry(t, newEntry);
                      }

                      return updatedTab;
                    }),
                  );

                  if (meta.url && tab.id === activeId && !ignoreMetaUrlRef.current) {
                    setOmnibox(meta.url);
                  }
                }}
                registerNav={(nav) => {
                  navs.current[tab.id] = nav;
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      </AnimatePresence>
    </div>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
