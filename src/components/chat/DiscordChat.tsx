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
        let res = await fetch("/api/chat/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 404) {
          res = await fetch("/chat/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            if (data && data.user) {
              setCurrentUser(data.user);
            } else {
              localStorage.removeItem("discord_chat_token");
              setToken(null);
            }
          } catch {
            localStorage.removeItem("discord_chat_token");
            setToken(null);
          }
        } else {
          // Token invalid or session expired
          localStorage.removeItem("discord_chat_token");
          setToken(null);
        }
      } catch (err: any) {
        console.warn("Auth verify notice:", err?.message || err);
        // On network failure or invalid session state, clear token so login form displays cleanly
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
    sendMessage,
    toggleReaction,
    sendTyping,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
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
        onJoinVoice={joinVoiceChannel}
        onLeaveVoice={leaveVoiceChannel}
        onToggleMute={toggleMute}
        onToggleDeafen={toggleDeafen}
        onLogout={handleLogout}
      />

      {/* 3. Main Message Area */}
      <DiscordMessageArea
        activeChannel={activeChannel}
        messages={messages}
        currentUser={currentUser}
        typingUsers={typingUsers}
        onSendMessage={sendMessage}
        onToggleReaction={toggleReaction}
        onSendTyping={sendTyping}
        onToggleUserList={() => setShowUserList(!showUserList)}
        showUserList={showUserList}
        notificationPermission={notificationPermission}
        onRequestNotificationPermission={requestNotificationPermission}
      />

      {/* 4. Right Online Members List */}
      {showUserList && <DiscordUserList users={onlineUsers} currentUserId={currentUser.id} />}
    </div>
  );
}
