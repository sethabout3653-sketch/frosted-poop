// Comprehensive Moderation Engine for Voice & Text
// Detects Slurs, Vulgar Language, 18+ Jokes / Sayings, and Explicit Content

export interface ModerationResult {
  isViolating: boolean;
  category:
    | "Slur / Hate Speech"
    | "Vulgar Language"
    | "18+ / Adult Joke or Saying"
    | "Explicit Content"
    | "Inappropriate Content";
  actionDescription: string; // Direct description of the action, e.g. 'Saying an 18+ joke or saying: "that\'s what she said"'
  detectedSnippet: string;
}

// 1. SLURS & HATE SPEECH
const SLUR_TERMS: { word: string; label: string }[] = [
  { word: "nigger", label: "Racial slur" },
  { word: "nigga", label: "Racial slur" },
  { word: "nigg", label: "Racial slur" },
  { word: "faggot", label: "Homophobic slur" },
  { word: "fag", label: "Homophobic slur" },
  { word: "fags", label: "Homophobic slur" },
  { word: "dyke", label: "Homophobic slur" },
  { word: "dykes", label: "Homophobic slur" },
  { word: "tranny", label: "Transphobic slur" },
  { word: "trannies", label: "Transphobic slur" },
  { word: "shemale", label: "Transphobic slur" },
  { word: "shemales", label: "Transphobic slur" },
  { word: "retard", label: "Ableist slur" },
  { word: "retarded", label: "Ableist slur" },
  { word: "retards", label: "Ableist slur" },
  { word: "kike", label: "Antisemitic slur" },
  { word: "kikes", label: "Antisemitic slur" },
  { word: "spic", label: "Ethnic slur" },
  { word: "spics", label: "Ethnic slur" },
  { word: "chink", label: "Ethnic slur" },
  { word: "chinks", label: "Ethnic slur" },
  { word: "gook", label: "Ethnic slur" },
  { word: "gooks", label: "Ethnic slur" },
  { word: "wetback", label: "Ethnic slur" },
  { word: "wetbacks", label: "Ethnic slur" },
  { word: "beaner", label: "Ethnic slur" },
  { word: "cracker", label: "Racial slur" },
  { word: "honky", label: "Racial slur" },
  { word: "coon", label: "Racial slur" },
  { word: "raghead", label: "Ethnic/Religious slur" },
  { word: "towelhead", label: "Ethnic/Religious slur" },
  { word: "cameljockey", label: "Ethnic slur" },
  { word: "slope", label: "Ethnic slur" },
  { word: "zipperhead", label: "Ethnic slur" },
  { word: "squaw", label: "Ethnic slur" },
  { word: "cholo", label: "Ethnic slur" },
  { word: "mongoloid", label: "Ableist slur" },
  { word: "cripple", label: "Ableist slur" },
  { word: "tard", label: "Ableist slur" },
  { word: "carpetmuncher", label: "Homophobic slur" },
  { word: "fudgepacker", label: "Homophobic slur" },
  { word: "pillowbiter", label: "Homophobic slur" },
  { word: "sodomite", label: "Derogatory slur" },
];

