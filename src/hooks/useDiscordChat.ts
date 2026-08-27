import { useState, useEffect, useRef, useCallback } from "react";
import type { User, Channel, ChatMessage, VoiceUser } from "@/types/chat";

interface Props {
  token: string | null;
  currentUser: User | null;
  onLogout: () => void;
}

export function useDiscordChat({ token, currentUser, onLogout }: Props) {
  const [isConnected, setIsConnected] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({}); // channelId -> array of displayNames

  const socketRef = useRef<WebSocket | null>(null);
  const activeChannelIdRef = useRef(activeChannelId);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  const fetchState = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/chat/state", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
        if (data.users) setOnlineUsers(data.users);
        if (data.messages && data.messages[activeChannelIdRef.current]) {
          setMessages(data.messages[activeChannelIdRef.current]);
        }
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, [token, onLogout]);

  // Initial fetch and poll setup
  useEffect(() => {
    if (!token) return;
    fetchState();
    
    const interval = window.setInterval(() => {
      if (!isConnected) {
        fetchState();
      }
    }, 3000);
    
    return () => {
      window.clearInterval(interval);
    };
  }, [fetchState, token, isConnected]);

  // WebSocket Lifecycle Connection
  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", payload: { token } }));
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        if (type === "auth_success") {
          setIsConnected(true);
          setChannels(payload.channels || []);
          if (payload.usersList) setOnlineUsers(payload.usersList);
          
          if (payload.messages && payload.messages[activeChannelIdRef.current]) {
            setMessages(payload.messages[activeChannelIdRef.current]);
          }
        }

        if (type === "new_message") {
          const newMsg: ChatMessage = payload;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            if (newMsg.channelId === activeChannelIdRef.current) {
              return [...prev, newMsg];
            }
            return prev;
          });
        }

        if (type === "reaction_updated") {
          const { channelId, messageId, reactions } = payload;
          if (channelId === activeChannelIdRef.current) {
            setMessages((prev) =>
              prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
            );
          }
        }

        if (type === "user_typing") {
          const { channelId, displayName, isTyping } = payload;
          setTypingUsers((prev) => {
            const list = prev[channelId] || [];
            if (isTyping) {
              if (list.includes(displayName)) return prev;
              return { ...prev, [channelId]: [...list, displayName] };
            } else {
              return { ...prev, [channelId]: list.filter((name) => name !== displayName) };
            }
          });
        }

        if (type === "user_status_change") {
          const { userId, status, username, displayName, avatarColor } = payload;
          setOnlineUsers((prev) => {
            const index = prev.findIndex((u) => u.id === userId);
            if (index > -1) {
              const updated = [...prev];
              updated[index] = { ...updated[index], status };
              return updated;
            } else if (username) {
              return [...prev, { id: userId, username, displayName: displayName || username, avatarColor: avatarColor || "#5865f2", status }];
            }
            return prev;
          });
        }

        if (type === "error" && payload === "Authentication failed") {
          onLogout();
        }
      } catch (err) {
        console.error("WS Parse error:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [token, onLogout]);

  // Handle active channel change
  useEffect(() => {
    if (!token) return;
    fetch(`/api/chat/messages/${activeChannelId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(console.error);
  }, [activeChannelId, token]);

  const sendMessage = async (content: string, attachmentUrl?: string, attachmentName?: string) => {
    if (!token) return;
    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ channelId: activeChannelId, content, attachmentUrl, attachmentName })
      });
      if (res.ok && !isConnected) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (e) {
      console.error("Send message error:", e);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!token) return;
    try {
      const res = await fetch("/api/chat/reaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ channelId: activeChannelId, messageId, emoji })
      });
      if (res.ok && !isConnected) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
        );
      }
    } catch (e) {
      console.error("Toggle reaction error:", e);
    }
  };

  const sendTyping = (isTyping: boolean) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(
      JSON.stringify({
        type: "typing",
        payload: { channelId: activeChannelId, isTyping },
      })
    );
  };

  // Stubs for backward compatibility
  const voiceStates: Record<string, VoiceUser[]> = {};
  const currentVoiceChannelId = null;
  const isMuted = false;
  const isDeafened = false;
  const isSelfSpeaking = false;
  const joinVoiceChannel = () => {};
  const leaveVoiceChannel = () => {};
  const toggleMute = () => {};
  const toggleDeafen = () => {};

  return {
    isConnected,
    channels,
    activeChannelId,
    setActiveChannelId,
    messages,
    onlineUsers,
    voiceStates,
    typingUsers: typingUsers[activeChannelId] || [],
    currentVoiceChannelId,
    isMuted,
    isDeafened,
    isSelfSpeaking,
    sendMessage,
    toggleReaction,
    sendTyping,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
  };
}
