/**
 * Exhaustive Voice Moderation & Phonetic Whisper Engine
 * Isomorphic: Operates with 0ms latency in both browser and Node.js environments.
 *
 * Catches all categories:
 * 1. Severe profanities, curse words, swear words and all derivatives
 * 2. Racial, ethnic, homophobic, transphobic, ableist, and religious slurs
 * 3. Sexual anatomy, explicit acts, vulgarities, and sexual slang
 * 4. Toxic gaming / self-harm / harassment slang (kys, rope yourself, etc.)
 * 5. International vulgarities commonly spoken in voice chat (Spanish, Russian, French, German, etc.)
 * 6. Browser Speech-to-Text asterisks censor masks (****, f***, s***, b****, etc.)
 * 7. Phonetic whisper formants and soundalike substitutions (fok, chit, bytch, holy sheet, son of a beach)
 * 8. Leetspeak, repeated character stretching, and spaced-out bypasses
 */

export interface VoiceModerationResult {
  isViolating: boolean;
  matchedWord: string;
  category: string;
}

/**
 * Classifies a prohibited word/slang into its specific moderation violation category:
 * - "Racial / Ethnic Slur"
 * - "Homophobic / LGBTQ+ Slur"
 * - "Ableist / Cognitive Slur"
 * - "Sexual Vulgarity & Explicit Content"
 * - "Derogatory & Degrading Insult"
 * - "Severe Harassment & Toxic Slang"
 * - "Severe Profanity & Curse Word"
 * - "Foreign Language Slur / Vulgarity"
 * - "Censored Voice Profanity"
 */
export function categorizeProfanity(word: string): string {
  const w = (word || "").toLowerCase().trim();
  if (!w) return "Prohibited Language";

  // 1. Pure Censored Asterisks Tokens (e.g. ****, f***, s***, b****)
  if (/\*+/.test(w) || w === "profanity") {
    return "Censored Voice Profanity";
  }

  // 2. Racial, Ethnic & Xenophobic Slurs
  if (
    /nigg|n-word|the\s+n\s+word|coon|kike|chink|gook|spic|wetback|beaner|raghead|towelhead|paki|pikey|gypsy|gypsies|gyppo|wop|dago|polack|kraut|redskin|injun|squaw|sambo|darkie|yid|shylock|hymie|zipperhead|slanteye|\bjap\b|\bjaps\b|\bnip\b|\bnips\b|greaser|cameljockey|dunecoon|sandnigg|guinea|\babo\b|\babos\b|jigaboo|jiggaboo|pickaninny|porchmonkey|tarbaby/i.test(
      w,
    )
  ) {
    return "Racial / Ethnic Slur";
  }

  // 3. Homophobic & Transphobic Slurs
  if (
    /fag|fagg|fagot|f-slur|\bslurs?\b|dyke|dike|trann|transvestite|shemale|ladyboy|battyboy|carpetmuncher|fudgepacker|poof|poofter|he-she|maricon|marica/i.test(
      w,
    )
  ) {
    return "Homophobic / LGBTQ+ Slur";
  }

  // 4. Derogatory, Demeaning & Degrading Insults
  if (
    /bitch|bish|bytch|beetch|bich|biatch|son\s*of\s*a\s*bitch|son\s*of\s*a\s*beach|dumb\s*beach|whore|whoring|whorehouse|slut|skank|thot|tramp|slag|prostitute|hooker|cunt|kunt|twat|dumbass|jackass|smartass|fatass|lazyass|lameass|hardass|tightass|asswipe|asshat|assclown|wankstain|bellend|knobhead|tosser|minger|bastard/i.test(
      w,
    )
  ) {
    return "Derogatory & Degrading Insult";
  }

  // 5. Ableist & Cognitive Slurs
  if (
    /retard|\btard\b|\btards\b|mongoloid|mong|spastic|spaz|cripple|gimp|autist|downie|windowlicker/i.test(
      w,
    )
  ) {
    return "Ableist / Cognitive Slur";
  }

  // 6. Severe Harassment & Self-Harm Slang
  if (
    /kys|kill\s*your|kill\s*urself|rope\s*your|hang\s*your|slit|drinkbleach|doxx|swat|\bkms\b/i.test(
      w,
    )
  ) {
    return "Severe Harassment & Toxic Slang";
  }

  // 7. Sexual Anatomy, Vulgarities & Explicit Acts
  if (
    /cock|dick|dik|dyk|deek|pussy|pussies|clit|clitoris|labia|vagina|penis|scrotum|nutsack|ballsack|boner|pecker|schlong|dong|anus|butthole|tit|tits|titties|titty|boob|boobs|boobies|nipple|cum|jizz|semen|sperm|ejaculat|blowjob|handjob|rimjob|footjob|deepthroat|bukkake|creampie|gangbang|orgy|masturbat|felch|pegging|sext|porn|hentai|bdsm|incest|rape|raping|raped|rapist|molest|pedo|pedophile|nonce|beastiality|zoophil|necrophil|cuck|coomer/i.test(
      w,
    )
  ) {
    return "Sexual Vulgarity & Explicit Content";
  }

  // 8. Foreign Language Vulgarities & Slurs
  if (
    /puta|puto|mierda|cabron|cabrona|pendejo|pendeja|chinga|chingar|chingada|chingado|pinche|coño|joder|culiao|gilipollas|cyka|suka|blyat|nahui|pizdec|pizda|ebat|mudak|gandon|dolbaeb|huyu|putain|merde|connard|salope|encule|enculer|scheisse|scheiße|fotze|arschloch|arschlöcher|hurensohn|schlampe|wichser|cazzo|stronzo|vaffanculo|caralho|porra/i.test(
      w,
    )
  ) {
    return "Foreign Language Slur / Vulgarity";
  }

  // 9. Severe Profanity & Curse Words (Fuck, Shit, Asshole, etc. and phonetic variants)
  if (
    /fuck|feck|fock|phuck|fuk|fawk|fux|fohk|fook|shit|shite|shyt|chit|sheit|shet|schit|sheet|asshole|ashole|azzhole|a-hole|arse|arsehole|prick|wank|bollocks|bugger/i.test(
      w,
    )
  ) {
    return "Severe Profanity & Curse Word";
  }

  return "Derogatory & Prohibited Language";
}

