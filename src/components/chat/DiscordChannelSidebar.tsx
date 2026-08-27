import { useState } from "react";
import {
  Hash,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import type { Channel, User } from "@/types/chat";

interface Props {
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export function DiscordChannelSidebar({
  channels,
  activeChannelId,
  onSelectChannel,
  currentUser,
  onLogout,
}: Props) {
  const [textOpen, setTextOpen] = useState(true);

  const textChannels = channels.filter((c) => c.type === "text");

  return (
    <div className="flex h-full w-60 shrink-0 flex-col bg-[#0d0d0d] text-neutral-400 font-sans border-r border-neutral-800 select-none">
      {/* Server Header */}
      <div className="flex h-12 items-center justify-between border-b border-neutral-800 px-4 font-bold text-white shadow-sm bg-[#0d0d0d]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-white" />
          <span className="truncate text-xs font-black uppercase tracking-wider">Frosted Community</span>
        </div>
        <ChevronDown className="h-4 w-4 text-neutral-400" />
      </div>

      {/* Channels List Container */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* TEXT CHANNELS */}
        <div>
          <button
            onClick={() => setTextOpen(!textOpen)}
            className="flex w-full items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white mb-1 px-1 cursor-pointer"
          >
            {textOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span>Text Channels</span>
          </button>

          {textOpen && (
            <div className="space-y-0.5">
              {textChannels.map((ch) => {
                const isActive = activeChannelId === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-white text-black font-bold shadow-sm"
                        : "text-neutral-400 hover:bg-[#161616] hover:text-white"
                    }`}
                  >
                    <Hash className={`h-4 w-4 ${isActive ? "text-black" : "text-neutral-500 group-hover:text-white"}`} />
                    <span className="truncate">{ch.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User Status Bar at Bottom */}
      {currentUser && (
        <div className="flex h-14 items-center justify-between border-t border-neutral-800 bg-[#111111] px-3">
          {/* Avatar & Username */}
          <div className="flex items-center gap-2.5 truncate pr-1">
            <div className="relative shrink-0">
              <div
                style={{ backgroundColor: currentUser.avatarColor }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-white/20 shadow-sm"
              >
                {currentUser.username.substring(0, 1).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#111111] bg-emerald-400" />
            </div>
            <div className="truncate">
              <div className="truncate text-xs font-bold text-white leading-tight">
                {currentUser.displayName || currentUser.username}
              </div>
              <div className="text-[10px] text-neutral-400">@{currentUser.username}</div>
            </div>
          </div>

          {/* Action Buttons: Logout only */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onLogout}
              title="Sign Out"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
