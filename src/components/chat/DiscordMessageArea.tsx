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
} from "lucide-react";
import type { Channel, ChatMessage, User } from "@/types/chat";
import { isInappropriateContent } from "../../lib/moderation";

interface Props {
  activeChannel: Channel | undefined;
  messages: ChatMessage[];
  currentUser: User | null;
  typingUsers: string[];
  onSendMessage: (content: string, attachmentUrl?: string, attachmentName?: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  onToggleUserList: () => void;
  showUserList: boolean;
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
  onToggleReaction,
  onSendTyping,
  onToggleUserList,
  showUserList,
}: Props) {
  const [inputText, setInputText] = useState("");
  const [attachment, setAttachment] = useState<{ url: string; name: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // messageId or null for main input
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<any>(null);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCheckingLinks) return;
    const trimmedInput = inputText.trim();
    if (!trimmedInput && !attachment) return;

    if (isInappropriateContent(trimmedInput)) {
      setErrorText("detected inappropriate content try sending something else");
      return;
    }

    // Extract links
    const urlRegex =
      /((?:https?:\/\/|www\.)[^\s]+|\b[a-zA-Z0-9-]+\.(?:com|org|net|gov|edu|mil|co|io|me|us|info|biz|tv|cc|xyz|club|link|adult|sex|porn|pro|online|site|net)\b[^\s]*)/gi;
    const urls = trimmedInput.match(urlRegex) || [];

    if (urls.length > 0) {
      setIsCheckingLinks(true);
      setErrorText(null);
      try {
        for (const url of urls) {
          const checkRes = await fetch("/api/chat/moderate-link", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("discord_chat_token") || ""}`,
            },
            body: JSON.stringify({ url }),
          });

          if (checkRes.ok) {
            const data = await checkRes.json();
            if (data.allowed === false) {
              setErrorText("detected inappropriate content try sending something else");
              setIsCheckingLinks(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Link verification failed:", err);
      } finally {
        setIsCheckingLinks(false);
      }
    }

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
        setAttachment({
          url: event.target.result as string,
          name: file.name,
        });
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

                {/* Attachment Preview */}
                {msg.attachmentUrl && (
                  <div className="mt-2 max-w-sm overflow-hidden rounded-xl border border-neutral-800 bg-[#121212] p-1.5">
                    {msg.attachmentUrl.startsWith("data:image") ||
                    msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                      <img
                        src={msg.attachmentUrl}
                        alt={msg.attachmentName || "Attachment"}
                        className="max-h-60 w-full object-cover rounded-lg"
                      />
                    ) : (
                      <a
                        href={msg.attachmentUrl}
                        download={msg.attachmentName || "download"}
                        className="flex items-center gap-2 p-2 text-xs text-white hover:underline font-mono"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span>{msg.attachmentName || "Download Attachment"}</span>
                      </a>
                    )}
                  </div>
                )}

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
                  >
                    <Smile className="h-3.5 w-3.5" />
                  </button>
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
              disabled={isCheckingLinks}
              placeholder={
                isCheckingLinks
                  ? "Verifying link safety..."
                  : `Message #${activeChannel?.name || "channel"}...`
              }
              className="flex-1 bg-transparent text-xs text-white placeholder-neutral-500 outline-none disabled:opacity-50"
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
                disabled={(!inputText.trim() && !attachment) || isCheckingLinks}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors disabled:opacity-30 cursor-pointer ml-1"
              >
                {isCheckingLinks ? (
                  <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
