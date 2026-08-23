import { useEffect, useState } from "react";

export type Bookmark = {
  id: string;
  title: string;
  url: string;
};

const STORAGE_KEY = "frosted.bookmarks.v2";

const DEFAULT_BOOKMARKS: Bookmark[] = [
  { id: "b-games", title: "Games", url: "frosted://games" },
  { id: "b1", title: "Google", url: "https://google.com" },
  { id: "b2", title: "YouTube", url: "https://youtube.com" },
  { id: "b3", title: "Discord", url: "https://discord.com" },
  { id: "b4", title: "GitHub", url: "https://github.com" },
  { id: "b5", title: "Wikipedia", url: "https://wikipedia.org" },
];

export function getBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Bookmark[];
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_BOOKMARKS;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    setBookmarks(getBookmarks());

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setBookmarks(getBookmarks());
      }
    };

    window.addEventListener("storage", handleStorage);
    // Custom event to sync inside the same tab
    const handleSync = () => setBookmarks(getBookmarks());
    window.addEventListener("frosted_bookmarks_sync", handleSync);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("frosted_bookmarks_sync", handleSync);
    };
  }, []);

  const saveBookmarks = (next: Bookmark[]) => {
    setBookmarks(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("frosted_bookmarks_sync"));
    } catch {
      /* ignore */
    }
  };

  const addBookmark = (title: string, url: string) => {
    const next = [...bookmarks, { id: Math.random().toString(36).slice(2), title, url }];
    saveBookmarks(next);
  };

  const removeBookmark = (id: string) => {
    const next = bookmarks.filter((b) => b.id !== id);
    saveBookmarks(next);
  };

  const toggleUrlBookmark = (title: string, url: string) => {
    const exists = bookmarks.find((b) => b.url === url);
    if (exists) {
      removeBookmark(exists.id);
    } else {
      addBookmark(title, url);
    }
  };

  const isBookmarked = (url: string) => {
    return bookmarks.some((b) => b.url === url);
  };

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    toggleUrlBookmark,
    isBookmarked,
  };
}
