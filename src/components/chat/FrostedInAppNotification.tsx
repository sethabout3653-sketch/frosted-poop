import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, ArrowUpRight, Hash } from "lucide-react";
import { notificationManager, type InAppNotificationData } from "@/lib/notifications";

interface Props {
  onOpenChat: (channelId?: string) => void;
}

export function FrostedInAppNotification({ onOpenChat }: Props) {
  const [notifications, setNotifications] = useState<InAppNotificationData[]>([]);

  useEffect(() => {
    // 1. Subscribe to NotificationManager's in-app stream
    const unsubscribe = notificationManager.subscribeInApp((data) => {
      setNotifications((prev) => {
        // Keep at most 3 active toasts at a time
        const next = [data, ...prev.filter((n) => n.id !== data.id)].slice(0, 3);
        return next;
      });
    });

    // 2. Also listen for custom DOM event as an additional safety bus
    const handleCustomEvent = (e: Event) => {
      const customEvt = e as CustomEvent<InAppNotificationData>;
      if (customEvt.detail) {
        const data = customEvt.detail;
        setNotifications((prev) => {
          const next = [data, ...prev.filter((n) => n.id !== data.id)].slice(0, 3);
          return next;
        });
      }
    };

    window.addEventListener("frosted-in-app-notification", handleCustomEvent);

    return () => {
      unsubscribe();
      window.removeEventListener("frosted-in-app-notification", handleCustomEvent);
    };
  }, []);

  const dismissNotification = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleToastClick = useCallback(
    (notif: InAppNotificationData) => {
      dismissNotification(notif.id);
      onOpenChat(notif.channelId || "general");
    },
    [dismissNotification, onOpenChat],
  );

  return (
    <div
      id="frosted-in-app-notifications-container"
      className="fixed top-4 right-4 z-[999999] flex flex-col gap-2.5 max-w-[360px] w-[calc(100vw-2rem)] pointer-events-none"
    >
      <AnimatePresence>
        {notifications.map((notif) => (
          <NotificationToastItem
            key={notif.id}
            notif={notif}
            onClick={() => handleToastClick(notif)}
            onDismiss={(e) => dismissNotification(notif.id, e)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  notif: InAppNotificationData;
  onClick: () => void;
  onDismiss: (e?: React.MouseEvent) => void;
}

function NotificationToastItem({ notif, onClick, onDismiss }: ToastItemProps) {
  useEffect(() => {
    // Auto dismiss toast after 5.5 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 5500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const initialLetter = (notif.senderName || "U").charAt(0).toUpperCase();

  return (
    <motion.div
      id={`in-app-toast-${notif.id}`}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onClick={onClick}
      className="pointer-events-auto group relative cursor-pointer overflow-hidden rounded-xl border border-neutral-700/80 bg-[#121215]/95 p-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-all duration-200 hover:border-neutral-500 hover:bg-[#18181d] hover:shadow-[0_16px_44px_rgba(0,0,0,0.95)]"
    >
      {/* Top Accent Line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${notif.avatarColor || "#5865f2"}, transparent 80%)`,
        }}
      />

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md select-none"
          style={{ backgroundColor: notif.avatarColor || "#5865f2" }}
        >
          {initialLetter}
          <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#121215] text-[#5865f2]">
            <MessageSquare className="h-2.5 w-2.5 fill-current" />
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate text-xs font-bold text-white group-hover:text-white">
                {notif.senderName}
              </span>
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-semibold text-neutral-400 bg-neutral-800/80">
                <Hash className="h-2.5 w-2.5 text-neutral-400" />
                {notif.channelName}
              </span>
            </div>

            <button
              id={`dismiss-toast-${notif.id}`}
              onClick={onDismiss}
              aria-label="Close notification"
              className="rounded p-1 text-neutral-400 opacity-60 hover:bg-neutral-800 hover:opacity-100 hover:text-white transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Message preview text */}
          <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed break-words font-normal">
            {notif.content || "Sent an attachment"}
          </p>

          {/* Action hint */}
          <div className="mt-2 flex items-center justify-between pt-1 border-t border-neutral-800/60 text-[11px]">
            <span className="text-neutral-400 font-medium">Click to reply</span>
            <span className="flex items-center gap-0.5 font-semibold text-[#7289da] group-hover:text-white transition-colors">
              Open Chat <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
