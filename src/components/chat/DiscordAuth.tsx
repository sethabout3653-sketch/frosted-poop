import React, { useState } from "react";
import { Lock, User as UserIcon, MessageSquare, ArrowRight, ShieldCheck, AlertCircle, Check, X } from "lucide-react";
import type { User } from "@/types/chat";

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
  // If user has never registered/signed in before, default to "signup" mode
  const [mode, setMode] = useState<"login" | "signup">(() => {
    const hasRegisteredBefore = localStorage.getItem("has_registered_before");
    return hasRegisteredBefore ? "login" : "signup";
  });

  const [username, setUsername] = useState(() => {
    return localStorage.getItem("discord_last_username") || "";
  });
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password requirement checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  // Calculate password strength (Weak, Medium, Strong)
  const calculateStrength = (): { level: "Weak" | "Medium" | "Strong"; score: number; color: string; percentage: number } => {
    if (!password) {
      return { level: "Weak", score: 0, color: "bg-rose-500", percentage: 0 };
    }
    let score = 0;
    if (hasMinLength) score += 1;
    if (hasUppercase) score += 1;
    if (hasLowercase) score += 1;
    if (hasNumberOrSpecial) score += 1;
    if (password.length >= 12) score += 1;

    if (score <= 2) {
      return { level: "Weak", score, color: "bg-rose-500", percentage: 33 };
    } else if (score <= 4) {
      return { level: "Medium", score, color: "bg-amber-400", percentage: 66 };
    } else {
      return { level: "Strong", score, color: "bg-emerald-400", percentage: 100 };
    }
  };

  const strength = calculateStrength();
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumberOrSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "signup" && !isPasswordValid) {
      setError("Please ensure your password meets all requirements.");
      return;
    }

    setLoading(true);

    const endpoint = mode === "signup" ? "/api/chat/signup" : "/api/chat/login";
    const bodyPayload =
      mode === "signup"
        ? { username: username.trim(), password, displayName: displayName.trim() || username.trim(), avatarColor }
        : { username: username.trim(), password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(res.ok ? "Server returned an invalid response" : "Server error. Please try again.");
      }

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Store credentials & registered status in localStorage to remember site state
      localStorage.setItem("discord_chat_token", data.token);
      localStorage.setItem("has_registered_before", "true");
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

      {/* Container Card - Frosted Games Black & White Aesthetic */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-[#0d0d0d] p-8 shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {/* Top Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-1.5">
            {mode === "login" ? "Welcome Back" : "Sign Up for Frosted Chat"}
          </h1>
          <p className="text-xs text-neutral-400">
            {mode === "login"
              ? "Sign in with your username & password to join text and voice chat."
              : "No email required! Choose a username and strong password to get started."}
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
              Username <span className="text-neutral-500 font-normal">(No email needed)</span>
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

          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-300">
                Display Name <span className="text-neutral-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Captain Frosted"
                className="w-full rounded-xl border border-neutral-800 bg-[#141414] px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-neutral-800 bg-[#141414] pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-600 outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
              />
            </div>

            {/* Password Strength Meter Bar */}
            {password.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Password Strength:</span>
                  <span
                    className={`font-bold ${
                      strength.level === "Weak"
                        ? "text-rose-400"
                        : strength.level === "Medium"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {strength.level}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a] border border-neutral-800">
                  <div
                    style={{ width: `${strength.percentage}%` }}
                    className={`h-full transition-all duration-300 ${strength.color}`}
                  />
                </div>
              </div>
            )}

            {/* Password Requirements Checklist (for Sign Up) */}
            {mode === "signup" && (
              <div className="mt-3 rounded-xl bg-[#121212] p-3 text-[11px] space-y-1.5 text-neutral-400 border border-neutral-800/80">
                <div className="font-semibold text-white mb-1">Password Requirements:</div>
                <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400" : "text-neutral-500"}`}>
                  {hasMinLength ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> : <X className="h-3.5 w-3.5 shrink-0 text-rose-500" />}
                  <span>At least 8 characters long</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-400" : "text-neutral-500"}`}>
                  {hasUppercase ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> : <X className="h-3.5 w-3.5 shrink-0 text-rose-500" />}
                  <span>At least 1 uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLowercase ? "text-emerald-400" : "text-neutral-500"}`}>
                  {hasLowercase ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> : <X className="h-3.5 w-3.5 shrink-0 text-rose-500" />}
                  <span>At least 1 lowercase letter (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumberOrSpecial ? "text-emerald-400" : "text-neutral-500"}`}>
                  {hasNumberOrSpecial ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> : <X className="h-3.5 w-3.5 shrink-0 text-rose-500" />}
                  <span>At least 1 number or special symbol</span>
                </div>
              </div>
            )}
          </div>

          {mode === "signup" && (
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
                      avatarColor === c ? "border-white scale-110 shadow-md ring-2 ring-white/50" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "signup" && !isPasswordValid)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-40 cursor-pointer"
          >
            {loading ? (
              <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
            ) : (
              <>
                <span>{mode === "login" ? "Sign In" : "Sign Up & Join"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch Mode Toggle */}
        <div className="mt-6 border-t border-neutral-800 pt-4 text-center text-xs text-neutral-400">
          {mode === "login" ? (
            <span>
              Never signed in before?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="font-semibold text-white hover:underline cursor-pointer"
              >
                Sign Up Now
              </button>
            </span>
          ) : (
            <span>
              Already registered?{" "}
              <button
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="font-semibold text-white hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </span>
          )}
        </div>

        {/* Security badge */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-neutral-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Remembered Session & In-Game Voice Chat Enabled</span>
        </div>
      </div>
    </div>
  );
}

