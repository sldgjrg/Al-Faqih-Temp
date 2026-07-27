import { cleanCorpusDisplay } from "./corpus-display.js";

const ENGLISH_STOP_WORDS = new Set(
  "a about an and are as at be can could did do does for from had has have how i if in into is it me my of on or please tell that the their them then this to us was we what when where which who why will with would you your".split(" "),
);

const RELIGIOUS_TERMS = /\b(hadith|ahadith|riwaya|riwayat|imam|sadiq|baqir|ali|hussain|husayn|mahdi|wudu|wudhu|wuzu|ablution|well|bir|kuan|kuaa|khooh|dog|kalb|kutta|kutte|water|pani|prayer|pray|salah|salat|namaz|fast|sawm|zakat|khums|nikah|talaq|taqiyya|taqiyyah|halal|haram|najis|tahir|purity|quran|allah|prophet|narration|fatwa)\b/i;
const RELIGIOUS_SCRIPT_TERMS = /(?:حدیث|حديث|روایت|رواية|امام|وضو|وضوء|بئر|کنواں|کھوہ|کتا|كلب|پانی|ماء|نماز|صلاة|زکات|زكاة|خمس|نکاح|نكاح|تقیہ|تقية|قرآن|الله)/u;
const ROMAN_URDU = /\b(kya|kaise|kyun|mujhe|mera|meri|aap|ap|hain|hai|batao|bataein|yaad|rakho|shukriya|salam)\b/i;
const ROMAN_PUNJABI = /\b(tusi|tuhada|mainu|mera naa|kiven|kidda|ki haal|labhna|paiya|changa|yaad rakho)\b/i;
const ROMAN_ARABIC = /\b(marhaban|kayfa|anta|anti|ana|shukran|ma'a salama|assalamu|salam alaykum)\b/i;

const RESPONSES = {
  english: {
    greeting: (name) => `Hello${name ? `, ${name}` : ""}. What would you like to discuss?`,
    wellbeing: "I am ready and listening. How can I help?",
    thanks: "You are welcome.",
    farewell: "Take care. Your conversations and remembered preferences will remain on this device.",
    identity: "I am Al-Faqih, an entirely on-device hadith research and conversation assistant.",
    capability: "I can converse in several languages, remember explicit preferences on this device, retrieve narrations, follow references such as “the first one,” and elucidate Arabic wording in context.",
    general: "I can keep this in our conversation, but my factual library in this fully offline build is the local hadith corpus. I will not turn an unrelated prompt into a random hadith search.",
    remembered: "I will remember that on this device.",
    noMemory: "You have not asked me to remember anything across chats yet.",
  },
  romanUrdu: {
    greeting: (name) => `Assalamu alaykum${name ? `, ${name}` : ""}. Aap kis bare mein baat karna chahte hain?`,
    wellbeing: "Main tayyar hoon. Aap batayein, main kis tarah madad karun?",
    thanks: "Khushi hui. Aap ka shukriya.",
    farewell: "Allah hafiz. Aap ki yaad rakhi hui maloomat isi device par rahegi.",
    identity: "Main Al-Faqih hoon, ek mukammal on-device hadith research aur conversation assistant.",
    capability: "Main kai zabanon mein baat, riwayat retrieve, pehli ya doosri riwayat ka hawala samajh, aur Arabi ibarat ki wazahat kar sakta hoon.",
    general: "Main is baat ko hamari guftagu ke context mein rakh sakta hoon, lekin is offline build ki factual library local hadith corpus hai. Main ghair mutaliq sawal par random riwayat nahi dikhaunga.",
    remembered: "Theek hai, main is baat ko isi device par yaad rakhunga.",
    noMemory: "Abhi aap ne mujhe chats ke darmiyan yaad rakhne ke liye koi baat nahi batayi.",
  },
  romanPunjabi: {
    greeting: (name) => `Assalamu alaykum${name ? `, ${name}` : ""}. Tusi kis gall bare gal karni ae?`,
    wellbeing: "Main tayyar aan. Dasso, main kiven madad karaan?",
    thanks: "Ji aayan nu, khushi hoi.",
    farewell: "Allah hafiz. Yaad rakhi hoi gall ise device te rahegi.",
    identity: "Main Al-Faqih aan, ik on-device hadith research te conversation assistant.",
    capability: "Main kai zubanan vich gal, riwayat labh, pichhle natije samajh, te Arabi ibarat di wazahat kar sakda aan.",
    general: "Main eh gall conversation de context vich rakh sakda aan, par is offline build di factual library local hadith corpus ae. Ghair mutaliq gall te random riwayat nahi vikhavanga.",
    remembered: "Theek ae, main eh gall ise device te yaad rakhanga.",
    noMemory: "Hale tusi chats de vichkar yaad rakhan layi koi gall nahi ditti.",
  },
  arabic: {
    greeting: (name) => `السلام عليكم${name ? ` يا ${name}` : ""}. عمّ تريد أن نتحدث؟`,
    wellbeing: "أنا حاضر ومستعد. كيف أساعدك؟",
    thanks: "على الرحب والسعة.",
    farewell: "في أمان الله. ستبقى المعلومات المحفوظة على هذا الجهاز.",
    identity: "أنا «الفقيه»، مساعد محادثة وبحث حديثي يعمل بالكامل على جهازك.",
    capability: "أستطيع المحادثة بلغات متعددة، وتذكّر ما تطلب حفظه، واسترجاع الروايات، وشرح ألفاظ النص العربي في سياقها.",
    general: "أستطيع إبقاء هذا ضمن سياق حديثنا، لكن مكتبتي المعرفية في هذا الإصدار المحلي هي مجموعة الحديث المخزنة على جهازك. لن أحوّل سؤالًا غير متعلق بها إلى روايات عشوائية.",
    remembered: "حسنًا، سأتذكر ذلك على هذا الجهاز.",
    noMemory: "لم تطلب مني بعد حفظ شيء بين المحادثات.",
  },
  urdu: {
    greeting: (name) => `السلام علیکم${name ? `، ${name}` : ""}۔ آپ کس موضوع پر بات کرنا چاہتے ہیں؟`,
    wellbeing: "میں حاضر ہوں۔ بتائیے، میں کیسے مدد کروں؟",
    thanks: "خوشی ہوئی، آپ کا شکریہ۔",
    farewell: "اللہ حافظ۔ محفوظ کی گئی معلومات اسی آلے پر رہیں گی۔",
    identity: "میں الفقیہ ہوں، مکمل طور پر آپ کے آلے پر چلنے والا حدیثی تحقیق اور گفتگو کا معاون۔",
    capability: "میں متعدد زبانوں میں گفتگو، روایات کی بازیافت، سابقہ نتائج کا حوالہ، اور عربی عبارت کی سیاقی وضاحت کر سکتا ہوں۔",
    general: "میں اس بات کو ہماری گفتگو کے سیاق میں رکھ سکتا ہوں، لیکن اس مکمل آف لائن نسخے کی معلوماتی لائبریری مقامی حدیثی ذخیرہ ہے۔ میں غیر متعلق سوال پر بے ترتیب روایات نہیں دکھاؤں گا۔",
    remembered: "ٹھیک ہے، میں یہ بات اسی آلے پر یاد رکھوں گا۔",
    noMemory: "ابھی آپ نے گفتگوؤں کے درمیان یاد رکھنے کے لیے کوئی بات نہیں بتائی۔",
  },
  punjabi: {
    greeting: (name) => `السلام علیکم${name ? `، ${name}` : ""}۔ تسی کس گل بارے گل کرنا چاندے او؟`,
    wellbeing: "میں حاضر آں۔ دسو، میں کیویں مدد کراں؟",
    thanks: "جی آیاں نوں، خوشی ہوئی۔",
    farewell: "اللہ حافظ۔ یاد رکھی ہوئی گل ایس ڈیوائس تے رہے گی۔",
    identity: "میں الفقیہ آں، اک مکمل آن ڈیوائس حدیثی تحقیق تے گفتگو دا معاون۔",
    capability: "میں کئی زباناں وچ گل، روایتاں لبھ، پچھلے نتیجیاں دا حوالہ سمجھ، تے عربی عبارت دی وضاحت کر سکدا آں۔",
    general: "میں ایہ گل ساڈی گفتگو دے سیاق وچ رکھ سکدا آں، پر ایس آف لائن نسخے دی معلوماتی لائبریری مقامی حدیثی ذخیرہ اے۔ میں غیر متعلق سوال تے بے ترتیب روایتاں نہیں وکھاواں گا۔",
    remembered: "ٹھیک اے، میں ایہ گل ایس ڈیوائس تے یاد رکھاں گا۔",
    noMemory: "ہلے تسی چیٹاں دے وچکار یاد رکھن لئی کوئی گل نہیں دسی۔",
  },
};

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
    const match = query.match(pattern);
    if (match) return { key, value: match[1].trim().replace(/[.!?]+$/, "") };
  }
  const explicit = query.match(/\bremember(?: that)?\s+(.{2,160})$/iu)
    || query.match(/\byaad rakho(?: ke| کہ)?\s+(.{2,160})$/iu)
    || query.match(/یاد رکھو(?: کہ)?\s+(.{2,160})$/u)
    || query.match(/تذكّر(?: أن)?\s+(.{2,160})$/u);
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

