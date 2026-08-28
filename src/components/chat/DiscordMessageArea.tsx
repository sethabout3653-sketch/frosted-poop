import React, { useState, useRef, useEffect } from "react";
import {
  Hash,
  Volume2,
  Paperclip,
  Smile,
  Send,
  Users,
  Image as ImageIcon,
  X,
  Plus,
  Bell,
  BellRing,
  BellOff,
  Trash2,
  Download,
  Eye,
  ExternalLink,
} from "lucide-react";
import type { Channel, ChatMessage, User } from "@/types/chat";
import { notificationManager } from "../../lib/notifications";

interface Props {
  activeChannel: Channel | undefined;
  messages: ChatMessage[];
  currentUser: User | null;
  typingUsers: string[];
  onSendMessage: (content: string, attachmentUrl?: string, attachmentName?: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onClearAllMessages?: () => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  onToggleUserList: () => void;
  showUserList: boolean;
  notificationPermission?: NotificationPermission;
  onRequestNotificationPermission?: () => Promise<NotificationPermission>;
}

const EMOJIS = ["👍", "❤️", "🔥", "🚀", "🎉", "🎮", "😂", "😎"];

function renderMessageContentWithLinks(content: string, msgId: string) {
  const urlRegex =
    /((?:https?:\/\/|www\.)[^\s]+|\b[a-zA-Z0-9-]+\.(?:com|org|net|gov|edu|mil|co|io|me|us|info|biz|tv|cc|xyz|club|link|adult|sex|porn|pro|online|site|net)\b[^\s]*)/gi;
  const parts = content.split(urlRegex);
  if (parts.length <= 1) return content;

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      let href = part;
      if (!/^https?:\/\//i.test(part)) {
        href = "http://" + part;
      }
      return (
        <a
          key={`${msgId}-link-${i}`}
          id={`link-${msgId}-${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5865f2] hover:underline break-all font-medium inline-flex items-center gap-0.5"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function DiscordMessageArea({
  activeChannel,
  messages,
  currentUser,
  typingUsers,
  onSendMessage,
  onDeleteMessage,
  onClearAllMessages,
  onToggleReaction,
  onSendTyping,
  onToggleUserList,
  showUserList,
  notificationPermission,
  onRequestNotificationPermission,
}: Props) {
  const [inputText, setInputText] = useState("");
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageId or null for main input
  const [errorText, setErrorText] = useState<string | null>(null);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const downloadImage = async (url: string, filename?: string) => {
    const safeFilename = filename || `download-${Date.now()}.png`;
    try {
      if (url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = safeFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Fetch as blob for instant direct file download
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    } catch (err) {
      console.warn("Direct blob download fallback to link download:", err);
      const a = document.createElement("a");
      a.href = url;
      a.download = safeFilename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleNotificationClick = async () => {
    if (onRequestNotificationPermission) {
      const res = await onRequestNotificationPermission();
      if (res === "granted") {
        notificationManager.showNotification({
          title: "Frosted Chat Notifications Active",
          body: "You will now receive alerts for new messages even when outside the app!",
        });
        setNotifFeedback("Notifications enabled!");
        setTimeout(() => setNotifFeedback(null), 3000);
      } else if (res === "denied") {
        setNotifFeedback("Notifications blocked by browser. Please enable them in site settings.");
        setTimeout(() => setNotifFeedback(null), 5000);
      }
    } else {
      notificationManager.showNotification({
        title: "Frosted Chat Notification Test",
        body: "Real-time notifications and audio chimes are active!",
      });
      setNotifFeedback("Notification test sent!");
      setTimeout(() => setNotifFeedback(null), 3000);
    }
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onSendTyping(true);
    if (errorText) setErrorText(null);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputText.trim();
    if (!trimmedInput && !attachment) return;

    onSendMessage(trimmedInput, attachment?.url, attachment?.name);
    setInputText("");
    setAttachment(null);
    setErrorText(null);
    onSendTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  // Handle file attachment upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to base64 Data URL for real instant chat sharing
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const result = event.target.result as string;
        // If image file is larger than 750KB, scale down slightly to comfortably fit Firestore 1MB limits
        if (file.type.startsWith("image/") && file.size > 750 * 1024) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            let { width, height } = img;
            const maxDim = 1920;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL(
              file.type === "image/png" ? "image/png" : "image/jpeg",
              0.92,
            );
            setAttachment({
              url: optimized,
              name: file.name,
            });
          };
          img.src = result;
        } else {
          setAttachment({
            url: result,
            name: file.name,
          });
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-[#050505] text-neutral-200 font-sans overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-800 px-4 bg-[#0d0d0d] shadow-sm">
        <div className="flex items-center gap-2 truncate">
          {activeChannel?.type === "voice" ? (
            <Volume2 className="h-4 w-4 text-neutral-400" />
          ) : (
            <Hash className="h-4 w-4 text-neutral-400" />
          )}
          <span className="font-bold text-white text-sm">{activeChannel?.name}</span>
          {activeChannel?.topic && (
            <>
              <div className="h-4 w-[1px] bg-neutral-800" />
              <span className="text-xs text-neutral-400 truncate font-normal">
                {activeChannel.topic}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Button / Status */}
          {notificationPermission === "granted" ? (
            <button
              onClick={handleNotificationClick}
              title="Desktop notifications & chimes are active. Click to test!"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
            >
              <BellRing className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Notifications Active</span>
            </button>
          ) : (
            <button
              onClick={handleNotificationClick}
              title="Enable real desktop notifications for new messages"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 transition cursor-pointer animate-pulse"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Allow Notifications</span>
            </button>
          )}

          {notifFeedback && (
            <span className="text-[11px] text-neutral-300 hidden md:inline animate-fade-in">
              {notifFeedback}
            </span>
          )}

          {/* Clear All Messages Button */}
          {onClearAllMessages && (
            <button
              onClick={() => setShowConfirmClear(true)}
              title="Delete all current messages in chat"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Clear Chat</span>
            </button>
          )}

          <button
            onClick={onToggleUserList}
            title="Toggle Member List"
            className={`flex h-8 w-8 items-center justify-center rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer ${
              showUserList ? "text-white bg-neutral-800" : "text-neutral-400"
            }`}
          >
            <Users className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal to Clear All Messages */}
      {showConfirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => !isClearing && setShowConfirmClear(false)}
        >
          <div
            className="relative flex flex-col max-w-md w-full rounded-2xl bg-[#141414] border border-neutral-800 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white">Clear All Chat Messages</h3>
                <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
                  Are you sure you want to permanently delete all messages right now? This action
                  wipes the message history from both the screen and the server.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setShowConfirmClear(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={async () => {
                  setIsClearing(true);
                  if (onClearAllMessages) {
                    await onClearAllMessages();
                  }
                  setIsClearing(false);
                  setShowConfirmClear(false);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete All Messages RN</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Permission Banner if not enabled */}
      {notificationPermission === "default" && (
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#141414] border-b border-amber-500/20 text-xs">
          <div className="flex items-center gap-2 text-neutral-300">
            <Bell className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              Enable real desktop notifications to get alerted whenever someone messages, even when
              you're off the app!
            </span>
          </div>
          <button
            onClick={handleNotificationClick}
            className="px-3 py-1 bg-amber-500 text-black font-semibold rounded hover:bg-amber-400 transition shrink-0 cursor-pointer"
          >
            Enable Now
          </button>
        </div>
      )}

      {/* Message History Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome Channel Banner */}
        <div className="my-4 border-b border-neutral-800/80 pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#141414] border border-neutral-800 text-white mb-3 shadow-sm">
            <Hash className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Welcome to #{activeChannel?.name}!
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            This is the start of the #{activeChannel?.name} channel.
          </p>
        </div>

        {/* Message Items */}
        {messages.map((msg, index) => {
          const prevMsg = messages[index - 1];
          const isCompact =
            prevMsg && prevMsg.userId === msg.userId && msg.timestamp - prevMsg.timestamp < 300000;
          const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={msg.id}
              className={`group relative flex gap-3 px-3 py-1.5 rounded-xl transition-colors hover:bg-[#111111] ${
                isCompact ? "mt-0.5" : "mt-3"
              }`}
            >
              {/* Avatar */}
              {!isCompact ? (
                <div
                  style={{ backgroundColor: msg.avatarColor || "#ffffff" }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-white text-xs ring-1 ring-white/20 shadow-sm"
                >
                  {msg.username.substring(0, 1).toUpperCase()}
                </div>
              ) : (
                <div className="w-9 shrink-0 text-right text-[10px] text-neutral-500 opacity-0 group-hover:opacity-100 select-none">
                  {formattedTime}
                </div>
              )}

              {/* Body */}
              <div className="flex-1 min-w-0">
                {!isCompact && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-bold text-white text-xs select-none">{msg.username}</span>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      {formattedTime}
                    </span>
                  </div>
                )}

                {/* Content */}
                {msg.content && (
                  <p className="text-xs text-neutral-200 leading-relaxed break-words whitespace-pre-wrap">
                    {renderMessageContentWithLinks(msg.content, msg.id)}
                  </p>
                )}

                {/* Attachment Preview with Download & Fullscreen Preview */}
                {msg.attachmentUrl &&
                  (() => {
                    const isImage =
                      msg.attachmentUrl.startsWith("data:image") ||
                      Boolean(msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i));
                    const filename = msg.attachmentName || (isImage ? "image.png" : "attachment");

                    return (
                      <div
                        id={`attachment-${msg.id}`}
                        className="mt-2 max-w-md overflow-hidden rounded-xl border border-neutral-800 bg-[#121212] group/img shadow-md transition-all hover:border-neutral-700"
                      >
                        {isImage ? (
                          <div>
                            {/* Clickable Image Preview */}
                            <div
                              onClick={() =>
                                setSelectedImage({ url: msg.attachmentUrl!, name: filename })
                              }
                              className="relative cursor-zoom-in overflow-hidden bg-black/50 flex items-center justify-center min-h-[140px] max-h-80"
                              title="Click to view full image"
                            >
                              <img
                                src={msg.attachmentUrl}
                                alt={filename}
                                className="max-h-80 w-full object-contain transition-transform duration-200 group-hover/img:scale-[1.01]"
                                loading="lazy"
                              />

                              {/* Hover Quick Download Badge */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity duration-150">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadImage(msg.attachmentUrl!, filename);
                                  }}
                                  className="flex items-center gap-1.5 rounded-lg bg-black/85 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md hover:bg-black hover:scale-105 border border-white/20 transition-all cursor-pointer"
                                  title="Download Image"
                                >
                                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>

                            {/* Bottom Info & Download Bar */}
                            <div className="flex items-center justify-between gap-3 border-t border-neutral-800/80 bg-[#161616] px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <ImageIcon className="h-4 w-4 text-neutral-400 shrink-0" />
                                <span
                                  className="truncate text-xs font-mono text-neutral-300"
                                  title={filename}
                                >
                                  {filename}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedImage({ url: msg.attachmentUrl!, name: filename })
                                  }
                                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>View</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => downloadImage(msg.attachmentUrl!, filename)}
                                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer"
                                  title="Download image to your device"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                              <Paperclip className="h-4 w-4 text-neutral-400 shrink-0" />
                              <span
                                className="truncate text-xs font-mono text-neutral-200"
                                title={filename}
                              >
                                {filename}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadImage(msg.attachmentUrl!, filename)}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-all cursor-pointer shrink-0"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                {/* Inline Image Link Preview if image URL posted in text without attachment */}
                {!msg.attachmentUrl &&
                  (() => {
                    const imgUrlMatch = msg.content?.match(
                      /https?:\/\/[^\s]+\.(?:jpeg|jpg|gif|png|webp|svg)(?:\?[^\s]*)?/i,
                    );
                    if (!imgUrlMatch) return null;
                    const imgUrl = imgUrlMatch[0];
                    const urlFilename = imgUrl.split("/").pop()?.split("?")[0] || "image.png";

                    return (
                      <div className="mt-2 max-w-md overflow-hidden rounded-xl border border-neutral-800 bg-[#121212] group/img shadow-md">
                        <div
                          onClick={() => setSelectedImage({ url: imgUrl, name: urlFilename })}
                          className="relative cursor-zoom-in overflow-hidden bg-black/50 flex items-center justify-center max-h-72"
                          title="Click to view full image"
                        >
                          <img
                            src={imgUrl}
                            alt={urlFilename}
                            className="max-h-72 w-full object-contain hover:scale-[1.01] transition-transform duration-200"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-neutral-800/80 bg-[#161616] px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <ImageIcon className="h-4 w-4 text-neutral-400 shrink-0" />
                            <span className="truncate text-xs font-mono text-neutral-300">
                              {urlFilename}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadImage(imgUrl, urlFilename)}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer shrink-0"
                            title="Download image"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                {/* Reactions */}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {Object.entries(msg.reactions || {}).map(([emoji, userList]) => {
                    const hasReacted = currentUser && userList.includes(currentUser.username);
                    return (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(msg.id, emoji)}
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs border transition-colors cursor-pointer ${
                          hasReacted
                            ? "bg-white/10 border-white text-white font-bold"
                            : "bg-[#141414] border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="text-[10px]">{userList.length}</span>
                      </button>
                    );
                  })}

                  {/* Quick add reaction button */}
                  <button
                    onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                    className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-6 w-6 rounded-lg bg-[#141414] border border-neutral-800 text-neutral-400 hover:text-white transition-opacity cursor-pointer"
                    title="Add Reaction"
                  >
                    <Smile className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete message button */}
                  {onDeleteMessage &&
                    (currentUser?.id === msg.userId || currentUser?.username === msg.username) && (
                      <button
                        onClick={() => onDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 flex items-center justify-center h-6 w-6 rounded-lg bg-[#141414] border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:border-rose-500/30 transition-opacity cursor-pointer"
                        title="Delete Message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                </div>

                {/* Quick Emoji Picker Popover */}
                {showEmojiPicker === msg.id && (
                  <div className="absolute top-0 right-4 z-20 flex items-center gap-1 rounded-xl border border-neutral-800 bg-[#121212] p-1.5 shadow-2xl animate-in zoom-in-95">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onToggleReaction(msg.id, emoji);
                          setShowEmojiPicker(null);
                        }}
                        className="hover:scale-125 transition-transform p-1 text-base cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      <div className="px-4 py-1 h-5 text-[11px] text-neutral-500 font-medium italic">
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="animate-pulse font-semibold text-neutral-300">
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </span>
          </div>
        )}
      </div>

      {/* Input Box Area */}
      <div className="p-4 pt-0">
        {errorText && (
          <div className="mb-2 rounded-lg bg-red-950/80 border border-red-800 p-2.5 text-xs text-red-200 animate-bounce flex items-center justify-between shadow-md">
            <span className="font-semibold">{errorText}</span>
            <button
              type="button"
              onClick={() => setErrorText(null)}
              className="text-red-400 hover:text-white cursor-pointer ml-2"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <form
          onSubmit={handleSend}
          className="relative rounded-xl bg-[#0e0e0e] p-2.5 border border-neutral-800 focus-within:border-white focus-within:ring-1 focus-within:ring-white transition-all shadow-lg"
        >
          {/* Attachment Preview Box */}
          {attachment && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-[#181818] px-3 py-1.5 text-xs text-white border border-neutral-800">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon className="h-4 w-4 text-white" />
                <span className="truncate font-mono">{attachment.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload File or Image"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] border border-neutral-800 text-neutral-300 hover:bg-white hover:text-black transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.zip"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Main Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={`Message #${activeChannel?.name || "channel"}...`}
              className="flex-1 bg-transparent text-xs text-white placeholder-neutral-500 outline-none"
            />

            {/* Quick Emoji Buttons */}
            <div className="flex items-center gap-1 text-neutral-400">
              {EMOJIS.slice(0, 4).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setInputText((prev) => prev + emoji)}
                  className="hover:scale-110 transition-transform px-0.5 cursor-pointer text-sm"
                >
                  {emoji}
                </button>
              ))}

              <button
                type="submit"
                disabled={!inputText.trim() && !attachment}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors disabled:opacity-30 cursor-pointer ml-1"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {selectedImage && (
        <div
          id="image-lightbox-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative flex flex-col max-w-4xl w-full max-h-[92vh] rounded-2xl bg-[#121212] border border-neutral-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-[#161616]">
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-4">
                <ImageIcon className="h-4 w-4 text-neutral-400 shrink-0" />
                <span className="text-xs font-mono text-white truncate">{selectedImage.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadImage(selectedImage.url, selectedImage.name)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Image Stage */}
            <div className="flex flex-1 items-center justify-center overflow-auto p-4 bg-black/60 min-h-[300px]">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-lg select-none"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-4 py-2 text-[11px] text-neutral-400 border-t border-neutral-800 bg-[#161616]">
              <span>Click Download to save image directly to your device</span>
              <a
                href={selectedImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white underline inline-flex items-center gap-1"
              >
                <span>Open original in new tab</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
