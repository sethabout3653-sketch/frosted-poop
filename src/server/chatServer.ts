import { Router } from "express";
import { WebSocketServer, WebSocket } from "ws";
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
];

const messages = new Map<string, ChatMessage[]>(); // channelId -> array of ChatMessage

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
  // Update last seen for requesting user
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");
  if (token && sessions.has(token)) {
    const userId = sessions.get(token)!;
    const user = users.get(userId);
    if (user) {
      user.lastSeen = Date.now();
      user.status = "online";
    }
  }

  // Cleanup offline users
  const now = Date.now();
  for (const [id, user] of users.entries()) {
    if (now - user.lastSeen > 30000) {
      user.status = "offline";
    }
  }

  const allMessages: Record<string, ChatMessage[]> = {};
  for (const [channelId, msgs] of messages.entries()) {
    allMessages[channelId] = msgs;
  }

  const onlineUsers = Array.from(users.values())
    .filter(u => u.status === "online")
    .map(({ lastSeen, ...safe }) => safe);

  return res.json({
    channels: CHANNELS,
    messages: allMessages,
    users: onlineUsers,
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

  // Broadcast to WS clients if available
  try {
    broadcastAll({
      type: "new_message",
      payload: newMsg,
    });
  } catch (e) {}

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

  try {
    broadcastAll({
      type: "reaction_updated",
      payload: { channelId, messageId, reactions: msg.reactions },
    });
  } catch (e) {}

  return res.json({ success: true, reactions: msg.reactions });
});

// --- WebSocket Server Logic ---

export interface ClientConnection {
  ws: WebSocket;
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  voiceChannelId: string | null;
}

const activeSockets = new Map<WebSocket, ClientConnection>();

export function setupChatWebSocket(wss: WebSocketServer) {
  wss.on("connection", (ws, req) => {
    let clientInfo: ClientConnection | null = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, payload } = message;

        // 1. Authenticate socket connection
        if (type === "auth") {
          const { token } = payload;
          const userId = sessions.get(token);

          if (!userId || !users.has(userId)) {
            ws.send(JSON.stringify({ type: "error", payload: "Authentication failed" }));
            return;
          }

          const user = users.get(userId)!;
          user.status = "online";

          clientInfo = {
            ws,
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarColor: user.avatarColor,
            voiceChannelId: null,
          };

          activeSockets.set(ws, clientInfo);

          const allMessages: Record<string, ChatMessage[]> = {};
          for (const [channelId, msgs] of messages.entries()) {
            allMessages[channelId] = msgs;
          }

          const onlineUsers = Array.from(users.values())
            .filter(u => u.status === "online")
            .map(({ lastSeen, ...safe }) => safe);

          // Confirm auth success to client
          ws.send(
            JSON.stringify({
              type: "auth_success",
              payload: {
                user: {
                  id: user.id,
                  username: user.username,
                  displayName: user.displayName,
                  avatarColor: user.avatarColor,
                },
                channels: CHANNELS,
                messages: allMessages,
                usersList: onlineUsers,
              },
            })
          );

          // Broadcast user online status update to everyone
          broadcastAll({
            type: "user_status_change",
            payload: { userId: user.id, status: "online", username: user.username, displayName: user.displayName, avatarColor: user.avatarColor },
          });

          return;
        }

        // Require authentication for all subsequent events
        if (!clientInfo) {
          ws.send(JSON.stringify({ type: "error", payload: "Unauthenticated socket" }));
          return;
        }

        // 2. Text Message Sending
        if (type === "send_message") {
          const { channelId, content, attachmentUrl, attachmentName } = payload;

          if (!channelId || (!content && !attachmentUrl)) return;

          const newMsg: ChatMessage = {
            id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
            channelId,
            userId: clientInfo.userId,
            username: clientInfo.username,
            displayName: clientInfo.displayName,
            avatarColor: clientInfo.avatarColor,
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

          // Keep channel history capped at 200 messages
          if (channelList.length > 200) {
            channelList.shift();
          }

          // Broadcast new message to all clients
          broadcastAll({
            type: "new_message",
            payload: newMsg,
          });
        }

        // 3. Message Reaction
        if (type === "toggle_reaction") {
          const { channelId, messageId, emoji } = payload;
          const channelList = messages.get(channelId);
          if (channelList) {
            const msg = channelList.find((m) => m.id === messageId);
            if (msg) {
              if (!msg.reactions[emoji]) {
                msg.reactions[emoji] = [];
              }

              const usernameIndex = msg.reactions[emoji].indexOf(clientInfo.username);
              if (usernameIndex > -1) {
                msg.reactions[emoji].splice(usernameIndex, 1);
                if (msg.reactions[emoji].length === 0) {
                  delete msg.reactions[emoji];
                }
              } else {
                msg.reactions[emoji].push(clientInfo.username);
              }

              broadcastAll({
                type: "reaction_updated",
                payload: { channelId, messageId, reactions: msg.reactions },
              });
            }
          }
        }

        // 4. Typing Indicator
        if (type === "typing") {
          const { channelId, isTyping } = payload;
          broadcastExcept(ws, {
            type: "user_typing",
            payload: {
              channelId,
              userId: clientInfo.userId,
              username: clientInfo.username,
              displayName: clientInfo.displayName,
              isTyping,
            },
          });
        }
      } catch (err) {
        console.error("WS Message Error:", err);
      }
    });

    ws.on("close", () => {
      if (clientInfo) {
        const user = users.get(clientInfo.userId);
        if (user) {
          user.status = "offline";
        }

        activeSockets.delete(ws);

        broadcastAll({
          type: "user_status_change",
          payload: { userId: clientInfo.userId, status: "offline" },
        });
      }
    });
  });
}

// Helpers

function broadcastAll(messageObj: any) {
  const json = JSON.stringify(messageObj);
  for (const client of activeSockets.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(json);
    }
  }
}

function broadcastExcept(excludeWs: WebSocket, messageObj: any) {
  const json = JSON.stringify(messageObj);
  for (const [ws, client] of activeSockets.entries()) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  }
}
