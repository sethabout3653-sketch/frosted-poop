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

    // Request notification permission during user gesture
    notificationManager.requestPermission().catch(() => {});

    try {
      let res = await fetch("/api/chat/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), avatarColor }),
      });

      // Fallback for custom serverless routing setups
      if (res.status === 404) {
        res = await fetch("/chat/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), avatarColor }),
        });
      }

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        let msg = data.error;
        if (!msg) {
          if (text && !text.includes("<") && !text.includes("FUNCTION_INVOCATION_FAILED")) {
            msg = text;
          } else {
            msg = "Unable to connect to chat server. Please check your network and try again.";
          }
        }
        throw new Error(msg);
      }

      // Store credentials
      localStorage.setItem("discord_chat_token", data.token);
      localStorage.setItem("discord_last_username", data.user.username);

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
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
          <h1 className="text-2xl font-black tracking-tight text-white mb-1.5">Join Chat</h1>
          <p className="text-xs text-neutral-400">
            Choose a username and an avatar color to jump in.
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
              <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. frosted_player"
                className="w-full rounded-xl border border-neutral-800 bg-[#141414] pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-600 outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Choose Avatar Accent Color
            </label>
            <div className="flex gap-2 py-1">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-7 w-7 rounded-full border-2 transition-transform cursor-pointer ${
                    avatarColor === c
                      ? "border-white scale-110 shadow-md ring-2 ring-white/50"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-40 cursor-pointer"
          >
            {loading ? (
              <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
            ) : (
              <>
                <span>Jump In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-neutral-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Guest access via HTTP</span>
        </div>
      </div>
    </div>
  );
}
