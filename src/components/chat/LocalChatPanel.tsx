import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, MessageCircle, Send, Users, X } from "lucide-react";

type ChatMessage = { id: string; author: string; text: string; createdAt: number };
const CHANNEL_NAME = "frosted-local-chat";

export function LocalChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", author: "frosted", text: "Same-tab chat is ready. Open another tab to see messages sync without a server.", createdAt: Date.now() },
  ]);
  const [draft, setDraft] = useState("");
  const [displayName] = useState(() => `Guest ${Math.floor(Math.random() * 900 + 100)}`);
  const [isMuted, setIsMuted] = useState(true);
  const [isVoiceReady, setIsVoiceReady] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<ChatMessage>) => {
      if (event.data?.text) setMessages((current) => [...current, event.data]);
    };
    return () => {
      channel.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleVoice = async () => {
    if (isVoiceReady) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsVoiceReady(false);
      setIsMuted(true);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsVoiceReady(true);
      setIsMuted(false);
    } catch {
      setIsVoiceReady(false);
    }
  };

  const toggleMute = () => {
    if (!streamRef.current) return;
    const nextMuted = !isMuted;
    streamRef.current.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    setIsMuted(nextMuted);
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    const message = { id: crypto.randomUUID(), author: displayName, text, createdAt: Date.now() };
    setMessages((current) => [...current, message]);
    channelRef.current?.postMessage(message);
    setDraft("");
  };

  return (
    <aside className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-neutral-700 bg-[#101010]/98 shadow-2xl shadow-black/60">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-white" /><div><p className="text-sm font-semibold text-white">Frosted Chat</p><p className="text-[10px] text-neutral-500">Same-tab local room</p></div></div>
        <button aria-label="Close chat" onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex items-center justify-between border-b border-neutral-800 bg-black/20 px-4 py-2 text-[11px] text-neutral-400"><span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {displayName}</span><span className="text-emerald-400">No server</span></div>
      <div className="flex max-h-72 min-h-48 flex-col gap-3 overflow-y-auto p-4">{messages.map((message) => <div key={message.id}><p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{message.author}</p><p className="mt-0.5 text-sm leading-relaxed text-neutral-200">{message.text}</p></div>)}</div>
      <div className="border-t border-neutral-800 p-3"><div className="flex gap-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) sendMessage(); }} placeholder="Write a message..." className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-neutral-500" /><button aria-label="Send message" onClick={sendMessage} className="rounded-xl bg-white px-3 text-black hover:bg-neutral-200"><Send className="h-4 w-4" /></button></div><div className="mt-2 flex items-center justify-between"><button onClick={toggleVoice} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${isVoiceReady ? "bg-emerald-500/15 text-emerald-300" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"}`}><Mic className="h-3.5 w-3.5" />{isVoiceReady ? "Voice ready" : "Enable voice"}</button>{isVoiceReady && <button aria-label={isMuted ? "Unmute microphone" : "Mute microphone"} onClick={toggleMute} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white">{isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>}</div></div>
    </aside>
  );
}

export function LocalChatButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} title="Open Frosted Chat" className="smooth-btn flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-[#0d0d0d] px-3 py-2 text-xs font-medium text-neutral-300 hover:border-white hover:text-white"><MessageCircle className="h-3.5 w-3.5" /><span className="hidden sm:inline">Chat</span></button>;
}
