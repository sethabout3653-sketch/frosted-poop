import { useState } from "react";
import {
  Hash,
  Volume2,
  Mic,
  MicOff,
  VolumeX,
  PhoneOff,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Radio,
} from "lucide-react";
import type { Channel, User, VoiceUser } from "@/types/chat";

interface Props {
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  currentUser: User | null;
  voiceStates: Record<string, VoiceUser[]>;
  currentVoiceChannelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSelfSpeaking: boolean;
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
  voiceStates,
  currentVoiceChannelId,
  isMuted,
  isDeafened,
  isSelfSpeaking,
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
            <div className="space-y-1">
              {voiceChannels.map((ch) => {
                const isConnectedToThis = currentVoiceChannelId === ch.id;
                const occupants = voiceStates[ch.id] || [];

                return (
                  <div key={ch.id} className="space-y-0.5">
                    <button
                      onClick={() => onJoinVoice(ch.id)}
                      className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        isConnectedToThis
                          ? "bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30"
                          : "text-neutral-400 hover:bg-[#161616] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Volume2 className={`h-4 w-4 ${isConnectedToThis ? "text-emerald-400" : "text-neutral-500 group-hover:text-white"}`} />
                        <span className="truncate">{ch.name}</span>
                      </div>
                      {isConnectedToThis && (
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </button>

                    {/* Occupants connected in this voice channel */}
                    {occupants.length > 0 && (
                      <div className="pl-6 space-y-1 py-1">
                        {occupants.map((occ) => {
                          const isSelf = occ.userId === currentUser?.id;
                          const speaking = isSelf ? isSelfSpeaking : occ.isSpeaking;

                          return (
                            <div
                              key={occ.userId}
                              className="flex items-center justify-between gap-2 px-2 py-1 rounded-md hover:bg-[#161616] text-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div
                                  style={{ backgroundColor: occ.avatarColor }}
                                  className={`relative flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white transition-all ${
                                    speaking ? "ring-2 ring-emerald-400 scale-105" : ""
                                  }`}
                                >
                                  {occ.username.substring(0, 1).toUpperCase()}
                                </div>
                                <span className={`truncate text-[11px] ${speaking ? "text-emerald-400 font-bold" : "text-neutral-300"}`}>
                                  {occ.displayName || occ.username}
                                </span>
                              </div>
                              {occ.isMuted && <MicOff className="h-3.5 w-3.5 text-rose-500" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Voice Active Status Connection Banner */}
      {currentVoiceChannelId && (
        <div className="border-t border-neutral-800 bg-[#050505] px-3 py-2 flex items-center justify-between text-xs border-l-2 border-l-emerald-500">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            <div>
              <div className="text-emerald-400 font-bold text-[11px] leading-tight">Voice Connected</div>
              <div className="text-[10px] text-neutral-500">In-Game Active • WebRTC</div>
            </div>
          </div>
          <button
            onClick={onLeaveVoice}
            title="Disconnect Voice"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </button>
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

          {/* Action Buttons: Mute, Deafen, Logout */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={onToggleMute}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
              className={`flex h-7 w-7 items-center justify-center rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer ${
                isMuted ? "text-rose-400" : "text-neutral-300"
              }`}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <button
              onClick={onToggleDeafen}
              title={isDeafened ? "Undeafen" : "Deafen"}
              className={`flex h-7 w-7 items-center justify-center rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer ${
                isDeafened ? "text-rose-400" : "text-neutral-300"
              }`}
            >
              {isDeafened ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

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
