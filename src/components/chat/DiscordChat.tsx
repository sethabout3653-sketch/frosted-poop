import { useState, useEffect, useCallback } from "react";
import type { User } from "@/types/chat";
import { useDiscordChat } from "@/hooks/useDiscordChat";
import { DiscordAuth } from "./DiscordAuth";
import { DiscordServerBar } from "./DiscordServerBar";
import { DiscordChannelSidebar } from "./DiscordChannelSidebar";
import { DiscordMessageArea } from "./DiscordMessageArea";
import { DiscordUserList } from "./DiscordUserList";
import { ShieldAlert } from "lucide-react";

export interface VoiceStateInfo {
  currentVoiceChannelId: string | null;
  channelName?: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSelfSpeaking: boolean;
  occupantCount: number;
  leaveVoice: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
}

interface Props {
  onReturnToGames: () => void;
  onVoiceStateChange?: (state: VoiceStateInfo) => void;
}

export function DiscordChat({ onReturnToGames, onVoiceStateChange }: Props) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("discord_chat_token");
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(true);
  const [showUserList, setShowUserList] = useState<boolean>(true);

  // Re-authenticate session token on mount
  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setIsVerifyingAuth(false);
        return;
      }

      try {
        let res: Response | null = null;
        try {
          res = await fetch("/api/chat/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          try {
            res = await fetch("/chat/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch {}
        }

        if (!res) {
          setIsVerifyingAuth(false);
          return;
        }

        if (res.status === 404) {
          try {
            const fallbackRes = await fetch("/chat/me", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (fallbackRes.ok) res = fallbackRes;
          } catch {}
        }

        if (res && res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            if (data && data.user) {
              setCurrentUser(data.user);
              localStorage.setItem("discord_cached_user", JSON.stringify(data.user));
              setIsVerifyingAuth(false);
              return;
            }
          } catch {}
        }

        // Fallback: check cached user session
        const cachedUserStr = localStorage.getItem("discord_cached_user");
        if (cachedUserStr) {
          try {
            const cachedUser = JSON.parse(cachedUserStr);
            if (cachedUser && cachedUser.id && cachedUser.username) {
              setCurrentUser(cachedUser);
              setIsVerifyingAuth(false);
              return;
            }
          } catch {}
        }

        // Token invalid or session expired
        localStorage.removeItem("discord_chat_token");
        localStorage.removeItem("discord_cached_user");
        setToken(null);
      } catch (err: any) {
        console.warn("Auth verify notice:", err?.message || err);
        const cachedUserStr = localStorage.getItem("discord_cached_user");
        if (cachedUserStr) {
          try {
            const cachedUser = JSON.parse(cachedUserStr);
            if (cachedUser && cachedUser.id) {
              setCurrentUser(cachedUser);
              setIsVerifyingAuth(false);
              return;
            }
          } catch {}
        }
        localStorage.removeItem("discord_chat_token");
        setToken(null);
      } finally {
        setIsVerifyingAuth(false);
      }
    }

    checkAuth();
  }, [token]);

  const handleLoginSuccess = (newToken: string, user: User) => {
    setToken(newToken);
    setCurrentUser(user);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem("discord_chat_token");
    setToken(null);
    setCurrentUser(null);
  }, []);

  const {
    channels,
    activeChannelId,
    setActiveChannelId,
    messages,
    onlineUsers,
    voiceStates,
    typingUsers,
    currentVoiceChannelId,
    voiceError,
    setVoiceError,
    isMuted,
    isDeafened,
    isSuspended,
    suspensionTimeLeft,
    suspensionAction,
    suspensionWord,
    micGain,
    setMicGain,
    outputGain,
    setOutputGain,
    micLevel,
    sendMessage,
    deleteMessage,
    clearAllMessages,
    toggleReaction,
    sendTyping,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    studioVoiceMode,
    setStudioVoiceMode,
    micMonitoring,
    setMicMonitoring,
    echoCancellation,
    setEchoCancellation,
    notificationPermission,
    requestNotificationPermission,
  } = useDiscordChat({ token, currentUser, onLogout: handleLogout });

  if (isVerifyingAuth) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#050505] text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
          <span className="text-xs text-neutral-400">Connecting to Frosted Chat...</span>
        </div>
      </div>
    );
  }

  // Render Auth screen if not logged in
  if (!token || !currentUser) {
    return <DiscordAuth onLoginSuccess={handleLoginSuccess} />;
  }

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#050505] text-white font-sans selection:bg-white selection:text-black">
      {/* 1. Leftmost Guild Rail */}
      <DiscordServerBar onReturnToGames={onReturnToGames} />

      {/* 2. Channels Sidebar */}
      <DiscordChannelSidebar
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={setActiveChannelId}
        currentUser={currentUser}
        voiceStates={voiceStates}
        currentVoiceChannelId={currentVoiceChannelId}
        voiceError={voiceError}
        setVoiceError={setVoiceError}
        isMuted={isMuted}
        isDeafened={isDeafened}
        isSuspended={isSuspended}
        suspensionTimeLeft={suspensionTimeLeft}
        suspensionAction={suspensionAction}
        suspensionWord={suspensionWord}
        micGain={micGain}
        setMicGain={setMicGain}
        outputGain={outputGain}
        setOutputGain={setOutputGain}
        micLevel={micLevel}
        studioVoiceMode={studioVoiceMode}
        setStudioVoiceMode={setStudioVoiceMode}
        micMonitoring={micMonitoring}
        setMicMonitoring={setMicMonitoring}
        echoCancellation={echoCancellation}
        setEchoCancellation={setEchoCancellation}
        onJoinVoice={joinVoiceChannel}
        onLeaveVoice={leaveVoiceChannel}
        onToggleMute={toggleMute}
        onToggleDeafen={toggleDeafen}
        onLogout={handleLogout}
      />

      {/* 3. Main Message Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {isSuspended && (
          <div className="flex items-center justify-between border-b border-rose-500/30 bg-rose-950/70 px-4 py-2 text-xs text-rose-200 shadow-inner">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
              <span>
                <strong className="text-white font-semibold">Voice Moderation:</strong> You have been suspended for saying{" "}
                <span className="font-mono font-bold text-rose-300 underline">
                  "{suspensionWord || "prohibited word"}"
                </span>
                . Voice channels are restricted for 1 minute.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-neutral-400">Remaining:</span>
              <span className="font-mono text-xs font-bold text-rose-300 bg-rose-900/60 px-2 py-0.5 rounded border border-rose-500/30">
                00:{String(suspensionTimeLeft).padStart(2, "0")}
              </span>
            </div>
          </div>
        )}
        <DiscordMessageArea
          activeChannel={activeChannel}
          messages={messages}
          currentUser={currentUser}
          typingUsers={typingUsers}
          onSendMessage={sendMessage}
          onDeleteMessage={deleteMessage}
          onClearAllMessages={clearAllMessages}
          onToggleReaction={toggleReaction}
          onSendTyping={sendTyping}
          onToggleUserList={() => setShowUserList(!showUserList)}
          showUserList={showUserList}
          notificationPermission={notificationPermission}
          onRequestNotificationPermission={requestNotificationPermission}
        />
      </div>

      {/* 4. Right Online Members List */}
      {showUserList && <DiscordUserList users={onlineUsers} currentUserId={currentUser.id} />}
    </div>
  );
}