// 2. 18+ / ADULT JOKES, SAYINGS & CRUDE PHRASES
const ADULT_JOKES_AND_SAYINGS: { phrase: string; label: string }[] = [
  { phrase: "that's what she said", label: "18+ saying" },
  { phrase: "thats what she said", label: "18+ saying" },
  { phrase: "that is what she said", label: "18+ saying" },
  { phrase: "deez nuts", label: "18+ joke" },
  { phrase: "deez nutz", label: "18+ joke" },
  { phrase: "these nuts", label: "18+ joke" },
  { phrase: "hawk tuah", label: "18+ viral saying" },
  { phrase: "spit on that thing", label: "18+ saying" },
  { phrase: "suck my dick", label: "Crude sexual phrase" },
  { phrase: "suck my cock", label: "Crude sexual phrase" },
  { phrase: "suck my balls", label: "Crude sexual phrase" },
  { phrase: "suck my nuts", label: "Crude sexual phrase" },
  { phrase: "suck on deez", label: "18+ joke" },
  { phrase: "suck me off", label: "Crude sexual phrase" },
  { phrase: "suck my", label: "Crude sexual phrase" },
  { phrase: "lick my balls", label: "Crude sexual phrase" },
  { phrase: "lick my nuts", label: "Crude sexual phrase" },
  { phrase: "lick my dick", label: "Crude sexual phrase" },
  { phrase: "lick my pussy", label: "Crude sexual phrase" },
  { phrase: "lick my clit", label: "Crude sexual phrase" },
  { phrase: "step bro", label: "18+ joke / meme" },
  { phrase: "stepbro", label: "18+ joke / meme" },
  { phrase: "step sister", label: "18+ joke / meme" },
  { phrase: "stepsister", label: "18+ joke / meme" },
  { phrase: "what are you doing step", label: "18+ joke / meme" },
  { phrase: "stuck in the washer", label: "18+ joke / meme" },
  { phrase: "bend over", label: "18+ suggestive saying" },
  { phrase: "bend her over", label: "18+ suggestive saying" },
  { phrase: "doggy style", label: "18+ sexual saying" },
  { phrase: "doggystyle", label: "18+ sexual saying" },
  { phrase: "ride my dick", label: "18+ sexual saying" },
  { phrase: "ride that dick", label: "18+ sexual saying" },
  { phrase: "ride on my", label: "18+ sexual saying" },
  { phrase: "choke on my", label: "Crude sexual phrase" },
  { phrase: "choke on this", label: "Crude sexual phrase" },
  { phrase: "blow me", label: "Crude sexual saying" },
  { phrase: "give me head", label: "18+ sexual saying" },
  { phrase: "giving head", label: "18+ sexual saying" },
  { phrase: "getting head", label: "18+ sexual saying" },
  { phrase: "smash or pass", label: "18+ joke / game" },
  { phrase: "would you smash", label: "18+ suggestive saying" },
  { phrase: "i'd smash", label: "18+ suggestive saying" },
  { phrase: "id smash", label: "18+ suggestive saying" },
  { phrase: "tap that", label: "18+ crude saying" },
  { phrase: "hit that from behind", label: "18+ crude saying" },
  { phrase: "bust a nut", label: "18+ crude saying" },
  { phrase: "busting a nut", label: "18+ crude saying" },
  { phrase: "buss a nut", label: "18+ crude saying" },
  { phrase: "busted a nut", label: "18+ crude saying" },
  { phrase: "touch yourself", label: "18+ crude saying" },
  { phrase: "beat my meat", label: "18+ crude joke/saying" },
  { phrase: "beating my meat", label: "18+ crude joke/saying" },
  { phrase: "choke the chicken", label: "18+ crude joke/saying" },
  { phrase: "jerk off", label: "18+ sexual phrase" },
  { phrase: "jerking off", label: "18+ sexual phrase" },
  { phrase: "jack off", label: "18+ sexual phrase" },
  { phrase: "jacking off", label: "18+ sexual phrase" },
  { phrase: "send nudes", label: "18+ phrase" },
  { phrase: "send noods", label: "18+ phrase" },
  { phrase: "show me your tits", label: "18+ harassment phrase" },
  { phrase: "show your tits", label: "18+ harassment phrase" },
  { phrase: "show me your boobs", label: "18+ harassment phrase" },
  { phrase: "flash me", label: "18+ suggestive saying" },
  { phrase: "morning wood", label: "18+ crude saying" },
  { phrase: "got a boner", label: "18+ crude joke/saying" },
  { phrase: "popped a boner", label: "18+ crude joke/saying" },
  { phrase: "hard on", label: "18+ crude saying" },
  { phrase: "so horny", label: "18+ saying" },
  { phrase: "i'm horny", label: "18+ saying" },
  { phrase: "im horny", label: "18+ saying" },
  { phrase: "make me wet", label: "18+ saying" },
  { phrase: "getting wet", label: "18+ suggestive saying" },
  { phrase: "onlyfans", label: "18+ adult platform reference" },
  { phrase: "only fans", label: "18+ adult platform reference" },
  { phrase: "sugar daddy", label: "18+ adult saying" },
  { phrase: "sugar mommy", label: "18+ adult saying" },
  { phrase: "dirty joke", label: "18+ joke reference" },
  { phrase: "18+ joke", label: "18+ joke reference" },
  { phrase: "adult joke", label: "18+ joke reference" },
  { phrase: "put it in", label: "18+ suggestive phrase" },
  { phrase: "stick it in", label: "18+ suggestive phrase" },
  { phrase: "shove it in", label: "18+ suggestive phrase" },
  { phrase: "raw dog", label: "18+ crude saying" },
  { phrase: "rawdog", label: "18+ crude saying" },
  { phrase: "pull out game", label: "18+ joke / saying" },
  { phrase: "creampie", label: "18+ sexual saying" },
  { phrase: "threesome", label: "18+ adult topic" },
  { phrase: "foursome", label: "18+ adult topic" },
  { phrase: "orgy", label: "18+ adult topic" },
  { phrase: "gangbang", label: "18+ adult topic" },
  { phrase: "deepthroat", label: "18+ sexual phrase" },
  { phrase: "deep throat", label: "18+ sexual phrase" },
  { phrase: "sixty nine", label: "18+ sexual joke" },
  { phrase: "69 position", label: "18+ sexual joke" },
];

