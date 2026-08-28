export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  status: "online" | "idle" | "dnd" | "offline";
  currentVoiceChannelId?: string | null;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  isSuspended?: boolean;
  voiceSuspendedUntil?: number | null;
  suspensionWord?: string | null;
  suspensionAction?: string | null;
}

export interface Channel {
  id: string;
  name: string;
  type: "text" | "voice";
  topic?: string;
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

export interface VoiceUser {
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
}
