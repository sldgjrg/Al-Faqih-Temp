import { resolveBookAuthorship } from "./book-catalog.js";
import { cleanCorpusDisplay } from "./corpus-display.js";

const ENGLISH_STOP_WORDS = new Set(
  "a about an and are as at be can could did do does for from had has have how i if in into is it me my of on or please tell that the their them then this to us was we what when where which who why will with would you your".split(" "),
);

const ROMAN_URDU = /\b(kya|kaise|kyun|mujhe|mera|meri|aap|ap|hain|hai|batao|bataein|yaad|rakho|shukriya|salam)\b/i;
const ROMAN_PUNJABI = /\b(tusi|tuhada|mainu|mera naa|kiven|kidda|ki haal|labhna|paiya|changa|yaad rakho)\b/i;
const ROMAN_ARABIC = /\b(marhaban|kayfa|anta|anti|ana|shukran|ma'a salama|assalamu|salam alaykum)\b/i;

const RELIGIOUS_DOMAIN = /\b(?:ahl(?:ul| al)[-\s]?bayt|allah|islam(?:ic)?|shia|shi['’]?a|imam|imamah|ma['’]?s(?:oo|u)m|prophet|nabi|rasul|quran|sunnah|hadith|ahadith|riwaya|riwayat|aqeedah|tawhid|wilayah|walayah|fiqh|wajib|mustahab|makruh|mubah|halal|haram)\b/i;
const RELIGIOUS_SCRIPT_DOMAIN = /(?:الله|الإسلام|اسلام|الشيعة|شیعہ|أهل البيت|اہل بیت|إمام|امام|القرآن|قرآن|حديث|حدیث|رواية|روایت|توحيد|توحید|إمامة|امامت|ولاية|ولایت|رجعة|رجعت|بداء|برزخ|قيامة|قیامت|تقليد|تقلید|اجتهاد|فقه|حلال|حرام|واجب|مستحب|مكروه|زكاة|زکات|خمس|حج|عمرة|نماز|صلاة|صوم|نكاح|نکاح|طلاق)/u;

const RELIGIOUS_FOLLOW_UP = /^(?:(?:no|nah|yes|yeah|okay|ok|please)\s+)*(?:now\s+)?(?:find|show|give|bring|search(?:\s+for)?|cite|source)\s+(?:(?:me|us)\s+)?(?:(?:the|those|some|any)\s+)?(?:hadith|ahadith|narration|narrations|riwaya|riwayat|reports?|sources?)(?:\s+(?:on|about|for|it|that|this|them))?[.!?]*$/i;

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

const MAHDI_QUERY = /\b(?:imam(?:-e)?\s+(?:zaman|zamana)|imam\s+of\s+the\s+age|sahib(?:-e|\s+az)?[-\s]?zaman|sahib\s+al[-\s]?zaman|imam\s+mahdi|al[-\s]?mahdi|al[-\s]?qa[’'`]?im|qaim)\b/i;
const MAHDI_SCRIPT_QUERY = /(?:امام زمان|صاحب الزمان|صاحب العصر|المهدي|القائم)/u;

const RETRIEVAL_FACETS = [
  {
    name: "appearance",
    pattern: /\b(?:what\s+(?:does|did|will)\s+(?:imam|the\s+imam|mahdi|the\s+mahdi|qaim|the\s+qaim|he)\s+look\s+like|how\s+(?:does|did|will)\s+(?:imam|the\s+imam|mahdi|the\s+mahdi|qaim|the\s+qaim|he)\s+look|look(?:s|ed)?\s+like|physical\s+(?:appearance|description|features?)|describe\s+(?:his|the\s+imam(?:'s)?|imam\s+mahdi(?:'s)?|al[-\s]?mahdi(?:'s)?|al[-\s]?qaim(?:'s)?)\s+(?:appearance|features?|face|body)|appearance\s+of\s+(?:imam|the\s+imam|imam\s+mahdi|mahdi|the\s+mahdi|al[-\s]?qaim|the\s+qaim)|features?|complexion|forehead|eyebrows?|eyes?|nose|cheeks?|mole|beard|hair|curly|wavy|stature|height|build|shoulders?|young-looking|age appearance)\b/i,
    scriptPattern: /(?:كيف يبدو|صفته|صفاته|حليته|حليته|شكله|وجهه|لونه|جبهته|حاجبه|عينيه|انفه|خده|خال|لحيته|شعره|جعد|قامته|منكبيه)/u,
    strict: true,
    terms: [
      "face", "countenance", "complexion", "forehead",
      "eyebrows", "eyes", "nose", "cheek", "mole", "beard", "hair", "curly", "wavy",
      "stature", "height", "build", "shoulders",
      "وجه", "لون", "جبهة", "حاجب", "عين", "أنف", "خد", "خال", "لحية", "شعر", "جعد", "قامة", "منكبان",
    ],
    resultLimit: 10,
    maxDirectResults: 6,
    maxFamilyMembers: 5,
    maxPerChapter: 3,
    secondaryDirectRatio: 0.7,
    directFloorRatio: 0.46,
    relatedFloorRatio: 0.36,
    disableFocus: true,
  },
  {
    name: "identity",
    pattern: /\b(?:who\s+(?:is|was|will\s+be)|identity|lineage|genealogy|father|mother|parents?|ancestor|descendant|son\s+of|name|title|kunya|which imam|twelfth imam)\b/i,
    scriptPattern: /(?:من هو|من يكون|نسبه|ابوه|امه|والده|اسمه|لقبه|كنيته|الامام الثاني عشر)/u,
    strict: false,
    terms: ["lineage", "name", "father", "son", "descendant", "progeny", "twelfth imam"],
    resultLimit: 10,
    maxDirectResults: 5,
    maxFamilyMembers: 5,
    maxPerChapter: 3,
    secondaryDirectRatio: 0.35,
    directFloorRatio: 0.32,
    relatedFloorRatio: 0.28,
    disableFocus: true,
  },
  {
    name: "method",
    pattern: /\b(?:how\s+(?:to|do|does|should|can|could|did|would)|how\s+(?:is|are)\b.{0,60}\b(?:done|performed|recited|made)|(?:teach|show)\s+me|method|procedure|steps?|perform|recite|posture|position|demonstrat(?:e|ed|ion))\b/i,
    scriptPattern: /(?:كيف|علمني|طريقة|خطوات|كيفية|أؤدي|اصلي|أصلي|کیسے|طریقہ|سکھائیں)/u,
    strict: false,
    terms: [
      "description", "describe", "demonstrate", "method", "procedure", "steps", "manner",
      "perform", "first", "then", "wash", "wipe", "recite", "bow", "prostrate",
      "stand", "sit", "slaughter", "shave",
    ],
    resultLimit: 2,
    maxDirectResults: 4,
    maxFamilyMembers: 7,
    familyMinRelation: 0.46,
    maxPerChapter: 3,
    minUniqueResults: 1,
    maxUniqueResults: 1,
    parallelReserve: 6,
    secondaryDirectRatio: 0.68,
  },
  {
    name: "time-definition",
    pattern: /\b(?:what\s+time|when\s+(?:does|do|did|is|are|should|can|may)|start(?:s|ing)?\s+time|end(?:s|ing)?\s+time|earliest|latest|deadline|time\s+(?:for|of|to)|how\s+(?:early|late|long)|until\s+when)\b/i,
    scriptPattern: /(?:متى|وقت|کب|کس وقت|کِس وقت|کدوں)/u,
    strict: false,
    terms: [
      "time", "begin", "start", "end", "until", "before", "after",
      "appear", "sign", "criterion", "light", "darkness", "horizon",
    ],
    resultLimit: 6,
    maxDirectResults: 5,
    maxFamilyMembers: 5,
    maxPerChapter: 4,
    secondaryDirectRatio: 0.72,
    directFloorRatio: 0.4,
    relatedFloorRatio: 0.32,
  },
  {
    name: "signs-events",
    pattern: /\b(?:signs?|before\s+(?:the\s+)?(?:appearance|reappearance|rise)|when\s+will|emergence|reappearance|advent|sufyani|dajjal|yamani)\b/i,
    scriptPattern: /(?:علامات|قبل الظهور|الظهور|الخروج|السفياني|الدجال|اليماني)/u,
    strict: false,
    terms: [],
    resultLimit: 10,
    maxDirectResults: 6,
    maxFamilyMembers: 5,
    maxPerChapter: 3,
    secondaryDirectRatio: 0.55,
  },
  {
    name: "conduct-deeds",
    pattern: /\b(?:what\s+will\s+he\s+do|how\s+will\s+he\s+(?:act|rule)|deeds?|conduct|government|rule|justice|judge|army|companions?|actions?|practice|manner)\b/i,
    scriptPattern: /(?:ماذا يفعل|كيف يحكم|سيرته|أعماله|حكمه|عدله|أصحابه)/u,
    strict: false,
    terms: [],
    resultLimit: 10,
    maxDirectResults: 5,
    maxFamilyMembers: 5,
    maxPerChapter: 3,
    secondaryDirectRatio: 0.55,
    relatedFloorRatio: 0.58,
  },
  {
    name: "legal-practical",
    pattern: /\b(?:allowed|permitted|permissible|valid|invalid|obligatory|recommended|forbidden|haram|halal|najis|tahir|breaks?|invalidates?|ruling|(?:can|could|may|should|must)\s+(?!you\b)\S+|what\s+should\s+i\s+do)\b/i,
    scriptPattern: /(?:يجوز|لا يجوز|واجب|مستحب|حرام|حلال|نجس|طاهر|حكم|کیا میں|جائز|ناجائز)/u,
    strict: false,
    terms: [],
    resultLimit: 10,
    maxDirectResults: 4,
    maxFamilyMembers: 5,
    maxPerChapter: 3,
    secondaryDirectRatio: 0.68,
  },
];

function entityExpansion(query, normalized) {
  const hasMahdiEntity = MAHDI_QUERY.test(normalized) || MAHDI_SCRIPT_QUERY.test(query);
  if (hasMahdiEntity) {
    const needsCanonicalAlias = /\b(?:imam(?:-e)?\s+(?:zaman|zamana)|imam\s+of\s+the\s+age|sahib(?:-e|\s+az)?[-\s]?zaman|sahib\s+al[-\s]?zaman)\b/i.test(normalized)
      || /(?:امام زمان|صاحب الزمان|صاحب العصر)/u.test(query);
    return {
      text: needsCanonicalAlias ? "Imam al-Mahdi al-Qaim" : "",
      terms: ["mahdi", "qaim", "zaman", "master of the age", "man of this matter", "sahib al-amr", "المهدي", "القائم", "صاحب الزمان", "صاحب الامر"],
      detected: true,
    };
  }
  const namedImam = normalized.match(/\b(?:who\s+(?:is|was)\s+|tell\s+me\s+about\s+)?imam\s+([\p{L}'-]+(?:\s+[\p{L}'-]+){0,3})/iu);
  return namedImam
    ? { text: "", terms: [namedImam[1]], detected: true }
    : { text: "", terms: [], detected: false };
}

function requestedCollection(query, manifest) {
  const normalizedQuery = normalize(query);
  return (manifest?.strings?.collections || [])
    .map((collection) => ({ collection, normalized: normalize(collection) }))
    .filter(({ normalized }) => normalized && normalizedQuery.includes(normalized))
    .sort((left, right) => right.normalized.length - left.normalized.length)[0]?.normalized || "";
}

function shouldAnalyzeQuery(original, normalized, facet, manifest) {
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const knownCorpusTerms = corpusTermCount(original, manifest);
  if (facet?.name === "time-definition") return true;
  if (facet?.name === "method") {
    return wordCount > 6;
  }
  if (facet?.name === "legal-practical") {
    return knownCorpusTerms < 2
      || wordCount > 5
      || /\b(?:can|could|may|should|must|another|someone|work|job|sell|buy|under|without|except|all|every|circumstances?)\b/i.test(normalized);
  }
  // Named concepts and transliterations are often absent as an exact phrase
  // even when their reports are present under descriptive wording.  Send
  // short, unfamiliar general corpus questions through the semantic planner
  // instead of treating an empty exact-match search as authoritative.
  return knownCorpusTerms < 2 && wordCount >= 2;
}

export function buildReligiousSearchPlan(query, manifest) {
  const original = String(query || "").trim();
  const normalized = normalize(original);
  const signsBeforeAppearance = /\b(?:signs?|events?|conditions?)\b.{0,48}\b(?:before|preceding|prior\s+to)\b.{0,32}\b(?:appearance|reappearance|advent|rise|emergence)\b/i.test(normalized)
    || /(?:علامات|أحداث).{0,30}(?:قبل|تسبق).{0,24}(?:الظهور|الخروج)/u.test(original);
  const timeDefinitionFacet = RETRIEVAL_FACETS.find((candidate) => candidate.name === "time-definition");
  const asksForTimeBoundary = timeDefinitionFacet.pattern.test(normalized)
    || timeDefinitionFacet.scriptPattern.test(original);
  const facet = signsBeforeAppearance
    ? RETRIEVAL_FACETS.find((candidate) => candidate.name === "signs-events")
    : asksForTimeBoundary
      ? timeDefinitionFacet
      : RETRIEVAL_FACETS.find((candidate) => (
      candidate.pattern.test(normalized) || candidate.scriptPattern.test(original)
      )) || null;
  const entity = entityExpansion(original, normalized);
  const requiredCollection = requestedCollection(original, manifest);
  const expansionParts = [original, entity.text];

  return {
    searchQuery: expansionParts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
    entityDetected: entity.detected,
    retrievalProfile: {
      version: 3,
      facet: facet?.name || "general",
      needsQueryAnalysis: shouldAnalyzeQuery(original, normalized, facet, manifest),
      strictFacet: Boolean(facet?.strict),
      requiredTerms: facet?.strict ? facet.terms : [],
      boostTerms: facet?.terms || [],
      entityTerms: entity.terms,
      requireEntityMatch: entity.detected,
      requireFocusCoverage: true,
      requireFocusFacetProximity: facet?.name === "method" || facet?.name === "time-definition",
      minimumTitleFocusFacetDensity: facet?.name === "method" || facet?.name === "time-definition" ? 0.14 : 0,
      minimumFocusCoverage: 0.6,
      requiredCollection,
      secondaryQuery: "",
      secondaryQueries: [],
      secondaryBoostTerms: [],
      resultLimit: Math.min(10, facet?.resultLimit || 10),
      seedLimit: 16,
      seedCount: 8,
      candidateLimit: 360,
      expandedLimit: 560,
      perSeed: 36,
      familyDepth: 2,
      familyPropagationThreshold: 0.48,
      maxFamilyMembers: facet?.maxFamilyMembers || 5,
      familyMinRelation: facet?.familyMinRelation || 0.5,
      minUniqueResults: facet?.minUniqueResults || (facet?.name === "method" ? 2 : 3),
      maxUniqueResults: facet?.maxUniqueResults || 7,
      parallelReserve: facet?.parallelReserve ?? (facet?.name === "method" ? 4 : 3),
      uniqueFloorRatio: facet?.uniqueFloorRatio || (facet?.strict ? 0.34 : 0.38),
      clusterOverlapThreshold: facet?.clusterOverlapThreshold || 0.72,
      maxDirectResults: facet?.maxDirectResults || 5,
      maxPerChapter: facet?.maxPerChapter || 3,
      disableFocus: Boolean(facet?.disableFocus),
      secondaryDirectRatio: facet?.secondaryDirectRatio || 0.62,
      directFloorRatio: facet?.directFloorRatio || 0.46,
      relatedFloorRatio: facet?.relatedFloorRatio || 0.36,
      secondaryPromotionLimit: 4,
    },
  };
}

export function applyQueryAnalysisToSearchPlan(searchQuery, retrievalProfile = {}, analysis) {
  if (!analysis?.retrievalQuery) {
    return {
      searchQuery: String(searchQuery || "").trim(),
      retrievalProfile: { ...retrievalProfile, rewritten: true },
    };
  }
  const evidenceQueries = (Array.isArray(analysis.evidenceQueries) ? analysis.evidenceQueries : [])
    .map((entry) => typeof entry === "string" ? entry : entry?.query)
    .map((entry) => String(entry || "").trim())
    .filter((entry, index, all) => entry && all.indexOf(entry) === index)
    .slice(0, 4);
  const subjectTermGroups = analysis.evidenceSubjects?.length
    ? analysis.evidenceSubjects
    : analysis.exactSubjects;
  const answerCriteria = Array.isArray(analysis.answerCriteria)
    ? analysis.answerCriteria.filter(Boolean)
    : [];
  const expandedQuery = [
    searchQuery,
    analysis.retrievalQuery,
    ...answerCriteria,
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const secondaryQueries = [
    ...evidenceQueries,
    ...(Array.isArray(retrievalProfile.secondaryQueries) ? retrievalProfile.secondaryQueries : []),
  ].filter((entry, index, all) => entry && all.indexOf(entry) === index).slice(0, 4);
  const requireSubjectMatch = subjectTermGroups?.length > 0
    && analysis.confidence >= 0.55;
  return {
    searchQuery: expandedQuery,
    retrievalProfile: {
      ...retrievalProfile,
      rewritten: true,
      relation: analysis.relation || retrievalProfile.relation || "general",
      answerCriteria,
      boostTerms: [
        ...(Array.isArray(retrievalProfile.boostTerms) ? retrievalProfile.boostTerms : []),
        ...answerCriteria.flatMap((entry) => entry.split(/\s+/).filter(Boolean)),
      ],
      evidenceRoles: (analysis.evidenceQueries || [])
        .map((entry) => typeof entry === "object" ? String(entry?.role || "") : "")
        .filter(Boolean)
        .slice(0, 4),
      evidenceQuerySubjects: (analysis.evidenceQueries || [])
        .map((entry) => Array.isArray(entry?.requiredSubjects) ? entry.requiredSubjects : [])
        .slice(0, 4),
      subjectTermGroups,
      requireSubjectMatch,
      minimumSubjectCoverage: 0.4,
      requireFocusCoverage: false,
      secondaryQuery: secondaryQueries[0] || "",
      secondaryQueries,
      secondaryBoostTerms: secondaryQueries.flatMap((entry) => entry.split(/\s+/).filter(Boolean)),
      secondaryPromotionLimit: Math.max(3, Math.min(4, secondaryQueries.length || 3)),
    },
  };
}

function corpusTermCount(query, manifest) {
  const lexicon = new Set((manifest?.lexicon || []).map((entry) => entry[0]));
  if (!lexicon.size) return 0;
  return normalize(query)
    .split(/\s+/)
    .filter((token, index, all) => token.length > 2
      && !ENGLISH_STOP_WORDS.has(token)
      && all.indexOf(token) === index
      && lexicon.has(token))
    .length;
}

function shouldRetrieveNarrations(query, manifest) {
  const normalized = normalize(query);
  const explicitEvidence = /\b(?:hadith|ahadith|narration|narrations|riwaya|riwayat|report from|source for|what did (?:the )?imam|did (?:the )?imam say)\b/i.test(normalized)
    || /(?:حدیث|حديث|روایت|رواية|امام نے کیا فرمایا|قال الامام)/u.test(query);
  if (explicitEvidence) return true;

  const practice = /\b(?:wudu|wudhu|wuzu|ablution|prayer|pray|salah|salat|namaz|fast|sawm|zakat|khums|nikah|talaq|taqiyya|taqiyyah|halal|haram|najis|tahir|purity|ghusl|tayammum)\b/i.test(normalized)
    || /(?:وضو|وضوء|نماز|صلاة|زکات|زكاة|خمس|نکاح|نكاح|تقیہ|تقية|حلال|حرام|نجس|طاهر|غسل|تيمم)/u.test(query);
  const practicalQuestion = /\b(?:how|what|who|when|where|why|can|could|may|should|must|is|are|does|do|did|allowed|valid|invalid|break|invalidate|ruling|author|wrote|compiled)\b/i.test(normalized)
    || /[?؟]/u.test(query);
  const inquiry = practicalQuestion
    || /\b(?:tell|explain|find|show|give|describe|search)\b/i.test(normalized);
  const corpusTerms = corpusTermCount(query, manifest);
  const religiousQuestion = (RELIGIOUS_DOMAIN.test(normalized) || RELIGIOUS_SCRIPT_DOMAIN.test(query))
    && inquiry;
  const normativeQuestion = !/^\s*(?:can|could|would|will)\s+you\b/i.test(normalized)
    && (
      /\b(?:can|could|may|should|must)\s+(?!you\b)(?:\S+\s+){0,12}\S+/i.test(normalized)
      || /\b(?:allowed|permitted|permissible|forbidden|obligatory|recommended|valid|invalid|haram|halal|ruling)\b/i.test(normalized)
      || /\b(?:is|are|was|were)\b.{0,100}\b(?:allowed|permitted|permissible|forbidden|obligatory|recommended|valid|invalid)\b/i.test(normalized)
    );
  return religiousQuestion
    || (practice && inquiry)
    || normativeQuestion
    || (corpusTerms >= 1 && (inquiry || normalized.split(/\s+/).length <= 5));
}

function previousUserQuestion(conversation) {
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user" || typeof message.text !== "string") continue;
    const text = message.text.trim();
    if (!text || RELIGIOUS_FOLLOW_UP.test(text)) continue;
    return text;
  }
  return "";
}

export function contextualizeReligiousQuery(query, conversation) {
  const current = String(query || "").trim();
  if (!RELIGIOUS_FOLLOW_UP.test(current)) return current;
  const previous = previousUserQuestion(conversation);
  return previous ? `${previous}. ${current}` : current;
}

export function resolveLocalConversation(query, conversation, globalMemory, manifest) {
  const switchedLanguage = requestedLanguage(query);
  const detectedLanguage = detectConversationLanguage(query);
  const rememberedLanguage = conversation?.memory?.language || globalMemory?.profile?.language;
  const language = switchedLanguage
    || (detectedLanguage !== "english" ? detectedLanguage : rememberedLanguage)
    || detectedLanguage;
  const memoryUpdate = extractMemory(query)
    || (switchedLanguage ? { key: "language", value: switchedLanguage } : null);
  const contextualQuery = contextualizeReligiousQuery(query, conversation);
  const bookInfo = resolveBookAuthorship(contextualQuery, manifest);
  if (bookInfo) {
    return {
      ...bookInfo,
      language,
      memoryUpdate,
    };
  }
  const religiousSearch = buildReligiousSearchPlan(contextualQuery, manifest);
  if (religiousSearch.entityDetected || shouldRetrieveNarrations(contextualQuery, manifest)) {
    return {
      intent: "religious-search",
      language,
      searchQuery: religiousSearch.searchQuery,
      synthesisQuery: contextualQuery,
      retrievalProfile: religiousSearch.retrievalProfile,
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
