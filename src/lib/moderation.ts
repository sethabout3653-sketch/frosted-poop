// Profanity and Inappropriate Content Moderation Module

// Roots that should trigger a block if they appear ANYWHERE in a word (e.g. "fucking" -> "fuck")
const BLOCKED_ROOTS = [
  "fuck",
  "fck",
  "shit",
  "sht",
  "bitch",
  "btch",
  "cunt",
  "cnt",
  "dick",
  "dck",
  "pussy",
  "pssy",
  "cock",
  "bastard",
  "slut",
  "whore",
  "nigger",
  "nigga",
  "nigg",
  "faggot",
  "fag",
  "dyke",
  "tranny",
  "shemale",
  "retard",
  "kike",
  "spic",
  "chink",
  "gook",
  "wetback",
  "blowjob",
  "clitoris",
  "clit",
  "hentai",
  "porn",
  "orgasm",
  "milf",
  "dilf",
  "cumshot",
  "cumming",
  "vibrator",
  "dildo",
  "masturbate",
  "masturbation",
  "handjob",
  "rimjob",
  "rape",
  "raping",
  "rapist",
  "pedophile",
  "pedo",
];

// Exact terms that must match as a standalone word (or with a plural 's') to avoid false positives (e.g. "class" or "assessment")
const EXACT_BLOCKED = [
  "ass",
  "asses",
  "asshole",
  "assholes",
  "asswipe",
  "piss",
  "pisses",
  "pissed",
  "pissing",
  "pisser",
  "sex",
  "sexy",
  "naked",
  "nude",
  "boobs",
  "boob",
  "tits",
  "titties",
  "anal",
  "anus",
  "cum",
  "cums",
  "semen",
  "sperm",
  "penis",
  "vagina",
  "erotic",
  "rape",
  "twat",
  "prick",
  "douche",
  "douchebag",
  "wanker",
  "bollocks",
  "bugger",
  "goddamn",
  "dammit",
];

/**
 * Checks if text contains any inappropriate words, phrases, or symbols resembling them.
 */
export function isInappropriateContent(text: string): boolean {
  if (!text) return false;

  // 1. Lowercase and trim
  const cleanText = text.toLowerCase().trim();

  // 2. Direct exact and wildcard pattern checks for leetspeak or space spacing
  const wildcardPatterns = [
    /\bf[u*@4xvi3e]ck\b/i,
    /\bsh[i*!1|]t\b/i,
    /\bb[i*!1|]tch\b/i,
    /\bc[u*@4]nt\b/i,
    /\bp[u*]ssy\b/i,
    /\ba[s*$5][s*$5]\b/i,
    /\ba[s*$5][s*$5]hole\b/i,
    /\bc[o*0]ck\b/i,
    /\bm[o0]th[e3]rf[u*]ck[e3]r\b/i,
    /\bn[i1!|]gg[a@4e3]r?\b/i,
    /\bd[i1!|]ck\b/i,
    /\bp[o0]rn\b/i,
  ];

  for (const pattern of wildcardPatterns) {
    if (pattern.test(cleanText)) {
      return true;
    }
  }

  // 3. Tokenize by whitespace and punctuation to inspect individual words
  const rawTokens = cleanText.split(/[\s\-_.,?!:;()[\]{}|/\\+*=~`@#$%^&]+/);

  // 4. Group adjacent single characters (e.g., "f u c k" -> "fuck")
  const tokens: string[] = [];
  let currentSingleCharAccumulator = "";

  for (const token of rawTokens) {
    if (!token) continue;
    if (token.length === 1) {
      currentSingleCharAccumulator += token;
    } else {
      if (currentSingleCharAccumulator) {
        tokens.push(currentSingleCharAccumulator);
        currentSingleCharAccumulator = "";
      }
      tokens.push(token);
    }
  }
  if (currentSingleCharAccumulator) {
    tokens.push(currentSingleCharAccumulator);
  }

  // 5. Normalization and checking
  const leetMap: Record<string, string> = {
    "@": "a",
    "4": "a",
    "3": "e",
    "1": "i",
    "!": "i",
    "|": "i",
    "0": "o",
    "$": "s",
    "5": "s",
    "7": "t",
    "+": "t",
    "9": "g",
    "8": "b",
    "(": "c",
  };

  for (const token of tokens) {
    // Convert leetspeak
    let mapped = "";
    for (let i = 0; i < token.length; i++) {
      const char = token[i];
      mapped += leetMap[char] || char;
    }

    // Strip remaining non-alphanumeric
    const stripped = mapped.replace(/[^a-z0-9]/g, "");

    // Collapse consecutive identical characters (e.g. "fuuuuuck" -> "fuck")
    let collapsed = "";
    for (let i = 0; i < stripped.length; i++) {
      if (i === 0 || stripped[i] !== stripped[i - 1]) {
        collapsed += stripped[i];
      }
    }

    if (!collapsed) continue;

    // A. Check exact matches for safe-word sensitive roots
    if (EXACT_BLOCKED.includes(collapsed)) {
      return true;
    }

    // B. Check substring match for highly explicit roots
    for (const root of BLOCKED_ROOTS) {
      if (collapsed.includes(root)) {
        return true;
      }
    }
  }

  // 6. Check for inappropriate multi-word phrases directly
  const phrases = [
    "dirty joke",
    "18+ joke",
    "sexual joke",
    "make love",
    "send nudes",
  ];
  for (const phrase of phrases) {
    if (cleanText.includes(phrase)) {
      return true;
    }
  }

  return false;
}
