import { resolveBookAuthorship } from "./book-catalog.js";
import { cleanCorpusDisplay } from "./corpus-display.js";

const ENGLISH_STOP_WORDS = new Set(
  "a about an and are as at be been can concerning could did do does for from had has have how i if in into is it may me must my narrated of on or please regarding related reported said should tell that the their them then this to us was we what when where which who why will with would you your".split(" "),
);

const GENERIC_QUERY_WORDS = new Set(
  "answer describe explanation find give help information instructions look lookup manner method perform procedure provide search show steps tell".split(" "),
);

const CORPUS_VOCABULARY_CACHE = new WeakMap();

// These are word-level glosses, not query-specific answers. They let the
// retriever compose an English evidence query from common Roman-Arabic
// vocabulary even when a published translation does not preserve the
// transliterated wording.
const ROMAN_ARABIC_GLOSSES = new Map(Object.entries({
  aql: "intellect",
  akhlaq: "character",
  akhirah: "hereafter",
  barzakh: "intermediate realm",
  dua: "supplication",
  fajr: "dawn",
  ghair: "non",
  ghusl: "ritual bath",
  hayat: "life",
  ilm: "knowledge",
  imamah: "leadership",
  najasah: "impurity",
  najis: "impure",
  nikah: "marriage",
  nikkah: "marriage",
  quddus: "holy",
  qudus: "holy",
  rooh: "spirit",
  rouh: "spirit",
  ruh: "spirit",
  sayed: "Hashimite descendant",
  sayyid: "Hashimite descendant",
  sayyida: "Hashimite woman",
  sayyidah: "Hashimite woman",
  shabeeh: "representation depiction reenactment",
  shabih: "representation depiction reenactment",
  syed: "Hashimite descendant",
  syedah: "Hashimite woman",
  syedani: "Hashimite woman",
  tasveer: "picture image depiction",
  tasvir: "picture image depiction",
  salah: "prayer",
  salat: "prayer",
  sawm: "fasting",
  taqwa: "piety",
  taharah: "purity",
  tawhid: "oneness",
  wafat: "death",
  wilayah: "authority",
  wiladah: "birth",
  wilayat: "authority",
  zakat: "alms",
}));

const ROMAN_ARABIC_CONNECTORS = new Set(
  "al el e i ul ud us as ash ar ur uz ka kay ke ki ko se aur mein main".split(" "),
);

const ENGLISH_PRENOMINAL_ADJECTIVES = new Set(
  "holy sacred true false lawful unlawful pure impure spiritual physical divine eternal final first last major minor".split(" "),
);

// Corpus translations frequently identify an Imam by a kunya and lineage
// while users use the familiar epithet. Keep those names as entity knowledge
// so every relation (birth, sayings, appearance, death, and so on) benefits.
const IMAM_NAME_GLOSSES = new Map(Object.entries({
  ali: "Amir al-Mu'minin Ali ibn Abi Talib",
  hasan: "Abu Muhammad al-Hasan ibn Ali",
  hassan: "Abu Muhammad al-Hassan ibn Ali",
  husayn: "Abu Abdullah al-Husayn ibn Ali",
  hussain: "Abu Abdullah al-Husayn ibn Ali",
  sajjad: "Ali ibn al-Husayn Zayn al-Abidin",
  baqir: "Abu Jafar Muhammad ibn Ali",
  sadiq: "Abu Abdullah Jafar ibn Muhammad",
  kazim: "Abu al-Hassan Musa ibn Jafar",
  rida: "Abu al-Hassan Ali ibn Musa al-Rida",
  ridha: "Abu al-Hassan Ali ibn Musa al-Ridha",
  jawad: "Abu Jafar Muhammad ibn Ali the Second",
  hadi: "Abu al-Hassan Ali ibn Muhammad",
  askari: "Abu Muhammad al-Hassan ibn Ali",
}));

// Alternate spellings actually used across the corpus metadata. Keeping
// these with entity resolution lets every relation query (birth, death,
// sayings, appearance, and so on) survive transliteration differences.
const IMAM_SEARCH_ALIASES = new Map(Object.entries({
  ali: ["Imam Ali", "Ali ibn Abi Talib"],
  hasan: ["Imam Hasan", "Imam al-Hasan"],
  hassan: ["Imam Hassan", "Imam al-Hassan"],
  husayn: ["Imam Husayn", "Imam al-Husayn"],
  hussain: ["Imam Hussain", "Imam al-Husayn"],
  sajjad: ["Imam al-Sajjad", "Zayn al-Abidin"],
  baqir: ["Imam al-Baqir", "Abu Jafar Muhammad ibn Ali"],
  sadiq: ["Imam al-Sadiq", "Jafar ibn Muhammad"],
  kazim: ["Imam al-Kazim", "Imam al-Kadhim", "Musa ibn Jafar"],
  rida: ["Ar Ridha", "Imam al-Ridha", "Ali ibn Musa al-Rida"],
  ridha: ["Ar Ridha", "Imam al-Ridha", "Ali ibn Musa al-Rida"],
  jawad: ["Imam al-Jawad", "Muhammad ibn Ali al-Jawad"],
  hadi: ["Imam al-Hadi", "Ali ibn Muhammad al-Hadi"],
  askari: ["Imam al-Askari", "Abu Muhammad al-Hassan ibn Ali"],
}));

