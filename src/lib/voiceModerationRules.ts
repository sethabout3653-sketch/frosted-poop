/**
 * Voice Chat Moderation Rules & Pattern Engine
 * Isomorphic: Safe for both browser and Node.js server environments.
 */

export interface VoiceModerationResult {
  isViolating: boolean;
  matchedWord: string;
}

// Prohibited base words, slurs, and severe profanity
export const PROHIBITED_WORDS = [
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

// Boundaries
const B_START = "(?:^|[^a-zA-Z0-9])";
const B_END = "(?=$|[^a-zA-Z0-9])";
const M = "[\\*\\-#@_]";

interface MaskedPattern {
  regex: RegExp;
  word: string;
}

const MASKED_AND_WHISPER_PATTERNS: MaskedPattern[] = [
  // Fuck and variants (f*ck, f**k, f***, f***ing, f*cker, motherf*cker, fak, fok, phuck)
  {
    regex: new RegExp(
      B_START + "(?:mother)?(?:f|ph)" + M + "{1,6}(?:ing|ed|er|ers|s|in)?" + B_END,
      "i",
    ),
    word: "fuck",
  },
  {
    regex: new RegExp(
      B_START + "(?:mother)?(?:f|ph)[u|o|a|\\*\\-#@_]+ck?(?:ing|ed|er|ers|s)?" + B_END,
      "i",
    ),
    word: "fuck",
  },
  {
    regex: new RegExp(B_START + "(?:mother)?(?:f|ph)" + M + "+k(?:ing|ed|er|ers|s)?" + B_END, "i"),
    word: "fuck",
  },
  { regex: new RegExp(B_START + "(?:mother)?(?:f|ph)" + M + "{2,6}" + B_END, "i"), word: "fuck" },
  { regex: new RegExp(B_START + "(?:fak|fok|fock|phuck|fuk|fawk)" + B_END, "i"), word: "fuck" },
  {
    regex: new RegExp(B_START + "(?:duck|funk)\\s+(?:you|u|off|this|that|up)" + B_END, "i"),
    word: "fuck",
  },

  // Shit and variants (sh*t, s***, s**t, bullsh*t, sh*tty, chit, shyt)
  {
    regex: new RegExp(B_START + "(?:bull|dip|horse)?sh?" + M + "{1,6}t(?:s|ty|ting)?" + B_END, "i"),
    word: "shit",
  },
  {
    regex: new RegExp(B_START + "(?:bull|dip|horse)?sh[iy\\*\\-#@_]+t(?:s|ty|ting)?" + B_END, "i"),
    word: "shit",
  },
  { regex: new RegExp(B_START + "s" + M + "{2,6}" + B_END, "i"), word: "shit" },
  { regex: new RegExp(B_START + "(?:chit|shyt|sheit)" + B_END, "i"), word: "shit" },
  {
    regex: new RegExp(B_START + "(?:holy|piece\\s+of|bull|full\\s+of)\\s+sheet" + B_END, "i"),
    word: "shit",
  },

  // Bitch and variants (b*tch, b****, b***ing, b**ch, bish)
  { regex: new RegExp(B_START + "b" + M + "{1,6}ch?(?:es|ing)?" + B_END, "i"), word: "bitch" },
  { regex: new RegExp(B_START + "b[iy\\*\\-#@_]+tch(?:es|ing)?" + B_END, "i"), word: "bitch" },
  { regex: new RegExp(B_START + "b" + M + "{2,6}" + B_END, "i"), word: "bitch" },
  { regex: new RegExp(B_START + "(?:bish|bytch|beetch)" + B_END, "i"), word: "bitch" },
  {
    regex: new RegExp(B_START + "(?:son\\s+of\\s+a|dumb|stupid)\\s+beach" + B_END, "i"),
    word: "bitch",
  },

  // Cunt and variants (c*nt, c***, c**t) - strictly requires ending in "nt", never "an" or "ant"
  { regex: new RegExp(B_START + "c" + M + "{1,6}nts?" + B_END, "i"), word: "cunt" },
  { regex: new RegExp(B_START + "c[u\\*\\-#@_]+nts?" + B_END, "i"), word: "cunt" },
  { regex: new RegExp(B_START + "c" + M + "{2,6}" + B_END, "i"), word: "cunt" },

  // Dick and variants (d*ck, d***, d**k, dik) - requires "i", "y" or mask, never "u" (duck) or "o" (dock)
  { regex: new RegExp(B_START + "d" + M + "{1,6}ck?s?" + B_END, "i"), word: "dick" },
  { regex: new RegExp(B_START + "d[iy\\*\\-#@_]+cks?" + B_END, "i"), word: "dick" },
  { regex: new RegExp(B_START + "d" + M + "{2,6}" + B_END, "i"), word: "dick" },
  { regex: new RegExp(B_START + "(?:dik|dyk)" + B_END, "i"), word: "dick" },

  // Pussy and variants (p*ssy, p***, p**sy)
  { regex: new RegExp(B_START + "p" + M + "{1,6}ss?y?s?" + B_END, "i"), word: "pussy" },
  { regex: new RegExp(B_START + "p[u\\*\\-#@_]+ss(?:y|ies)" + B_END, "i"), word: "pussy" },
  { regex: new RegExp(B_START + "p" + M + "{2,6}" + B_END, "i"), word: "pussy" },

  // Asshole and variants (a**hole, a*shole, a***, ashole, azzhole)
  { regex: new RegExp(B_START + "a" + M + "{1,6}(?:hole|ss)?s?" + B_END, "i"), word: "asshole" },
  { regex: new RegExp(B_START + "ass[\\*\\-#@_]*hole" + B_END, "i"), word: "asshole" },
  { regex: new RegExp(B_START + "(?:ashole|azzhole|a-hole)" + B_END, "i"), word: "asshole" },

  // Slurs (n-word, f-slur, retard)
  { regex: new RegExp(B_START + "n" + M + "{1,6}(?:er|ga|gg|a|ers|gas)?" + B_END, "i"), word: "n-word" },
  { regex: new RegExp(B_START + "n[i1e\\*\\-#@_]+gg[a3e\\*\\-#@_]+r?s?" + B_END, "i"), word: "n-word" },
  { regex: new RegExp(B_START + "n" + M + "{2,6}" + B_END, "i"), word: "n-word" },
  { regex: new RegExp(B_START + "(?:n-word|the\\s+n\\s+word)" + B_END, "i"), word: "n-word" },
  { regex: new RegExp(B_START + "f" + M + "{1,6}(?:g|got|gots)?" + B_END, "i"), word: "slur" },
  { regex: new RegExp(B_START + "f[a@\\*\\-#@_]+gg?[o0\\*\\-#@_]+ts?" + B_END, "i"), word: "slur" },
  { regex: new RegExp(B_START + "f" + M + "{2,6}" + B_END, "i"), word: "slur" },
  { regex: new RegExp(B_START + "r" + M + "{1,6}(?:d|ded|ds)?" + B_END, "i"), word: "retard" },
  { regex: new RegExp(B_START + "r[e3\\*\\-#@_]+t[a@\\*\\-#@_]+rd(?:ed|s)?" + B_END, "i"), word: "retard" },
  { regex: new RegExp(B_START + "r" + M + "{2,6}" + B_END, "i"), word: "retard" },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks a spoken or transcribed string against voice moderation rules.
 * Handles masked outputs (f***, sh*t), phonetic whisper variants, and direct profanities.
 */
export function checkVoiceModeration(transcript: string): VoiceModerationResult {
  if (!transcript || typeof transcript !== "string") {
    return { isViolating: false, matchedWord: "" };
  }

  const rawClean = transcript.trim().toLowerCase();

  // 1. Check Masked and Whisper regex patterns
  for (const item of MASKED_AND_WHISPER_PATTERNS) {
    if (item.regex.test(rawClean)) {
      return { isViolating: true, matchedWord: item.word };
    }
  }

  // 2. Normalize spaced characters (e.g. "f u c k" -> "fuck")
  const collapsedSpaces = rawClean.replace(
    /\b([a-z])\s+([a-z])\s+([a-z])\s+([a-z])\b/g,
    "$1$2$3$4",
  );
  if (collapsedSpaces !== rawClean) {
    for (const item of MASKED_AND_WHISPER_PATTERNS) {
      if (item.regex.test(collapsedSpaces)) {
        return { isViolating: true, matchedWord: item.word };
      }
    }
  }

  // 3. Check for exact prohibited words with punctuation stripped
  const stripped = rawClean.replace(/[^a-z0-9\s]/g, " ");
  const tokens = stripped.split(/\s+/).filter(Boolean);
  const tokenSet = new Set(tokens);

  for (const prohibited of PROHIBITED_WORDS) {
    if (tokenSet.has(prohibited)) {
      return { isViolating: true, matchedWord: prohibited };
    }
    // Also check phrases like "mother fucker" or multi-word
    const escaped = escapeRegex(prohibited);
    const phraseRegex = new RegExp(`\\b${escaped}\\b`, "i");
    if (phraseRegex.test(stripped)) {
      return { isViolating: true, matchedWord: prohibited };
    }
  }

  return { isViolating: false, matchedWord: "" };
}
