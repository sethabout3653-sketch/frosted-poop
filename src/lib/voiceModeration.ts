import { notificationManager } from "./notifications";

/**
 * Voice Chat Moderation Engine
 *
 * Specifically monitors voice channels for vulgar words, slurs, and hate speech.
 * Text chat remains completely unmoderated.
 *
 * If a prohibited word is detected via speech recognition:
 * - The user is suspended for 1 minute from voice chat.
 * - The system executes the action: announces "You have been suspended for saying [word]" via Text-to-Speech and UI.
 */

// Categorized dictionary of prohibited voice vulgarities and slurs
const PROHIBITED_WORDS = [
  // Severe profanity & vulgarities
  "fuck",
  "fucking",
  "fucked",
  "fucker",
  "fuckers",
  "fucks",
  "motherfucker",
  "motherfuckers",
  "motherfucking",
  "clusterfuck",
  "shit",
  "shits",
  "shitty",
  "bullshit",
  "dipshit",
  "horseshit",
  "bitch",
  "bitches",
  "bitching",
  "cunt",
  "cunts",
  "pussy",
  "pussies",
  "cock",
  "cocks",
  "cocksucker",
  "cocksuckers",
  "dick",
  "dicks",
  "dickhead",
  "dickheads",
  "asshole",
  "assholes",
  "bastard",
  "bastards",
  "whore",
  "whores",
  "slut",
  "sluts",
  "twat",
  "twats",
  "wanker",
  "wankers",

  // Slurs (racial, ethnic, homophobic, transphobic, ableist)
  "nigger",
  "niggers",
  "nigga",
  "niggas",
  "n-word",
  "faggot",
  "faggots",
  "fag",
  "fags",
  "dyke",
  "dykes",
  "tranny",
  "trannies",
  "kike",
  "kikes",
  "chink",
  "chinks",
  "spic",
  "spics",
  "wetback",
  "wetbacks",
  "gook",
  "gooks",
  "coon",
  "coons",
  "retard",
  "retarded",
  "retards",
  "mongoloid",
];

// Chrome and other Web Speech API implementations often censor profanity with asterisks.
// We map these masked patterns to their offending terms so censoring doesn't evade voice moderation.
const ASTERISK_PATTERNS: Array<{ pattern: RegExp; word: string }> = [
  { pattern: /\bf[*]{3,}(?:ing|er|s|ed)?\b/i, word: "fuck" },
  { pattern: /\bs[*]{3,}(?:y|s)?\b/i, word: "shit" },
  { pattern: /\bb[*]{3,}(?:es|ing)?\b/i, word: "bitch" },
  { pattern: /\bc[*]{3,}(?:s)?\b/i, word: "cunt" },
  { pattern: /\bn[*]{3,}(?:s)?\b/i, word: "n-word" },
  { pattern: /\bf[*]{4,}(?:s)?\b/i, word: "slur" },
  { pattern: /\bd[*]{3,}(?:s|head)?\b/i, word: "dick" },
  { pattern: /\bp[*]{3,}(?:es)?\b/i, word: "pussy" },
  { pattern: /\ba[*]{4,}(?:s)?\b/i, word: "asshole" },
  { pattern: /\br[*]{4,}(?:ed)?\b/i, word: "retard" },
  { pattern: /\bw[*]{3,}(?:s)?\b/i, word: "whore" },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface VoiceModerationResult {
  isViolating: boolean;
  matchedWord: string;
}

/**
 * Checks spoken transcript against the voice moderation rules.
 */
export function checkVoiceModeration(transcript: string): VoiceModerationResult {
  if (!transcript || typeof transcript !== "string") {
    return { isViolating: false, matchedWord: "" };
  }

  const cleanTranscript = transcript.trim().toLowerCase();

  // 1. Check for asterisked speech recognition outputs (e.g. Chrome's f***, b****)
  for (const item of ASTERISK_PATTERNS) {
    if (item.pattern.test(cleanTranscript)) {
      return { isViolating: true, matchedWord: item.word };
    }
  }

  // 2. Check for explicit words using word boundaries to prevent false positives
  for (const prohibited of PROHIBITED_WORDS) {
    const escaped = escapeRegex(prohibited);
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(cleanTranscript)) {
      return { isViolating: true, matchedWord: prohibited };
    }
  }

  return { isViolating: false, matchedWord: "" };
}

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
