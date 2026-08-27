import { Router } from "express";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
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
  limit
} from "firebase/firestore";

export const chatRouter = Router();

// Load firebase-applet-config.json
let firebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  console.error("Failed to load firebase-applet-config.json", e);
}

if (!firebaseConfig) {
  throw new Error("firebase-applet-config.json is missing or corrupt!");
}

// Initialize Firebase App & Firestore Database
const app = initializeApp(firebaseConfig);
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

// Initialize default channels with welcome messages if collection is empty
const seedWelcomeMessages = async () => {
  try {
    const msgsRef = collection(db, "messages");
    const q = query(msgsRef, limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      const systemId = "system-bot";
      const now = Date.now();
      const msgId = "msg-welcome-1";
      
      const welcomeMsg: ChatMessage = {
        id: msgId,
        channelId: "general",
        userId: systemId,
        username: "FrostedBot",
        displayName: "Frosted Bot",
        avatarColor: "#ffffff",
        content: "Welcome to Frosted Chat! 🎉 Enter a username to chat with everyone.",
        timestamp: now - 3600000,
        reactions: { "👋": ["FrostedBot"] },
      };
      
      await setDoc(doc(db, "messages", msgId), welcomeMsg);
    }
  } catch (err) {
    console.error("Failed to seed welcome message:", err);
  }
};

seedWelcomeMessages();

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
      status: user.status
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
    const q = query(msgsRef, where("channelId", "==", channelId), orderBy("timestamp", "asc"), limit(100));
    const snapshot = await getDocs(q);
    const msgs: ChatMessage[] = [];
    snapshot.forEach(doc => {
      msgs.push(doc.data() as ChatMessage);
    });
    return res.json(msgs);
  } catch (err: any) {
    console.error("Get messages error:", err);
    return res.status(500).json([]);
  }
});

// GET /api/chat/state
chatRouter.get("/state", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");
    
    let currentUserId: string | null = null;
    if (token) {
      const sessionDoc = await getDoc(doc(db, "sessions", token));
      if (sessionDoc.exists()) {
        currentUserId = sessionDoc.data().userId;
        await updateDoc(doc(db, "users", currentUserId), {
          lastSeen: Date.now(),
          status: "online"
        });
      }
    }

    const now = Date.now();

    // Retrieve all users from Firestore
    const usersSnapshot = await getDocs(collection(db, "users"));
    const allUsers: UserRecord[] = [];
    
    // Cleanup offline/timed out users (timeout threshold: 12 seconds for serverless tolerance)
    for (const d of usersSnapshot.docs) {
      const u = d.data() as UserRecord;
      if (now - u.lastSeen > 12000) {
        if (u.status !== "offline" || u.currentVoiceChannelId !== null) {
          u.status = "offline";
          u.currentVoiceChannelId = null;
          await updateDoc(doc(db, "users", u.id), {
            status: "offline",
            currentVoiceChannelId: null
          });
        }
      }
      allUsers.push(u);
    }

    // Get active online users
    const onlineUsers = allUsers
      .filter(u => u.status === "online")
      .map(({ lastSeen, ...safe }) => safe);

    // Retrieve latest messages
    const msgsSnapshot = await getDocs(
      query(collection(db, "messages"), orderBy("timestamp", "asc"), limit(100))
    );
    const allMessages: Record<string, ChatMessage[]> = {};
    msgsSnapshot.forEach(d => {
      const m = d.data() as ChatMessage;
      if (!allMessages[m.channelId]) {
        allMessages[m.channelId] = [];
      }
      allMessages[m.channelId].push(m);
    });

    // Retrieve typing statuses
    const typingSnapshot = await getDocs(collection(db, "typing"));
    const typing: Record<string, string[]> = {};
    typingSnapshot.forEach(d => {
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

    // Compile voice channel states
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

    // Retrieve signals queued for this client
    let rtcSignals: Array<{ senderId: string; signalData: any }> = [];
    if (currentUserId) {
      const signalsQuery = query(collection(db, "signals"), where("targetUserId", "==", currentUserId));
      const signalsSnapshot = await getDocs(signalsQuery);
      
      signalsSnapshot.forEach(d => {
        const s = d.data();
        rtcSignals.push({
          senderId: s.senderId,
          signalData: typeof s.signalData === "string" ? JSON.parse(s.signalData) : s.signalData,
        });
        // Consume signals on retrieval
        deleteDoc(doc(db, "signals", d.id)).catch(e => console.error("Signal consumption delete error:", e));
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
    let usersMap = typingDoc.exists() ? typingDoc.data().users || {} : {};

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
    
    user.currentVoiceChannelId = currentVoiceChannelId !== undefined ? currentVoiceChannelId : user.currentVoiceChannelId;
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
      createdAt: Date.now()
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Signal post error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Minimal stub for server.ts backwards-compatibility
export function setupChatWebSocket() {}
