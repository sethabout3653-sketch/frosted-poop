// Notification and Web Audio Sound Engine for Frosted Chat

export interface InAppNotificationData {
  id: string;
  senderName: string;
  channelName: string;
  channelId?: string;
  content: string;
  avatarColor?: string;
  timestamp: number;
}

type InAppListener = (data: InAppNotificationData) => void;

class NotificationManager {
  private audioCtx: AudioContext | null = null;
  private originalTitle: string = document.title || "Frosted Games & Chat";
  private unreadCount: number = 0;
  private titleInterval: number | null = null;
  private soundEnabled: boolean = true;
  private notificationsEnabled: boolean = true;
  private inAppListeners: Set<InAppListener> = new Set();

  constructor() {
    // Keep track of user settings from localStorage
    try {
      this.soundEnabled = localStorage.getItem("frosted_sound_enabled") !== "false";
      this.notificationsEnabled = localStorage.getItem("frosted_notifications_enabled") !== "false";
    } catch (e) {
      console.warn("Could not read notification preferences:", e);
      this.soundEnabled = true;
      this.notificationsEnabled = true;
    }

    // Reset unread title counter when user focuses or returns to window
    if (typeof window !== "undefined") {
      window.addEventListener("focus", () => {
        this.clearUnreadBadge();
      });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          this.clearUnreadBadge();
        }
      });
    }
  }

  public subscribeInApp(listener: InAppListener): () => void {
    this.inAppListeners.add(listener);
    return () => {
      this.inAppListeners.delete(listener);
    };
  }

  public notifyNewMessage(options: {
    senderName: string;
    channelName: string;
    channelId?: string;
    content: string;
    avatarColor?: string;
  }) {
    const notifData: InAppNotificationData = {
      id: `inapp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderName: options.senderName,
      channelName: options.channelName,
      channelId: options.channelId || "general",
      content: options.content,
      avatarColor: options.avatarColor || "#5865f2",
      timestamp: Date.now(),
    };

    // 1. Dispatch In-App Notification (Zero browser permission required)
    this.inAppListeners.forEach((listener) => {
      try {
        listener(notifData);
      } catch (err) {
        console.warn("In-app notification listener error:", err);
      }
    });

    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("frosted-in-app-notification", { detail: notifData }));
      } catch (e) {
        console.warn("In-app notification dispatch note:", e);
      }
    }

    // 2. Play audio notification chime
    this.playChime();

    // 3. Flash document tab title for users on other tabs or windows
    this.triggerTabFlash(options.senderName, options.content);

    // 4. If OS / desktop notifications are already granted, also deliver desktop notification
    if (
      this.notificationsEnabled &&
      this.isSupported() &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        const notif = new Notification(`${options.senderName} (#${options.channelName})`, {
          body: options.content.slice(0, 100),
          icon: "https://api.iconify.design/lucide:message-square.svg?color=%23ffffff",
          tag: "frosted-chat-msg",
          silent: true,
        });
        notif.onclick = () => {
          try {
            window.focus();
          } catch (e) {
            console.warn("Window focus note:", e);
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("frosted-open-chat", { detail: { channelId: options.channelId } }),
            );
          }
          notif.close();
        };
        setTimeout(() => notif.close(), 6000);
      } catch (e) {
        console.warn("Desktop notification display note:", e);
      }
    }
  }

  public isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return "denied";
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return "denied";
    try {
      // Warm up audio context on this user gesture
      this.initAudio();
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.warn("Notification request permission error:", err);
      return "denied";
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem("frosted_sound_enabled", String(enabled));
    } catch (e) {
      console.warn("Could not save sound preference:", e);
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setNotificationsEnabled(enabled: boolean) {
    this.notificationsEnabled = enabled;
    try {
      localStorage.setItem("frosted_notifications_enabled", String(enabled));
    } catch (e) {
      console.warn("Could not save notification preference:", e);
    }
  }

  public isNotificationsEnabled(): boolean {
    return this.notificationsEnabled;
  }

  private initAudio() {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {
        // audio resume error ignored
      });
    }
  }

  // Play a Discord-like 2-tone melodic notification chime
  public playChime() {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      // Master Gain for smooth volume
      const masterGain = this.audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.18, now);
      masterGain.connect(this.audioCtx.destination);

      // Tone 1: 587.33 Hz (D5) - soft bell
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: 880 Hz (A5) - chime resolution
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.4, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn("Audio chime play error:", e);
    }
  }

  public playSuspensionAlert() {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn("Suspension alert audio error:", e);
    }
  }

  public showNotification(options: {
    title: string;
    body: string;
    tag?: string;
    onClick?: () => void;
  }) {
    // 1. Always play the sound chime for new messages
    this.playChime();

    // 2. Update browser tab title if tab is inactive
    this.triggerTabFlash(options.title, options.body);

    // 3. Real OS / Desktop Notification
    if (!this.notificationsEnabled || !this.isSupported()) return;

    if (Notification.permission === "granted") {
      try {
        const notif = new Notification(options.title, {
          body: options.body,
          icon: "https://api.iconify.design/lucide:message-square.svg?color=%23ffffff",
          tag: options.tag || "frosted-chat",
          requireInteraction: false,
          silent: true, // We already play our high-fidelity chime
        });

        notif.onclick = () => {
          try {
            window.focus();
          } catch (e) {
            console.warn("Window focus error:", e);
          }
          if (options.onClick) {
            options.onClick();
          }
          notif.close();
        };

        // Auto close notification after 6 seconds
        setTimeout(() => {
          try {
            notif.close();
          } catch (e) {
            console.warn("Notification close error:", e);
          }
        }, 6000);
      } catch (err) {
        console.warn("Desktop notification display error:", err);
      }
    }
  }

  private triggerTabFlash(title: string, body: string) {
    if (typeof document === "undefined") return;
    this.unreadCount += 1;

    if (document.hidden || !document.hasFocus()) {
      if (this.titleInterval) {
        clearInterval(this.titleInterval);
      }

      let toggle = false;
      const countPrefix = `(${this.unreadCount}) 💬 `;
      this.titleInterval = window.setInterval(() => {
        if (toggle) {
          document.title = `${countPrefix}${title}: ${body.slice(0, 30)}`;
        } else {
          document.title = `${countPrefix}New Message - Frosted Chat`;
        }
        toggle = !toggle;
      }, 1200);
    }
  }

  public clearUnreadBadge() {
    this.unreadCount = 0;
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
    }
    if (typeof document !== "undefined") {
      document.title = this.originalTitle || "Frosted Games & Chat";
    }
  }
}

export const notificationManager = new NotificationManager();
