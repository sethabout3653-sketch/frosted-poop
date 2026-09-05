import { useState, useEffect, useRef, useCallback } from "react";
import type { User, Channel, ChatMessage, VoiceUser } from "@/types/chat";
import { notificationManager } from "../lib/notifications";
import { StudioAudioEngine } from "../lib/studioAudioEngine";
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

/**
 * Optimizes WebRTC SDP to ensure crystal-clear, continuous voice transmission without cutting off:
 * - usedtx=0 (disables discontinuous transmission / silence clipping, prevents voice cutting off)
 * - useinbandfec=1 (in-band forward error correction, restores lost packets across Wi-Fi & cellular)
 * - maxaveragebitrate=32000 (stable voice bitrate even on bad wifis)
 * - ptime=20, minptime=10 (smooth, low-latency audio delivery)
 */
function optimizeOpusSdp(sdp: string): string {
  return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
    if (sdp.includes(`a=rtpmap:${pt} opus/48000`)) {
      let newParams = params;
      if (!newParams.includes("useinbandfec=")) {
        newParams += ";useinbandfec=1";
      }
      if (newParams.includes("usedtx=")) {
        newParams = newParams.replace(/usedtx=\d+/g, "usedtx=0");
      } else {
        newParams += ";usedtx=0";
      }
      if (newParams.includes("maxaveragebitrate=")) {
        newParams = newParams.replace(/maxaveragebitrate=\d+/g, "maxaveragebitrate=32000");
      } else {
        newParams += ";maxaveragebitrate=32000";
      }
      if (!newParams.includes("ptime=")) {
        newParams += ";ptime=20";
      }
      if (!newParams.includes("minptime=")) {
        newParams += ";minptime=10";
      }
      newParams = newParams
        .replace(/;?stereo=\d+/g, "")
        .replace(/;?sprop-stereo=\d+/g, "")
        .replace(/;?cbr=\d+/g, "");
      return `a=fmtp:${pt} ${newParams}`;
    }
    return match;
  });
}

