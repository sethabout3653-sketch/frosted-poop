import { useEffect, useRef } from "react";
import { Camera, CameraOff, Mic, MicOff, PhoneOff } from "lucide-react";
import type { User, VoiceUser } from "@/types/chat";

interface Props {
  channelName: string;
  currentUser: User;
  occupants: VoiceUser[];
  cameraStream: MediaStream | null;
  isCameraOn: boolean;
  isMuted: boolean;
  isSelfSpeaking: boolean;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onLeave: () => void;
}

function LocalVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    void ref.current.play().catch(() => undefined);
    return () => {
      if (ref.current) ref.current.srcObject = null;
    };
  }, [stream]);
  return <video ref={ref} muted playsInline className="absolute inset-0 h-full w-full object-cover" />;
}

function Avatar({ user }: { user: Pick<User, "displayName" | "avatarColor"> }) {
  return <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-emerald-500/80 text-4xl font-bold text-white shadow-[0_0_0_5px_rgba(16,185,129,0.18)]" style={{ backgroundColor: user.avatarColor }}>{user.displayName.charAt(0).toUpperCase()}</div>;
}

export function VoiceStage({ channelName, currentUser, occupants, cameraStream, isCameraOn, isMuted, isSelfSpeaking, onToggleCamera, onToggleMute, onLeave }: Props) {
  const users = occupants.filter((user) => user.userId !== currentUser.id);
  const localSpeaking = isSelfSpeaking;
  return (
    <section className="flex min-w-0 flex-1 flex-col bg-black text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-900 px-5">
        <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-emerald-500" /><span className="font-bold text-emerald-400">Voice Connected</span></div>
        <span className="text-sm text-neutral-400">{channelName} ({users.length + 1})</span>
      </header>
      <div className="grid flex-1 content-start gap-5 overflow-auto p-5 sm:grid-cols-2 xl:grid-cols-3">
        <article className={`relative aspect-video min-h-[230px] overflow-hidden rounded-2xl border ${localSpeaking ? "border-emerald-500" : "border-neutral-800"} bg-[#111]`}>
          {isCameraOn && cameraStream ? <LocalVideo stream={cameraStream} /> : <div className="absolute inset-0 flex items-center justify-center"><Avatar user={currentUser} /></div>}
          <div className="absolute left-3 top-3 rounded-lg border border-neutral-700 bg-black/80 px-3 py-2 text-xs font-bold"><span className="mr-2 text-emerald-500">●</span>{localSpeaking ? "SPEAKING" : "LISTENING"}</div>
          <div className="absolute bottom-3 left-3 rounded-lg border border-neutral-700 bg-black/85 px-3 py-2 text-xs font-bold">{currentUser.displayName} (You)</div>
        </article>
        {users.map((user) => <article key={user.userId} className={`relative flex aspect-video min-h-[230px] items-center justify-center overflow-hidden rounded-2xl border ${user.isSpeaking ? "border-emerald-500" : "border-neutral-800"} bg-[#111]`}><Avatar user={user} /><div className="absolute left-3 top-3 rounded-lg border border-neutral-700 bg-black/80 px-3 py-2 text-xs font-bold"><span className="mr-2 text-emerald-500">●</span>{user.isSpeaking ? "SPEAKING" : "LISTENING"}</div><div className="absolute bottom-3 left-3 rounded-lg border border-neutral-700 bg-black/85 px-3 py-2 text-xs font-bold">{user.displayName}</div></article>)}
      </div>
      <footer className="flex h-24 shrink-0 items-center justify-center gap-5 border-t border-neutral-900">
        <button onClick={onToggleMute} aria-label={isMuted ? "Unmute microphone" : "Mute microphone"} className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-800 ${isMuted ? "bg-rose-500 text-white" : "bg-[#171717] text-white hover:bg-[#222]"}`}>{isMuted ? <MicOff /> : <Mic />}</button>
        <button onClick={onToggleCamera} aria-label={isCameraOn ? "Turn camera off" : "Turn camera on"} className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-800 ${isCameraOn ? "bg-white text-black" : "bg-[#171717] text-white hover:bg-[#222]"}`}>{isCameraOn ? <Camera /> : <CameraOff />}</button>
        <button onClick={onLeave} aria-label="Leave voice channel" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f00046] text-white hover:bg-[#ff1c5b]"><PhoneOff /></button>
      </footer>
    </section>
  );
}
