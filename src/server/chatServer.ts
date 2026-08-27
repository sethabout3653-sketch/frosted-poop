import { Router } from "express";
import { randomBytes } from "crypto";

export const chatRouter = Router();

// In-Memory Database for Users and Messages
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

const users = new Map<string, UserRecord>(); // userId -> UserRecord
const usernameToUser = new Map<string, UserRecord>(); // username -> UserRecord
const sessions = new Map<string, string>(); // token -> userId

// Pre-seeded channels
export const CHANNELS = [
  { id: "general", name: "general", type: "text", topic: "General community chat and discussions" },
  { id: "general-voice", name: "General Voice", type: "voice", topic: "General Voice Chat Room" },
];

const messages = new Map<string, ChatMessage[]>(); // channelId -> array of ChatMessage

// Real-Time Polling structures
const typingStates = new Map<string, Map<string, number>>(); // channelId -> Map<username, lastSeenTyping>
const signalQueue = new Map<string, Array<{ senderId: string; signalData: any }>>(); // targetUserId -> Array of signals

// Initialize default channels with welcome messages
const seedWelcomeMessages = () => {
  const systemId = "system-bot";
  const now = Date.now();

  messages.set("general", [
    {
      id: "msg-welcome-1",
      channelId: "general",
      userId: systemId,
      username: "FrostedBot",
      displayName: "Frosted Bot",
      avatarColor: "#ffffff",
      content: "Welcome to Frosted Chat! 🎉 Enter a username to chat with everyone.",
      timestamp: now - 3600000,
      reactions: { "👋": ["FrostedBot"] },
    },
  ]);
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
chatRouter.post("/join", (req, res) => {
  try {
    const { username, avatarColor } = req.body || {};

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      return res.status(400).json({ error: "Username must be between 3 and 20 characters" });
    }

    // Since this is a guest join, if username exists, we can just log them back in or append a number
    let finalUsername = cleanUsername;
    let displayName = String(username).trim();
    if (usernameToUser.has(cleanUsername)) {
      finalUsername = cleanUsername + "-" + Math.floor(Math.random() * 1000);
      displayName = displayName + " " + Math.floor(Math.random() * 1000);
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

    users.set(userId, newUser);
    usernameToUser.set(finalUsername, newUser);
    sessions.set(token, userId);

    return res.json({ token, user: newUser });
  } catch (err: any) {
    console.error("Join error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error during join" });
  }
});

// GET /api/chat/me
chatRouter.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = sessions.get(token)!;
  const user = users.get(userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  user.lastSeen = Date.now();
  user.status = "online";
  return res.json({ token, user });
});

// GET /api/chat/messages/:channelId
chatRouter.get("/messages/:channelId", (req, res) => {
  const { channelId } = req.params;
  const channelMsgs = messages.get(channelId) || [];
  return res.json(channelMsgs);
});

// GET /api/chat/state
chatRouter.get("/state", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");
  
  let currentUserId: string | null = null;
  if (token && sessions.has(token)) {
    currentUserId = sessions.get(token)!;
    const user = users.get(currentUserId);
    if (user) {
      user.lastSeen = Date.now();
      user.status = "online";
    }
  }

  // Cleanup offline/timed out users (timeout threshold: 6 seconds for high responsiveness)
  const now = Date.now();
  for (const [id, user] of users.entries()) {
    if (now - user.lastSeen > 6000) {
      user.status = "offline";
      user.currentVoiceChannelId = null; // automatically boot from voice rooms if disconnected
    }
  }

  // Prepare messages map
  const allMessages: Record<string, ChatMessage[]> = {};
  for (const [channelId, msgs] of messages.entries()) {
    allMessages[channelId] = msgs;
  }

  // Get active online users
  const onlineUsers = Array.from(users.values())
    .filter(u => u.status === "online")
    .map(({ lastSeen, ...safe }) => safe);

  // Compile typing statuses
  const typing: Record<string, string[]> = {};
  for (const [channelId, userMap] of typingStates.entries()) {
    typing[channelId] = [];
    for (const [username, lastActive] of userMap.entries()) {
      if (now - lastActive < 4000) {
        typing[channelId].push(username);
      }
    }
  }

  // Compile voice channel states
  const voiceStates: Record<string, any[]> = {};
  for (const u of users.values()) {
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

  // Fetch signals queued for this client
  let rtcSignals: Array<{ senderId: string; signalData: any }> = [];
  if (currentUserId) {
    rtcSignals = signalQueue.get(currentUserId) || [];
    signalQueue.delete(currentUserId); // Consume signals on retrieval
  }

  return res.json({
    channels: CHANNELS,
    messages: allMessages,
    users: onlineUsers,
    typing,
    voiceStates,
    rtcSignals,
  });
});

