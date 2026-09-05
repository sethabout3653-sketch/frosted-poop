import { Router } from "express";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
  updateDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { GoogleGenAI, Type } from "@google/genai";

export const chatRouter = Router();

// Load firebase-applet-config.json with safe embedded fallback for Vercel/serverless environments
const DEFAULT_FIREBASE_CONFIG = {
  projectId: "analog-cathode-kfs6l",
  appId: "1:630735569759:web:09b818a7611bf40c41acea",
  apiKey: "AIzaSyCkOwYbegyyClXTd2WTgv60sGPp8o6xj4E",
  authDomain: "analog-cathode-kfs6l.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-gamesyeahboyfros-051aea72-6504-4880-9fc5-c07824e713ac",
  storageBucket: "analog-cathode-kfs6l.firebasestorage.app",
  messagingSenderId: "630735569759",
  measurementId: "",
  oAuthClientId: "630735569759-c7i7hb84frr5ekvspk7qndpn1ldrupn6.apps.googleusercontent.com",
  recaptchaSiteKey: "",
};

let firebaseConfig: any = DEFAULT_FIREBASE_CONFIG;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } else if (process.env.FIREBASE_CONFIG) {
    firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  }
} catch (e) {
  console.warn("Using embedded default Firebase configuration:", e);
}

// Initialize Firebase App & Firestore Database safely for serverless environments
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  status: "online" | "idle" | "dnd" | "offline";
  currentVoiceChannelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  createdAt: number;
  lastSeen: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  content: string;
  attachmentUrl?: string;
  attachmentName?: string;
  timestamp: number;
  reactions: Record<string, string[]>; // emoji -> array of usernames
}

// Pre-seeded channels
export const CHANNELS = [
  { id: "general", name: "general", type: "text", topic: "General community chat and discussions" },
  { id: "general-voice", name: "General Voice", type: "voice", topic: "General Voice Chat Room" },
];

const AVATAR_COLORS = [
  "#5865f2", // Discord Blurple
  "#57f287", // Green
  "#fee75c", // Yellow
  "#eb459e", // Fuchsia
  "#ed4245", // Red
  "#9b59b6", // Purple
  "#1abc9c", // Teal
  "#e67e22", // Orange
];

// --- HTTP Auth Endpoints ---

// POST /api/chat/join
chatRouter.post("/join", async (req, res) => {
  try {
    const { username, avatarColor } = req.body || {};

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return res.status(400).json({ error: "Username must be between 3 and 20 characters" });
    }

    // Check if the user already exists in Firestore
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", cleanUsername));
    const querySnapshot = await getDocs(q);

    let finalUsername = cleanUsername;
    let displayName = String(username).trim();
    if (!querySnapshot.empty) {
      const randSuffix = Math.floor(Math.random() * 1000);
      finalUsername = cleanUsername + "-" + randSuffix;
      displayName = displayName + " " + randSuffix;
    }

    const userId = "usr-" + randomBytes(8).toString("hex");
    const token = "tok-" + randomBytes(16).toString("hex");

    const newUser: UserRecord = {
      id: userId,
      username: finalUsername,
      displayName: displayName,
      avatarColor: avatarColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      status: "online",
      currentVoiceChannelId: null,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      createdAt: Date.now(),
      lastSeen: Date.now(),
    };

    // Save user record and session mapping in centralized database
    await setDoc(doc(db, "users", userId), newUser);
    await setDoc(doc(db, "sessions", token), { userId, createdAt: Date.now() });

    return res.json({ token, user: newUser });
  } catch (err: any) {
    console.error("Join error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error during join" });
  }
});

// GET /api/chat/me
chatRouter.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionDoc = await getDoc(doc(db, "sessions", token));
    if (!sessionDoc.exists()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = sessionDoc.data().userId;
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userDoc.data() as UserRecord;
    user.lastSeen = Date.now();
    user.status = "online";

    await updateDoc(doc(db, "users", userId), {
      lastSeen: user.lastSeen,
      status: user.status,
    });

    return res.json({ token, user });
  } catch (err: any) {
    console.error("Me error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/chat/messages/:channelId
chatRouter.get("/messages/:channelId", async (req, res) => {
  try {
    const { channelId } = req.params;
    const msgsRef = collection(db, "messages");
    const snapshot = await getDocs(query(msgsRef, limit(300)));
    const msgs: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as ChatMessage;
      if (!channelId || data.channelId === channelId) {
        msgs.push(data);
      }
    });
    msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return res.json(msgs);
  } catch (err: any) {
    console.error("Get messages error:", err);
    return res.status(500).json([]);
  }
});

// In-memory fast session cache to avoid redundant database reads per poll
const sessionMemoryCache = new Map<string, { userId: string; cachedAt: number }>();
const userLastSeenWriteCache = new Map<string, number>();

