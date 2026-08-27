import { useState } from "react";
import {
  Hash,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Volume2,
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  AlertCircle,
  X,
} from "lucide-react";
import type { Channel, User, VoiceUser } from "@/types/chat";

interface Props {
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  currentUser: User | null;
  voiceStates?: Record<string, VoiceUser[]>;
  currentVoiceChannelId?: string | null;
  voiceError?: string | null;
  setVoiceError?: (err: string | null) => void;
  isMuted?: boolean;
  isDeafened?: boolean;
  onJoinVoice: (channelId: string) => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onLogout: () => void;
}

export function DiscordChannelSidebar({
  channels,
  activeChannelId,
  onSelectChannel,
  currentUser,
  voiceStates = {},
  currentVoiceChannelId = null,
  voiceError = null,
  setVoiceError,
  isMuted = false,
  isDeafened = false,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  onToggleDeafen,
  onLogout,
}: Props) {
  const [textOpen, setTextOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(true);

  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

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
        {voiceError && (
          <div className="relative mx-1 mb-1 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-[11px] text-rose-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-400">Microphone Error</p>
                <p className="mt-0.5 leading-normal text-neutral-300">{voiceError}</p>
              </div>
              {setVoiceError && (
                <button
                  onClick={() => setVoiceError(null)}
                  className="rounded hover:bg-white/10 p-0.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

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

        {/* VOICE CHANNELS */}
        <div>
          <button
            onClick={() => setVoiceOpen(!voiceOpen)}
            className="flex w-full items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white mb-1 px-1 cursor-pointer"
          >
            {voiceOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span>Voice Channels</span>
          </button>

          {voiceOpen && (
            <div className="space-y-0.5">
              {voiceChannels.map((ch) => {
                const isUserInThisVoice = currentVoiceChannelId === ch.id;
                const occupants = voiceStates[ch.id] || [];

                return (
                  <div key={ch.id} className="space-y-0.5">
                    <button
                      onClick={() => onJoinVoice(ch.id)}
                      className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        isUserInThisVoice
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold"
                          : "text-neutral-400 hover:bg-[#161616] hover:text-white"
                      }`}
                    >
                      <Volume2 className={`h-4 w-4 ${isUserInThisVoice ? "text-emerald-400" : "text-neutral-500 group-hover:text-white"}`} />
                      <span className="truncate flex-1 text-left">{ch.name}</span>
                    </button>

                    {/* Occupants list */}
                    {occupants.length > 0 && (
                      <div className="space-y-0.5 py-0.5">
                        {occupants.map((occ) => (
                          <div
                            key={occ.userId}
                            className="flex items-center gap-2 pl-7 pr-2 py-1 text-[11px] text-neutral-300"
                          >
                            <div
                              style={{ backgroundColor: occ.avatarColor }}
                              className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ring-1 ring-white/10 uppercase"
                            >
                              {occ.username.substring(0, 1)}
                            </div>
                            <span className="truncate flex-1 font-medium">{occ.displayName || occ.username}</span>
                            <div className="flex items-center gap-0.5 shrink-0 opacity-85">
                              {occ.isMuted && <MicOff className="h-3 w-3 text-rose-400" />}
                              {occ.isDeafened && <Headphones className="h-3 w-3 text-amber-400" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Voice Status Controls Panel */}
      {currentVoiceChannelId && (
        <div className="flex flex-col gap-1.5 border-t border-neutral-800 bg-[#0c0c0c] p-2.5 mx-1 rounded-t-lg shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 shrink-0">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <span className="text-[11px] font-bold tracking-tight">Voice Connected</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-semibold truncate max-w-[90px] text-right">
              {channels.find((c) => c.id === currentVoiceChannelId)?.name || "General Voice"}
            </span>
          </div>

          <div className="flex items-center justify-around mt-1">
            <button
              onClick={onToggleMute}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all cursor-pointer ${
                isMuted
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/25"
                  : "hover:bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              onClick={onToggleDeafen}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all cursor-pointer ${
                isDeafened
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/25"
                  : "hover:bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
            >
              <Headphones className={`h-4 w-4 ${isDeafened ? "text-amber-400" : ""}`} />
            </button>
            <button
              onClick={onLeaveVoice}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer"
              title="Disconnect Voice"
            >
              <PhoneOff className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
