import { notificationManager } from "./notifications";
import { categorizeProfanity } from "./voiceModerationRules";
export * from "./voiceModerationRules";
export { checkVoiceModeration, categorizeProfanity } from "./voiceModerationRules";
export type { VoiceModerationResult } from "./voiceModerationRules";

/**
 * Voice Chat Moderation Engine
 *
 * Specifically monitors voice channels for vulgar words, slurs, and hate speech.
 * Text chat remains completely unmoderated.
 *
 * If a prohibited word is detected via speech recognition or audio analysis:
 * - The user is suspended for 1 minute from voice chat.
 * - The system executes the action: announces:
 *   "You have been suspended for violating moderation"
 *   "Offensive Item: \"[word]\""
 *   "Violation Type: [category of word]"
 *   via Text-to-Speech, Notifications, and the UI.
 */

/**
 * Executes the auditory and notification action when a user is suspended for voice moderation.
 */
export function announceVoiceSuspension(word: string, category?: string) {
  const itemType = category || categorizeProfanity(word) || "Derogatory & Prohibited Language";
  const sentence = `You have been suspended for violating moderation. Offensive item: "${word}". Violation type: ${itemType}.`;

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
      utterance.rate = 0.95;
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
      title: "You Have Been Suspended for Violating Moderation",
      body: `Offensive Item: "${word}". Violation Type: ${itemType}. Voice chat suspended for 1 minute.`,
    });
  } catch (err) {
    console.warn("Notification error:", err);
  }
}