// Helper to remove undefined properties before writing to Firestore
function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean as T;
}

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
  const [micLevel, setMicLevel] = useState<number>(0);

  // Studio Voice Quality Controls
  const [studioVoiceMode, setStudioVoiceModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem("discord_studio_voice");
    return saved !== null ? saved === "true" : true;
  });
  const [echoCancellation, setEchoCancellationState] = useState<boolean>(() => {
    const saved = localStorage.getItem("discord_echo_cancellation");
    return saved !== null ? saved === "true" : true;
  });

  const studioVoiceModeRef = useRef(studioVoiceMode);
  const echoCancellationRef = useRef(echoCancellation);
  const studioEngineRef = useRef<StudioAudioEngine | null>(null);

  useEffect(() => {
    studioVoiceModeRef.current = studioVoiceMode;
  }, [studioVoiceMode]);

  useEffect(() => {
    echoCancellationRef.current = echoCancellation;
  }, [echoCancellation]);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    () => {
      return notificationManager.getPermission();
    },
  );

  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSelfSpeaking, setIsSelfSpeaking] = useState(false);

  // Audio & WebRTC Refs
  const rawStreamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const remoteAudioCtxRef = useRef<AudioContext | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteAudiosRef = useRef<Record<string, HTMLAudioElement>>({});

  const speechRecognitionRef = useRef<any | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const whisperAudioIntervalRef = useRef<number | null>(null);
  const isAnalyzingAudioRef = useRef<boolean>(false);
  const recentMaxEnergyRef = useRef<number>(0);
  const speechWatchdogRef = useRef<number | null>(null);
  const whisperBoosterStreamRef = useRef<MediaStream | null>(null);
  const activeChannelIdRef = useRef(activeChannelId);
  const currentVoiceChannelIdRef = useRef(currentVoiceChannelId);
  const isMutedRef = useRef(isMuted);
  const isDeafenedRef = useRef(isDeafened);
  const currentUserRef = useRef(currentUser);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    currentVoiceChannelIdRef.current = currentVoiceChannelId;
  }, [currentVoiceChannelId]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isDeafenedRef.current = isDeafened;
  }, [isDeafened]);

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

  const setStudioVoiceMode = useCallback((val: boolean) => {
    setStudioVoiceModeState(val);
    try {
      localStorage.setItem("discord_studio_voice", val.toString());
    } catch {}
    if (studioEngineRef.current) {
      studioEngineRef.current.setStudioEnhancer(val);
    }
  }, []);

  const setEchoCancellation = useCallback((val: boolean) => {
    setEchoCancellationState(val);
    try {
      localStorage.setItem("discord_echo_cancellation", val.toString());
    } catch {}
  }, []);

  // Audio track states (Mute/Deafen)
  useEffect(() => {
    if (rawStreamRef.current) {
      rawStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted && !isDeafened;
      });
    }
    if (processedStreamRef.current) {
      processedStreamRef.current.getAudioTracks().forEach((track) => {
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
    // 1. Stop Speech Recognition & Watchdog
    if (speechWatchdogRef.current) {
      clearInterval(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.abort();
      } catch {}
      speechRecognitionRef.current = null;
    }

    // 2. Stop Whisper Audio Recording & Analysis
    if (whisperAudioIntervalRef.current) {
      clearInterval(whisperAudioIntervalRef.current);
      whisperAudioIntervalRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
    }
    isAnalyzingAudioRef.current = false;
    recentMaxEnergyRef.current = 0;
    whisperBoosterStreamRef.current = null;

    if (studioEngineRef.current) {
      studioEngineRef.current.destroy();
      studioEngineRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (remoteAudioCtxRef.current) {
      remoteAudioCtxRef.current.close().catch(() => {});
      remoteAudioCtxRef.current = null;
    }
    analyserRef.current = null;

    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((track) => track.stop());
      rawStreamRef.current = null;
    }
    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach((track) => track.stop());
      processedStreamRef.current = null;
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
    setMicLevel(0);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupVoice();
    };
  }, [cleanupVoice]);

  // Voice moderation suspension action trigger
  const triggerVoiceSuspension = useCallback(
    async (word: string, category?: string) => {
      const durationMs = 60 * 1000; // 1 minute
      const until = Date.now() + durationMs;
      const cat = category || categorizeProfanity(word) || "Derogatory & Prohibited Language";
      const actionText = `You Have been suspended for violating moderation. Offensive Item: "${word}". Violation Type: ${cat}.`;

      // 1. Immediately disconnect and leave voice channel
      cleanupVoice();

      // 2. Update local state
      setIsSuspended(true);
      setSuspensionTimeLeft(60);
      setSuspensionWord(word);
      setSuspensionCategory(cat);
      setSuspensionAction(actionText);
      setVoiceError(actionText);

      // 3. Persist in localStorage for cross-refresh persistence
      try {
        localStorage.setItem("discord_voice_suspended_until", until.toString());
        localStorage.setItem("discord_voice_suspension_word", word);
        localStorage.setItem("discord_voice_suspension_category", cat);
        localStorage.setItem("discord_voice_suspension_action", actionText);
      } catch (e) {
        console.warn("LocalStorage save error:", e);
      }

      // 4. Update Firestore user state
      if (currentUserRef.current?.id) {
        try {
          await updateDoc(doc(db, "users", currentUserRef.current.id), {
            currentVoiceChannelId: null,
            isSpeaking: false,
            isSuspended: true,
            voiceSuspendedUntil: until,
            suspensionWord: word,
            suspensionCategory: cat,
            suspensionAction: actionText,
          });
        } catch (err) {
          console.warn("Firestore user suspension update note:", err);
        }
      }

      // 5. Execute action: Audible speech saying "You Have been suspended for violating moderation" "Offensive Item [word]" "Violation Type: [category]"
      announceVoiceSuspension(word, cat);
    },
    [cleanupVoice],
  );

  const triggerVoiceSuspensionRef = useRef(triggerVoiceSuspension);
  useEffect(() => {
    triggerVoiceSuspensionRef.current = triggerVoiceSuspension;
  }, [triggerVoiceSuspension]);

  // WebRTC Signal Sender
  const sendSignal = useCallback(async (targetPeerId: string, signalData: any) => {
    if (!currentUserRef.current) return;
    try {
      const signalId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setDoc(doc(db, "signals", signalId), {
        id: signalId,
        senderId: currentUserRef.current.id,
        targetUserId: targetPeerId,
        signalData: JSON.stringify(signalData),
        timestamp: Date.now(),
      });
    } catch {
      try {
        await fetch("/api/chat/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetPeerId, signalData }),
        });
      } catch {}
    }
  }, []);

  // WebRTC Peer Connection Factory with amplified outbound and inbound audio
  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      });

      pcsRef.current[peerId] = pc;

      const streamToSend = processedStreamRef.current || rawStreamRef.current;
      if (streamToSend) {
        streamToSend.getAudioTracks().forEach((track) => {
          track.enabled = !isMuted && !isDeafened;
          const sender = pc.addTrack(track, streamToSend);
          try {
            const params = sender.getParameters();
            if (params.encodings && params.encodings.length > 0) {
              params.encodings[0].maxBitrate = 32000;
              params.encodings[0].priority = "high";
              params.encodings[0].networkPriority = "high";
              sender.setParameters(params);
            }
          } catch {}
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(peerId, event.candidate);
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;

        // Native HTMLAudioElement is the most reliable, zero-cutoff playback engine
        let audio = remoteAudiosRef.current[peerId];
        if (!audio) {
          audio = document.createElement("audio");
          audio.autoplay = true;
          (audio as any).playsInline = true;
          document.body.appendChild(audio);
          remoteAudiosRef.current[peerId] = audio;
        }
        audio.srcObject = remoteStream;
        audio.muted = isDeafened;
        audio.volume = isDeafened ? 0 : 1.0;
        audio.play().catch(() => {
          const resumeAudio = () => {
            if (audio) audio.play().catch(() => {});
            window.removeEventListener("click", resumeAudio);
            window.removeEventListener("touchstart", resumeAudio);
          };
          window.addEventListener("click", resumeAudio);
          window.addEventListener("touchstart", resumeAudio);
        });
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
    [isMuted, isDeafened, sendSignal],
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
          if (answer.sdp) {
            answer.sdp = optimizeOpusSdp(answer.sdp);
          }
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
    [createPeerConnection, sendSignal],
  );

  // --- Real-time Cloud Firestore Snapshots (Zero WebSockets) ---
  useEffect(() => {
    if (!currentUser) return;

    // 1. Listen for Real-Time Messages (Reliable Firestore Query)
    const qMessages = query(collection(db, "messages"), limit(300));
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

        // Always sort chronologically
        incomingMessages.sort((a, b) => a.timestamp - b.timestamp);

        setMessages(incomingMessages.filter((m) => m.channelId === activeChannelIdRef.current));

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
                  channelId: m.channelId,
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
      },
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
            isSuspended: !!data.isSuspended,
            voiceSuspendedUntil: data.voiceSuspendedUntil || null,
            suspensionWord: data.suspensionWord || null,
            suspensionCategory: data.suspensionCategory || null,
            suspensionAction: data.suspensionAction || null,
          };

          if (docSnap.id === currentUserRef.current?.id) {
            if (data.voiceSuspendedUntil && data.voiceSuspendedUntil > now) {
              const diff = Math.ceil((data.voiceSuspendedUntil - now) / 1000);
              setIsSuspended(true);
              setSuspensionTimeLeft(diff);
              if (data.suspensionWord) setSuspensionWord(data.suspensionWord);
              if (data.suspensionCategory) setSuspensionCategory(data.suspensionCategory);
              if (data.suspensionAction) setSuspensionAction(data.suspensionAction);
            }
          }

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
                    if (offer.sdp) {
                      offer.sdp = optimizeOpusSdp(offer.sdp);
                    }
                    await pc.setLocalDescription(offer);
                    await sendSignal(peerId, offer);
                  })
                  .catch((e) => console.warn("Failed to create offer:", e));
              }
            }
          }

          Object.keys(pcsRef.current).forEach((peerId) => {
            if (!activePeerIds.includes(peerId)) {
              if (pcsRef.current[peerId]) {
                pcsRef.current[peerId].close();
                delete pcsRef.current[peerId];
              }
              if (remoteGainNodesRef.current[peerId]) {
                delete remoteGainNodesRef.current[peerId];
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
      },
    );

    // 3. Listen for Incoming WebRTC Signals directed to this user
    const qSignals = query(
      collection(db, "signals"),
      where("targetUserId", "==", currentUser.id),
      limit(20),
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
              deleteDoc(doc(db, "signals", change.doc.id)).catch(() => {});
            } catch (e) {
              console.warn("Signal process error:", e);
            }
          }
        });
      },
      (err) => {
        console.warn("Firestore signals snapshot note:", err.message);
      },
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
        try {
          await setDoc(
            doc(db, "users", currentUserRef.current.id),
            {
              ...currentUserRef.current,
              lastSeen: Date.now(),
              status: "online",
            },
            { merge: true },
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
        const snap = await getDocs(query(collection(db, "messages"), limit(300)));
        const msgs: ChatMessage[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.channelId === activeChannelId) {
            msgs.push({
              id: d.id,
              channelId: data.channelId,
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
          }
        });
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgs);
      } catch {}
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
      content: content || "",
      timestamp: Date.now(),
      reactions: {},
    };

    if (attachmentUrl) {
      newMsg.attachmentUrl = attachmentUrl;
    }
    if (attachmentName) {
      newMsg.attachmentName = attachmentName;
    }

    setMessages((prev) => [...prev.filter((m) => m.id !== msgId), newMsg]);

    const sanitizedMsg = cleanFirestoreData(newMsg);

    try {
      await setDoc(doc(db, "messages", msgId), sanitizedMsg);
    } catch (fsErr) {
      console.warn("Firestore write note:", fsErr);
    }

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
            content: content || "",
            ...(attachmentUrl ? { attachmentUrl } : {}),
            ...(attachmentName ? { attachmentName } : {}),
          }),
        });
      } catch {}
    }
  };

  const deleteMessage = async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await deleteDoc(doc(db, "messages", messageId));
    } catch (err) {
      console.warn("Delete message error:", err);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const username = currentUser.username;

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
      }),
    );

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
        setTypingUsers((prev) =>
          prev.includes(currentUser.username) ? prev : [...prev, currentUser.username],
        );
      } else {
        setTypingUsers((prev) => prev.filter((u) => u !== currentUser.username));
      }
    } catch {}
  };

  // --- Voice Actions ---

  const joinVoiceChannel = async (voiceChannelId: string) => {
    if (!currentUser) return;
    setVoiceError(null);

    try {
      cleanupVoice();

      // Broadcast-grade audio constraints compatible with all microphones (USB, built-in, Bluetooth, headsets)
      const audioConstraints: MediaTrackConstraints = {
        sampleRate: { ideal: 48000 },
        channelCount: { ideal: 1 },
        echoCancellation: { ideal: echoCancellationRef.current },
        noiseSuppression: { ideal: false },
        autoGainControl: { ideal: false },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      rawStreamRef.current = stream;

      // Initialize Studio Broadcast DSP Engine
      try {
        const engine = new StudioAudioEngine({
          studioEnhancer: studioVoiceModeRef.current,
        });
        studioEngineRef.current = engine;
        const processedStream = engine.initialize(stream);
        processedStreamRef.current = processedStream;

        // Visual Audio Level Meter & Voice Activity Detection
        const analyser = engine.getAnalyserNode();
        if (analyser) {
          analyserRef.current = analyser;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let speakingHangover = 0;

          const checkSpeaking = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));
            setMicLevel(normalizedLevel);
            recentMaxEnergyRef.current = Math.max(recentMaxEnergyRef.current, average);

            // Responsive threshold + smooth hangover (30 frames) so quiet whispers and trailing words are detected
            if (average > 1.2) {
              speakingHangover = 30;
              setIsSelfSpeaking(true);
            } else if (speakingHangover > 0) {
              speakingHangover--;
              setIsSelfSpeaking(true);
            } else {
              setIsSelfSpeaking(false);
            }

            animFrameRef.current = requestAnimationFrame(checkSpeaking);
          };
          checkSpeaking();
        }

        // Whisper Intelligibility Stream for local speech moderation
        whisperBoosterStreamRef.current = processedStream;
      } catch (audioErr) {
        console.warn("StudioAudioEngine setup note:", audioErr);
        processedStreamRef.current = stream;
      }

      // Immediately register active voice channel synchronously to eliminate any moderation activation lag
      currentVoiceChannelIdRef.current = voiceChannelId;
      setCurrentVoiceChannelId(voiceChannelId);

      // Voice presence update in Firestore (runs asynchronously in background)
      updateDoc(doc(db, "users", currentUser.id), {
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
          { merge: true },
        );
      });
    } catch (err: any) {
      console.error("Microphone access error:", err);
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
    isMutedRef.current = nextMuted;
    if (rawStreamRef.current) {
      rawStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !nextMuted && !isDeafened));
    }
    if (processedStreamRef.current) {
      processedStreamRef.current
        .getAudioTracks()
        .forEach((t) => (t.enabled = !nextMuted && !isDeafened));
    }
    if (currentUser) {
      updateDoc(doc(db, "users", currentUser.id), { isMuted: nextMuted }).catch(() => {});
    }

    if (nextMuted) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.abort();
        } catch {}
      }
    }
  };

  const toggleDeafen = () => {
    const nextDeaf = !isDeafened;
    setIsDeafened(nextDeaf);
    isDeafenedRef.current = nextDeaf;
    if (rawStreamRef.current) {
      rawStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !isMuted && !nextDeaf));
    }
    if (processedStreamRef.current) {
      processedStreamRef.current
        .getAudioTracks()
        .forEach((t) => (t.enabled = !isMuted && !nextDeaf));
    }
    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.muted = nextDeaf;
    });
    if (currentUser) {
      updateDoc(doc(db, "users", currentUser.id), { isDeafened: nextDeaf }).catch(() => {});
    }

    if (nextDeaf) {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.abort();
        } catch {}
      }
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
    setVoiceError,
    isMuted,
    isDeafened,
    isSelfSpeaking,
    micLevel,
    notificationPermission,
    requestNotificationPermission,
    sendMessage,
    deleteMessage,
    toggleReaction,
    sendTyping,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    studioVoiceMode,
    setStudioVoiceMode,
    echoCancellation,
    setEchoCancellation,
  };
}