// 3. VULGAR LANGUAGE & PROFANITY
const VULGAR_ROOTS = [
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
  "motherfucker",
  "cocksucker",
  "wanker",
  "twat",
  "tosser",
  "prick",
  "skank",
  "chode",
  "cuck",
  "cuckold",
  "asshole",
  "asswipe",
  "dumbass",
  "jackass",
];

const VULGAR_EXACT = [
  "ass",
  "asses",
  "asshole",
  "assholes",
  "asswipe",
  "dumbass",
  "jackass",
  "piss",
  "pisses",
  "pissed",
  "pissing",
  "pisser",
  "goddamn",
  "dammit",
  "hell",
  "crap",
  "crappy",
  "damn",
  "damned",
  "slutty",
  "whoreish",
  "bitchy",
  "shitty",
  "shite",
  "shat",
  "cunt",
  "cunts",
  "dicks",
  "pussies",
  "cocks",
  "cocky",
  "bollocks",
  "bugger",
];

// 4. EXPLICIT SEXUAL CONTENT
const EXPLICIT_TERMS = [
  "blowjob",
  "handjob",
  "rimjob",
  "cumshot",
  "cumming",
  "cum",
  "cums",
  "semen",
  "sperm",
  "ejaculate",
  "ejaculation",
  "orgasm",
  "orgasms",
  "vibrator",
  "dildo",
  "fleshlight",
  "butt plug",
  "masturbate",
  "masturbation",
  "masturbating",
  "porn",
  "pornography",
  "hentai",
  "xxx",
  "erotic",
  "erotica",
  "clitoris",
  "clit",
  "labia",
  "phallus",
  "vulva",
  "testicle",
  "testicles",
  "scrotum",
  "penis",
  "vagina",
  "anal",
  "anus",
  "titfuck",
  "tittyfuck",
  "tits",
  "titties",
  "boobs",
  "boob",
  "cameltoe",
  "queef",
  "smegma",
  "incel",
  "jizz",
  "nude",
  "nudes",
  "nudity",
  "naked",
  "hooker",
  "escort",
  "stripper",
  "incest",
  "bestiality",
  "necrophilia",
  "snuff",
  "scat",
  "felching",
  "bukkake",
  "goatse",
  "lemonparty",
  "meatspin",
  "bluewaffle",
  "milf",
  "milfs",
  "dilf",
  "dilfs",
  "rape",
  "raping",
  "rapist",
  "pedophile",
  "pedo",
];

/**
 * Analyzes text or spoken transcript and returns a detailed moderation result
 * with the exact category and action description.
 */
