import { useState, useEffect, useRef, useCallback } from "react";
import type { User, Channel, ChatMessage, VoiceUser } from "@/types/chat";
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

/**
 * Optimizes WebRTC SDP to boost Opus voice audio quality to Studio Hi-Fi grade:
 * - usedtx=0 (disables discontinuous silence clipping, prevents voice cutting out)
 * - maxaveragebitrate=510000 (maximum fidelity Opus bitrate, up to 510kbps)
 * - stereo=1; sprop-stereo=1 (dual channel stereo transmission)
 * - useinbandfec=1 (forward error correction packet recovery)
 * - cbr=1 (constant bitrate transmission, completely smooth jitter-free)
 * - maxplaybackrate=48000 (full 48kHz audio reproduction)
 * - ptime=20, minptime=10 (low latency 10ms-20ms packet framing)
 */
function optimizeOpusSdp(sdp: string): string {
  return sdp.replace(/a=fmtp:(\d+) (.*)/g, (match, pt, params) => {
    if (sdp.includes(`a=rtpmap:${pt} opus/48000`)) {
      let newParams = params;
      if (newParams.includes("usedtx=")) {
        newParams = newParams.replace(/usedtx=\d+/g, "usedtx=0");
      } else {
        newParams += ";usedtx=0";
      }
      if (newParams.includes("maxaveragebitrate=")) {
        newParams = newParams.replace(/maxaveragebitrate=\d+/g, "maxaveragebitrate=510000");
      } else {
        newParams += ";maxaveragebitrate=510000";
      }
      if (newParams.includes("stereo=")) {
        newParams = newParams.replace(/stereo=\d+/g, "stereo=1");
      } else {
        newParams += ";stereo=1";
      }
      if (newParams.includes("sprop-stereo=")) {
        newParams = newParams.replace(/sprop-stereo=\d+/g, "sprop-stereo=1");
      } else {
        newParams += ";sprop-stereo=1";
      }
      if (!newParams.includes("useinbandfec=")) {
        newParams += ";useinbandfec=1";
      }
      if (!newParams.includes("cbr=")) {
        newParams += ";cbr=1";
      }
      if (newParams.includes("maxplaybackrate=")) {
        newParams = newParams.replace(/maxplaybackrate=\d+/g, "maxplaybackrate=48000");
      } else {
        newParams += ";maxplaybackrate=48000";
      }
      if (!newParams.includes("minptime=")) {
        newParams += ";minptime=10";
      }
      if (!newParams.includes("ptime=")) {
        newParams += ";ptime=20";
      }
      return `a=fmtp:${pt} ${newParams}`;
    }
    return match;
  });
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

  // Audio Gain & Volume Boost States (Default 300% mic boost, 250% speaker boost)
  const [micGain, setMicGainState] = useState<number>(() => {
    const saved = localStorage.getItem("discord_mic_gain");
    return saved ? parseFloat(saved) : 3.0;
  });
  const [outputGain, setOutputGainState] = useState<number>(() => {
    const saved = localStorage.getItem("discord_output_gain");
    return saved ? parseFloat(saved) : 2.5;
  });
  const [micLevel, setMicLevel] = useState<number>(0);

  // Studio Voice Quality & Monitoring Controls
  const [studioVoiceMode, setStudioVoiceModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem("discord_studio_voice");
    return saved !== null ? saved === "true" : true;
  });
  const [micMonitoring, setMicMonitoringState] = useState<boolean>(() => {
    return localStorage.getItem("discord_mic_monitoring") === "true";
  });
  const [echoCancellation, setEchoCancellationState] = useState<boolean>(() => {
    const saved = localStorage.getItem("discord_echo_cancellation");
    return saved !== null ? saved === "true" : true;
  });

  const studioVoiceModeRef = useRef(studioVoiceMode);
  const micMonitoringRef = useRef(micMonitoring);
  const echoCancellationRef = useRef(echoCancellation);
  const micMonitorGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    studioVoiceModeRef.current = studioVoiceMode;
  }, [studioVoiceMode]);

  useEffect(() => {
    micMonitoringRef.current = micMonitoring;
  }, [micMonitoring]);

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

  // Moderation disabled - clear any previous suspension states
  const [isSuspended] = useState<boolean>(false);
  const [suspensionTimeLeft] = useState<number>(0);
  const [suspensionAction] = useState<string>("");

  useEffect(() => {
    try {
      localStorage.removeItem("discord_suspended_until");
      localStorage.removeItem("discord_suspension_action");
    } catch {}
    if (currentUser?.id) {
      updateDoc(doc(db, "users", currentUser.id), {
        isSuspended: false,
        suspendedUntil: null,
        suspensionAction: null,
      }).catch(() => {});
    }
  }, [currentUser?.id]);

  // Audio & WebRTC Refs
  const rawStreamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const remoteAudioCtxRef = useRef<AudioContext | null>(null);
  const remoteGainNodesRef = useRef<Record<string, GainNode>>({});
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteAudiosRef = useRef<Record<string, HTMLAudioElement>>({});

  const speechRecognitionRef = useRef<any | null>(null);
  const activeChannelIdRef = useRef(activeChannelId);
  const currentVoiceChannelIdRef = useRef(currentVoiceChannelId);
  const isSuspendedRef = useRef(isSuspended);
  const isMutedRef = useRef(isMuted);
  const isDeafenedRef = useRef(isDeafened);
  const currentUserRef = useRef(currentUser);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  const micGainRef = useRef(micGain);
  const outputGainRef = useRef(outputGain);

  useEffect(() => {
    micGainRef.current = micGain;
  }, [micGain]);

  useEffect(() => {
    outputGainRef.current = outputGain;
  }, [outputGain]);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    currentVoiceChannelIdRef.current = currentVoiceChannelId;
  }, [currentVoiceChannelId]);

  useEffect(() => {
    isSuspendedRef.current = isSuspended;
  }, [isSuspended]);

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

  // Update Mic Gain
  const setMicGain = useCallback(
    (newGain: number) => {
      setMicGainState(newGain);
      localStorage.setItem("discord_mic_gain", newGain.toString());
      if (micGainNodeRef.current) {
        micGainNodeRef.current.gain.value = isMuted ? 0 : newGain;
      }
    },
    [isMuted],
  );

  // Update Output Gain
  const setOutputGain = useCallback(
    (newGain: number) => {
      setOutputGainState(newGain);
      localStorage.setItem("discord_output_gain", newGain.toString());
      Object.values(remoteGainNodesRef.current).forEach((gNode) => {
        gNode.gain.value = isDeafened ? 0 : newGain;
      });
    },
    [isDeafened],
  );

  const setStudioVoiceMode = useCallback((val: boolean) => {
    setStudioVoiceModeState(val);
    localStorage.setItem("discord_studio_voice", val.toString());
  }, []);

  const setMicMonitoring = useCallback((val: boolean) => {
    setMicMonitoringState(val);
    localStorage.setItem("discord_mic_monitoring", val.toString());
    if (micMonitorGainRef.current) {
      micMonitorGainRef.current.gain.value = val ? 0.85 : 0;
    }
  }, []);

  const setEchoCancellation = useCallback((val: boolean) => {
    setEchoCancellationState(val);
    localStorage.setItem("discord_echo_cancellation", val.toString());
  }, []);

  // Audio track states (Mute/Deafen)
  useEffect(() => {
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = isMuted || isDeafened ? 0 : micGain;
    }
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
  }, [isMuted, isDeafened, micGain]);

  useEffect(() => {
    Object.values(remoteGainNodesRef.current).forEach((gNode) => {
      gNode.gain.value = isDeafened ? 0 : outputGain;
    });
    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.muted = isDeafened;
    });
  }, [isDeafened, outputGain]);

  const cleanupVoice = useCallback(() => {
    // 1. Stop Speech Recognition
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.abort();
      } catch {}
      speechRecognitionRef.current = null;
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
    micGainNodeRef.current = null;
    micMonitorGainRef.current = null;
    remoteGainNodesRef.current = {};

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
          const sender = pc.addTrack(track, streamToSend);
          try {
            const params = sender.getParameters();
            if (params.encodings && params.encodings.length > 0) {
              params.encodings[0].maxBitrate = 510000;
              params.encodings[0].priority = "high";
              params.encodings[0].networkPriority = "high";
              (params.encodings[0] as any).dtx = "disabled";
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

        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (!remoteAudioCtxRef.current || remoteAudioCtxRef.current.state === "closed") {
            remoteAudioCtxRef.current = new AudioCtx({
              sampleRate: 48000,
              latencyHint: "interactive",
            });
          }
          const rCtx = remoteAudioCtxRef.current;
          if (rCtx.state === "suspended") {
            rCtx.resume().catch(() => {});
          }

          const rSource = rCtx.createMediaStreamSource(remoteStream);

          // Studio Remote Audio Pipeline (48kHz Hi-Fi Filter + Dynamics Compressor + Dynamic Gain)
          const rHighpass = rCtx.createBiquadFilter();
          rHighpass.type = "highpass";
          rHighpass.frequency.value = 75;
          rHighpass.Q.value = 0.7;

          const rCompressor = rCtx.createDynamicsCompressor();
          rCompressor.threshold.value = -18;
          rCompressor.knee.value = 10;
          rCompressor.ratio.value = 3.0;
          rCompressor.attack.value = 0.004;
          rCompressor.release.value = 0.12;

          const rGain = rCtx.createGain();
          rGain.gain.value = isDeafened ? 0 : outputGainRef.current;
          remoteGainNodesRef.current[peerId] = rGain;

          rSource.connect(rHighpass);
          rHighpass.connect(rCompressor);
          rCompressor.connect(rGain);
          rGain.connect(rCtx.destination);
        } catch (webaudioErr) {
          console.warn("WebAudio remote setup note:", webaudioErr);
        }

        let audio = remoteAudiosRef.current[peerId];
        if (!audio) {
          audio = document.createElement("audio");
          audio.autoplay = true;
          (audio as any).playsInline = true;
          audio.volume = 1.0;
          document.body.appendChild(audio);
          remoteAudiosRef.current[peerId] = audio;
        }
        audio.srcObject = remoteStream;
        audio.muted = Boolean(remoteAudioCtxRef.current);
        audio.play().catch(() => {
          const resumeAudio = () => {
            audio.play().catch(() => {});
            if (remoteAudioCtxRef.current && remoteAudioCtxRef.current.state === "suspended") {
              remoteAudioCtxRef.current.resume().catch(() => {});
            }
            window.removeEventListener("click", resumeAudio);
          };
          window.addEventListener("click", resumeAudio);
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
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
      };

      return pc;
    },
    [isDeafened, sendSignal],
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
        const q = query(
          collection(db, "messages"),
          where("channelId", "==", activeChannelId),
          orderBy("timestamp", "asc"),
          limit(100),
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
      content,
      attachmentUrl,
      attachmentName,
      timestamp: Date.now(),
      reactions: {},
    };

    setMessages((prev) => [...prev, newMsg]);

    try {
      await setDoc(doc(db, "messages", msgId), newMsg);
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
            content,
            attachmentUrl,
            attachmentName,
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

  const clearAllMessages = async () => {
    setMessages([]);
    try {
      const snap = await getDocs(collection(db, "messages"));
      const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, "messages", d.id)));
      await Promise.all(deletePromises);
    } catch (err) {
      console.warn("Clear all messages in firestore error:", err);
    }
    try {
      if (token) {
        await fetch("/api/chat/messages/clear-all", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
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

      // High-Fidelity Studio Audio Constraints (48kHz, 24-bit, uncompressed, optional echo cancel)
      const audioConstraints: MediaTrackConstraints = {
        sampleRate: { ideal: 48000, min: 44100 },
        sampleSize: { ideal: 24, min: 16 },
        channelCount: { ideal: 2, min: 1 },
        echoCancellation: echoCancellationRef.current,
        noiseSuppression: false, // Disabled to prevent frequency cutoffs and metallic voice artifacting
        autoGainControl: false, // Disabled to eliminate volume jumping/pumping
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      rawStreamRef.current = stream;

      // Studio DSP Audio Pipeline (48kHz Uncompressed Broadcast Output)
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const actx = new AudioCtx({
            sampleRate: 48000,
            latencyHint: "interactive",
          });
          audioContextRef.current = actx;
          if (actx.state === "suspended") {
            actx.resume().catch(() => {});
          }

          const rawSource = actx.createMediaStreamSource(stream);

          // 1. Studio Highpass Rumble Filter (<75Hz table vibrations / low hum cut)
          const highpass = actx.createBiquadFilter();
          highpass.type = "highpass";
          highpass.frequency.value = 75;
          highpass.Q.value = 0.7;

          // 2. Studio Low-End Warmth EQ (+1.0dB at 240Hz for broadcast vocal fullness)
          const warmthEQ = actx.createBiquadFilter();
          warmthEQ.type = "peaking";
          warmthEQ.frequency.value = 240;
          warmthEQ.Q.value = 0.9;
          warmthEQ.gain.value = 1.0;

          // 3. Studio Vocal Presence EQ (+2.5dB at 3500Hz for crystal clear articulation)
          const clarityEQ = actx.createBiquadFilter();
          clarityEQ.type = "peaking";
          clarityEQ.frequency.value = 3500;
          clarityEQ.Q.value = 1.0;
          clarityEQ.gain.value = 2.5;

          // 4. Studio Broadcast Dynamics Compressor (levels quiet speech, prevents shouting clipping)
          const compressor = actx.createDynamicsCompressor();
          compressor.threshold.value = -18;
          compressor.knee.value = 12;
          compressor.ratio.value = 3.5;
          compressor.attack.value = 0.003;
          compressor.release.value = 0.1;

          // 5. Hardware Gain Amplifier (User-controlled 100%-500%)
          const micGainNode = actx.createGain();
          micGainNode.gain.value = isMuted || isDeafened ? 0 : micGainRef.current;
          micGainNodeRef.current = micGainNode;

          // 6. WebRTC Outbound Destination Stream (High-Fi Output)
          const destination = actx.createMediaStreamDestination();

          rawSource.connect(highpass);
          highpass.connect(warmthEQ);
          warmthEQ.connect(clarityEQ);
          clarityEQ.connect(compressor);
          compressor.connect(micGainNode);
          micGainNode.connect(destination);

          // 7. Mic Monitoring Loopback (Hear Myself in real-time)
          const monitorGain = actx.createGain();
          monitorGain.gain.value = micMonitoringRef.current ? 0.85 : 0;
          micMonitorGainRef.current = monitorGain;
          micGainNode.connect(monitorGain);
          monitorGain.connect(actx.destination);

          processedStreamRef.current = destination.stream;

          // 8. Visual Audio Meter (Connected to post-compressor studio vocal signal)
          const analyser = actx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.25;
          compressor.connect(analyser);
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

            if (average > 8) {
              speakingHangover = 15;
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
      } catch (audioErr) {
        console.warn("Audio boost setup note:", audioErr);
        processedStreamRef.current = stream;
      }

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
          { merge: true },
        );
      });

      setCurrentVoiceChannelId(voiceChannelId);
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
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = nextMuted || isDeafened ? 0 : micGain;
    }
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

    if (speechRecognitionRef.current) {
      if (nextMuted) {
        try {
          speechRecognitionRef.current.abort();
        } catch {}
      } else {
        try {
          speechRecognitionRef.current.start();
        } catch {}
      }
    }
  };

  const toggleDeafen = () => {
    const nextDeaf = !isDeafened;
    setIsDeafened(nextDeaf);
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = isMuted || nextDeaf ? 0 : micGain;
    }
    if (rawStreamRef.current) {
      rawStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !isMuted && !nextDeaf));
    }
    if (processedStreamRef.current) {
      processedStreamRef.current
        .getAudioTracks()
        .forEach((t) => (t.enabled = !isMuted && !nextDeaf));
    }
    Object.values(remoteGainNodesRef.current).forEach((gNode) => {
      gNode.gain.value = nextDeaf ? 0 : outputGain;
    });
    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.muted = nextDeaf;
    });
    if (currentUser) {
      updateDoc(doc(db, "users", currentUser.id), { isDeafened: nextDeaf }).catch(() => {});
    }

    if (speechRecognitionRef.current) {
      if (nextDeaf) {
        try {
          speechRecognitionRef.current.abort();
        } catch {}
      } else if (!isMuted) {
        try {
          speechRecognitionRef.current.start();
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
    isSuspended,
    suspensionTimeLeft,
    suspensionAction,
    micGain,
    setMicGain,
    outputGain,
    setOutputGain,
    micLevel,
    notificationPermission,
    requestNotificationPermission,
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
  };
}
