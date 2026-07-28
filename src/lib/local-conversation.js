import { cleanCorpusDisplay } from "./corpus-display.js";

const ENGLISH_STOP_WORDS = new Set(
  "a about an and are as at be can could did do does for from had has have how i if in into is it me my of on or please tell that the their them then this to us was we what when where which who why will with would you your".split(" "),
);

const ROMAN_URDU = /\b(kya|kaise|kyun|mujhe|mera|meri|aap|ap|hain|hai|batao|bataein|yaad|rakho|shukriya|salam)\b/i;
const ROMAN_PUNJABI = /\b(tusi|tuhada|mainu|mera naa|kiven|kidda|ki haal|labhna|paiya|changa|yaad rakho)\b/i;
const ROMAN_ARABIC = /\b(marhaban|kayfa|anta|anti|ana|shukran|ma'a salama|assalamu|salam alaykum)\b/i;

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function detectConversationLanguage(query) {
  const value = normalize(query);
  if (/[\u0600-\u06ff]/u.test(query)) {
    if (/[ٹڈڑںھہےکگپچژ]/u.test(query)) {
      return /(?:تسی|مینوں|کیویں|کدّاں|آں|او|لبھ)/u.test(query) ? "punjabi" : "urdu";
    }
    return "arabic";
  }
  if (ROMAN_PUNJABI.test(value)) return "romanPunjabi";
  if (ROMAN_URDU.test(value)) return "romanUrdu";
  if (ROMAN_ARABIC.test(value)) return "arabic";
  return "english";
}

function requestedLanguage(query) {
  const value = normalize(query);
  if (/\b(?:speak|reply in|talk in)\s+urdu\b/.test(value)) return "romanUrdu";
  if (/\b(?:speak|reply in|talk in)\s+punjabi\b/.test(value)) return "romanPunjabi";
  if (/\b(?:speak|reply in|talk in)\s+arabic\b/.test(value)) return "arabic";
  if (/\b(?:speak|reply in|talk in)\s+english\b/.test(value)) return "english";
  if (/اردو میں|اردو وچ/u.test(query)) return "urdu";
  if (/پنجابی میں|پنجابی وچ/u.test(query)) return "punjabi";
  if (/بالعربية|تكلم العربية/u.test(query)) return "arabic";
  return "";
}

function extractMemory(query) {
  const patterns = [
    { key: "name", pattern: /\b(?:my name is|call me)\s+([\p{L}' -]{2,40})[.!]?$/iu },
    { key: "name", pattern: /\bmera naam\s+([\p{L}' -]{2,40})\s+hai\b/iu },
    { key: "name", pattern: /میرا نام\s+([\p{L}' -]{2,40})\s+ہے/u },
    { key: "name", pattern: /اسمي\s+([\p{L}' -]{2,40})/u },
    { key: "preference", pattern: /\b(?:i prefer|i like)\s+(.{2,100})$/iu },
    { key: "preference", pattern: /\bmujhe\s+(.{2,80})\s+pasand hai\b/iu },
  ];
  for (const { key, pattern } of patterns) {
    const match = String(query || "").match(pattern);
    if (match) return { key, value: match[1].trim().replace(/[.!?]+$/, "") };
  }
  const explicit = String(query || "").match(/\bremember(?: that)?\s+(.{2,160})$/iu)
    || String(query || "").match(/\byaad rakho(?: ke| کہ)?\s+(.{2,160})$/iu)
    || String(query || "").match(/یاد رکھو(?: کہ)?\s+(.{2,160})$/u)
    || String(query || "").match(/تذكّر(?: أن)?\s+(.{2,160})$/u);
  return explicit ? { key: "fact", value: explicit[1].trim() } : null;
}

export function applyMemoryUpdate(memory, update, conversationId) {
  if (!update) return memory;
  const next = {
    profile: { ...(memory?.profile || {}) },
    facts: [...(memory?.facts || [])],
  };
  if (update.key === "name" || update.key === "preference" || update.key === "language") {
    next.profile[update.key] = update.value;
  } else if (!next.facts.some((fact) => normalize(fact.value) === normalize(update.value))) {
    next.facts.push({ value: update.value, conversationId, updatedAt: Date.now() });
    next.facts = next.facts.slice(-24);
  }
  return next;
}

function expandedReligiousQuery(query) {
  const normalized = normalize(query);
  const imamZamana = /\b(?:imam(?:-e)?\s+(?:zaman|zamana)|imam\s+of\s+the\s+age|sahib(?:-e|\s+az)?[-\s]?zaman|sahib\s+al[-\s]?zaman)\b/i.test(normalized)
    || /(?:امام زمان|صاحب الزمان|صاحب العصر)/u.test(query);
  if (imamZamana) {
    const appearance = /\b(?:look like|appearance|physical description|describe|hair|face|stature|height)\b/i.test(normalized)
      || /(?:کیسے دکھتے|حلیہ|صفات ظاہری|كيف يبدو|صفته)/u.test(query);
    return appearance
      ? "Imam al-Mahdi al-Qaim Sahib al-Zaman appearance face hair stature physical description"
      : "Imam al-Mahdi al-Qaim Sahib al-Zaman identity lineage role twelve imams";
  }

  const namedImam = normalized.match(/\bwho (?:is|was) imam\s+([\p{L}'-]+(?:\s+[\p{L}'-]+){0,3})/iu)
    || normalized.match(/\btell me about imam\s+([\p{L}'-]+(?:\s+[\p{L}'-]+){0,3})/iu);
  if (namedImam) return `${query} identity lineage role teachings`;
  return "";
}

function shouldRetrieveNarrations(query) {
  const normalized = normalize(query);
  const explicitEvidence = /\b(?:hadith|ahadith|narration|narrations|riwaya|riwayat|report from|source for|what did (?:the )?imam|did (?:the )?imam say)\b/i.test(normalized)
    || /(?:حدیث|حديث|روایت|رواية|امام نے کیا فرمایا|قال الامام)/u.test(query);
  if (explicitEvidence) return true;

  const practice = /\b(?:wudu|wudhu|wuzu|ablution|prayer|pray|salah|salat|namaz|fast|sawm|zakat|khums|nikah|talaq|taqiyya|taqiyyah|halal|haram|najis|tahir|purity|ghusl|tayammum)\b/i.test(normalized)
    || /(?:وضو|وضوء|نماز|صلاة|زکات|زكاة|خمس|نکاح|نكاح|تقیہ|تقية|حلال|حرام|نجس|طاهر|غسل|تيمم)/u.test(query);
  const practicalQuestion = /\b(?:how|what|when|where|why|can|could|may|should|must|is|are|does|do|did|allowed|valid|invalid|break|invalidate|ruling)\b/i.test(normalized)
    || /[?؟]/u.test(query);
  return practice && practicalQuestion;
}

export function resolveLocalConversation(query, conversation, globalMemory) {
  const switchedLanguage = requestedLanguage(query);
  const detectedLanguage = detectConversationLanguage(query);
  const rememberedLanguage = conversation?.memory?.language || globalMemory?.profile?.language;
  const language = switchedLanguage
    || (detectedLanguage !== "english" ? detectedLanguage : rememberedLanguage)
    || detectedLanguage;
  const memoryUpdate = extractMemory(query)
    || (switchedLanguage ? { key: "language", value: switchedLanguage } : null);
  const expanded = expandedReligiousQuery(query);

  if (expanded || shouldRetrieveNarrations(query)) {
    return {
      intent: "religious-search",
      language,
      searchQuery: expanded || String(query || "").trim(),
      memoryUpdate,
    };
  }

  return {
    intent: "local-llm",
    language,
    memoryUpdate,
  };
}

function meaningfulWords(value) {
  return normalize(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !ENGLISH_STOP_WORDS.has(word) && !/^(explain|first|second|one|hello|thanks)$/.test(word));
}

export function updateConversationMemory(conversation, query, intent, language) {
  const existing = conversation?.memory || {};
  const topics = [...(existing.topics || []), ...meaningfulWords(query)]
    .filter((topic, index, all) => all.indexOf(topic) === index)
    .slice(-12);
  return {
    ...existing,
    language: language || existing.language || detectConversationLanguage(query),
    lastIntent: intent,
    topics,
    summary: topics.slice(-6).join(", "),
    updatedAt: Date.now(),
  };
}

export function generateConversationTitle(conversation, latestQuery = "", results = []) {
  const allUserText = [
    ...(conversation?.messages || []).filter(({ role }) => role === "user").map(({ text }) => text),
    latestQuery,
  ].join(" ");
  const normalized = normalize(allUserText);
  if (/\b(well|kuan|khooh|bir)\b/.test(normalized) && /\b(dog|kutta|kalb)\b/.test(normalized)) {
    return /\b(wudu|wudhu|ablution)\b/.test(normalized) ? "Dog in a Well and Wudhu" : "Dog in a Well";
  }
  if (/\b(how|teach|method)\b/.test(normalized) && /\b(pray|prayer|salah|salat|namaz)\b/.test(normalized)) {
    return "Learning the Imam’s Prayer";
  }
  const words = meaningfulWords(allUserText).filter((word, index, all) => all.indexOf(word) === index);
  if (words.length) {
    return words
      .slice(-5)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .slice(0, 52);
  }
  if (results[0]?.chapter || results[0]?.title) {
    return cleanCorpusDisplay(results[0].chapter || results[0].title)
      .replace(/^Al-[^:]+:\s*/i, "")
      .slice(0, 52);
  }
  return "New inquiry";
}
