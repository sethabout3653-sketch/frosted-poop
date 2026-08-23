import { FROSTED_ICON_SVG } from "@/lib/favicons";

export type TabKind = "new" | "web" | "games" | "game";

export type TabHistoryEntry = {
  kind: TabKind;
  title: string;
  icon: string;
  url: string;
  target?: string;
  gameDir?: string;
  gameName?: string;
};

export type Tab = {
  id: string;
  kind: TabKind;
  title: string;
  icon: string;
  url: string;
  /** Pending navigation target for web tabs. */
  target: string;
  gameDir?: string;
  gameName?: string;
  history: TabHistoryEntry[];
  historyIndex: number;
};

export function newTab(): Tab {
  const initialEntry: TabHistoryEntry = {
    kind: "new",
    title: "New Tab",
    icon: FROSTED_ICON_SVG,
    url: "",
    target: "",
  };
  return {
    id: Math.random().toString(36).slice(2),
    kind: "new",
    title: "New Tab",
    icon: FROSTED_ICON_SVG,
    url: "",
    target: "",
    history: [initialEntry],
    historyIndex: 0,
  };
}