// POST /api/chat/message
chatRouter.post("/message", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = sessions.get(token)!;
  const user = users.get(userId);
  if (!user) return res.status(401).json({ error: "User not found" });

  user.lastSeen = Date.now();

  const { channelId, content, attachmentUrl, attachmentName } = req.body;
  if (!channelId || (!content && !attachmentUrl)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newMsg: ChatMessage = {
    id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    channelId,
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    content: content || "",
    attachmentUrl,
    attachmentName,
    timestamp: Date.now(),
    reactions: {},
  };

  let channelList = messages.get(channelId);
  if (!channelList) {
    channelList = [];
    messages.set(channelId, channelList);
  }
  channelList.push(newMsg);

  if (channelList.length > 200) {
    channelList.shift();
  }

  return res.json(newMsg);
});

// POST /api/chat/reaction
chatRouter.post("/reaction", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = sessions.get(token)!;
  const user = users.get(userId);
  if (!user) return res.status(401).json({ error: "User not found" });

  user.lastSeen = Date.now();

  const { channelId, messageId, emoji } = req.body;
  const channelList = messages.get(channelId);
  if (!channelList) return res.status(404).json({ error: "Channel not found" });

  const msg = channelList.find((m) => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "Message not found" });

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

  return res.json({ success: true, reactions: msg.reactions });
});

// POST /api/chat/typing
chatRouter.post("/typing", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = sessions.get(token)!;
  const user = users.get(userId);
  if (!user) return res.status(401).json({ error: "User not found" });

  const { channelId, isTyping } = req.body;
  if (!channelId) return res.status(400).json({ error: "Missing channelId" });

  if (!typingStates.has(channelId)) {
    typingStates.set(channelId, new Map());
  }

  if (isTyping) {
    typingStates.get(channelId)!.set(user.username, Date.now());
  } else {
    typingStates.get(channelId)!.delete(user.username);
  }

  return res.json({ success: true });
});

// POST /api/chat/voice/state
chatRouter.post("/voice/state", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = sessions.get(token)!;
  const user = users.get(userId);
  if (!user) return res.status(401).json({ error: "User not found" });

  user.lastSeen = Date.now();

  const { currentVoiceChannelId, isMuted, isDeafened, isSpeaking } = req.body;
  
  user.currentVoiceChannelId = currentVoiceChannelId !== undefined ? currentVoiceChannelId : user.currentVoiceChannelId;
  user.isMuted = isMuted !== undefined ? !!isMuted : user.isMuted;
  user.isDeafened = isDeafened !== undefined ? !!isDeafened : user.isDeafened;
  user.isSpeaking = isSpeaking !== undefined ? !!isSpeaking : user.isSpeaking;

  return res.json({ success: true, user });
});

// POST /api/chat/signal
chatRouter.post("/signal", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = sessions.get(token)!;
  const user = users.get(userId);
  if (!user) return res.status(401).json({ error: "User not found" });

  const { targetPeerId, signalData } = req.body;
  if (!targetPeerId || !signalData) {
    return res.status(400).json({ error: "Missing targetPeerId or signalData" });
  }

  if (!signalQueue.has(targetPeerId)) {
    signalQueue.set(targetPeerId, []);
  }

  signalQueue.get(targetPeerId)!.push({
    senderId: user.id,
    signalData,
  });

  return res.json({ success: true });
});

// Minimal stub for server.ts backwards-compatibility
export function setupChatWebSocket() {}
