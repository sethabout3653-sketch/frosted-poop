import { useEffect, useRef, useState } from "react";
import {
  Search,
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
  ShieldAlert,
  X,
  Video,
  VideoOff,
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
  micLevel?: number;
  studioVoiceMode?: boolean;
  setStudioVoiceMode?: (val: boolean) => void;
  echoCancellation?: boolean;
  setEchoCancellation?: (val: boolean) => void;
  onJoinVoice: (channelId: string) => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  isCameraOn?: boolean;
  cameraStream?: MediaStream | null;
  onToggleCamera?: () => void;
  onLogout: () => void;
}

function LocalVideoPreview({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => undefined);
    }
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [stream]);
  return <div className="mx-1 overflow-hidden rounded-lg border border-blue-500/30 bg-neutral-950"><video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" /><div className="px-2 py-1 text-[10px] font-semibold text-blue-300">Your camera</div></div>;
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
  micLevel = 0,
  studioVoiceMode = true,
  setStudioVoiceMode,
  echoCancellation = true,
  setEchoCancellation,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  onToggleDeafen,
  isCameraOn = false,
  cameraStream = null,
  onToggleCamera,
  onLogout,
}: Props) {
  const [textOpen, setTextOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(true);

  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  return (
    <div className="flex h-full w-60 shrink-0 flex-col bg-[#000000] text-neutral-400 font-sans border-r border-neutral-900 select-none">
      {/* Server Header / Search */}
      <div className="flex h-12 items-center border-b border-neutral-900 px-4 bg-[#000000]">
        <div className="flex flex-1 items-center gap-2 rounded bg-[#090909] px-2 py-1.5 border border-neutral-800">
          <Search className="h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Find a channel"
            className="w-full bg-transparent text-xs text-neutral-200 outline-none placeholder:text-neutral-500"
          />
        </div>
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
            className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-200 cursor-pointer"
          >
            <div className="flex items-center gap-1">
              {textOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span>CHANNELS</span>
            </div>
          </button>

          {textOpen && (
            <div className="mt-1 space-y-0.5">
              {textChannels.map((ch) => {
                const isActive = activeChannelId === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => onSelectChannel(ch.id)}
                    className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#1a1a1a] text-white font-semibold"
                        : "text-neutral-400 hover:bg-[#161616] hover:text-white"
                    }`}
                  >
                    <Hash
                      className={`h-4 w-4 ${isActive ? "text-neutral-400" : "text-neutral-500 group-hover:text-white"}`}
                    />
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
            className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-200 cursor-pointer"
          >
            <div className="flex items-center gap-1">
              {voiceOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span>VOICE</span>
            </div>
          </button>

          {voiceOpen && (
            <div className="mt-1 space-y-0.5">
              {voiceChannels.map((ch) => {
                const isUserInThisVoice = currentVoiceChannelId === ch.id;
                const occupants = voiceStates[ch.id] || [];

                return (
                  <div key={ch.id} className="space-y-0.5">
                    <button
                      onClick={() => onJoinVoice(ch.id)}
                      className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                        isUserInThisVoice
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold cursor-pointer"
                          : "text-neutral-400 hover:bg-[#161616] hover:text-white cursor-pointer"
                      }`}
                    >
                      <Volume2
                        className={`h-4 w-4 ${
                          isUserInThisVoice
                            ? "text-emerald-400"
                            : "text-neutral-500 group-hover:text-white"
                        }`}
                      />
                      <span className="truncate flex-1 text-left">{ch.name}</span>
                      {isUserInThisVoice ? (
                        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-bold uppercase">
                          Live
                        </span>
                      ) : null}
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
                            <span className="truncate flex-1 font-medium">
                              {occ.displayName || occ.username}
                            </span>
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
        <>
          {isCameraOn && cameraStream && <LocalVideoPreview stream={cameraStream} />}
          <div className="flex flex-col gap-1.5 border-t border-neutral-800 bg-[#0c0c0c] p-2.5 mx-1 rounded-t-lg shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 shrink-0">
                <div className="relative flex h-2 w-2"><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></div>
                <span className="text-[11px] font-bold tracking-tight">Voice Connected</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-semibold truncate max-w-[90px] text-right">{channels.find((c) => c.id === currentVoiceChannelId)?.name || "General Voice"}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 px-1"><span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider shrink-0">Mic</span><div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-75" style={{ width: `${isMuted || isDeafened ? 0 : micLevel}%` }} /></div></div>
            <div className="flex items-center justify-around mt-1">
              <button onClick={onToggleMute} className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all cursor-pointer ${isMuted ? "bg-rose-500/20 text-rose-400 border border-rose-500/25" : "hover:bg-neutral-800 text-neutral-400 hover:text-white"}`} title={isMuted ? "Unmute Mic" : "Mute Mic"}>{isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
              <button onClick={onToggleDeafen} className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all cursor-pointer ${isDeafened ? "bg-amber-500/20 text-amber-400 border border-amber-500/25" : "hover:bg-neutral-800 text-neutral-400 hover:text-white"}`} title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}><Headphones className="h-4 w-4" /></button>
              {onToggleCamera && <button onClick={onToggleCamera} className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all cursor-pointer ${isCameraOn ? "bg-blue-500/20 text-blue-400 border border-blue-500/25" : "hover:bg-neutral-800 text-neutral-400 hover:text-white"}`} title={isCameraOn ? "Turn camera off" : "Turn camera on"}>{isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}</button>}
              <button onClick={onLeaveVoice} className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer" title="Disconnect Voice"><PhoneOff className="h-4 w-4" /></button>
            </div>
          </div>
        </>
      )}
      {/* User Status Bar at Bottom */}
      {currentUser && (
        <div className="flex h-14 items-center justify-between border-t border-neutral-900 bg-[#000000] px-3">
          {/* Avatar & Username */}
          <div className="flex items-center gap-2.5 truncate pr-1">
            <div className="relative shrink-0">
              <div
                style={{ backgroundColor: currentUser.avatarColor }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-white/20 shadow-sm"
              >
                {currentUser.username.substring(0, 1).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#000000] bg-emerald-400" />
            </div>
            <div className="truncate">
              <div className="truncate text-xs font-bold text-white leading-tight">
                {currentUser.displayName || currentUser.username}
              </div>
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
