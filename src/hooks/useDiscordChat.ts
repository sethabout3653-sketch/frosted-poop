import { useState, useEffect, useRef, useCallback } from "react";
import type { User, Channel, ChatMessage, VoiceUser } from "@/types/chat";
import { isInappropriateContent } from "../lib/moderation";
import { notificationManager } from "../lib/notifications";
import { db } from "../lib/firebaseClient";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  getDocs,
} from "firebase/firestore";

interface Props {
  token: string | null;
  currentUser: User | null;
  onLogout: () => void;
}

const DEFAULT_CHANNELS: Channel[] = [
  { id: "general", name: "general", type: "text", topic: "General community chat and discussions" },
  { id: "general-voice", name: "General Voice", type: "voice", topic: "General Voice Chat Room" },
];

export function useDiscordChat({ token, currentUser, onLogout }: Props) {
  const [isConnected, setIsConnected] = useState(true);
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceUser[]>>({});
  const [currentVoiceChannelId, setCurrentVoiceChannelId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return notificationManager.getPermission();
  });

  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSelfSpeaking, setIsSelfSpeaking] = useState(false);

  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionTimeLeft, setSuspensionTimeLeft] = useState(0);

  // Audio & WebRTC Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteAudiosRef = useRef<Record<string, HTMLAudioElement>>({});
  const activeChannelIdRef = useRef(activeChannelId);
  const currentUserRef = useRef(currentUser);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Request notification permissions
  useEffect(() => {
    if (notificationManager.isSupported()) {
      if (Notification.permission === "default") {
        notificationManager.requestPermission().then((perm) => {
          setNotificationPermission(perm);
        });
      } else {
        setNotificationPermission(Notification.permission);
      }
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    const perm = await notificationManager.requestPermission();
    setNotificationPermission(perm);
    return perm;
  }, []);

  // Suspension countdown
  useEffect(() => {
    if (isSuspended && suspensionTimeLeft > 0) {
      const timer = window.setInterval(() => {
        setSuspensionTimeLeft((prev) => {
          if (prev <= 1) {
            setIsSuspended(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => window.clearInterval(timer);
    }
  }, [isSuspended, suspensionTimeLeft]);

  // Audio track states (Mute/Deafen)
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted && !isDeafened;
      });
    }
  }, [isMuted, isDeafened]);

  useEffect(() => {
    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.muted = isDeafened;
    });
  }, [isDeafened]);

  const cleanupVoice = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    Object.entries(pcsRef.current).forEach(([peerId, pc]) => {
      pc.close();
    });
    pcsRef.current = {};
    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    remoteAudiosRef.current = {};
    setCurrentVoiceChannelId(null);
    setIsSelfSpeaking(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupVoice();
    };
  }, [cleanupVoice]);

  // WebRTC Signal Sender (Direct Cloud Firestore or HTTP API)
  const sendSignal = useCallback(async (targetPeerId: string, signalData: any) => {
    if (!currentUserRef.current) return;
    try {
      const signalId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      // Direct Firestore signaling document
      await setDoc(doc(db, "signals", signalId), {
        id: signalId,
        senderId: currentUserRef.current.id,
        targetUserId: targetPeerId,
        signalData: JSON.stringify(signalData),
        timestamp: Date.now(),
      });
    } catch {
      // Fallback via HTTP API
      try {
        await fetch("/api/chat/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPeerId, signalData }),
        });
      } catch {}
    }
  }, []);

  // WebRTC Peer Connection Factory
  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      pcsRef.current[peerId] = pc;

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
          if (pcsRef.current[peerId]) {
            pcsRef.current[peerId].close();
            delete pcsRef.current[peerId];
          }
          if (remoteAudiosRef.current[peerId]) {
            remoteAudiosRef.current[peerId].srcObject = null;
            remoteAudiosRef.current[peerId].remove();
            delete remoteAudiosRef.current[peerId];
          }
        }
      };

      return pc;
    },
    [isDeafened, sendSignal]
  );

  // Incoming RTC Signal Handler
  const handleIncomingSignal = useCallback(
    async (senderId: string, signalData: any) => {
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
        console.warn("RTC Signal handling:", err);
      }
    },
    [createPeerConnection, sendSignal]
  );

  // --- Real-time Cloud Firestore Snapshots (Zero WebSockets) ---
  useEffect(() => {
    if (!currentUser) return;

    // 1. Listen for Real-Time Messages
    const qMessages = query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(200));
    const unsubscribeMessages = onSnapshot(
      qMessages,
      (snapshot) => {
        const incomingMessages: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          incomingMessages.push({
            id: docSnap.id,
            channelId: data.channelId || "general",
            userId: data.userId || "",
            username: data.username || "Unknown",
            displayName: data.displayName || data.username || "Unknown",
            avatarColor: data.avatarColor || "#5865f2",
            content: data.content || "",
            attachmentUrl: data.attachmentUrl,
            attachmentName: data.attachmentName,
            timestamp: data.timestamp || Date.now(),
            reactions: data.reactions || {},
          });
        });

        // Filter messages for active channel
        setMessages(incomingMessages.filter((m) => m.channelId === activeChannelIdRef.current));

        // Notifications for new messages
        if (!initialLoadDoneRef.current) {
          incomingMessages.forEach((m) => knownMessageIdsRef.current.add(m.id));
          initialLoadDoneRef.current = true;
        } else {
          incomingMessages.forEach((m) => {
            if (!knownMessageIdsRef.current.has(m.id)) {
              knownMessageIdsRef.current.add(m.id);
              if (m.userId !== currentUserRef.current?.id) {
                notificationManager.notifyNewMessage({
                  senderName: m.displayName || m.username,
                  channelName: m.channelId === "general" ? "general" : m.channelId,
                  content: m.content,
                  avatarColor: m.avatarColor,
                });
              }
            }
          });
        }
      },
      (err) => {
        console.warn("Firestore message snapshot note:", err.message);
      }
    );

    // 2. Listen for Real-Time Users Presence & Voice States
    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const userList: User[] = [];
        const voices: Record<string, VoiceUser[]> = {
          "general-voice": [],
        };

        const now = Date.now();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const lastSeen = data.lastSeen || 0;
          const isOnline = now - lastSeen < 45000;

          const u: User = {
            id: docSnap.id,
            username: data.username || "Gamer",
            displayName: data.displayName || data.username || "Gamer",
            avatarColor: data.avatarColor || "#5865f2",
            status: isOnline ? data.status || "online" : "offline",
            currentVoiceChannelId: data.currentVoiceChannelId,
            isMuted: !!data.isMuted,
            isDeafened: !!data.isDeafened,
            isSpeaking: !!data.isSpeaking,
          };

          if (isOnline || docSnap.id === currentUserRef.current?.id) {
            userList.push(u);
          }

          if (isOnline && data.currentVoiceChannelId) {
            const vChannel = data.currentVoiceChannelId;
            if (!voices[vChannel]) voices[vChannel] = [];
            voices[vChannel].push({
              userId: docSnap.id,
              username: data.username || "Gamer",
              displayName: data.displayName || data.username || "Gamer",
              avatarColor: data.avatarColor || "#5865f2",
              isMuted: !!data.isMuted,
              isDeafened: !!data.isDeafened,
              isSpeaking: !!data.isSpeaking,
            });
          }
        });

        setOnlineUsers(userList);
        setVoiceStates(voices);

        // Manage WebRTC connections for current voice room occupants
        if (currentVoiceChannelId) {
          const channelOccupants = voices[currentVoiceChannelId] || [];
          const activePeerIds = channelOccupants
            .filter((o) => o.userId !== currentUserRef.current?.id)
            .map((o) => o.userId);

          for (const peerId of activePeerIds) {
            if (!pcsRef.current[peerId]) {
              const pc = createPeerConnection(peerId);
              if (currentUserRef.current && currentUserRef.current.id > peerId) {
                pc.createOffer({ offerToReceiveAudio: true })
                  .then(async (offer) => {
                    await pc.setLocalDescription(offer);
                    await sendSignal(peerId, offer);
                  })
                  .catch((e) => console.warn("Failed to create offer:", e));
              }
            }
          }

          // Cleanup peers that left
          Object.keys(pcsRef.current).forEach((peerId) => {
            if (!activePeerIds.includes(peerId)) {
              if (pcsRef.current[peerId]) {
                pcsRef.current[peerId].close();
                delete pcsRef.current[peerId];
              }
              if (remoteAudiosRef.current[peerId]) {
                remoteAudiosRef.current[peerId].srcObject = null;
                remoteAudiosRef.current[peerId].remove();
                delete remoteAudiosRef.current[peerId];
              }
            }
          });
        }
      },
      (err) => {
        console.warn("Firestore users snapshot note:", err.message);
      }
    );

    // 3. Listen for Incoming WebRTC Signals directed to this user
    const qSignals = query(
      collection(db, "signals"),
      where("targetUserId", "==", currentUser.id),
      limit(20)
    );
    const unsubscribeSignals = onSnapshot(
      qSignals,
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            try {
              const signalPayload = JSON.parse(data.signalData);
              await handleIncomingSignal(data.senderId, signalPayload);
              // Clean up processed signal
              deleteDoc(doc(db, "signals", change.doc.id)).catch(() => {});
            } catch (e) {
              console.warn("Signal process error:", e);
            }
          }
        });
      },
      (err) => {
        console.warn("Firestore signals snapshot note:", err.message);
      }
    );

    // 4. Heartbeat: Update presence periodically
    const updatePresence = async () => {
      if (!currentUserRef.current) return;
      try {
        await updateDoc(doc(db, "users", currentUserRef.current.id), {
          lastSeen: Date.now(),
          status: "online",
        });
      } catch {
        // Document might need initial setDoc
        try {
          await setDoc(
            doc(db, "users", currentUserRef.current.id),
            {
              ...currentUserRef.current,
              lastSeen: Date.now(),
              status: "online",
            },
            { merge: true }
          );
        } catch {}
      }
    };

    updatePresence();
    const heartbeatInterval = window.setInterval(updatePresence, 12000);

    return () => {
      unsubscribeMessages();
      unsubscribeUsers();
      unsubscribeSignals();
      window.clearInterval(heartbeatInterval);
    };
  }, [currentUser, currentVoiceChannelId, createPeerConnection, handleIncomingSignal, sendSignal]);

  // Re-filter messages when active channel changes
  useEffect(() => {
    async function loadChannelMessages() {
      try {
        const q = query(
          collection(db, "messages"),
          where("channelId", "==", activeChannelId),
          orderBy("timestamp", "asc"),
          limit(100)
        );
        const snap = await getDocs(q);
        const msgs: ChatMessage[] = [];
        snap.forEach((d) => {
          const data = d.data();
          msgs.push({
            id: d.id,
            channelId: data.channelId,
            userId: data.userId,
            username: data.username,
            displayName: data.displayName,
            avatarColor: data.avatarColor,
            content: data.content,
            attachmentUrl: data.attachmentUrl,
            attachmentName: data.attachmentName,
            timestamp: data.timestamp,
            reactions: data.reactions || {},
          });
        });
        setMessages(msgs);
      } catch {
        // Fallback to in-memory filter
      }
    }
    loadChannelMessages();
  }, [activeChannelId]);

  // --- Chat Actions ---

  const sendMessage = async (content: string, attachmentUrl?: string, attachmentName?: string) => {
    if (!currentUser) return;
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: ChatMessage = {
      id: msgId,
      channelId: activeChannelId,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName || currentUser.username,
      avatarColor: currentUser.avatarColor,
      content,
      attachmentUrl,
      attachmentName,
      timestamp: Date.now(),
      reactions: {},
    };

    // Optimistic UI update
    setMessages((prev) => [...prev, newMsg]);

    // 1. Direct Cloud Firestore write (instant real-time broadcast)
    try {
      await setDoc(doc(db, "messages", msgId), newMsg);
    } catch (fsErr) {
      console.warn("Firestore write note:", fsErr);
    }

    // 2. Also notify backend API if available
    if (token) {
      try {
        await fetch("/api/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            channelId: activeChannelId,
            content,
            attachmentUrl,
            attachmentName,
          }),
        });
      } catch {}
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const username = currentUser.username;

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...m.reactions };
        const users = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
        const idx = users.indexOf(username);
        if (idx >= 0) {
          users.splice(idx, 1);
          if (users.length === 0) delete currentReactions[emoji];
          else currentReactions[emoji] = users;
        } else {
          users.push(username);
          currentReactions[emoji] = users;
        }
        return { ...m, reactions: currentReactions };
      })
    );

    // Update on Firestore
    try {
      const msgRef = doc(db, "messages", messageId);
      const targetMsg = messages.find((m) => m.id === messageId);
      if (targetMsg) {
        const nextReactions = { ...targetMsg.reactions };
        const users = nextReactions[emoji] ? [...nextReactions[emoji]] : [];
        const idx = users.indexOf(username);
        if (idx >= 0) {
          users.splice(idx, 1);
          if (users.length === 0) delete nextReactions[emoji];
          else nextReactions[emoji] = users;
        } else {
          users.push(username);
          nextReactions[emoji] = users;
        }
        await updateDoc(msgRef, { reactions: nextReactions });
      }
    } catch (e) {
      console.warn("Reaction update note:", e);
    }
  };

  const sendTyping = async (isTyping: boolean) => {
    if (!currentUser) return;
    try {
      if (isTyping) {
        setTypingUsers((prev) => (prev.includes(currentUser.username) ? prev : [...prev, currentUser.username]));
      } else {
        setTypingUsers((prev) => prev.filter((u) => u !== currentUser.username));
      }
    } catch {}
  };

  // --- Voice Actions ---

  const joinVoiceChannel = async (voiceChannelId: string) => {
    if (isSuspended) {
      setVoiceError(
        `You are suspended from voice channels for ${suspensionTimeLeft} more seconds due to inappropriate content.`
      );
      return;
    }
    if (!currentUser) return;
    setVoiceError(null);

    try {
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
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      localStreamRef.current = stream;

      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted && !isDeafened;
      });

      // Voice presence update in Firestore
      await updateDoc(doc(db, "users", currentUser.id), {
        currentVoiceChannelId: voiceChannelId,
        isMuted,
        isDeafened,
        isSpeaking: false,
        lastSeen: Date.now(),
      }).catch(async () => {
        await setDoc(
          doc(db, "users", currentUser.id),
          {
            ...currentUser,
            currentVoiceChannelId: voiceChannelId,
            isMuted,
            isDeafened,
            isSpeaking: false,
            lastSeen: Date.now(),
          },
          { merge: true }
        );
      });

      setCurrentVoiceChannelId(voiceChannelId);
    } catch (err: any) {
      console.error("Microphone access denied or error:", err);
      setVoiceError(err.message || "Failed to access microphone.");
    }
  };

  const leaveVoiceChannel = async () => {
    cleanupVoice();
    if (currentUser) {
      try {
        await updateDoc(doc(db, "users", currentUser.id), {
          currentVoiceChannelId: null,
          isSpeaking: false,
        });
      } catch {}
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !nextMuted && !isDeafened));
    }
    if (currentUser) {
      updateDoc(doc(db, "users", currentUser.id), { isMuted: nextMuted }).catch(() => {});
    }
  };

  const toggleDeafen = () => {
    const nextDeaf = !isDeafened;
    setIsDeafened(nextDeaf);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !isMuted && !nextDeaf));
    }
    if (currentUser) {
      updateDoc(doc(db, "users", currentUser.id), { isDeafened: nextDeaf }).catch(() => {});
    }
  };

  return {
    isConnected,
    channels,
    activeChannelId,
    setActiveChannelId,
    messages,
    onlineUsers,
    typingUsers,
    voiceStates,
    currentVoiceChannelId,
    voiceError,
    isMuted,
    isDeafened,
    isSelfSpeaking,
    isSuspended,
    suspensionTimeLeft,
    notificationPermission,
    requestNotificationPermission,
    sendMessage,
    toggleReaction,
    sendTyping,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
  };
}
