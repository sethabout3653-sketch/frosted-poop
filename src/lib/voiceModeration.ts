import { notificationManager } from "./notifications";
export * from "./voiceModerationRules";
export { checkVoiceModeration } from "./voiceModerationRules";
export type { VoiceModerationResult } from "./voiceModerationRules";

/**
 * Voice Chat Moderation Engine
 *
 * Specifically monitors voice channels for vulgar words, slurs, and hate speech.
 * Text chat remains completely unmoderated.
 *
 * If a prohibited word is detected via speech recognition or audio analysis:
 * - The user is suspended for 1 minute from voice chat.
 * - The system executes the action: announces "You have been suspended for saying [word]" via Text-to-Speech and UI.
 */

/**
 * Executes the auditory and notification action when a user is suspended for voice moderation.
 * Says: "You have been suspended for saying '[word]'"
 */
export function announceVoiceSuspension(word: string) {
  const sentence = `You have been suspended for saying "${word}"`;

  // 1. Play alert buzzer tone
  try {
    notificationManager.playSuspensionAlert();
  } catch (err) {
    console.warn("Suspension sound error:", err);
  }

  // 2. Audible speech synthesis (TTS) saying the action aloud
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis error:", err);
    }
  }

  // 3. Desktop Notification
  try {
    notificationManager.showNotification({
      title: "Voice Moderation Action",
      body: `${sentence}. You are suspended from voice chat for 1 minute.`,
    });
  } catch (err) {
    console.warn("Notification error:", err);
  }
}