async function resolveUserIdFromToken(token: string): Promise<string | null> {
  if (!token) return null;
  const cached = sessionMemoryCache.get(token);
  if (cached && Date.now() - cached.cachedAt < 60000) {
    return cached.userId;
  }
  try {
    const sessionDoc = await getDoc(doc(db, "sessions", token));
    if (sessionDoc.exists()) {
      const uid = sessionDoc.data().userId;
      sessionMemoryCache.set(token, { userId: uid, cachedAt: Date.now() });
      return uid;
    }
  } catch (e) {
    console.warn("Session lookup error:", e);
  }
  return null;
}

// GET /api/chat/state
chatRouter.get("/state", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    let currentUserId: string | null = null;
    if (token) {
      currentUserId = await resolveUserIdFromToken(token);
      if (currentUserId) {
        const lastWrite = userLastSeenWriteCache.get(currentUserId) || 0;
        const now = Date.now();
        // Debounce lastSeen write to at most once per 6 seconds to prevent Firestore saturation
        if (now - lastWrite > 6000) {
          userLastSeenWriteCache.set(currentUserId, now);
          updateDoc(doc(db, "users", currentUserId), {
            lastSeen: now,
            status: "online",
          }).catch((err) => console.warn("Background lastSeen update warning:", err));
        }
      }
    }

    const now = Date.now();

    // Fetch all collections in parallel
    const [usersSnapshot, msgsSnapshot, typingSnapshot, signalsSnapshot] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(100))),
      getDocs(collection(db, "typing")),
      currentUserId
        ? getDocs(query(collection(db, "signals"), where("targetUserId", "==", currentUserId)))
        : Promise.resolve({ docs: [], forEach: () => {} } as any),
    ]);

    const allUsers: UserRecord[] = [];
    usersSnapshot.forEach((d) => {
      const u = d.data() as UserRecord;
      // Mark as offline dynamically if lastSeen is older than 18 seconds
      const isOnline = now - (u.lastSeen || 0) <= 18000;
      if (!isOnline) {
        u.status = "offline";
        u.currentVoiceChannelId = null;
      }
      allUsers.push(u);
    });

    // Active online users
    const onlineUsers = allUsers
      .filter((u) => u.status === "online")
      .map(({ lastSeen, ...safe }) => safe);

    // Messages mapped by channel
    const allMessages: Record<string, ChatMessage[]> = {};
    msgsSnapshot.forEach((d) => {
      const m = d.data() as ChatMessage;
      if (!allMessages[m.channelId]) {
        allMessages[m.channelId] = [];
      }
      allMessages[m.channelId].push(m);
    });

    // Typing statuses
    const typing: Record<string, string[]> = {};
    typingSnapshot.forEach((d) => {
      const channelId = d.id;
      const data = d.data() || {};
      const usersMap = data.users || {};
      typing[channelId] = [];
      for (const [username, lastActive] of Object.entries(usersMap)) {
        if (now - (lastActive as number) < 5000) {
          typing[channelId].push(username);
        }
      }
    });

    // Voice channel occupants
    const voiceStates: Record<string, any[]> = {};
    for (const u of allUsers) {
      if (u.status === "online" && u.currentVoiceChannelId) {
        if (!voiceStates[u.currentVoiceChannelId]) {
          voiceStates[u.currentVoiceChannelId] = [];
        }
        voiceStates[u.currentVoiceChannelId].push({
          userId: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarColor: u.avatarColor,
          isMuted: u.isMuted,
          isDeafened: u.isDeafened,
          isSpeaking: u.isSpeaking,
        });
      }
    }

    // Signals for the requesting user
    const rtcSignals: Array<{ senderId: string; signalData: any }> = [];
    if (signalsSnapshot && signalsSnapshot.docs) {
      signalsSnapshot.docs.forEach((d: any) => {
        const s = d.data();
        rtcSignals.push({
          senderId: s.senderId,
          signalData: typeof s.signalData === "string" ? JSON.parse(s.signalData) : s.signalData,
        });
        deleteDoc(doc(db, "signals", d.id)).catch((e) => console.warn("Signal delete error:", e));
      });
    }

    return res.json({
      channels: CHANNELS,
      messages: allMessages,
      users: onlineUsers,
      typing,
      voiceStates,
      rtcSignals,
    });
  } catch (err: any) {
    console.error("State API error:", err);
    return res.status(500).json({
      channels: CHANNELS,
      messages: {},
      users: [],
      typing: {},
      voiceStates: {},
      rtcSignals: [],
    });
  }
});