const ROMAN_URDU = /\b(kya|kaise|kyun|mujhe|mera|meri|aap|ap|hain|hai|batao|bataein|yaad|rakho|shukriya|salam|syedani|syedah|ghair|nikah|nikkah|tasveer|shabih|shabeeh)\b/i;
const ROMAN_PUNJABI = /\b(tusi|tuhada|mainu|mera naa|kiven|kidda|ki haal|labhna|paiya|changa|yaad rakho)\b/i;
const ROMAN_ARABIC = /\b(marhaban|kayfa|anta|anti|ana|shukran|ma'a salama|assalamu|salam alaykum)\b/i;

const RELIGIOUS_DOMAIN = /\b(?:ahl(?:ul| al)[-\s]?bayt|allah|islam(?:ic)?|shia|shi['’]?a|imam|imamah|ma['’]?s(?:oo|u)m|prophet|nabi|rasul|quran|sunnah|hadith|ahadith|riwaya|riwayat|aqeedah|tawhid|wilayah|walayah|fiqh|wajib|mustahab|makruh|mubah|halal|haram|nikah|nikkah|sayyid|sayyida|sayyidah|syed|syedah|syedani|azadari|majlis|karbala|shabih|shabeeh|tasveer|tasvir)\b/i;
const RELIGIOUS_SCRIPT_DOMAIN = /(?:الله|الإسلام|اسلام|الشيعة|شیعہ|أهل البيت|اہل بیت|إمام|امام|القرآن|قرآن|حديث|حدیث|رواية|روایت|توحيد|توحید|إمامة|امامت|ولاية|ولایت|رجعة|رجعت|بداء|برزخ|قيامة|قیامت|تقليد|تقلید|اجتهاد|فقه|حلال|حرام|واجب|مستحب|مكروه|زكاة|زکات|خمس|حج|عمرة|نماز|صلاة|صوم|نكاح|نکاح|طلاق)/u;

const RELIGIOUS_FOLLOW_UP = /^(?:(?:no|nah|yes|yeah|okay|ok|please)\s+)*(?:now\s+)?(?:find|show|give|bring|search(?:\s+for)?|cite|source)\s+(?:(?:me|us)\s+)?(?:(?:the|those|some|any)\s+)?(?:hadith|ahadith|narration|narrations|riwaya|riwayat|reports?|sources?)(?:\s+(?:on|about|for|it|that|this|them))?[.!?]*$/i;

// Practical questions are often written as fragments ("X happened what to
// do") rather than grammatical permission questions.  Preserve that relation
// so the retriever can prefer a report containing both the case and its remedy.
const CASE_REMEDY_QUERY = /\b(?:what\s+(?:(?:am|are|is|was|were)\s+\S+\s+)?to\s+do|what\s+(?:should|must|can|could)\s+(?:i|we|he|she|they|the\s+\w+)\s+do|how\s+(?:should|must|can|could)\s+(?:i|we|he|she|they|the\s+\w+)\s+(?:proceed|respond|fix|resolve)|what\s+happens\s+(?:if|when)|solution|remedy)\b/i;

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
    // A visual-representation question is not an appearance-description
    // question. Search distinct rules and reported uses of pictures instead
    // of treating an Imam's appearance or generic mourning as picture proof.
    name: "visual-depiction",
    pattern: /\b(?:pictures?|images?|portraits?|draw(?:ing|n|s)?|paint(?:ing|ed|s)?|depict(?:ions?|ed|ing|s)?|represent(?:ations?|ed|ing|s)?|likeness(?:es)?|statues?|photographs?|photos?|shabih|shabeeh|tasveer|tasvir)\b/i,
    scriptPattern: /(?:صورة|صور|تصوير|تمثال|تماثيل|شبيه|تشبيه)/u,
    strict: false,
    terms: [
      "picture", "pictures", "image", "portrait", "drawing", "depiction",
      "representation", "likeness", "statue", "furnishings", "house",
    ],
    deterministicEvidence: true,
    evidenceQueries: [
      {
        role: "display-context",
        query: "pictures furnishings house not unlawful under feet",
        subjects: ["pictures furnishings"],
        literalAnchors: ["picture", "pictures"],
      },
      {
        role: "reported-use-context",
        query: "Ali ibn Husayn picture decorated pillows furnishings sat on them",
        subjects: ["picture decorated pillows", "picture furnishings"],
        literalAnchors: ["sat"],
      },
      {
        role: "reported-use-context",
        query: "Abu Jafar man sit furnishing pictures do not consider important",
        subjects: ["sit furnishing pictures"],
        literalAnchors: ["sit"],
      },
      {
        role: "sacred-person-image-context",
        query: "green rock pictures all prophets Mosque Sahlah",
        subjects: ["pictures all prophets"],
        literalAnchors: ["prophets"],
      },
      {
        role: "making-context",
        query: "forms pictures statues blow spirit creator",
        subjects: ["forms pictures", "forms statues"],
        literalAnchors: ["picture", "pictures", "statue", "statues"],
        operation: "making",
      },
      {
        role: "altered-image-context",
        query: "pictures statues house heads changed not harmful",
        subjects: ["pictures statues"],
        literalAnchors: ["picture", "pictures", "statue", "statues"],
        operation: "making",
      },
    ],
    resultLimit: 4,
    maxDirectResults: 4,
    maxFamilyMembers: 4,
    maxPerChapter: 4,
    minUniqueResults: 3,
    maxUniqueResults: 5,
    candidateLimit: 160,
    expandedLimit: 280,
    seedLimit: 10,
    seedCount: 6,
    disableFocus: true,
    secondaryPromotionLimit: 8,
    secondaryDirectRatio: 0.7,
    directFloorRatio: 0.38,
    relatedFloorRatio: 0.3,
  },
  {
    // Treat a claim about an Imam's daughters as a historical assertion to
    // test against transmitted evidence, not as permission for the model to
    // improvise a motive. The evidence roles are reusable: the actor's own
    // testament, a same-family precedent, and the general compatibility rule.
    name: "contested-lineage-marriage",
    pattern: /\b(?=.*(?:imam\s+(?:al[-\s]?)?(?:kadhim|kazim)|musa\s+(?:ibn|bin|b\.?)[-\s]+ja[’'`]?far|seventh\s+imam))(?=.*\bdaughters?\b)(?=.*\b(?:marry|married|marriage|unmarried|suitor|nikah|nikkah)\b).*/i,
    scriptPattern: /(?=.*(?:موسى بن جعفر|الإمام الكاظم))(?=.*(?:بنت|بنات))(?=.*(?:زواج|تزوج|تتزَوج|لم تتزوج))/u,
    strict: false,
    terms: ["Musa ibn Jafar", "daughters", "marriage", "Ali al-Rida", "testament"],
    deterministicEvidence: true,
    allowCrossEntityEvidence: true,
    evidenceQueries: [
      {
        role: "testament-evidence",
        query: "Musa ibn Jafar will daughters Ali Rida counsel marry them off if he pleases",
        subjects: ["Musa ibn Jafar daughters", "my daughters Ali Rida"],
        literalAnchors: ["daughters"],
      },
      {
        role: "ahlulbayt-precedent",
        query: "Sadiq married daughter Umayyad Messenger example",
        subjects: ["daughter Umayyad"],
        literalAnchors: ["umayyad"],
      },
      {
        role: "prophetic-precedent",
        query: "Miqdad Dubaah daughter Zubayr marriage most pious",
        subjects: ["Miqdad Dubaah"],
        literalAnchors: ["miqdad"],
      },
      {
        role: "compatibility-principle",
        query: "Juwayabir daughter marriage Islam tribe genealogy pious",
        subjects: ["Juwayabir daughter"],
        literalAnchors: ["juwayabir", "juwaybir"],
      },
    ],
    resultLimit: 6,
    maxDirectResults: 5,
    maxFamilyMembers: 4,
    maxPerChapter: 4,
    minUniqueResults: 3,
    maxUniqueResults: 7,
    candidateLimit: 220,
    expandedLimit: 340,
    seedLimit: 12,
    seedCount: 6,
    disableFocus: true,
    secondaryPromotionLimit: 8,
    secondaryDirectRatio: 0.7,
    directFloorRatio: 0.34,
    relatedFloorRatio: 0.26,
  },
  {
    // Marriage compatibility is a relation between faith, lineage and social
    // status. These evidence lanes apply to caste, tribe, race, clan and
    // Sayyid/non-Sayyid wording, including compositional Roman-Urdu queries.
    name: "lineage-marriage",
    pattern: /\b(?:(?:say+id|sayed|syed|syedani|syedah|hashimi|hashimite|banu\s+hashim|lineage|genealogy|ancestry|caste|tribe|clan|race|social\s+status|family\s+status|kaf[a']?ah|kufu)\b.{0,72}\b(?:marry|marriage|nikah|nikkah|spouse|match)|(?:marry|marriage|nikah|nikkah|spouse|match)\b.{0,72}\b(?:say+id|sayed|syed|syedani|syedah|hashimi|hashimite|banu\s+hashim|lineage|genealogy|ancestry|caste|tribe|clan|race|social\s+status|family\s+status|kaf[a']?ah|kufu))\b/i,
    scriptPattern: /(?:(?:سيد|سيدة|هاشمي|هاشمية|نسب|قبيلة|كفاءة).{0,48}(?:زواج|نكاح)|(?:زواج|نكاح).{0,48}(?:سيد|سيدة|هاشمي|هاشمية|نسب|قبيلة|كفاءة))/u,
    strict: false,
    terms: [
      "marriage", "believer", "believing woman", "match", "piety",
      "lineage", "genealogy", "tribe", "Quraysh", "Banu Hashim",
    ],
    deterministicEvidence: true,
    evidenceQueries: [
      {
        role: "faith-compatibility",
        query: "believers good match believing women daughter marriage pious genealogy",
        subjects: ["believers match believing women"],
        literalAnchors: ["believer", "believers", "believing"],
      },
      {
        role: "prophetic-precedent",
        query: "Miqdad Dubaah daughter Zubayr marriage most pious",
        subjects: ["Miqdad Dubaah"],
        literalAnchors: ["miqdad"],
      },
      {
        role: "lineage-precedent",
        query: "Juwayabir daughter marriage Islam tribe genealogy pious",
        subjects: ["Juwayabir daughter"],
        literalAnchors: ["juwayabir", "juwaybir"],
      },
      {
        role: "social-status-precedent",
        query: "Ali ibn Husayn married slave girl Islam removed lowliness blame ignorance",
        subjects: ["Islam removed lowliness"],
        literalAnchors: ["lowliness"],
      },
      {
        role: "general-compatibility",
        query: "proper match chaste affluent marriage",
        subjects: ["proper match"],
        literalAnchors: ["match"],
      },
    ],
    resultLimit: 6,
    maxDirectResults: 5,
    maxFamilyMembers: 5,
    maxPerChapter: 4,
    minUniqueResults: 4,
    maxUniqueResults: 8,
    candidateLimit: 200,
    expandedLimit: 320,
    seedLimit: 12,
    seedCount: 6,
    disableFocus: true,
    secondaryPromotionLimit: 8,
    secondaryDirectRatio: 0.72,
    directFloorRatio: 0.36,
    relatedFloorRatio: 0.28,
  },
  {
    // A continuing temporary contract followed by a second marriage is an
    // overlapping-contract question.  It is not answered by generic chapters
    // about repeated mut'ah after expiry.  Search the active conflict, the
    // reverse conflict, and the expired-contract contrast as separate roles.
    name: "overlapping-marriage-contracts",
    pattern: /^(?=.*\b(?:mutah|muta|mut['â€™Ê¿`]?ah|temporary\s+marriage)\b)(?=.*\b(?:nikah|nikkah|married|marries|marry|second\s+husband|another\s+husband)\b)(?=.*\b(?:while|during|already|still|ongoing|currently|family|without\s+(?:her\s+)?permission|in\s+(?:a\s+)?(?:mutah|muta|mut['â€™Ê¿`]?ah|temporary\s+marriage))\b).*$/i,
    scriptPattern: /(?=.*(?:Ù…ØªØ¹Ø©|Ø§Ù„Ù…ØªØ¹Ø©))(?=.*(?:Ø²ÙˆØ§Ø¬|Ù†ÙƒØ§Ø­|Ø²ÙˆØ¬ÙˆÙ‡Ø§))(?=.*(?:ÙÙŠ|Ø£Ø«Ù†Ø§Ø¡|Ù…Ø§ Ø²Ø§Ù„|Ø¨ØºÙŠØ± Ø¥Ø°Ù†Ù‡Ø§|Ø£Ù‡Ù„Ù‡Ø§))/u,
    strict: false,
    terms: ["woman", "mutah", "temporary marriage", "marriage", "husband", "contract"],
    deterministicEvidence: true,
    caseRemedy: true,
    onePerEvidenceRole: true,
    evidenceQueries: [
      {
        role: "active-contract-conflict",
        query: "woman mutah then family give her in marriage publicly without permission solution",
        subjects: ["woman mutah marriage"],
        literalAnchors: ["permission"],
      },
      {
        role: "reverse-contract-conflict",
        query: "woman has husband forms mutah learns husband living with her",
        subjects: ["woman husband mutah"],
        literalAnchors: ["mutah"],
      },
      {
        role: "expired-contract-contrast",
        query: "mutah appointed time expires then another man marries her first man",
        subjects: ["mutah another man marries"],
        literalAnchors: ["expires"],
      },
    ],
    resultLimit: 3,
    maxDirectResults: 4,
    maxFamilyMembers: 3,
    maxPerChapter: 3,
    minUniqueResults: 3,
    maxUniqueResults: 6,
    candidateLimit: 220,
    expandedLimit: 340,
    seedLimit: 12,
    seedCount: 6,
    disableFocus: true,
    secondaryPromotionLimit: 6,
    secondaryDirectRatio: 0.68,
    directFloorRatio: 0.4,
    relatedFloorRatio: 0.3,
  },
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
    name: "biographical-event",
    pattern: /\b(?:(?:when|where|how)\b.{0,72}\b(?:born|birth|died|death|martyred|martyrdom|demise|murdered|poisoned|passed\s+away)|(?:birth|born|death|died|martyrdom|demise|murder|poisoning)\s+(?:of|date|place|year|month|age)|(?:martyrdom|demise|murder|poisoning)\b.{0,64}\b(?:imam|prophet|lady))\b/i,
    scriptPattern: /(?:ولادت|پیدائش|وفات|شہادت|ولد|ولادة|توفي|وفاة|استشهد|شهادة)/u,
    strict: false,
    terms: [
      "birth", "born", "month", "year", "date", "place", "mother", "father",
      "age", "died", "death", "passed away", "life", "character", "virtue",
    ],
    resultLimit: 8,
    maxDirectResults: 7,
    maxFamilyMembers: 5,
    maxPerChapter: 4,
    minUniqueResults: 2,
    maxUniqueResults: 6,
    secondaryDirectRatio: 0.72,
    directFloorRatio: 0.38,
    relatedFloorRatio: 0.3,
  },
  {
    name: "definition",
    pattern: /\b(?:what\s+(?:is|are|was|were)|what\s+does\b.{0,48}\bmean|define|definition|meaning\s+of|explain\s+what)\b/i,
    scriptPattern: /(?:ما هو|ما هي|ماذا يعني|تعريف|معنى|کیا ہے|کیا مطلب|معنی)/u,
    strict: false,
    terms: [
      "definition", "means", "meaning", "is a creature", "described", "greater than",
      "angel", "different from", "accompanies", "with", "through", "protects", "knowledge",
      "does not sleep",
    ],
    resultLimit: 10,
    maxDirectResults: 8,
    maxFamilyMembers: 5,
    maxPerChapter: 4,
    minUniqueResults: 3,
    maxUniqueResults: 8,
    secondaryPromotionLimit: 6,
    secondaryDirectRatio: 0.72,
    directFloorRatio: 0.4,
    relatedFloorRatio: 0.32,
  },
  {
    name: "method",
    pattern: /\b(?:how\s+(?:to|do|does|should|can|could|did|would)|how\b.{0,60}\b(?:done|performed|recited|made)|(?:teach|show)\s+me|method|procedure|steps?|perform|recite|posture|position|demonstrat(?:e|ed|ion))\b/i,
    scriptPattern: /(?:كيف|علمني|طريقة|خطوات|كيفية|أؤدي|اصلي|أصلي|کیسے|طریقہ|سکھائیں)/u,
    strict: false,
    terms: [
      "description", "describe", "demonstrate", "method", "procedure", "steps", "manner",
      "perform", "performed", "done", "made", "first", "then", "wash", "wipe", "recite", "bow", "prostrate",
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
    name: "virtues",
    pattern: /\b(?:praise|praised|prasie|priase|virtues?|merits?|qualities|commend(?:ation|ed)?|in\s+praise\s+of|what\s+has\s+been\s+said\s+about)\b/i,
    scriptPattern: /(?:ÙØ¶Ø§Ø¦Ù„|Ù…Ù†Ø§Ù‚Ø¨|Ù…Ø¯Ø­|Ù…Ø¯ÙŠØ­|ØµÙØ§Øª|Ù…Ø­Ø§Ø³Ù†)/u,
    strict: false,
    terms: [
      "praise", "praised", "virtue", "virtues", "merit", "merits", "qualities",
      "love", "faith", "piety", "devotion", "our shia", "created from clay",
    ],
    resultLimit: 10,
    maxDirectResults: 8,
    maxFamilyMembers: 6,
    maxPerChapter: 4,
    disableFocus: true,
    secondaryDirectRatio: 0.64,
    directFloorRatio: 0.4,
    relatedFloorRatio: 0.32,
  },
  {
    name: "importance",
    pattern: /\b(?:how\s+important|importance|significance|significant|essential|necessity|why\s+is\s+.+\s+important)\b/i,
    scriptPattern: /(?:Ø£Ù‡Ù…ÙŠØ©|Ù…Ù‡Ù…|Ø¶Ø±ÙˆØ±Ø©|ÙˆØ¬ÙˆØ¨)/u,
    strict: false,
    terms: ["importance", "significance", "important", "religion", "faith", "piety", "necessity", "denial"],
    resultLimit: 10,
    maxDirectResults: 7,
    maxFamilyMembers: 6,
    maxPerChapter: 4,
    disableFocus: true,
    secondaryDirectRatio: 0.68,
    directFloorRatio: 0.4,
    relatedFloorRatio: 0.32,
  },
  {
    // Questions framed as “what has been narrated regarding X” ask for
    // answer-bearing report scenes, not merely documents sharing one word
    // with X. The subject itself is extracted dynamically below.
    name: "reported-evidence",
    pattern: /\b(?:what\s+(?:has|have|is|was)\s+been\s+(?:said|reported|narrated|related)\s+(?:about|regarding|on|concerning)|(?:find|show|give|bring|cite|search(?:\s+for)?)\b.{0,36}\b(?:hadith|ahadith|narrations?|reports?|riwaya|riwayat)\s+(?:about|regarding|on|concerning)|(?:hadith|ahadith|narrations?|reports?|riwaya|riwayat)\s+(?:about|regarding|on|concerning))\b/i,
    scriptPattern: /(?:Ø±ÙˆØ§ÛŒØ§Øª|Ø±ÙˆØ§ÙŠØ§Øª|Ø£Ø­Ø§Ø¯ÙŠØ«|Ø§Ø­Ø§Ø¯ÛŒØ«).{0,24}(?:Ø¹Ù†|Ø­ÙˆÙ„|Ú©Û’ Ø¨Ø§Ø±Û’)/u,
    strict: false,
    terms: [],
    resultLimit: 10,
    maxDirectResults: 8,
    maxFamilyMembers: 6,
    maxPerChapter: 4,
    minUniqueResults: 3,
    maxUniqueResults: 8,
    secondaryPromotionLimit: 6,
    secondaryDirectRatio: 0.72,
    directFloorRatio: 0.38,
    relatedFloorRatio: 0.3,
  },
  {
    name: "legal-practical",
    pattern: /\b(?:allowed|permitted|permissible|valid|invalid|obligatory|recommended|forbidden|haram|halal|najis|tahir|breaks?|invalidates?|ruling|(?:can|could|may|should|must)\s+(?!you\b)\S+|what\s+(?:(?:am|are|is|was|were)\s+\S+\s+)?to\s+do|what\s+(?:should|must|can|could)\s+(?:i|we|he|she|they|the\s+\w+)\s+do|how\s+(?:should|must|can|could)\s+(?:i|we|he|she|they|the\s+\w+)\s+(?:proceed|respond|fix|resolve)|what\s+happens\s+(?:if|when)|solution|remedy)\b/i,
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
      searchAliases: ["Imam al-Mahdi", "al-Qaim", "Sahib al-Amr"],
      detected: true,
    };
  }
  const namedImam = normalized.match(/\bimam\s+([\p{L}'-]+(?:\s+[\p{L}'-]+){0,4})/iu);
  if (!namedImam) return { text: "", terms: [], searchAliases: [], detected: false };
  const relationBoundaries = new Set(
    "about appearance born birth die died death do does did look looks looked mean means rule ruled say said when where why how was were is are can could should for from in of on regarding during mourning azadari majlis karbala picture image depiction representation".split(" "),
  );
  const entityTokens = [];
  for (const token of namedImam[1].split(/\s+/).filter(Boolean)) {
    if (relationBoundaries.has(token)) break;
    entityTokens.push(token);
  }
  const recognizedAliasIndex = entityTokens.reduce(
    (found, token, index) => IMAM_NAME_GLOSSES.has(token) ? index : found,
    -1,
  );
  const boundedEntityTokens = recognizedAliasIndex >= 0
    ? entityTokens.slice(0, recognizedAliasIndex + 1)
    : entityTokens.slice(0, 3);
  const entityName = boundedEntityTokens.join(" ");
  const aliasKey = boundedEntityTokens.filter((token) => token !== "al").at(-1) || "";
  const corpusName = IMAM_NAME_GLOSSES.get(aliasKey) || "";
  return entityName
    ? {
        text: corpusName,
        terms: [...new Set([corpusName, entityName, ...(IMAM_SEARCH_ALIASES.get(aliasKey) || [])].filter(Boolean))],
        searchAliases: IMAM_SEARCH_ALIASES.get(aliasKey) || [entityName],
        detected: true,
      }
    : { text: "", terms: [], searchAliases: [], detected: false };
}

function requestedCollection(query, manifest) {
  const normalizedQuery = normalize(query);
  const compact = (value) => normalize(value)
    .replace(/shi\s*[ʿ'`’]?\s*a/gu, "shia")
    .replace(/\b(?:al|as|ash|el)\b/gu, "")
    .replace(/[^a-z0-9]/g, "");
  const queryKey = compact(normalizedQuery);
  return (manifest?.strings?.collections || [])
    .map((collection) => ({ collection, normalized: normalize(collection), key: compact(collection) }))
    .filter(({ normalized, key }) => normalized && key && (queryKey.includes(key) || key.includes(queryKey)))
    .sort((left, right) => right.key.length - left.key.length)[0]?.normalized || "";
}

function shouldAnalyzeQuery(original, normalized, facet, manifest, glossaryQueries = []) {
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const knownCorpusTerms = corpusTermCount(original, manifest);
  if (facet?.deterministicEvidence) return false;
  if (facet?.name === "time-definition") return false;
  if (facet?.name === "biographical-event") return false;
  if (facet?.name === "virtues" || facet?.name === "importance") return false;
  if (facet?.name === "reported-evidence") return false;
  if (facet?.name === "method") {
    // Short procedure requests stay on the retrieval fast path. If their
    // first hit is only an exception or a special case, the worker expands
    // the neighbouring corpus chapters before asking the model to help.
    return wordCount > 8 && !hasFrequentCorpusAnchor(original, manifest, facet.terms);
  }
  if (facet?.name === "legal-practical") {
    // A corpus-anchored case/remedy fragment can stay on the fast path: the
    // full-record scene scorer below compares its problem and resolution. A
    // modern or unfamiliar act still receives semantic analysis.
    if (CASE_REMEDY_QUERY.test(normalized) && knownCorpusTerms >= 2) return false;
    return knownCorpusTerms < 2
      || /\b(?:can|could|may|should|must|another|someone|work|job|sell|buy|under|without|except|all|every|circumstances?)\b/i.test(normalized);
  }
  if (glossaryQueries.length) return false;
  // Named concepts and transliterations are often absent as an exact phrase
  // even when their reports are present under descriptive wording.  Send
  // short, unfamiliar general corpus questions through the semantic planner
  // instead of treating an empty exact-match search as authoritative.
  return knownCorpusTerms < 2 && wordCount >= 2;
}

function editDistanceAtMostOne(left, right) {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  let differences = 0;
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    differences += 1;
    if (differences > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  return differences + (left.length - leftIndex) + (right.length - rightIndex) <= 1;
}

function foldTransliteration(value) {
  return String(value || "")
    .replace(/ee/g, "i")
    .replace(/([aeiou])\1+/g, "$1")
    .replace(/ou/g, "u")
    .replace(/(?:dh|th|zh|kh|gh)/g, (pair) => pair[0])
    .replace(/q/g, "k")
    .replace(/h$/g, "");
}

function romanArabicGlossQueries(query) {
  const chunks = [];
  let glossCount = 0;
  for (const token of normalize(query).replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/)) {
    if (!token || ENGLISH_STOP_WORDS.has(token) || ROMAN_ARABIC_CONNECTORS.has(token)) continue;
    let gloss = ROMAN_ARABIC_GLOSSES.get(token);
    if (!gloss) {
      const folded = foldTransliteration(token);
      gloss = [...ROMAN_ARABIC_GLOSSES]
        .find(([candidate]) => foldTransliteration(candidate) === folded)?.[1];
    }
    if (gloss) glossCount += 1;
    chunks.push(gloss || token);
  }
  if (!glossCount || !chunks.length) return [];
  const variants = [];
  if (
    chunks.length >= 2
    && chunks.length <= 3
    && ENGLISH_PRENOMINAL_ADJECTIVES.has(chunks.at(-1).split(/\s+/)[0])
  ) {
    variants.push([chunks.at(-1), ...chunks.slice(0, -1)].join(" "));
  }
  variants.push(chunks.join(" "));
  return variants.filter((entry, index, all) => (
    entry
    && entry !== normalize(query)
    && all.indexOf(entry) === index
  )).slice(0, 3);
}

function corpusVocabulary(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return { exact: new Set(), folded: new Set() };
  }
  const cached = CORPUS_VOCABULARY_CACHE.get(manifest);
  if (cached) return cached;
  const exact = new Set();
  const folded = new Set();
  for (const entry of manifest.lexicon || []) {
    const term = String(entry?.[0] || "");
    if (!/^[a-z][a-z0-9]{2,}$/u.test(term)) continue;
    exact.add(term);
    const normalizedTerm = foldTransliteration(term);
    if (normalizedTerm.length >= 3) folded.add(normalizedTerm);
  }
  const vocabulary = { exact, folded };
  CORPUS_VOCABULARY_CACHE.set(manifest, vocabulary);
  return vocabulary;
}

function corpusMorphologyVariants(term, manifest) {
  const token = normalize(term).replace(/[^a-z0-9]/g, "");
  if (!token) return [];
  const vocabulary = corpusVocabulary(manifest).exact;
  const candidates = new Set([token]);
  if (/(?:ies|ied)$/.test(token) && token.length > 4) {
    candidates.add(`${token.slice(0, -3)}y`);
    candidates.add(token.slice(0, -3));
  }
  if (/ing$/.test(token) && token.length > 5) {
    const base = token.slice(0, -3);
    candidates.add(base);
    candidates.add(`${base}e`);
    if (/(.)\1$/.test(base)) candidates.add(base.slice(0, -1));
  }
  if (/ed$/.test(token) && token.length > 4) {
    const base = token.slice(0, -2);
    candidates.add(base);
    candidates.add(`${base}e`);
  }
  if (/es$/.test(token) && token.length > 4) {
    candidates.add(token.slice(0, -1));
    candidates.add(token.slice(0, -2));
  } else if (/s$/.test(token) && token.length > 4) {
    candidates.add(token.slice(0, -1));
  }
  const attested = [...candidates].filter((candidate) => vocabulary.has(candidate));
  return attested.length ? attested.slice(0, 3) : [token];
}

function reportedEvidencePlan(normalized, manifest) {
  const introduction = /(?:what\s+(?:has|have|is|was)\s+been\s+(?:said|reported|narrated|related)|(?:find|show|give|bring|cite|search(?:\s+for)?)\b.{0,36}\b(?:hadith|ahadith|narrations?|reports?|riwaya|riwayat)|(?:hadith|ahadith|narrations?|reports?|riwaya|riwayat))\s+(?:about|regarding|on|concerning)\s+(.+)$/i;
  const subject = normalized.match(introduction)?.[1] || "";
  if (!subject) return { queryTerms: [], subjectGroups: [] };
  let words = subject.replace(/[^a-z0-9\s-]+/g, " ").split(/\s+/).filter(Boolean);
  if (/ing$/.test(words[0] || "")) {
    const qualifier = words.findIndex((word, index) => index >= 2 && /^(?:as|at|during|for|from|in|of|with)$/.test(word));
    if (qualifier > 1) words = words.slice(0, qualifier);
  }
  const core = words.filter((word) => word.length >= 3
    && !ENGLISH_STOP_WORDS.has(word)
    && !GENERIC_QUERY_WORDS.has(word)
    && !/^(?:hadith|ahadith|narration|narrations|report|reports|riwaya|riwayat)$/.test(word))
    .slice(0, 4);
  if (!core.length) return { queryTerms: [], subjectGroups: [] };
  const variantSets = core.map((term) => corpusMorphologyVariants(term, manifest));
  let subjectGroups = [""];
  for (const variants of variantSets) {
    subjectGroups = subjectGroups
      .flatMap((prefix) => variants.map((variant) => `${prefix} ${variant}`.trim()))
      .slice(0, 12);
  }
  return {
    queryTerms: [...new Set(variantSets.flat())],
    subjectGroups: [...new Set(subjectGroups)].filter(Boolean),
  };
}

function hasFrequentCorpusAnchor(query, manifest, intentTerms = []) {
  const intentVocabulary = new Set(
    intentTerms
      .flatMap((term) => normalize(term).split(/\s+/))
      .filter(Boolean),
  );
  const frequent = (manifest?.lexicon || [])
    .filter((entry) => Number(entry?.[1]) >= 100)
    .map((entry) => String(entry?.[0] || ""))
    .filter((term) => term.length >= 4);
  if (!frequent.length) return false;
  return normalize(query)
    .split(/\s+/)
    .filter((token) => token.length >= 4
      && !ENGLISH_STOP_WORDS.has(token)
      && !intentVocabulary.has(token))
    .some((token) => frequent.some((term) => editDistanceAtMostOne(token, term)));
}

export function buildReligiousSearchPlan(query, manifest) {
  const original = String(query || "").trim();
  const normalized = normalize(original);
  const glossaryQueries = romanArabicGlossQueries(original);
  const signsBeforeAppearance = /\b(?:signs?|events?|conditions?)\b.{0,48}\b(?:before|preceding|prior\s+to)\b.{0,32}\b(?:appearance|reappearance|advent|rise|emergence)\b/i.test(normalized)
    || /(?:علامات|أحداث).{0,30}(?:قبل|تسبق).{0,24}(?:الظهور|الخروج)/u.test(original);
  const biographicalFacet = RETRIEVAL_FACETS.find((candidate) => candidate.name === "biographical-event");
  const asksForBiographicalEvent = biographicalFacet.pattern.test(normalized)
    || biographicalFacet.scriptPattern.test(original);
  const timeDefinitionFacet = RETRIEVAL_FACETS.find((candidate) => candidate.name === "time-definition");
  const asksForTimeBoundary = timeDefinitionFacet.pattern.test(normalized)
    || timeDefinitionFacet.scriptPattern.test(original);
  const facet = signsBeforeAppearance
    ? RETRIEVAL_FACETS.find((candidate) => candidate.name === "signs-events")
    : asksForBiographicalEvent
      ? biographicalFacet
      : asksForTimeBoundary
        ? timeDefinitionFacet
        : RETRIEVAL_FACETS.find((candidate) => (
        candidate.pattern.test(normalized) || candidate.scriptPattern.test(original)
        )) || null;
  const entity = entityExpansion(original, normalized);
  const requiredCollection = requestedCollection(original, manifest);
  const semanticGlossQuery = glossaryQueries[0] || "";
  const semanticGlossTokens = semanticGlossQuery.split(/\s+/).filter(Boolean);
  const semanticHeadTerm = semanticGlossTokens.length > 1
    && ENGLISH_PRENOMINAL_ADJECTIVES.has(semanticGlossTokens[0])
    ? semanticGlossTokens.at(-1)
    : semanticGlossTokens[0] || "";
  const definitionEvidenceQuery = semanticHeadTerm && facet?.name === "definition"
    ? `${semanticHeadTerm} creature greater than angel accompanies protects knowledge`
    : "";
  const asksForDeathEvent = facet?.name === "biographical-event"
    && /\b(?:died|death|martyr|martyrdom|martyred|demise|murder|murdered|kill|killed|poison|poisoned|passed\s+away)\b/i.test(normalized);
  const asksForBirthEvent = facet?.name === "biographical-event"
    && /\b(?:born|birth|birthday|wiladah|wiladat)\b/i.test(normalized);
  const biographicalRelationTerms = asksForDeathEvent
    ? ["martyrdom", "martyred", "death", "died", "cause", "killer", "final illness", "burial"]
    : asksForBirthEvent
      ? ["birth", "born", "date", "month", "year", "place", "mother", "father"]
      : facet?.name === "biographical-event" ? facet.terms : [];
  const biographicalEvidenceQueries = asksForDeathEvent && entity.detected
    ? [
        `${entity.searchAliases?.[0] || entity.text} martyrdom death cause killer murdered`,
        `${entity.searchAliases?.[0] || entity.text} poison poisoned grapes pomegranate final illness`,
        `${entity.searchAliases?.[0] || entity.text} burial grave funeral final moments`,
      ]
    : [];
  const subjectTerms = normalized.split(/\s+/)
    .filter((token) => token.length >= 4
      && !ENGLISH_STOP_WORDS.has(token)
      && !GENERIC_QUERY_WORDS.has(token)
      && !(facet?.terms || []).some((term) => normalize(term).split(/\s+/).includes(token)))
    .slice(0, 4);
  const importanceEvidenceQuery = facet?.name === "importance" && subjectTerms.length
    ? `${subjectTerms.join(" ")} denial religion faith piety necessity`
    : "";
  const reportedEvidence = facet?.name === "reported-evidence"
    ? reportedEvidencePlan(normalized, manifest)
    : { queryTerms: [], subjectGroups: [] };
  const reportedEvidenceQuery = reportedEvidence.queryTerms.length
    ? `${[...new Set([...reportedEvidence.queryTerms, ...subjectTerms])].join(" ")} asked instructed replied continued observed`
    : "";
  const visualOperation = facet?.name === "visual-depiction"
    && /\b(?:draw|drawing|paint|painting|make|making|create|creating|form|forming|produce|producing)\b/i.test(normalized)
    ? "making"
    : "display";
  const facetEvidenceQueries = Array.isArray(facet?.evidenceQueries)
    ? facet.evidenceQueries.filter((entry) => entry?.query
      && (!entry.operation || entry.operation === visualOperation))
    : [];
  const timeSearchQuery = facet?.name === "time-definition"
    ? (() => {
        const relationTerms = semanticGlossTokens.length ? semanticGlossTokens : subjectTerms;
        const terms = [...new Set(relationTerms)]
          .filter((term) => term.length >= 3 && term !== "pray");
        if (!terms.includes("time")) terms.push("time");
        return terms.join(" ");
      })()
    : "";
  const expansionParts = [timeSearchQuery || semanticGlossQuery || original, entity.text];
  const expandMethodContext = facet?.name === "method"
    && !hasFrequentCorpusAnchor(original, manifest, facet.terms);
  const methodIntentTerms = new Set((facet?.terms || [])
    .flatMap((term) => normalize(term).split(/\s+/))
    .filter(Boolean));
  const methodSubjectTerms = facet?.name === "method"
    ? normalized.split(/\s+/).filter((term) => term.length >= 4
      && !ENGLISH_STOP_WORDS.has(term)
      && !methodIntentTerms.has(term))
    : [];
  const caseRemedy = Boolean(facet?.caseRemedy)
    || (facet?.name === "legal-practical" && CASE_REMEDY_QUERY.test(normalized));

  return {
    searchQuery: expansionParts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
    entityDetected: entity.detected,
    retrievalProfile: {
      version: 3,
      facet: facet?.name || "general",
      caseRemedy,
      onePerEvidenceRole: Boolean(facet?.onePerEvidenceRole),
      needsQueryAnalysis: shouldAnalyzeQuery(original, normalized, facet, manifest, glossaryQueries),
      // Deterministic evidence lanes already use corpus-native vocabulary.
      // Do not make every word of those lanes mandatory merely because the
      // user's main query contained one Roman-Arabic gloss such as nikah.
      semanticGlossExpansion: glossaryQueries.length > 0 && !facet?.deterministicEvidence,
      expandMethodContext,
      methodSubjectTerms,
      strictFacet: Boolean(facet?.strict),
      requiredTerms: facet?.strict ? facet.terms : [],
      boostTerms: [
        ...(facet?.name === "biographical-event" ? biographicalRelationTerms : (facet?.terms || [])),
        ...subjectTerms,
      ],
      entityTerms: entity.terms,
      requireEntityMatch: entity.detected && !facet?.allowCrossEntityEvidence
        && facet?.name !== "visual-depiction",
      requiredTitlePhrase: facet?.name === "biographical-event" ? entity.text : "",
      minimumTitleEntityCoverage: 0.66,
      // General questions should not be rejected merely because an English
      // intent word (or a transliteration typo) has no exact indexed hash.
      // Faceted searches retain their focused evidence gate.
      requireFocusCoverage: Boolean(facet) && !expandMethodContext,
      requireFocusFacetProximity: (facet?.name === "method" && !expandMethodContext) || facet?.name === "time-definition",
      minimumTitleFocusFacetDensity: facet?.name === "method" || facet?.name === "time-definition" ? 0.14 : 0,
      minimumFocusCoverage: 0.6,
      requiredCollection,
      secondaryQuery: "",
      secondaryQueries: [
        ...facetEvidenceQueries.map((entry) => entry.query),
        definitionEvidenceQuery,
        importanceEvidenceQuery,
        ...biographicalEvidenceQueries,
        reportedEvidenceQuery,
      ].filter(Boolean),
      secondaryBoostTerms: [
        ...facetEvidenceQueries.map((entry) => entry.query),
        definitionEvidenceQuery,
        importanceEvidenceQuery,
        ...biographicalEvidenceQueries,
        reportedEvidenceQuery,
      ].join(" ").split(/\s+/).filter(Boolean),
      evidenceRoles: [
        ...facetEvidenceQueries.map((entry) => entry.role || "supporting"),
        definitionEvidenceQuery ? "definition-detail" : "",
        importanceEvidenceQuery ? "importance-context" : "",
        ...biographicalEvidenceQueries.map((_, index) => ["death-cause", "final-illness", "burial-event"][index]),
        reportedEvidenceQuery ? "reported-practice" : "",
      ].filter(Boolean),
      evidenceQuerySubjects: [
        ...facetEvidenceQueries.map((entry) => entry.subjects || []),
        definitionEvidenceQuery ? [semanticHeadTerm] : [],
        importanceEvidenceQuery ? subjectTerms : [],
        ...biographicalEvidenceQueries.map(() => entity.searchAliases),
        reportedEvidenceQuery ? reportedEvidence.subjectGroups : [],
      ].filter((group) => group.length),
      evidenceQueryLiteralAnchors: [
        ...facetEvidenceQueries.map((entry) => entry.literalAnchors || []),
        ...(definitionEvidenceQuery ? [[]] : []),
        ...(importanceEvidenceQuery ? [[]] : []),
        ...biographicalEvidenceQueries.map(() => []),
        ...(reportedEvidenceQuery ? [[]] : []),
      ],
      resultLimit: expandMethodContext ? 6 : Math.min(10, facet?.resultLimit || 10),
      seedLimit: facet?.seedLimit || 16,
      seedCount: facet?.seedCount || 8,
      candidateLimit: facet?.candidateLimit || 360,
      expandedLimit: facet?.expandedLimit || 560,
      perSeed: 36,
      familyDepth: 2,
      familyPropagationThreshold: 0.48,
      maxFamilyMembers: facet?.maxFamilyMembers || 5,
      familyMinRelation: facet?.familyMinRelation || 0.5,
      minUniqueResults: expandMethodContext ? 2 : (facet?.minUniqueResults || (facet?.name === "method" ? 2 : 3)),
      maxUniqueResults: expandMethodContext ? 4 : (facet?.maxUniqueResults || 7),
      parallelReserve: facet?.parallelReserve ?? (facet?.name === "method" ? 4 : 3),
      uniqueFloorRatio: facet?.uniqueFloorRatio || (facet?.strict ? 0.34 : 0.38),
      clusterOverlapThreshold: facet?.clusterOverlapThreshold || 0.72,
      maxDirectResults: facet?.maxDirectResults || 5,
      maxPerChapter: expandMethodContext ? 4 : (facet?.maxPerChapter || 3),
      disableFocus: Boolean(facet?.disableFocus),
      secondaryDirectRatio: facet?.secondaryDirectRatio || 0.62,
      directFloorRatio: facet?.directFloorRatio || 0.46,
      relatedFloorRatio: facet?.relatedFloorRatio || 0.36,
      secondaryPromotionLimit: facetEvidenceQueries.length || definitionEvidenceQuery || importanceEvidenceQuery || biographicalEvidenceQueries.length || reportedEvidenceQuery
        ? biographicalEvidenceQueries.length ? 8 : 6
        : (facet?.secondaryPromotionLimit || 4),
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
  const analyzedTiming = analysis.relation === "time-definition" || retrievalProfile.facet === "time-definition";
  const secondaryQueries = [
    ...evidenceQueries,
    ...(Array.isArray(retrievalProfile.secondaryQueries) ? retrievalProfile.secondaryQueries : []),
  ].filter((entry, index, all) => entry && all.indexOf(entry) === index).slice(0, 4);
  const timingText = `${searchQuery} ${analysis.retrievalQuery} ${(analysis.exactSubjects || []).join(" ")}`;
  const dawnBoundaryQuery = /\b(?:fajr|fajer|subh|morning|dawn|sunrise)\b/i.test(timingText)
    ? "true dawn white line horizontal qabati"
    : "";
  if (analyzedTiming && dawnBoundaryQuery && !secondaryQueries.some((entry) => /\bqabati\b/i.test(entry))) {
    secondaryQueries.splice(Math.min(1, secondaryQueries.length), 0, dawnBoundaryQuery);
    secondaryQueries.splice(4);
  }
  const requireSubjectMatch = subjectTermGroups?.length > 0
    && analysis.confidence >= 0.55;
  const analyzedMethod = analysis.relation === "method" || retrievalProfile.facet === "method";
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
      secondaryPromotionLimit: analyzedTiming
        ? Math.max(6, Math.min(8, secondaryQueries.length ? 8 : 6))
        : Math.max(3, Math.min(4, secondaryQueries.length || 3)),
      // A decomposed procedure can span several chapters. Keep the compact
      // two-result fast path for ordinary method searches, but allow an
      // analyzed method to return each distinct procedural report family.
      resultLimit: analyzedMethod
        ? Math.max(6, Number(retrievalProfile.resultLimit) || 0)
        : analyzedTiming
          ? Math.max(8, Number(retrievalProfile.resultLimit) || 0)
          : retrievalProfile.resultLimit,
      maxUniqueResults: analyzedMethod ? Math.max(4, Number(retrievalProfile.maxUniqueResults) || 0) : retrievalProfile.maxUniqueResults,
      minUniqueResults: analyzedMethod ? Math.max(2, Number(retrievalProfile.minUniqueResults) || 0) : retrievalProfile.minUniqueResults,
      maxPerChapter: analyzedMethod ? Math.max(4, Number(retrievalProfile.maxPerChapter) || 0) : retrievalProfile.maxPerChapter,
    },
  };
}

function corpusTermCount(query, manifest) {
  const vocabulary = corpusVocabulary(manifest);
  if (!vocabulary.exact.size) return 0;
  return normalize(query)
    .split(/\s+/)
    .filter((token, index, all) => token.length > 2
      && !ENGLISH_STOP_WORDS.has(token)
      && !GENERIC_QUERY_WORDS.has(token)
      && all.indexOf(token) === index
      && (
        vocabulary.exact.has(token)
        || vocabulary.folded.has(foldTransliteration(token))
      ))
    .length;
}

function shouldRetrieveNarrations(query, manifest) {
  const normalized = normalize(query);
  const explicitEvidence = /\b(?:hadith|ahadith|narration|narrations|riwaya|riwayat|report from|source for|what did (?:the )?imam|did (?:the )?imam say)\b/i.test(normalized)
    || /(?:حدیث|حديث|روایت|رواية|امام نے کیا فرمایا|قال الامام)/u.test(query);
  if (explicitEvidence) return true;
  if (romanArabicGlossQueries(query).length) return true;

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
  if (religiousSearch.entityDetected
    || religiousSearch.retrievalProfile.facet !== "general"
    || shouldRetrieveNarrations(contextualQuery, manifest)) {
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
    offerHadith: RELIGIOUS_DOMAIN.test(normalize(contextualQuery))
      || RELIGIOUS_SCRIPT_DOMAIN.test(contextualQuery),
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