function memorySummary(memory, language) {
  const entries = [];
  if (memory?.profile?.name) entries.push(`Name: ${memory.profile.name}`);
  if (memory?.profile?.preference) entries.push(`Preference: ${memory.profile.preference}`);
  for (const fact of memory?.facts || []) entries.push(fact.value);
  if (!entries.length) return RESPONSES[language].noMemory;
  const heading = {
    english: "I remember:",
    romanUrdu: "Mujhe yaad hai:",
    romanPunjabi: "Mainu yaad ae:",
    arabic: "أتذكر:",
    urdu: "مجھے یاد ہے:",
    punjabi: "مینوں یاد اے:",
  }[language];
  return `${heading}\n${entries.map((entry) => `- ${entry}`).join("\n")}`;
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

export function resolveLocalConversation(query, conversation, globalMemory) {
  const normalized = normalize(query);
  const switchedLanguage = requestedLanguage(query);
  const detectedLanguage = detectConversationLanguage(query);
  const rememberedLanguage = conversation?.memory?.language || globalMemory?.profile?.language;
  const language = switchedLanguage
    || (detectedLanguage !== "english" ? detectedLanguage : rememberedLanguage)
    || detectedLanguage;
  const copy = RESPONSES[language] || RESPONSES.english;
  const memoryUpdate = extractMemory(query)
    || (switchedLanguage ? { key: "language", value: switchedLanguage } : null);
  const name = globalMemory?.profile?.name || "";

  if (memoryUpdate) {
    return { intent: "memory", language, text: copy.remembered, memoryUpdate };
  }
  if (/\b(what do you remember|what have you remembered|do you remember me|what do you know about me)\b/i.test(normalized)
    || /(?:کیا یاد|کی یاد|ماذا تتذكر)/u.test(query)) {
    return { intent: "memory-recall", language, text: memorySummary(globalMemory, language) };
  }
  if (/\b(what(?:'s| is) my name|who am i)\b/i.test(normalized) || /میرا نام کیا|ما اسمي/u.test(query)) {
    return {
      intent: "memory-recall",
      language,
      text: name ? `${language === "english" ? "Your name is" : "Name"} ${name}.` : copy.noMemory,
    };
  }
  if (/^(hi|hello|hey|yo|hiya|good (?:morning|evening|afternoon))[.! ]*$/i.test(normalized)
    || /^(salam|salaam|assalamu alaykum|as-salamu alaykum)[.! ]*$/i.test(normalized)
    || /^(السلام عليكم|سلام|مرحبا|السلام علیکم)[.!، ]*$/u.test(query)) {
    return { intent: "greeting", language: normalized === "hi" ? "english" : language, text: (normalized === "hi" ? RESPONSES.english : copy).greeting(name) };
  }
  if (/\b(how are you|how's it going|kya haal|ki haal|kiven ho|kayfa haluk)\b/i.test(normalized)
    || /كيف حالك|کیا حال|کی حال/u.test(query)) {
    return { intent: "wellbeing", language, text: copy.wellbeing };
  }
  if (/^(thanks|thank you|thx|shukriya|shukran|جزاك الله|شکریہ)[.! ]*$/iu.test(normalized)) {
    return { intent: "thanks", language, text: copy.thanks };
  }
  if (/^(bye|goodbye|allah hafiz|khuda hafiz|ma'a salama|خدا حافظ|اللہ حافظ|مع السلامة)[.! ]*$/iu.test(normalized)) {
    return { intent: "farewell", language, text: copy.farewell };
  }
  if (/\b(who are you|what are you|your name)\b/i.test(normalized) || /من أنت|آپ کون|تسی کون/u.test(query)) {
    return { intent: "identity", language, text: copy.identity };
  }
  if (switchedLanguage || /\b(what can you do|help me|capabilities)\b/i.test(normalized)) {
    return { intent: "capability", language, text: copy.capability, memoryUpdate };
  }
  if (!RELIGIOUS_TERMS.test(normalized) && !RELIGIOUS_SCRIPT_TERMS.test(query)) {
    return {
      intent: "conversation",
      language,
      text: normalized.split(/\s+/).length <= 7 && !/[?؟]/u.test(query) ? copy.capability : copy.general,
    };
  }
  return null;
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
  if (/\b(clay|paradise|shadows)\b/.test(normalized)) return "Creation, Clay, and Covenant";

  const words = meaningfulWords(allUserText)
    .filter((word, index, all) => all.indexOf(word) === index);
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
  return "Welcome Conversation";
}
