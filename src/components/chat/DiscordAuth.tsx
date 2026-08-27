import React, { useState } from "react";
import {
  User as UserIcon,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import type { User } from "@/types/chat";
import { notificationManager } from "../../lib/notifications";
import { db } from "../../lib/firebaseClient";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface Props {
  onLoginSuccess: (token: string, user: User) => void;
}

const AVATAR_COLORS = [
  "#5865f2", // Discord Blurple
  "#57f287", // Emerald Green
  "#fee75c", // Bright Yellow
  "#eb459e", // Neon Pink
  "#ed4245", // Crimson Red
  "#9b59b6", // Deep Purple
  "#1abc9c", // Turquoise
  "#e67e22", // Pumpkin Orange
];

export function DiscordAuth({ onLoginSuccess }: Props) {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem("discord_last_username") || "";
  });
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Please enter a username");
      setLoading(false);
      return;
    }

    // Request notification permission during user gesture
    notificationManager.requestPermission().catch(() => {});

    try {
      let loggedInUser: User | null = null;
      let sessionToken = "";

      // 1. Attempt Serverless / API Route Join
      try {
        const res = await fetch("/api/chat/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: trimmedUsername, avatarColor }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token && data.user) {
            sessionToken = data.token;
            loggedInUser = data.user;
          }
        }
      } catch {
        // Fallback to direct Firestore auth
      }

      // 2. Direct Cloud Firestore Registration (Serverless-Independent)
      if (!loggedInUser) {
        const userId = "usr-" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        sessionToken = "fs_" + userId + "_" + Date.now();
        loggedInUser = {
          id: userId,
          username: trimmedUsername,
          displayName: trimmedUsername,
          avatarColor,
          status: "online",
        };

        try {
          await setDoc(
            doc(db, "users", userId),
            {
              ...loggedInUser,
              currentVoiceChannelId: null,
              isMuted: false,
              isDeafened: false,
              isSpeaking: false,
              createdAt: Date.now(),
              lastSeen: Date.now(),
            },
            { merge: true }
          );
        } catch (fsErr) {
          console.warn("Direct Firestore auth note:", fsErr);
        }
      }

      // Store credentials locally
      localStorage.setItem("discord_chat_token", sessionToken);
      localStorage.setItem("discord_last_username", loggedInUser.username);
      localStorage.setItem("discord_cached_user", JSON.stringify(loggedInUser));

      onLoginSuccess(sessionToken, loggedInUser);
    } catch (err: any) {
      setError(err.message || "Unable to join chat. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#050505] p-4 text-neutral-200 font-sans selection:bg-white selection:text-black">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />

      {/* Container Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-[#0d0d0d] p-8 shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {/* Top Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-1.5">Join Community Chat</h1>
          <p className="text-xs text-neutral-400">
            Real-time messaging & voice rooms powered by Cloud Firestore.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. MasterGamer99"
                maxLength={24}
                required
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Pick Avatar Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  className={`h-8 w-8 rounded-lg transition-transform ${
                    avatarColor === color
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#0d0d0d] scale-110"
                      : "opacity-75 hover:opacity-100 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-black transition-all hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <>
                  <span>Enter Chat</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
          <ShieldCheck className="h-3.5 w-3.5 text-neutral-400" />
          <span>Real-time sync • Zero WebSockets • Firestore Live</span>
        </div>
      </div>
    </div>
  );
}