// ---------------------------------------------------------------------------
// 1. COMPREHENSIVE PROHIBITED BASE WORDS & SLANG DICTIONARY
// ---------------------------------------------------------------------------

export const PROHIBITED_WORDS = [
  // --- Severe Profanities & Derivatives ---
  "fuck",
  "fucking",
  "fucked",
  "fucker",
  "fuckers",
  "fucks",
  "fuckhead",
  "fuckheads",
  "fuckface",
  "fuckfaces",
  "fuckboy",
  "fuckboys",
  "fuckboi",
  "fuckbois",
  "fucktard",
  "fucktards",
  "fuckwit",
  "fuckwits",
  "motherfucker",
  "motherfuckers",
  "motherfucking",
  "clusterfuck",
  "clusterfucks",
  "mindfuck",
  "fuckup",
  "fuckups",
  "feck",
  "fecking",
  "fock",
  "focking",
  "phuck",
  "phucking",
  "fuk",
  "fuking",
  "fukker",
  "fawk",

  // --- Shit & Derivatives ---
  "shit",
  "shits",
  "shitty",
  "shitting",
  "shitted",
  "shitter",
  "shitters",
  "bullshit",
  "bullshits",
  "bullshitting",
  "dipshit",
  "dipshits",
  "horseshit",
  "batshit",
  "apeshit",
  "shithead",
  "shitheads",
  "shitface",
  "shitfaces",
  "shitbag",
  "shitbags",
  "shithole",
  "shitholes",
  "shitshow",
  "shitshows",
  "shite",
  "shites",
  "shyt",
  "chit",
  "sheit",

  // --- Bitch & Derivatives ---
  "bitch",
  "bitches",
  "bitching",
  "bitched",
  "bitchy",
  "bitchass",
  "bitchboy",
  "sonofabitch",
  "bish",
  "bytch",
  "beetch",

  // --- Cunt & Derivatives ---
  "cunt",
  "cunts",
  "cunting",
  "cunted",
  "cuntface",
  "cuntbag",
  "kunt",
  "kunts",

  // --- Asshole, Ass & British Vulgarities ---
  "asshole",
  "assholes",
  "arse",
  "arses",
  "arsehole",
  "arseholes",
  "dumbass",
  "dumbasses",
  "jackass",
  "jackasses",
  "smartass",
  "fatass",
  "lazyass",
  "lameass",
  "hardass",
  "tightass",
  "asswipe",
  "asswipes",
  "asshat",
  "asshats",
  "assclown",
  "assclowns",
  "bastard",
  "bastards",
  "bastardy",
  "twat",
  "twats",
  "twatting",
  "prick",
  "pricks",
  "wanker",
  "wankers",
  "wank",
  "wanking",
  "wankstain",
  "bellend",
  "bellends",
  "knobhead",
  "knobheads",
  "tosser",
  "tossers",
  "minger",
  "mingers",
  "bollocks",
  "bugger",
  "buggers",
  "buggery",

  // --- Whore, Slut & Degenerate Terms ---
  "whore",
  "whores",
  "whoring",
  "whorehouse",
  "slut",
  "sluts",
  "slutty",
  "skank",
  "skanks",
  "skanky",
  "thot",
  "thots",
  "tramp",
  "tramps",
  "slag",
  "slags",
  "prostitute",
  "hooker",
  "hookers",

  // --- Genital, Sexual Anatomy & Acts ---
  "cock",
  "cocks",
  "cocksucker",
  "cocksuckers",
  "cocksucking",
  "cockhead",
  "dick",
  "dicks",
  "dickhead",
  "dickheads",
  "dickweed",
  "dickbag",
  "dickface",
  "pussy",
  "pussies",
  "clit",
  "clits",
  "clitoris",
  "labia",
  "vagina",
  "vaginas",
  "penis",
  "penises",
  "scrotum",
  "nutsack",
  "nutsacks",
  "ballsack",
  "ballsacks",
  "boner",
  "boners",
  "pecker",
  "peckers",
  "schlong",
  "schlongs",
  "dong",
  "dongs",
  "anus",
  "anuses",
  "butthole",
  "buttholes",
  "tit",
  "tits",
  "titties",
  "titty",
  "boob",
  "boobs",
  "boobies",
  "nipple",
  "nipples",
  "cum",
  "cums",
  "cumming",
  "cumshot",
  "cumshots",
  "cumslut",
  "cumdumpster",
  "jizz",
  "jizzed",
  "jizzing",
  "semen",
  "sperm",
  "ejaculate",
  "ejaculation",
  "blowjob",
  "blowjobs",
  "handjob",
  "handjobs",
  "rimjob",
  "rimjobs",
  "footjob",
  "deepthroat",
  "deepthroating",
  "bukkake",
  "creampie",
  "gangbang",
  "orgy",
  "masturbate",
  "masturbating",
  "masturbation",
  "felch",
  "felching",
  "pegging",
  "sexting",
  "porn",
  "porno",
  "pornography",
  "hentai",
  "bdsm",
  "incest",
  "rape",
  "raping",
  "raped",
  "rapist",
  "rapists",
  "molester",
  "molesters",
  "pedo",
  "pedos",
  "pedophile",
  "pedophiles",
  "pedophilia",
  "nonce",
  "nonces",
  "beastiality",
  "zoophile",
  "zoophilia",
  "necrophilia",
  "cuck",
  "cuckold",
  "cucks",
  "coomer",

  // --- Racial, Ethnic & Xenophobic Slurs ---
  "nigger",
  "niggers",
  "nigga",
  "niggas",
  "niggah",
  "niggaz",
  "n-word",
  "coon",
  "coons",
  "jigaboo",
  "jigaboos",
  "jiggaboo",
  "pickaninny",
  "porchmonkey",
  "tarbaby",
  "sambo",
  "darkie",
  "darkies",
  "kike",
  "kikes",
  "yid",
  "yids",
  "shylock",
  "hymie",
  "chink",
  "chinks",
  "gook",
  "gooks",
  "zipperhead",
  "zipperheads",
  "slanteye",
  "jap",
  "japs",
  "nip",
  "nips",
  "spic",
  "spics",
  "wetback",
  "wetbacks",
  "beaner",
  "beaners",
  "greaser",
  "greasers",
  "raghead",
  "ragheads",
  "towelhead",
  "towelheads",
  "cameljockey",
  "sandnigger",
  "sandniggers",
  "dunecoon",
  "paki",
  "pakis",
  "pikey",
  "pikeys",
  "gypsy",
  "gypsies",
  "gyppo",
  "wop",
  "wops",
  "dago",
  "dagos",
  "guinea",
  "polack",
  "polacks",
  "kraut",
  "krauts",
  "redskin",
  "redskins",
  "injun",
  "squaw",
  "abo",
  "abos",

  // --- LGBTQ+ & Transphobic Slurs ---
  "faggot",
  "faggots",
  "fag",
  "fags",
  "fagg",
  "fagot",
  "fagots",
  "dyke",
  "dykes",
  "dike",
  "dikes",
  "tranny",
  "trannies",
  "transvestite",
  "shemale",
  "shemales",
  "he-she",
  "ladyboy",
  "battyboy",
  "poof",
  "poofs",
  "poofter",
  "carpetmuncher",
  "fudgepacker",

  // --- Ableist & Cognitive Slurs ---
  "retard",
  "retarded",
  "retards",
  "retardation",
  "tard",
  "tards",
  "libtard",
  "libtards",
  "mongoloid",
  "mongoloids",
  "mong",
  "mongs",
  "spastic",
  "spastics",
  "spaz",
  "spazza",
  "cripple",
  "cripples",
  "gimp",
  "gimps",
  "autist",
  "downie",
  "downies",
  "windowlicker",

  // --- Severe Harassment & Self-Harm Slang ---
  "kys",
  "kill yourself",
  "kill urself",
  "kms",
  "rope yourself",
  "hang yourself",
  "slityourwrists",
  "drinkbleach",
  "doxxing",
  "swatting",

  // --- Foreign Language Vulgarities & Slurs ---
  // Spanish
  "puta",
  "putas",
  "puto",
  "putos",
  "mierda",
  "mierdas",
  "cabron",
  "cabrones",
  "cabrona",
  "pendejo",
  "pendejos",
  "pendeja",
  "pendejas",
  "maricon",
  "maricones",
  "marica",
  "maricas",
  "chinga",
  "chingar",
  "chingada",
  "chingado",
  "pinche",
  "coño",
  "coños",
  "joder",
  "culiao",
  "gilipollas",
  // Russian
  "cyka",
  "suka",
  "blyat",
  "nahui",
  "pizdec",
  "pizda",
  "ebat",
  "mudak",
  "gandon",
  "dolbaeb",
  "huyu",
  // French
  "putain",
  "merde",
  "connard",
  "connards",
  "salope",
  "salopes",
  "encule",
  "enculer",
  // German
  "scheisse",
  "scheiße",
  "fotze",
  "fotzen",
  "arschloch",
  "arschlöcher",
  "hurensohn",
  "schlampe",
  "wichser",
  // Italian & Portuguese
  "cazzo",
  "stronzo",
  "vaffanculo",
  "caralho",
  "porra",
];