export function analyzeContent(text: string): ModerationResult {
  if (!text) {
    return {
      isViolating: false,
      category: "Inappropriate Content",
      actionDescription: "",
      detectedSnippet: "",
    };
  }

  const cleanText = text.toLowerCase().trim();

  // 1. Check for 18+ Adult Jokes, Sayings & Crude Memes
  for (const item of ADULT_JOKES_AND_SAYINGS) {
    if (cleanText.includes(item.phrase)) {
      return {
        isViolating: true,
        category: "18+ / Adult Joke or Saying",
        actionDescription: `Saying an 18+ joke / saying: "${item.phrase}"`,
        detectedSnippet: item.phrase,
      };
    }
  }

  // 2. Check for Slurs & Hate Speech (Phrases & Exact / Substring Words)
  for (const item of SLUR_TERMS) {
    const wordPattern = new RegExp(`\\b${item.word}\\w*\\b`, "i");
    if (wordPattern.test(cleanText) || cleanText.includes(item.word)) {
      return {
        isViolating: true,
        category: "Slur / Hate Speech",
        actionDescription: `Using a slur / hate speech: "${item.word}"`,
        detectedSnippet: item.word,
      };
    }
  }

  // 3. Check for Explicit Sexual Terms
  for (const exp of EXPLICIT_TERMS) {
    const expPattern = new RegExp(`\\b${exp}\\w*\\b`, "i");
    if (expPattern.test(cleanText)) {
      return {
        isViolating: true,
        category: "Explicit Content",
        actionDescription: `Using explicit / sexual content: "${exp}"`,
        detectedSnippet: exp,
      };
    }
  }

  // 4. Check for Vulgar Language & Profanity
  // Regex Wildcards for leetspeak or bypassed swear words
  const vulgarWildcards: { pattern: RegExp; word: string }[] = [
    { pattern: /\bf[u*@4xvi3e]ck\w*\b/i, word: "fuck" },
    { pattern: /\bsh[i*!1|]t\w*\b/i, word: "shit" },
    { pattern: /\bb[i*!1|]tch\w*\b/i, word: "bitch" },
    { pattern: /\bc[u*@4]nt\w*\b/i, word: "cunt" },
    { pattern: /\bp[u*]ssy\w*\b/i, word: "pussy" },
    { pattern: /\ba[s*$5][s*$5]hole\w*\b/i, word: "asshole" },
    { pattern: /\bc[o*0]ck\w*\b/i, word: "cock" },
    { pattern: /\bm[o0]th[e3]rf[u*]ck\w*\b/i, word: "motherfucker" },
    { pattern: /\bd[i1!|]ck\w*\b/i, word: "dick" },
  ];

  for (const item of vulgarWildcards) {
    if (item.pattern.test(cleanText)) {
      return {
        isViolating: true,
        category: "Vulgar Language",
        actionDescription: `Using vulgar language / profanity: "${item.word}"`,
        detectedSnippet: item.word,
      };
    }
  }

  // Tokenize & check individual tokens
  const rawTokens = cleanText.split(/[\s\-_.,?!:;()[\]{}|/\\+*=~`@#$%^&]+/);
  const tokens: string[] = [];
  let charAcc = "";

  for (const t of rawTokens) {
    if (!t) continue;
    if (t.length === 1) {
      charAcc += t;
    } else {
      if (charAcc) {
        tokens.push(charAcc);
        charAcc = "";
      }
      tokens.push(t);
    }
  }
  if (charAcc) tokens.push(charAcc);

  const leetMap: Record<string, string> = {
    "@": "a",
    "4": "a",
    "3": "e",
    "1": "i",
    "!": "i",
    "|": "i",
    "0": "o",
    $: "s",
    "5": "s",
    "7": "t",
    "+": "t",
    "9": "g",
    "8": "b",
    "(": "c",
  };

  for (const token of tokens) {
    let mapped = "";
    for (let i = 0; i < token.length; i++) {
      const c = token[i];
      mapped += leetMap[c] || c;
    }
    const stripped = mapped.replace(/[^a-z0-9]/g, "");
    if (!stripped) continue;

    // Check exact vulgar list
    if (VULGAR_EXACT.includes(stripped)) {
      return {
        isViolating: true,
        category: "Vulgar Language",
        actionDescription: `Using vulgar language: "${stripped}"`,
        detectedSnippet: stripped,
      };
    }

    // Check vulgar roots
    for (const root of VULGAR_ROOTS) {
      if (stripped.includes(root)) {
        return {
          isViolating: true,
          category: "Vulgar Language",
          actionDescription: `Using vulgar language: "${root}"`,
          detectedSnippet: root,
        };
      }
    }
  }

  return {
    isViolating: false,
    category: "Inappropriate Content",
    actionDescription: "",
    detectedSnippet: "",
  };
}

/**
 * Backwards-compatible boolean check
 */
export function isInappropriateContent(text: string): boolean {
  return analyzeContent(text).isViolating;
}