// POST /api/chat/message
chatRouter.post("/message", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionDoc = await getDoc(doc(db, "sessions", token));
    if (!sessionDoc.exists()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = sessionDoc.data().userId;
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userDoc.data() as UserRecord;
    user.lastSeen = Date.now();
    await updateDoc(doc(db, "users", userId), { lastSeen: user.lastSeen });

    const { channelId, content, attachmentUrl, attachmentName } = req.body;
    if (!channelId || (!content && !attachmentUrl)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const msgId = "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const newMsg: ChatMessage = {
      id: msgId,
      channelId,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      content: content || "",
      timestamp: Date.now(),
      reactions: {},
    };

    if (attachmentUrl !== undefined) {
      newMsg.attachmentUrl = attachmentUrl;
    }
    if (attachmentName !== undefined) {
      newMsg.attachmentName = attachmentName;
    }

    // Store in centralized Firestore messages collection
    await setDoc(doc(db, "messages", msgId), newMsg);

    return res.json(newMsg);
  } catch (err: any) {
    console.error("Post message error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/chat/reaction
chatRouter.post("/reaction", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionDoc = await getDoc(doc(db, "sessions", token));
    if (!sessionDoc.exists()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = sessionDoc.data().userId;
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userDoc.data() as UserRecord;
    user.lastSeen = Date.now();
    await updateDoc(doc(db, "users", userId), { lastSeen: user.lastSeen });

    const { channelId, messageId, emoji } = req.body;
    const msgDocRef = doc(db, "messages", messageId);
    const msgDoc = await getDoc(msgDocRef);
    if (!msgDoc.exists()) {
      return res.status(404).json({ error: "Message not found" });
    }

    const msg = msgDoc.data() as ChatMessage;
    if (!msg.reactions) {
      msg.reactions = {};
    }
    if (!msg.reactions[emoji]) {
      msg.reactions[emoji] = [];
    }

    const usernameIndex = msg.reactions[emoji].indexOf(user.username);
    if (usernameIndex > -1) {
      msg.reactions[emoji].splice(usernameIndex, 1);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      msg.reactions[emoji].push(user.username);
    }

    await updateDoc(msgDocRef, { reactions: msg.reactions });

    return res.json({ success: true, reactions: msg.reactions });
  } catch (err: any) {
    console.error("Reaction error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/chat/typing
chatRouter.post("/typing", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionDoc = await getDoc(doc(db, "sessions", token));
    if (!sessionDoc.exists()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = sessionDoc.data().userId;
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userDoc.data() as UserRecord;

    const { channelId, isTyping } = req.body;
    if (!channelId) return res.status(400).json({ error: "Missing channelId" });

    const typingDocRef = doc(db, "typing", channelId);
    const typingDoc = await getDoc(typingDocRef);
    const usersMap = typingDoc.exists() ? typingDoc.data().users || {} : {};

    if (isTyping) {
      usersMap[user.username] = Date.now();
    } else {
      delete usersMap[user.username];
    }

    const now = Date.now();
    for (const [uname, time] of Object.entries(usersMap)) {
      if (now - (time as number) > 5000) {
        delete usersMap[uname];
      }
    }

    await setDoc(typingDocRef, { users: usersMap });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Typing API error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/chat/voice/state
chatRouter.post("/voice/state", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionDoc = await getDoc(doc(db, "sessions", token));
    if (!sessionDoc.exists()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = sessionDoc.data().userId;
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userDoc.data() as UserRecord;
    user.lastSeen = Date.now();

    const { currentVoiceChannelId, isMuted, isDeafened, isSpeaking } = req.body;

    user.currentVoiceChannelId =
      currentVoiceChannelId !== undefined ? currentVoiceChannelId : user.currentVoiceChannelId;
    user.isMuted = isMuted !== undefined ? !!isMuted : user.isMuted;
    user.isDeafened = isDeafened !== undefined ? !!isDeafened : user.isDeafened;
    user.isSpeaking = isSpeaking !== undefined ? !!isSpeaking : user.isSpeaking;

    await setDoc(userDocRef, user);

    return res.json({ success: true, user });
  } catch (err: any) {
    console.error("Voice state error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/chat/signal
chatRouter.post("/signal", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionDoc = await getDoc(doc(db, "sessions", token));
    if (!sessionDoc.exists()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = sessionDoc.data().userId;
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userDoc.data() as UserRecord;

    const { targetPeerId, signalData } = req.body;
    if (!targetPeerId || !signalData) {
      return res.status(400).json({ error: "Missing targetPeerId or signalData" });
    }

    const signalId = "sig-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    await setDoc(doc(db, "signals", signalId), {
      targetUserId: targetPeerId,
      senderId: user.id,
      signalData: typeof signalData === "object" ? JSON.stringify(signalData) : signalData,
      createdAt: Date.now(),
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Signal post error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// --- Link / Website Moderation Engine ---

let aiInstance: GoogleGenAI | null = null;
function getAi() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "dummy",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Link moderation disabled - all links allowed
chatRouter.post("/moderate-link", async (_req, res) => {
  return res.json({ allowed: true });
});