// Set for instant O(1) exact lookup
const PROHIBITED_SET = new Set(PROHIBITED_WORDS.map((w) => w.toLowerCase()));

// ---------------------------------------------------------------------------
// 2. REGEX PATTERNS FOR ASTERISKS, MASKED SPEECH & WHISPER VARIANTS
// ---------------------------------------------------------------------------

const B_START = "(?:^|[^a-zA-Z0-9\\*])";
const B_END = "(?=$|[^a-zA-Z0-9\\*])";
const M = "[\\*\\-#@_]";

interface MaskedPattern {
  regex: RegExp;
  word: string;
}

const MASKED_AND_WHISPER_PATTERNS: MaskedPattern[] = [
  // --- Contextual Spoken Phrases with Censored Symbols / Whispers ---
  {
    regex: new RegExp(
      B_START + "(?:what\\s+the|mother|shut\\s+the|get\\s+the)\\s+" + M + "{2,10}" + B_END,
      "i",
    ),
    word: "fuck",
  },
  {
    regex: new RegExp(B_START + M + "{2,10}\\s+(?:you|u|off|this|that|up|out)" + B_END, "i"),
    word: "fuck",
  },
  {
    regex: new RegExp(
      B_START + "(?:holy|piece\\s+of|bull|full\\s+of|eat|dip|horse)\\s+" + M + "{2,10}" + B_END,
      "i",
    ),
    word: "shit",
  },
  {
    regex: new RegExp(
      B_START + "(?:son\\s+of\\s+a|dumb|stupid|crazy|ugly|fat)\\s+" + M + "{2,10}" + B_END,
      "i",
    ),
    word: "bitch",
  },
  {
    regex: new RegExp(
      B_START +
        "(?:suck\\s+my|lick\\s+my|kiss\\s+my|eat\\s+my|stroke\\s+my)\\s+" +
        M +
        "{2,10}" +
        B_END,
      "i",
    ),
    word: "dick",
  },
  {
    regex: new RegExp(
      B_START + "(?:grab\\s+her|smell\\s+my|tight)\\s+" + M + "{2,10}" + B_END,
      "i",
    ),
    word: "pussy",
  },

  // --- Fuck and Variants (f*ck, f**k, f***, f***ing, f*cker, motherf*cker, fak, fok, phuck, feck) ---
  {
    regex: new RegExp(
      B_START + "(?:mother)?(?:f|ph)" + M + "{1,10}(?:ing|ed|er|ers|s|in|g)?" + B_END,
      "i",
    ),
    word: "fuck",
  },
  {
    regex: new RegExp(
      B_START + "(?:mother)?(?:f|ph)[u|o|a|e|\\*\\-#@_]+ck?(?:ing|ed|er|ers|s)?" + B_END,
      "i",
    ),
    word: "fuck",
  },
  {
    regex: new RegExp(B_START + "(?:mother)?(?:f|ph)" + M + "+k(?:ing|ed|er|ers|s)?" + B_END, "i"),
    word: "fuck",
  },
  {
    regex: new RegExp(B_START + "(?:mother)?(?:f|ph)" + M + "{2,10}" + B_END, "i"),
    word: "fuck",
  },
  {
    regex: new RegExp(
      B_START + "(?:fak|fok|fock|phuck|fuk|fawk|feck|faak|fux|phuk|fook|fohk)" + B_END,
      "i",
    ),
    word: "fuck",
  },
  {
    regex: new RegExp(
      B_START + "(?:duck|funk|fudge|frick)\\s+(?:you|u|off|this|that|up)" + B_END,
      "i",
    ),
    word: "fuck",
  },

  // --- Shit and Variants (sh*t, s***, s**t, bullsh*t, sh*tty, chit, shyt) ---
  {
    regex: new RegExp(
      B_START + "(?:bull|dip|horse|bat|ape)?sh?" + M + "{1,10}t?(?:s|ty|ting)?" + B_END,
      "i",
    ),
    word: "shit",
  },
  {
    regex: new RegExp(B_START + "(?:bull|dip|horse)?sh[iy\\*\\-#@_]+t(?:s|ty|ting)?" + B_END, "i"),
    word: "shit",
  },
  {
    regex: new RegExp(B_START + "s" + M + "{2,10}" + B_END, "i"),
    word: "shit",
  },
  {
    regex: new RegExp(B_START + "(?:chit|shyt|sheit|shite|shet|schit)" + B_END, "i"),
    word: "shit",
  },
  {
    regex: new RegExp(
      B_START + "(?:holy|piece\\s+of|bull|full\\s+of|dip|horse)\\s+sheet" + B_END,
      "i",
    ),
    word: "shit",
  },

  // --- Bitch and Variants (b*tch, b****, b***ing, b**ch, bish) ---
  {
    regex: new RegExp(B_START + "b" + M + "{1,10}(?:ch|es|ing)?" + B_END, "i"),
    word: "bitch",
  },
  {
    regex: new RegExp(B_START + "b[iy\\*\\-#@_]+tch(?:es|ing)?" + B_END, "i"),
    word: "bitch",
  },
  {
    regex: new RegExp(B_START + "b" + M + "{2,10}" + B_END, "i"),
    word: "bitch",
  },
  {
    regex: new RegExp(B_START + "(?:bish|bytch|beetch|bich|biatch)" + B_END, "i"),
    word: "bitch",
  },
  {
    regex: new RegExp(B_START + "(?:son\\s+of\\s+a|dumb|stupid|crazy)\\s+beach" + B_END, "i"),
    word: "bitch",
  },

  // --- Cunt and Variants (c*nt, c***, c**t) ---
  {
    regex: new RegExp(B_START + "c" + M + "{1,10}nts?" + B_END, "i"),
    word: "cunt",
  },
  {
    regex: new RegExp(B_START + "c[u\\*\\-#@_]+nts?" + B_END, "i"),
    word: "cunt",
  },
  {
    regex: new RegExp(B_START + "c" + M + "{2,10}" + B_END, "i"),
    word: "cunt",
  },

  // --- Dick and Variants (d*ck, d***, d**k, dik) ---
  {
    regex: new RegExp(B_START + "d" + M + "{1,10}ck?s?" + B_END, "i"),
    word: "dick",
  },
  {
    regex: new RegExp(B_START + "d[iy\\*\\-#@_]+cks?" + B_END, "i"),
    word: "dick",
  },
  {
    regex: new RegExp(B_START + "d" + M + "{2,10}" + B_END, "i"),
    word: "dick",
  },
  {
    regex: new RegExp(B_START + "(?:dik|dyk|deek|d!ck)" + B_END, "i"),
    word: "dick",
  },

  // --- Pussy and Variants (p*ssy, p***, p**sy) ---
  {
    regex: new RegExp(B_START + "p" + M + "{1,10}ss?y?s?" + B_END, "i"),
    word: "pussy",
  },
  {
    regex: new RegExp(B_START + "p[u\\*\\-#@_]+ss(?:y|ies)" + B_END, "i"),
    word: "pussy",
  },
  {
    regex: new RegExp(B_START + "p" + M + "{2,10}" + B_END, "i"),
    word: "pussy",
  },

  // --- Asshole and Variants (a**hole, a*shole, a***, ashole, azzhole) ---
  {
    regex: new RegExp(B_START + "a" + M + "{1,10}(?:hole|ss)?s?" + B_END, "i"),
    word: "asshole",
  },
  {
    regex: new RegExp(B_START + "ass[\\*\\-#@_]*hole" + B_END, "i"),
    word: "asshole",
  },
  {
    regex: new RegExp(B_START + "(?:ashole|azzhole|a-hole|a\\*\\*hole)" + B_END, "i"),
    word: "asshole",
  },

  // --- Slurs (N-word, F-slur, Retard, etc.) ---
  {
    regex: new RegExp(B_START + "n" + M + "{1,10}(?:er|ga|gg|a|ers|gas)?" + B_END, "i"),
    word: "n-word",
  },
  {
    regex: new RegExp(B_START + "n[i1e\\*\\-#@_]+gg[a3e\\*\\-#@_]+r?s?" + B_END, "i"),
    word: "n-word",
  },
  {
    regex: new RegExp(B_START + "n" + M + "{2,10}" + B_END, "i"),
    word: "n-word",
  },
  {
    regex: new RegExp(B_START + "(?:n-word|the\\s+n\\s+word)" + B_END, "i"),
    word: "n-word",
  },
  {
    regex: new RegExp(B_START + "f" + M + "{1,10}(?:got|gots)" + B_END, "i"),
    word: "faggot",
  },
  {
    regex: new RegExp(B_START + "f[a@\\*\\-#@_]+gg?[o0\\*\\-#@_]+ts?" + B_END, "i"),
    word: "faggot",
  },
  {
    regex: new RegExp(B_START + "r" + M + "{1,10}(?:d|ded|ds)?" + B_END, "i"),
    word: "retard",
  },
  {
    regex: new RegExp(B_START + "r[e3\\*\\-#@_]+t[a@\\*\\-#@_]+rd(?:ed|s)?" + B_END, "i"),
    word: "retard",
  },
  {
    regex: new RegExp(B_START + "r" + M + "{2,10}" + B_END, "i"),
    word: "retard",
  },

  // --- Pure Asterisks Tokens (Google Chrome & OS Speech-to-Text Censor Masking) ---
  { regex: new RegExp(B_START + "\\*{4}" + B_END), word: "fuck" },
  { regex: new RegExp(B_START + "\\*{5}" + B_END), word: "bitch" },
  { regex: new RegExp(B_START + "\\*{6,8}" + B_END), word: "asshole" },
  { regex: new RegExp(B_START + "\\*{3}" + B_END), word: "profanity" },
  { regex: new RegExp(B_START + "\\*{2,}" + B_END), word: "profanity" },
];

