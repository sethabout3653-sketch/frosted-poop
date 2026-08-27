import React from "react";
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Radio, MessageSquare, Maximize2 } from "lucide-react";

interface Props {
  channelName: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSelfSpeaking: boolean;
  occupantCount: number;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onLeaveVoice: () => void;
  onOpenChat: () => void;
}

export function VoiceOverlayWidget({
  channelName,
  isMuted,
  isDeafened,
  isSelfSpeaking,
  occupantCount,
  onToggleMute,
  onToggleDeafen,
  onLeaveVoice,
  onOpenChat,
}: Props) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-neutral-800 bg-[#0d0d0d]/95 p-3 text-white shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-in slide-in-from-bottom-5 font-sans select-none border-l-4 border-l-emerald-500">
      {/* Active Voice Info */}
      <div className="flex items-center gap-2.5 pl-1 pr-2">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Radio className="h-4 w-4 animate-pulse" />
          {isSelfSpeaking && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0d0d0d] animate-ping" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <span className="truncate max-w-[120px]">{channelName}</span>
            <span className="rounded bg-neutral-800 px-1.5 py-0.2 text-[10px] text-neutral-400 font-mono">
              {occupantCount} {occupantCount === 1 ? "user" : "users"}
            </span>
          </div>
          <div className="text-[10px] text-emerald-400 font-medium">Voice Active — Low Latency</div>
        </div>
      </div>

      <div className="h-6 w-[1px] bg-neutral-800" />

      {/* Voice Action Controls */}
      <div className="flex items-center gap-1">
        {/* Mute Mic */}
        <button
          onClick={onToggleMute}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all cursor-pointer ${
            isMuted
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white"
              : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
          }`}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        {/* Deafen */}
        <button
          onClick={onToggleDeafen}
          title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all cursor-pointer ${
            isDeafened
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white"
              : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
          }`}
        >
          {isDeafened ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Disconnect Voice */}
        <button
          onClick={onLeaveVoice}
          title="Disconnect Voice Call"
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
        >
          <PhoneOff className="h-4 w-4" />
        </button>

        {/* Expand Chat Screen */}
        <button
          onClick={onOpenChat}
          title="Open Full Frosted Chat"
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer ml-1"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
