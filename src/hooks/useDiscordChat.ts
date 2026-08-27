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
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceUser[]>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({}); // channelId -> array of displayNames

  // Voice state controls
  const [currentVoiceChannelId, setCurrentVoiceChannelId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSelfSpeaking, setIsSelfSpeaking] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize and fetch messages for active channel
  const fetchChannelMessages = useCallback(async (channelId: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${channelId}`);
      if (res.ok) {
        const text = await res.text();
        try {
          const msgs: ChatMessage[] = JSON.parse(text);
          if (Array.isArray(msgs)) {
            setMessages(msgs);
          }
        } catch (e) {
          console.error("Fetch messages parse error:", e);
        }
      }
    } catch (err) {
      console.error("Fetch messages error:", err);
    }
  }, []);

  useEffect(() => {
    if (activeChannelId) {
      fetchChannelMessages(activeChannelId);
    }
  }, [activeChannelId, fetchChannelMessages]);

  const activeChannelIdRef = useRef(activeChannelId);
  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  // Main WebSocket Lifecycle Connection
  useEffect(() => {
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      // Authenticate socket
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

        if (type === "voice_state_change") {
          setVoiceStates(payload);
        }

        // WebRTC Signaling Events for REAL Voice Streaming
        if (type === "voice_room_joined") {
          const { occupants } = payload;
          // Initiate WebRTC peer connections with existing occupants
          for (const occ of occupants) {
            initiatePeerConnection(occ.peerId, true);
          }
        }

        if (type === "peer_joined_voice") {
          const { peerId } = payload;
          initiatePeerConnection(peerId, false);
        }

        if (type === "peer_left_voice") {
          const { peerId } = payload;
          closePeerConnection(peerId);
        }

        if (type === "peer_speaking") {
          const { peerId, isSpeaking } = payload;
          setVoiceStates((prev) => {
            const copy = { ...prev };
            for (const chId in copy) {
              copy[chId] = copy[chId].map((v) =>
                v.userId === peerId ? { ...v, isSpeaking } : v
              );
            }
            return copy;
          });
        }

        if (type === "webrtc_signal") {
          const { senderPeerId, signalData } = payload;
          handleWebRTCSignal(senderPeerId, signalData);
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
      cleanupVoiceSession();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, onLogout]);

  // --- WebRTC Peer-to-Peer Real Audio Engine ---

  const initiatePeerConnection = async (peerId: string, isInitiator: boolean) => {
    if (peerConnectionsRef.current.has(peerId)) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    peerConnectionsRef.current.set(peerId, pc);

    // Add local mic stream tracks to Peer Connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.send(
          JSON.stringify({
            type: "webrtc_signal",
            payload: {
              targetPeerId: peerId,
              signalData: { type: "candidate", candidate: event.candidate },
            },
          })
        );
      }
    };

    // Handle Remote Stream Audio Playback
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) {
        let audioEl = remoteAudioElementsRef.current.get(peerId);
        if (!audioEl) {
          audioEl = document.createElement("audio");
          audioEl.autoplay = true;
          audioEl.muted = isDeafened;
          remoteAudioElementsRef.current.set(peerId, audioEl);
        }
        audioEl.srcObject = remoteStream;
      }
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.send(
          JSON.stringify({
            type: "webrtc_signal",
            payload: {
              targetPeerId: peerId,
              signalData: { type: "offer", sdp: pc.localDescription },
            },
          })
        );
      } catch (e) {
        console.error("Create offer error:", e);
      }
    }
  };

  const handleWebRTCSignal = async (senderPeerId: string, signalData: any) => {
    let pc = peerConnectionsRef.current.get(senderPeerId);

    if (!pc) {
      await initiatePeerConnection(senderPeerId, false);
      pc = peerConnectionsRef.current.get(senderPeerId);
    }

    if (!pc) return;

    try {
      if (signalData.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.send(
          JSON.stringify({
            type: "webrtc_signal",
            payload: {
              targetPeerId: senderPeerId,
              signalData: { type: "answer", sdp: pc.localDescription },
            },
          })
        );
      } else if (signalData.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
      } else if (signalData.type === "candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
      }
    } catch (e) {
      console.error("Signal handling error:", e);
    }
  };

  const closePeerConnection = (peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    const audioEl = remoteAudioElementsRef.current.get(peerId);
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl.remove();
      remoteAudioElementsRef.current.delete(peerId);
    }
  };

  // Start Voice Session with microphone access
  const joinVoiceChannel = async (voiceChannelId: string) => {
    try {
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // 2. Audio Level Analyzer for real-time green speaking indicator
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkSpeaking = () => {
          if (!localStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const isSpeakingNow = average > 25 && !isMuted;

          if (isSpeakingNow !== isSelfSpeaking) {
            setIsSelfSpeaking(isSpeakingNow);
            socketRef.current?.send(
              JSON.stringify({
                type: "voice_speaking",
                payload: { isSpeaking: isSpeakingNow },
              })
            );
          }
          requestAnimationFrame(checkSpeaking);
        };
        checkSpeaking();
      } catch (err) {
        console.warn("Audio Context Analyzer failed:", err);
      }

      setCurrentVoiceChannelId(voiceChannelId);

      // Notify server we joined voice
      socketRef.current?.send(
        JSON.stringify({
          type: "join_voice",
          payload: { voiceChannelId },
        })
      );
    } catch (err) {
      alert("Microphone access is required for real voice chat. Please allow mic permissions.");
    }
  };

  const leaveVoiceChannel = () => {
    cleanupVoiceSession();
    socketRef.current?.send(JSON.stringify({ type: "leave_voice" }));
    setCurrentVoiceChannelId(null);
  };

  const cleanupVoiceSession = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    remoteAudioElementsRef.current.forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    remoteAudioElementsRef.current.clear();

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // Toggle Microphone Mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    socketRef.current?.send(
      JSON.stringify({
        type: "voice_mute_toggle",
        payload: { isMuted: nextMuted, isDeafened },
      })
    );
  };

  // Toggle Deafen (mute incoming remote audio)
  const toggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);

    remoteAudioElementsRef.current.forEach((audioEl) => {
      audioEl.muted = nextDeafened;
    });

    socketRef.current?.send(
      JSON.stringify({
        type: "voice_mute_toggle",
        payload: { isMuted, isDeafened: nextDeafened },
      })
    );
  };

  // Send Message
  const sendMessage = (content: string, attachmentUrl?: string, attachmentName?: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(
      JSON.stringify({
        type: "send_message",
        payload: { channelId: activeChannelId, content, attachmentUrl, attachmentName },
      })
    );
  };

  // Send Reaction
  const toggleReaction = (messageId: string, emoji: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(
      JSON.stringify({
        type: "toggle_reaction",
        payload: { channelId: activeChannelId, messageId, emoji },
      })
    );
  };

  // Send Typing Notification
  const sendTyping = (isTyping: boolean) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(
      JSON.stringify({
        type: "typing",
        payload: { channelId: activeChannelId, isTyping },
      })
    );
  };

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