// ---------------------------------------------------------------------------
// 3. PHONETIC WHISPER & SOUNDEX ENGINE
// ---------------------------------------------------------------------------

/**
 * Phonetically normalizes a token by collapsing unvoiced whisper consonants
 * and leetspeak numbers to sound equivalents.
 */
function phoneticSimplify(word: string): string {
  return word
    .toLowerCase()
    .replace(/[0o]/g, "o")
    .replace(/[1!|i]/g, "i")
    .replace(/[3e]/g, "e")
    .replace(/[4@a]/g, "a")
    .replace(/[5$s]/g, "s")
    .replace(/[7+t]/g, "t")
    .replace(/[8b]/g, "b")
    .replace(/[9g]/g, "g")
    .replace(/ph/g, "f")
    .replace(/ck|k|q/g, "k")
    .replace(/sh|ch/g, "s")
    .replace(/(.)\1+/g, "$1"); // remove duplicate consecutive characters
}

const PHONETIC_TARGETS: { code: string; word: string }[] = [
  { code: "fuk", word: "fuck" },
  { code: "fok", word: "fuck" },
  { code: "fak", word: "fuck" },
  { code: "fek", word: "fuck" },
  { code: "fukin", word: "fuck" },
  { code: "fuker", word: "fuck" },
  { code: "mothafuker", word: "fuck" },
  { code: "sit", word: "shit" },
  { code: "syt", word: "shit" },
  { code: "bulsit", word: "shit" },
  { code: "bis", word: "bitch" },
  { code: "bit", word: "bitch" },
  { code: "kunt", word: "cunt" },
  { code: "dik", word: "dick" },
  { code: "pusy", word: "pussy" },
  { code: "asol", word: "asshole" },
  { code: "niga", word: "n-word" },
  { code: "niger", word: "n-word" },
  { code: "fagot", word: "faggot" },
  { code: "retard", word: "retard" },
  { code: "bastard", word: "bastard" },
  { code: "wanker", word: "wanker" },
  { code: "twat", word: "twat" },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// 4. CORE VOICE MODERATION AUDITOR
// ---------------------------------------------------------------------------

/**
 * Checks a spoken, whispered, or transcribed string against exhaustive voice moderation rules.
 * Handles masked outputs (f***, sh*t, ****), phonetic whisper variants, multi-word phrases,
 * leetspeak, spaced characters, and international terms.
 */
export function checkVoiceModeration(transcript: string): VoiceModerationResult {
  if (!transcript || typeof transcript !== "string") {
    return { isViolating: false, matchedWord: "", category: "" };
  }

  const rawClean = transcript.trim().toLowerCase();
  if (!rawClean) {
    return { isViolating: false, matchedWord: "", category: "" };
  }

  // 1. Check Masked and Whisper Regex Patterns (Handles ****, f***, s***, b****, holy sheet, etc.)
  for (const item of MASKED_AND_WHISPER_PATTERNS) {
    if (item.regex.test(rawClean)) {
      return {
        isViolating: true,
        matchedWord: item.word,
        category: categorizeProfanity(item.word),
      };
    }
  }

  // 2. Normalize Spaced Characters (e.g. "f u c k" -> "fuck", "s h i t" -> "shit", "n i g g a" -> "nigga")
  const collapsedSpaces = rawClean.replace(
    /\b([a-z0-9*])\s+([a-z0-9*])\s+([a-z0-9*])(?:\s+([a-z0-9*]))?(?:\s+([a-z0-9*]))?\b/gi,
    (m, a, b, c, d, e) => `${a}${b}${c}${d || ""}${e || ""}`,
  );
  if (collapsedSpaces !== rawClean) {
    for (const item of MASKED_AND_WHISPER_PATTERNS) {
      if (item.regex.test(collapsedSpaces)) {
        return {
          isViolating: true,
          matchedWord: item.word,
          category: categorizeProfanity(item.word),
        };
      }
    }
  }

  // 3. Check for Exact Prohibited Words and Phrases
  const stripped = rawClean.replace(/[^a-z0-9\s]/g, " ");
  const tokens = stripped.split(/\s+/).filter(Boolean);

  // Check single tokens
  for (const token of tokens) {
    // Exact match in dictionary
    if (PROHIBITED_SET.has(token)) {
      return {
        isViolating: true,
        matchedWord: token,
        category: categorizeProfanity(token),
      };
    }

    // Repeated character normalization (e.g. "fuuuuuck" -> "fuck", "shiiiit" -> "shit")
    const collapsedRepeats = token.replace(/(.)\1{2,}/g, "$1$1");
    if (PROHIBITED_SET.has(collapsedRepeats)) {
      return {
        isViolating: true,
        matchedWord: collapsedRepeats,
        category: categorizeProfanity(collapsedRepeats),
      };
    }
    const singleRepeats = token.replace(/(.)\1+/g, "$1");
    if (PROHIBITED_SET.has(singleRepeats)) {
      return {
        isViolating: true,
        matchedWord: singleRepeats,
        category: categorizeProfanity(singleRepeats),
      };
    }

    // Leetspeak normalization (e.g. "b1tch" -> "bitch", "f@ck" -> "fuck")
    const leetDecoded = token
      .replace(/0/g, "o")
      .replace(/[1!|]/g, "i")
      .replace(/3/g, "e")
      .replace(/[@4]/g, "a")
      .replace(/[5$]/g, "s")
      .replace(/[7+]/g, "t")
      .replace(/8/g, "b");
    if (PROHIBITED_SET.has(leetDecoded)) {
      return {
        isViolating: true,
        matchedWord: leetDecoded,
        category: categorizeProfanity(leetDecoded),
      };
    }
  }

  // Check multi-word phrase matches from dictionary (e.g. "shut the fuck up", "kill yourself", "son of a bitch")
  for (const prohibited of PROHIBITED_WORDS) {
    if (prohibited.includes(" ")) {
      const escaped = escapeRegex(prohibited);
      const phraseRegex = new RegExp(`\\b${escaped}\\b`, "i");
      if (phraseRegex.test(stripped) || phraseRegex.test(rawClean)) {
        return {
          isViolating: true,
          matchedWord: prohibited,
          category: categorizeProfanity(prohibited),
        };
      }
    }
  }

  // 4. Phonetic Whisper Fallback Auditor (Detects whispered consonant signatures)
  for (const token of tokens) {
    if (token.length >= 3) {
      const phonCode = phoneticSimplify(token);
      for (const target of PHONETIC_TARGETS) {
        if (phonCode === target.code) {
          return {
            isViolating: true,
            matchedWord: target.word,
            category: categorizeProfanity(target.word),
          };
        }
      }
    }
  }

  return { isViolating: false, matchedWord: "", category: "" };
}
