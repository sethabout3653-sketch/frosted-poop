import { useState, useEffect, useCallback } from "react";
import type { User } from "@/types/chat";
import { useDiscordChat } from "@/hooks/useDiscordChat";
import { DiscordAuth } from "./DiscordAuth";
import { DiscordServerBar } from "./DiscordServerBar";
import { DiscordChannelSidebar } from "./DiscordChannelSidebar";
import { DiscordMessageArea } from "./DiscordMessageArea";
import { DiscordUserList } from "./DiscordUserList";
import { ShieldAlert } from "lucide-react";
import { VoiceStage } from "./VoiceStage";

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
  isCameraOn: boolean;
  cameraStream: MediaStream | null;
  toggleCamera: () => void;
}

interface Props {
  onReturnToGames: () => void;
  onVoiceStateChange?: (state: VoiceStateInfo) => void;
}

export function DiscordChat({ onReturnToGames, onVoiceStateChange }: Props) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("discord_chat_token");
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem("discord_cached_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(() => {
    // If cached user already exists, auth is immediately ready
    try {
      return !localStorage.getItem("discord_cached_user");
    } catch {
      return true;
    }
  });
  const [showUserList, setShowUserList] = useState<boolean>(true);

  // Re-authenticate session token on mount or background refresh
  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setIsVerifyingAuth(false);
        return;
      }

      // Check cached user session first for instant responsiveness
      const cachedUserStr = localStorage.getItem("discord_cached_user");
      if (cachedUserStr) {
        try {
          const cachedUser = JSON.parse(cachedUserStr);
          if (cachedUser && cachedUser.id && cachedUser.username) {
            setCurrentUser(cachedUser);
            setIsVerifyingAuth(false);
          }
        } catch {}
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

        if (res && res.ok) {
          const data = await res.json();
          if (data && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem("discord_cached_user", JSON.stringify(data.user));
            setIsVerifyingAuth(false);
            return;
          }
        }
      } catch (err: any) {
        console.warn("Auth verify background note:", err?.message || err);
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
    micLevel,
    sendMessage,
    deleteMessage,
    toggleReaction,
    sendTyping,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    isCameraOn,
    cameraStream,
    toggleCamera,
    studioVoiceMode,
    setStudioVoiceMode,
    echoCancellation,
    setEchoCancellation,
    notificationPermission,
    requestNotificationPermission,
  } = useDiscordChat({ token, currentUser, onLogout: handleLogout });

  useEffect(() => {
    const handleOpenChatEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ channelId?: string }>;
      if (customEvt.detail?.channelId) {
        setActiveChannelId(customEvt.detail.channelId);
      }
    };
    window.addEventListener("frosted-open-chat", handleOpenChatEvent);
    return () => {
      window.removeEventListener("frosted-open-chat", handleOpenChatEvent);
    };
  }, [setActiveChannelId]);

  if (isVerifyingAuth) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#000000] text-white font-sans">
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
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#000000] text-white font-sans selection:bg-white selection:text-black">
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
        micLevel={micLevel}
        studioVoiceMode={studioVoiceMode}
        setStudioVoiceMode={setStudioVoiceMode}
        echoCancellation={echoCancellation}
        setEchoCancellation={setEchoCancellation}
        onJoinVoice={joinVoiceChannel}
        onLeaveVoice={leaveVoiceChannel}
        onToggleMute={toggleMute}
        onToggleDeafen={toggleDeafen}
        isCameraOn={isCameraOn}
        cameraStream={cameraStream}
        onToggleCamera={toggleCamera}
        onLogout={handleLogout}
      />

      {/* 3. Main Conversation Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {activeChannel?.type === "voice" && currentVoiceChannelId ? (
          <VoiceStage
            channelName={activeChannel.name}
            currentUser={currentUser}
            occupants={voiceStates[currentVoiceChannelId] || []}
            cameraStream={cameraStream}
            isCameraOn={isCameraOn}
            isMuted={isMuted}
            isSelfSpeaking={voiceStates[currentVoiceChannelId]?.some((user) => user.userId === currentUser.id && user.isSpeaking) || false}
            onToggleCamera={toggleCamera}
            onToggleMute={toggleMute}
            onLeave={leaveVoiceChannel}
          />
        ) : (
          <DiscordMessageArea
            activeChannel={activeChannel}
            messages={messages}
            currentUser={currentUser}
            typingUsers={typingUsers}
            onSendMessage={sendMessage}
            onDeleteMessage={deleteMessage}
            onToggleReaction={toggleReaction}
            onSendTyping={sendTyping}
            onToggleUserList={() => setShowUserList(!showUserList)}
            showUserList={showUserList}
            notificationPermission={notificationPermission}
            onRequestNotificationPermission={requestNotificationPermission}
          />
        )}
      </div>

      {/* 4. Right Online Members List */}
      {showUserList && activeChannel?.type !== "voice" && <DiscordUserList users={onlineUsers} currentUserId={currentUser.id} />}
    </div>
  );
}
