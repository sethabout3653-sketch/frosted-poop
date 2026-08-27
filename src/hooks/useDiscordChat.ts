import { useState, useEffect, useRef, useCallback } from "react";
import type { User, Channel, ChatMessage, VoiceUser } from "@/types/chat";

interface Props {
  token: string | null;
  currentUser: User | null;
  onLogout: () => void;
}

export function useDiscordChat({ token, currentUser, onLogout }: Props) {
  const [isConnected, setIsConnected] = useState(true); // Always true since we poll HTTP
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceUser[]>>({});
  const [currentVoiceChannelId, setCurrentVoiceChannelId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSelfSpeaking, setIsSelfSpeaking] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteAudiosRef = useRef<Record<string, HTMLAudioElement>>({});
  const activeChannelIdRef = useRef(activeChannelId);
  const tokenRef = useRef(token);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Handle local audio track states (Mute/Deafen)
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted && !isDeafened;
      });
    }
  }, [isMuted, isDeafened]);

  // Apply deafen state to all active remote audio elements
  useEffect(() => {
    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.muted = isDeafened;
    });
  }, [isDeafened]);

  // Clean up all voice resources on unmount
  useEffect(() => {
    return () => {
      cleanupVoice();
    };
  }, []);

  const cleanupVoice = () => {
    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    // Close PeerConnections
    Object.entries(pcsRef.current).forEach(([peerId, pc]) => {
      pc.close();
    });
    pcsRef.current = {};
    // Clean up audio elements
    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    remoteAudiosRef.current = {};
    setCurrentVoiceChannelId(null);
    setIsSelfSpeaking(false);
  };

  // Helper to send a signaling message to a target peer
  const sendSignal = async (targetPeerId: string, signalData: any) => {
    if (!tokenRef.current) return;
    try {
      await fetch("/api/chat/signal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ targetPeerId, signalData }),
      });
    } catch (err) {
      console.error("Failed to send RTC signal:", err);
    }
  };

  // Helper to create a new Peer Connection
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcsRef.current[peerId] = pc;

    // Attach local audio track if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(peerId, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      let audio = remoteAudiosRef.current[peerId];
      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        document.body.appendChild(audio);
        remoteAudiosRef.current[peerId] = audio;
      }
      audio.srcObject = remoteStream;
      audio.muted = isDeafened;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        cleanupPeer(peerId);
      }
    };

    return pc;
  }, [isDeafened]);

  const cleanupPeer = (peerId: string) => {
    if (pcsRef.current[peerId]) {
      pcsRef.current[peerId].close();
      delete pcsRef.current[peerId];
    }
    if (remoteAudiosRef.current[peerId]) {
      remoteAudiosRef.current[peerId].srcObject = null;
      remoteAudiosRef.current[peerId].remove();
      delete remoteAudiosRef.current[peerId];
    }
  };

  // Process incoming signaling messages
  const handleIncomingSignal = useCallback(async (senderId: string, signalData: any) => {
    let pc = pcsRef.current[senderId];
    if (!pc) {
      pc = createPeerConnection(senderId);
    }

    try {
      if (signalData.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(senderId, answer);
      } else if (signalData.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
      } else if (signalData.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signalData));
      }
    } catch (err) {
      console.error("Error processing RTC signal:", err);
    }
  }, [createPeerConnection]);

  // Main Polling Synchronization Loop
  const fetchSyncState = useCallback(async () => {
    if (!tokenRef.current) return;
    try {
      const res = await fetch("/api/chat/state", {
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        
        setChannels(data.channels || []);
        if (data.users) setOnlineUsers(data.users);
        
        // Update messages for current active text channel
        if (data.messages && data.messages[activeChannelIdRef.current]) {
          setMessages(data.messages[activeChannelIdRef.current]);
        }

        // Update typing list for current text channel
        if (data.typing && data.typing[activeChannelIdRef.current]) {
          setTypingUsers(data.typing[activeChannelIdRef.current]);
        } else {
          setTypingUsers([]);
        }

        // Update active voice occupants
        const voiceStatesMap = data.voiceStates || {};
        setVoiceStates(voiceStatesMap);

        // Process incoming signaling candidates/offers
        if (data.rtcSignals && Array.isArray(data.rtcSignals)) {
          for (const signal of data.rtcSignals) {
            await handleIncomingSignal(signal.senderId, signal.signalData);
          }
        }

        // --- WebRTC Room Peer Alignment ---
        // If we are actively in a voice channel, align PeerConnections with current channel occupants
        if (currentVoiceChannelId && currentUserRef.current) {
          const occupants = voiceStatesMap[currentVoiceChannelId] || [];
          const activePeerIds = occupants
            .filter((o: any) => o.userId !== currentUserRef.current!.id)
            .map((o: any) => o.userId);

          // 1. Initiate connections to new occupants (Tie-breaker: we initiate if our ID is lexicographically greater)
          for (const peerId of activePeerIds) {
            if (!pcsRef.current[peerId]) {
              const pc = createPeerConnection(peerId);
              if (currentUserRef.current.id > peerId) {
                // We are the caller! Initiate Offer
                try {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  await sendSignal(peerId, offer);
                } catch (e) {
                  console.error("Failed to create offer:", e);
                }
              }
            }
          }

          // 2. Tear down disconnected occupants
          Object.keys(pcsRef.current).forEach((peerId) => {
            if (!activePeerIds.includes(peerId)) {
              cleanupPeer(peerId);
            }
          });
        }
      }
    } catch (err) {
      console.error("HTTP Sync Poll error:", err);
    }
  }, [currentVoiceChannelId, handleIncomingSignal, createPeerConnection, onLogout]);

  // Run synchronization poll every 1.5 seconds (high-responsiveness serverless alternative)
  useEffect(() => {
    if (!token) return;
    fetchSyncState();

    const timer = window.setInterval(() => {
      fetchSyncState();
    }, 1500);

    return () => {
      window.clearInterval(timer);
    };
  }, [fetchSyncState, token]);

  const sendMessage = async (content: string, attachmentUrl?: string, attachmentName?: string) => {
    if (!token) return;
    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channelId: activeChannelId, content, attachmentUrl, attachmentName }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channelId: activeChannelId, messageId, emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
        );
      }
    } catch (e) {
      console.error("Toggle reaction error:", e);
    }
  };

  const sendTyping = async (isTyping: boolean) => {
    if (!token) return;
    try {
      await fetch("/api/chat/typing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channelId: activeChannelId, isTyping }),
      });
    } catch (e) {
      console.error("Typing state error:", e);
    }
  };

  // --- Voice Actions ---

  const joinVoiceChannel = async (voiceChannelId: string) => {
    if (!token || !currentUser) return;
    setVoiceError(null);
    try {
      // 1. Capture local audio first
      cleanupVoice();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch (e) {
        console.warn("High-fidelity audio constraints failed, falling back to basic audio:", e);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      localStreamRef.current = stream;

      // Ensure initial mute state is applied
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted && !isDeafened;
      });

      // 2. Announce presence to server
      const res = await fetch("/api/chat/voice/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentVoiceChannelId: voiceChannelId,
          isMuted,
          isDeafened,
          isSpeaking: false,
        }),
      });

      if (res.ok) {
        setCurrentVoiceChannelId(voiceChannelId);
        // Instantly sync
        fetchSyncState();
      }
    } catch (err: any) {
      console.error("Voice join failed (check browser permissions):", err);
      let errMsg = "Microphone access blocked. Please allow mic permission in your browser or iframe settings.";
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        errMsg = "Permission denied. Please grant microphone access to use voice chat.";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        errMsg = "No microphone device was found on your system.";
      }
      setVoiceError(errMsg);
    }
  };

  const leaveVoiceChannel = async () => {
    if (!token) return;
    try {
      await fetch("/api/chat/voice/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentVoiceChannelId: null,
          isSpeaking: false,
        }),
      });
      cleanupVoice();
      fetchSyncState();
    } catch (e) {
      console.error("Leave voice error:", e);
    }
  };

  const toggleMute = async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (!token) return;
    try {
      await fetch("/api/chat/voice/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isMuted: nextMuted,
        }),
      });
      fetchSyncState();
    } catch (e) {}
  };

  const toggleDeafen = async () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    if (!token) return;
    try {
      await fetch("/api/chat/voice/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isDeafened: nextDeafened,
        }),
      });
      fetchSyncState();
    } catch (e) {}
  };

  return {
    isConnected,
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
