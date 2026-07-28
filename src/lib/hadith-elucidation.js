// const ORDINALS = new Map([
//   ["first", 0],
//   ["1st", 0],
//   ["one", 0],
//   ["second", 1],
//   ["2nd", 1],
//   ["two", 1],
//   ["third", 2],
//   ["3rd", 2],
//   ["three", 2],
//   ["fourth", 3],
//   ["4th", 3],
//   ["four", 3],
//   ["fifth", 4],
//   ["5th", 4],
//   ["five", 4],
// ]);

// const ARABIC_GLOSSES = new Map(Object.entries({
//   ابو: "father of; part of a kunya",
//   عبد: "servant or worshipper",
//   الله: "Allah",
//   قال: "he said",
//   قالت: "she said",
//   قلت: "I said",
//   سالت: "I asked",
//   الصلاه: "the prayer",
//   صلاه: "prayer",
//   صل: "pray",
//   قم: "stand; rise",
//   علمني: "teach me",
//   كيف: "how",
//   اذا: "when; if",
//   ان: "if; indeed, according to syntax",
//   فان: "then if; for indeed",
//   سقط: "fell",
//   فيها: "in it",
//   في: "in",
//   البئر: "the well",
//   كلب: "a dog",
//   قدرت: "you are able",
//   تنزح: "to draw out or drain",
//   ماءها: "its water",
//   الماء: "the water",
//   فافعل: "then do so",
//   حتى: "until",
//   يطيب: "it becomes wholesome or clean",
//   سبع: "seven",
//   دلاء: "buckets",
//   لا: "not; no",
//   باس: "harm, objection, or problem",
//   الركوع: "bowing",
//   السجود: "prostration",
//   ركعه: "a unit of prayer",
//   ركعتين: "two units of prayer",
//   القبله: "the direction of prayer",
//   كبر: "he pronounced the takbir",
//   الحمد: "praise; al-Fatihah in this context",
//   سبحان: "glory be; declaring transcendence",
//   ربي: "my Lord",
//   العظيم: "the Magnificent",
//   الاعلى: "the Most High",
//   وبحمده: "and with His praise",
//   استغفر: "I seek forgiveness",
//   اتوب: "I repent; I turn back",
//   اليه: "to Him",
// }));

// const ARABIC_TRANSLITERATION = {
//   ا: "a", ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh",
//   د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh", ص: "s",
//   ض: "d", ط: "t", ظ: "z", ع: "'", غ: "gh", ف: "f", ق: "q",
//   ك: "k", ل: "l", م: "m", ن: "n", ه: "h", و: "w", ي: "y",
//   ء: "'", ى: "a", ة: "ah", ئ: "'", ؤ: "'", آ: "a",
// };

// const IDIOMS = [
//   {
//     pattern: /جعلت فداك/u,
//     literal: "May I be made your ransom.",
//     meaning: "A devotional expression of reverence, not a literal proposal of exchange.",
//   },
//   {
//     pattern: /فداك ابي وامي/u,
//     literal: "May my father and mother be your ransom.",
//     meaning: "An emphatic Arabic expression of love, loyalty, and reverence.",
//   },
//   {
//     pattern: /لا باس/u,
//     literal: "There is no harm.",
//     meaning: "Idiomatic legal language indicating no objection or impediment in the stated case.",
//   },
//   {
//     pattern: /سمع الله لمن حمده/u,
//     literal: "Allah hears the one who praises Him.",
//     meaning: "The prescribed prayer formula said when rising from bowing.",
//   },
//   {
//     pattern: /عليه السلام/u,
//     literal: "Peace be upon him.",
//     meaning: "An honorific invocation following the name or title of a sacred figure.",
//   },
// ];

// function normalizeArabic(value) {
//   return value
//     .normalize("NFKD")
//     .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
//     .replace(/[إأآٱ]/g, "ا")
//     .replace(/ى/g, "ي")
//     .replace(/ة/g, "ه")
//     .replace(/[^\u0600-\u06FF\s]/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function transliterate(value) {
//   return normalizeArabic(value)
//     .split("")
//     .map((character) => ARABIC_TRANSLITERATION[character] ?? character)
//     .join("")
//     .replace(/\s+/g, " ")
//     .trim();
// }

// function extractTextParts(text) {
//   const paragraphs = text
//     .replace(/^###\s+.+$/m, "")
//     .replace(/\[Link\]\([^)]+\)/gi, "")
//     .split(/\n\s*\n/)
//     .map((paragraph) => paragraph.trim())
//     .filter(Boolean);

//   const arabic = paragraphs
//     .filter((paragraph) => (paragraph.match(/[\u0600-\u06FF]/g) || []).length > 12)
//     .join("\n\n");
//   const english = paragraphs
//     .filter((paragraph) => {
//       const latin = (paragraph.match(/[A-Za-z]/g) || []).length;
//       const arabicLetters = (paragraph.match(/[\u0600-\u06FF]/g) || []).length;
//       return latin > 20 && latin > arabicLetters;
//     })
//     .join("\n\n");
//   return { arabic, english };
// }

// function extractMatn(english) {
//   const quoteStart = english.search(/[“"]/);
//   if (quoteStart >= 0) return english.slice(quoteStart).trim();
//   const following = english.match(/(?:has said the following|said the following|reported):\s*(.+)$/is);
//   return (following?.[1] || english).trim();
// }

// function meaningClauses(matn) {
//   const sentences = matn
//     .replace(/[“”]/g, "")
//     .split(/(?<=[.!?])\s+(?=[A-Z‘'“])/)
//     .map((sentence) => sentence.trim())
//     .filter((sentence) => sentence.length > 18);

//   return sentences.slice(0, 12).map((text) => {
//     let role = "Statement";
//     if (/\b(asked|questioned|inquired)\b/i.test(text)) role = "Question";
//     if (/^(if|when|unless)\b|\bif\b/i.test(text)) role = "Condition";
//     if (/\b(must|should|do not|never|perform|draw|pray|recite|place)\b/i.test(text)) role = "Instruction";
//     if (/\bmeans\b|\brefers to\b/i.test(text)) role = "Definition";
//     return { role, text };
//   });
// }

// function trimSentence(value, limit = 280) {
//   const clean = value.replace(/\s+/g, " ").replace(/^[“"'‘]+|[”"'’]+$/g, "").trim();
//   if (clean.length <= limit) return clean;
//   return `${clean.slice(0, limit).replace(/\s+\S*$/, "")}…`;
// }

// function explainNarration(english, matn) {
//   const normalized = english.toLowerCase();
//   if (
//     /\b(?:after|in) two rak[‘'’]?at\b/.test(normalized)
//     && /\b(?:greeting of peace|salam|taslim)\b/.test(normalized)
//   ) {
//     const isMaghrib = /\bmaghrib\b/.test(normalized);
//     return {
//       overview: "This report is about ending a prayer prematurely and realizing that the required units were not complete. Its focus is correction after an accidental taslim, not uncertainty about prayer times.",
//       points: [
//         {
//           title: "What happened",
//           text: `The worshipper ended after two units even though ${isMaghrib ? "Maghrib required a third" : "the prayer was not complete"}. The mistake was an early ending, not a doubt that arose while still praying.`,
//         },
//         {
//           title: "What the response means",
//           text: "The Imam’s answer treats the omitted unit as something that could be completed in the described circumstances; repeating the entire prayer was more than this report required.",
//         },
//         {
//           title: "Limit of the report",
//           text: `${isMaghrib ? "The incident itself concerns Maghrib, not Isha." : "The exact prayer and surrounding acts still matter."} Whether the same remedy applies after speaking, turning away from qiblah, losing wudu, or after a long delay requires the related narrations and the ruling of one’s marja.`,
//         },
//       ],
//       takeaway: "The useful distinction is between an immediately noticed premature taslim, which the report allows to be completed, and circumstances that may break continuity and change the ruling.",
//     };
//   }
//   if (/\b(?:taqiyya|taqiyyah|taqiyah|dissimulation)\b/.test(normalized)) {
//     const mentionsSocialHarm = /\b(tongues|abusing|destroyed|private|public|honor|humiliat)\b/.test(normalized);
//     return {
//       overview: "The narration treats taqiyyah as protective discretion: guarding faith, people, and entrusted matters when disclosure would expose them to real harm. It is broader than merely pretending to belong to another sect.",
//       points: [
//         {
//           title: "What the text directly establishes",
//           text: "Taqiyyah is presented as a serious religious discipline of concealment and caution, not as permission to abandon belief. The outward restraint protects what remains inwardly affirmed.",
//         },
//         {
//           title: "What its context can include",
//           text: mentionsSocialHarm
//             ? "This report itself mentions harm through people’s tongues, abuse in private and public, and threatened destruction. That supports including social and reputational harm, not only physical violence."
//             : "Related reports in this chapter apply the principle across conduct and danger, so reducing it to one sectarian disguise would be too narrow.",
//         },
//         {
//           title: "What should not be overclaimed",
//           text: "The narration does not make every awkward situation or ordinary embarrassment taqiyyah. The harm, the protected interest, legal limits, and whether concealment is actually warranted still need context.",
//         },
//       ],
//       takeaway: "The principle is prudent concealment against meaningful harm while preserving the truth inwardly; its scope is wider than sectarian appearance, but it is not a label for every act of avoidance.",
//     };
//   }
//   if (/\b(?:lime paste|nurah|noorah|depilatory)\b/.test(normalized) && /\b(?:bathhouse|saw|see|cover|screen)\b/.test(normalized)) {
//     return {
//       overview: "The report uses the lime paste as a covering in a scene where the Imam did not want something exposed. The wording protects the fact of concealment without necessarily identifying exactly what was concealed.",
//       points: [
//         {
//           title: "What is explicit",
//           text: "The narrator perceived something the Imam preferred not to have seen, and the answer redirects attention to the covering function of the paste.",
//         },
//         {
//           title: "Why a narrow reading is unsafe",
//           text: "The report does not require the unseen matter to be the private parts. A mark, scar, bodily condition, or another private feature can fit the language unless another text specifies it.",
//         },
//         {
//           title: "Interpretive boundary",
//           text: "Those possibilities explain the range of the wording; they are examples, not claims about what was actually there. The strongest conclusion is privacy and concealment, not a definite diagnosis of the hidden thing.",
//         },
//       ],
//       takeaway: "Read the report at the level it states: the Imam maintained bodily privacy, while the precise object of that privacy remains unspecified.",
//     };
//   }
//   if (/\bclay of paradise\b/.test(normalized) && /\bshadows\b/.test(normalized)) {
//     return {
//       overview: "The narration presents human moral and spiritual affiliation as beginning before ordinary earthly life. Its clay imagery connects inward receptivity with what a person later recognizes: Allah, the prophets, and the wilayah of the Ahl al-Bayt.",
//       points: [
//         {
//           title: "Clay as spiritual origin",
//           text: "Paradise and fire are used as images of two opposed dispositions. The point is not merely the material from which bodies are made, but an affinity between a person’s origin, what that person loves, and what that person is prepared to accept.",
//         },
//         {
//           title: "The shadows",
//           text: "The Imam explains the shadows through something that appears to have a form while lacking ordinary substance. In the flow of the report, this describes a pre-earthly mode of existence rather than the embodied life people presently know.",
//         },
//         {
//           title: "Recognition reveals the disposition",
//           text: "The calls to belief in Allah, the prophets, and the Ahl al-Bayt unfold in stages. Acceptance does not create the underlying orientation in this account; it discloses it.",
//         },
//         {
//           title: "The Qur’anic citations",
//           text: "The cited verses are used to frame later belief and rejection as continuous with that earlier response. The final statement identifies refusal of wilayah as the decisive instance of that rejection.",
//         },
//       ],
//       takeaway: "In plain terms, the hadith is explaining why recognition of divine authority differs between people: outward choices reveal a deeper primordial orientation, expressed through the language of clay, shadows, and covenant.",
//     };
//   }
//   if (/\bwell\b/.test(normalized) && /\b(bucket|draw(?:ing)? out|water)\b/.test(normalized)) {
//     return {
//       overview: "The narration gives a conditional procedure for water in a well after an animal falls into it. The controlling signs are disintegration and a perceptible change in the water, not the animal’s presence by itself.",
//       points: [
//         {
//           title: "When the water has not changed",
//           text: "If the animal has not disintegrated and the water’s qualities remain unchanged, the instruction is to remove the stated number of buckets.",
//         },
//         {
//           title: "When the water has changed",
//           text: "If taste or smell has changed, a fixed bucket count is no longer the endpoint. Water is drawn until the alteration disappears.",
//         },
//         {
//           title: "What answers the question",
//           text: "For a wudhu question, the relevant teaching is that usability turns on the condition of the well water and the prescribed removal, rather than on an unrelated ruling about hunting dogs.",
//         },
//       ],
//       takeaway: "The report distinguishes an unchanged well, for which a limited removal is prescribed, from changed water, which must be drawn until the sensory change is gone.",
//     };
//   }
//   if (/\bhammad\b/.test(normalized) && /\b(pray|prayer|bow|prostrat)\b/.test(normalized)) {
//     return {
//       overview: "This is a practical demonstration rather than an abstract list of rules. The Imam teaches prayer by performing its sequence carefully enough for the companion to observe posture, recitation, stillness, bowing, and prostration together.",
//       points: [
//         {
//           title: "Embodied instruction",
//           text: "The details show that prayer is learned through coordinated actions and pauses, not by reciting isolated formulas alone.",
//         },
//         {
//           title: "Order and composure",
//           text: "The sequence gives each movement its place and emphasizes settled posture before moving to the next act.",
//         },
//         {
//           title: "Purpose of the demonstration",
//           text: "The companion is being corrected through a complete model that can be imitated, making the narration especially relevant to questions about how the Imam prayed.",
//         },
//       ],
//       takeaway: "The hadith teaches the form of prayer as one continuous, deliberate act in which wording, posture, and stillness all matter.",
//     };
//   }

//   const clauses = meaningClauses(matn);
//   const question = clauses.find(({ role }) => role === "Question");
//   const instruction = clauses.find(({ role }) => role === "Instruction");
//   const condition = clauses.find(({ role }) => role === "Condition");
//   const core = instruction || condition || clauses.find(({ text }) => text.length > 35) || { text: matn };
//   const anchor = trimSentence(core.text, 190).replace(/^(he replied|he said|the imam said)[,:]?\s*/i, "");
//   return {
//     overview: question
//       ? "This is a case-and-answer report. The answer is tied to the facts raised by the question, so it should not be detached from those facts and turned into an unlimited slogan."
//       : "This report gives a teaching in a particular narrative setting. Its practical force comes from the relationship between that setting, the instruction, and any condition or contrast in the text.",
//     points: [
//       {
//         title: "Textual anchor",
//         text: anchor,
//       },
//       {
//         title: "How to read it",
//         text: condition
//           ? "The result turns on a stated condition. The narration is distinguishing cases, so changing that condition can change what follows."
//           : instruction
//             ? "The report moves from description to an instruction. That makes the action the immediate lesson, while the surrounding account explains when it is relevant."
//             : "The report’s central claim should be read in its immediate setting and alongside the contrast or problem that prompted it.",
//       },
//       {
//         title: "What it does not settle by itself",
//         text: "This single report does not by itself establish every wider application, reconcile apparently different narrations, grade its chain, or replace a juristic ruling where the issue is one of practical law.",
//       },
//     ],
//     takeaway: condition
//       ? "The sound reading preserves the condition and applies the teaching to the kind of case the narration actually describes."
//       : "The sound reading takes the report’s practical point without claiming more than its wording and context can support.",
//   };
// }

// function extractArabicMatn(arabic) {
//   const starts = [
//     /قَالَ\s+سَأَلْتُ/u,
//     /قَالَ\s+قُلْتُ/u,
//     /فَقَالَ/u,
//     /قَالَ\s+أَبُو/u,
//   ];
//   for (const pattern of starts) {
//     const index = arabic.search(pattern);
//     if (index >= 0) return arabic.slice(index).trim();
//   }
//   return arabic.trim();
// }

// function quotedPhrase(query) {
//   return query.match(/[“"«]([^”"»]{2,})[”"»]/u)?.[1]?.trim()
//     || query.match(/'([^']{2,})'/u)?.[1]?.trim()
//     || "";
// }

// function phraseAnalysis(phrase, arabic, english) {
//   if (!phrase) return null;
//   const containsArabic = /[\u0600-\u06FF]/u.test(phrase);
//   if (!containsArabic) {
//     const sentence = english
//       .split(/(?<=[.!?])\s+/)
//       .find((candidate) => candidate.toLowerCase().includes(phrase.toLowerCase()));
//     return {
//       phrase,
//       context: sentence || phrase,
//       words: [],
//       idioms: [],
//     };
//   }

//   const normalizedPhrase = normalizeArabic(phrase);
//   const words = phrase
//     .replace(/[^\u0600-\u06FF\s]/gu, " ")
//     .split(/\s+/)
//     .filter(Boolean)
//     .map((word) => {
//       const normalized = normalizeArabic(word);
//       return {
//         word,
//         transliteration: transliterate(word),
//         gloss: ARABIC_GLOSSES.get(normalized) || "Meaning depends on its form and sentence context.",
//       };
//     });
//   const idioms = IDIOMS
//     .filter(({ pattern }) => pattern.test(normalizedPhrase))
//     .map(({ literal, meaning }) => ({ literal, meaning }));
//   return { phrase, context: "", words, idioms };
// }

// function referencedIndex(query, resultCount) {
//   const normalized = query.toLowerCase();
//   if (/\blast(?: one| result| hadith| narration)?\b/.test(normalized) || /(?:آخری|آخری|الأخير)/u.test(query)) return resultCount - 1;
//   if (/(?:پہلی|پہلا|اول|الأول|pehli|pehla)/iu.test(query)) return 0;
//   if (/(?:دوسری|دوسرا|ثاني|الثاني|doosri|dusri)/iu.test(query)) return 1;
//   if (/(?:تیسری|تیسرا|ثالث|الثالث|teesri|tisri)/iu.test(query)) return 2;
//   for (const [word, index] of ORDINALS) {
//     const explicit = new RegExp(`\\b(?:the\\s+)?${word}(?:\\s+one|\\s+result|\\s+hadith|\\s+narration)?\\b`);
//     const numbered = new RegExp(`(?:#|result\\s*|hadith\\s*|narration\\s*)${index + 1}\\b`);
//     if (explicit.test(normalized) || numbered.test(normalized)) return index;
//   }
//   return 0;
// }

// export function resolveElucidation(query, conversation) {
//   const normalized = query.toLowerCase();
//   const asksForElucidation = /\b(explain|elucidate|clarify|word by word|word-by-word|what does|meaning of|what about|samjhao|samjha|wazahat|matlab)\b/.test(normalized)
//     || /(?:سمجھاؤ|سمجھاو|وضاحت|مطلب|اشرح|وضّح|معنى)/u.test(query);
//   const asksForNext = /^(?:yes|yeah|yep|sure|ok(?:ay)?|please do|more|next(?: one)?|continue|go on)[.!?\s]*$/i.test(query.trim());
//   const hasReference = /\b(first|second|third|fourth|fifth|last|this one|that one|it|result|hadith|narration)\b/.test(normalized)
//     || /(?:پہلی|پہلا|دوسری|دوسرا|تیسری|تیسرا|آخری|اول|ثاني|ثالث|الأول|الثاني|الثالث)/u.test(query)
//     || Boolean(quotedPhrase(query));

//   const priorResults = [...conversation.messages]
//     .reverse()
//     .find((message) => message.role === "assistant" && Array.isArray(message.results) && message.results.length);
//   if (!priorResults) return null;
//   const latestAssistant = [...conversation.messages]
//     .reverse()
//     .find((message) => message.role === "assistant");
//   const continuesElucidation = asksForNext && Boolean(latestAssistant?.elucidation && !latestAssistant.elucidation.end);
//   if (!asksForElucidation && !continuesElucidation) return null;

//   const phrase = quotedPhrase(query);
//   let index = hasReference ? referencedIndex(query, priorResults.results.length) : 0;
//   if (continuesElucidation) {
//     const previousIndex = priorResults.results.findIndex(({ id }) => id === latestAssistant.elucidation.resultId);
//     index = previousIndex >= 0 ? previousIndex + 1 : 1;
//   }
//   if (phrase) {
//     const phraseIndex = priorResults.results.findIndex((result) =>
//       result.text.toLowerCase().includes(phrase.toLowerCase()));
//     if (phraseIndex >= 0) index = phraseIndex;
//   }
//   if (index >= priorResults.results.length) {
//     return {
//       end: true,
//       message: "That was the last narration in this result set. Ask a new question if you want me to retrieve a different group of reports.",
//     };
//   }
//   const result = priorResults.results[Math.max(0, index)];
//   const { arabic, english } = extractTextParts(result.text);
//   const matn = extractMatn(english);

//   return {
//     resultId: result.id,
//     title: result.title,
//     collection: result.collection,
//     author: result.author,
//     link: result.link,
//     position: index + 1,
//     total: priorResults.results.length,
//     hasNext: index + 1 < priorResults.results.length,
//     matn,
//     explanation: explainNarration(english, matn),
//     parallel: {
//       arabic: extractArabicMatn(arabic),
//       english: matn,
//     },
//     clauses: meaningClauses(matn),
//     phrase: phraseAnalysis(phrase, arabic, english),
//   };
// }

const ORDINALS = new Map([
  ["first", 0],
  ["1st", 0],
  ["one", 0],
  ["second", 1],
  ["2nd", 1],
  ["two", 1],
  ["third", 2],
  ["3rd", 2],
  ["three", 2],
  ["fourth", 3],
  ["4th", 3],
  ["four", 3],
  ["fifth", 4],
  ["5th", 4],
  ["five", 4],
]);

const ARABIC_GLOSSES = new Map(Object.entries({
  ابو: "father of; part of a kunya",
  عبد: "servant or worshipper",
  الله: "Allah",
  قال: "he said",
  قالت: "she said",
  قلت: "I said",
  سالت: "I asked",
  الصلاه: "the prayer",
  صلاه: "prayer",
  صل: "pray",
  قم: "stand; rise",
  علمني: "teach me",
  كيف: "how",
  اذا: "when; if",
  ان: "if; indeed, according to syntax",
  فان: "then if; for indeed",
  سقط: "fell",
  فيها: "in it",
  في: "in",
  البئر: "the well",
  كلب: "a dog",
  قدرت: "you are able",
  تنزح: "to draw out or drain",
  ماءها: "its water",
  الماء: "the water",
  فافعل: "then do so",
  حتى: "until",
  يطيب: "it becomes wholesome or clean",
  سبع: "seven",
  دلاء: "buckets",
  لا: "not; no",
  باس: "harm, objection, or problem",
  الركوع: "bowing",
  السجود: "prostration",
  ركعه: "a unit of prayer",
  ركعتين: "two units of prayer",
  القبله: "the direction of prayer",
  كبر: "he pronounced the takbir",
  الحمد: "praise; al-Fatihah in this context",
  سبحان: "glory be; declaring transcendence",
  ربي: "my Lord",
  العظيم: "the Magnificent",
  الاعلى: "the Most High",
  وبحمده: "and with His praise",
  استغفر: "I seek forgiveness",
  اتوب: "I repent; I turn back",
  اليه: "to Him",
}));

const ARABIC_TRANSLITERATION = {
  ا: "a", ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh",
  د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh", ص: "s",
  ض: "d", ط: "t", ظ: "z", ع: "'", غ: "gh", ف: "f", ق: "q",
  ك: "k", ل: "l", م: "m", ن: "n", ه: "h", و: "w", ي: "y",
  ء: "'", ى: "a", ة: "ah", ئ: "'", ؤ: "'", آ: "a",
};

const IDIOMS = [
  {
    pattern: /جعلت فداك/u,
    literal: "May I be made your ransom.",
    meaning: "A devotional expression of reverence, not a literal proposal of exchange.",
  },
  {
    pattern: /فداك ابي وامي/u,
    literal: "May my father and mother be your ransom.",
    meaning: "An emphatic Arabic expression of love, loyalty, and reverence.",
  },
  {
    pattern: /لا باس/u,
    literal: "There is no harm.",
    meaning: "Idiomatic legal language indicating no objection or impediment in the stated case.",
  },
  {
    pattern: /سمع الله لمن حمده/u,
    literal: "Allah hears the one who praises Him.",
    meaning: "The prescribed prayer formula said when rising from bowing.",
  },
  {
    pattern: /عليه السلام/u,
    literal: "Peace be upon him.",
    meaning: "An honorific invocation following the name or title of a sacred figure.",
  },
];

function normalizeArabic(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FF\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function transliterate(value) {
  return normalizeArabic(value)
    .split("")
    .map((character) => ARABIC_TRANSLITERATION[character] ?? character)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextParts(text) {
  const paragraphs = text
    .replace(/^###\s+.+$/m, "")
    .replace(/\[Link\]\([^)]+\)/gi, "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const arabic = paragraphs
    .filter((paragraph) => (paragraph.match(/[\u0600-\u06FF]/g) || []).length > 12)
    .join("\n\n");
  const english = paragraphs
    .filter((paragraph) => {
      const latin = (paragraph.match(/[A-Za-z]/g) || []).length;
      const arabicLetters = (paragraph.match(/[\u0600-\u06FF]/g) || []).length;
      return latin > 20 && latin > arabicLetters;
    })
    .join("\n\n");
  return { arabic, english };
}

function extractMatn(english) {
  const quoteStart = english.search(/[“"]/);
  if (quoteStart >= 0) return english.slice(quoteStart).trim();
  const following = english.match(/(?:has said the following|said the following|reported):\s*(.+)$/is);
  return (following?.[1] || english).trim();
}

function meaningClauses(matn) {
  const sentences = matn
    .replace(/[“”]/g, "")
    .split(/(?<=[.!?])\s+(?=[A-Z‘'“])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 18);

  return sentences.slice(0, 12).map((text) => {
    let role = "Statement";
    if (/\b(asked|questioned|inquired)\b/i.test(text)) role = "Question";
    if (/^(if|when|unless)\b|\bif\b/i.test(text)) role = "Condition";
    if (/\b(must|should|do not|never|perform|draw|pray|recite|place)\b/i.test(text)) role = "Instruction";
    if (/\bmeans\b|\brefers to\b/i.test(text)) role = "Definition";
    return { role, text };
  });
}

function trimSentence(value, limit = 280) {
  const clean = value.replace(/\s+/g, " ").replace(/^[“"'‘]+|[”"'’]+$/g, "").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit).replace(/\s+\S*$/, "")}…`;
}

function explainNarration(english, matn) {
  const clauses = meaningClauses(matn);
  const question = clauses.find(({ role }) => role === "Question");
  const instructions = clauses.filter(({ role }) => role === "Instruction").slice(0, 2);
  const conditions = clauses.filter(({ role }) => role === "Condition").slice(0, 2);
  const core = instructions[0] || conditions[0] || clauses.find(({ text }) => text.length > 35) || { text: matn };
  const anchor = trimSentence(core.text, 210).replace(/^(he replied|he said|the imam said)[,:]?\s*/i, "");
  const setting = question
    ? trimSentence(question.text, 190)
    : trimSentence(clauses[0]?.text || matn, 190);
  return {
    overview: question
      ? "This is a case-and-answer report. Its answer must be read together with the facts in the question rather than detached into an unlimited rule."
      : "This report communicates a teaching through a particular statement or incident. The immediate wording is the secure starting point; wider applications require an explicit connection to that wording.",
    points: [
      {
        title: "What the text establishes",
        text: anchor || "The report's direct claim is contained in the quoted wording.",
      },
      {
        title: "Immediate context",
        text: setting || "The surrounding exchange identifies the situation to which the statement responds.",
      },
      {
        title: "Conditional structure",
        text: conditions.length
          ? `The report turns on this condition: ${trimSentence(conditions.map(({ text }) => text).join(" "), 230)}`
          : instructions.length
            ? "The narration moves from its setting to a concrete instruction; that instruction is its immediate practical point."
            : "No additional condition should be invented beyond the one actually stated in the report.",
      },
      {
        title: "What remains unsettled",
        text: "By itself, this report does not grade its chain, reconcile every other narration, prove every possible extension, or replace a juristic ruling where practical law is being asked.",
      },
    ],
    takeaway: conditions.length
      ? "Preserve the report's stated condition and apply its teaching only to cases that genuinely share that condition."
      : "Take the narration's direct lesson seriously while keeping possible wider applications distinct from what the wording itself proves.",
  };
}

function extractArabicMatn(arabic) {
  const starts = [
    /قَالَ\s+سَأَلْتُ/u,
    /قَالَ\s+قُلْتُ/u,
    /فَقَالَ/u,
    /قَالَ\s+أَبُو/u,
  ];
  for (const pattern of starts) {
    const index = arabic.search(pattern);
    if (index >= 0) return arabic.slice(index).trim();
  }
  return arabic.trim();
}

function quotedPhrase(query) {
  return query.match(/[“"«]([^”"»]{2,})[”"»]/u)?.[1]?.trim()
    || query.match(/'([^']{2,})'/u)?.[1]?.trim()
    || "";
}

function phraseAnalysis(phrase, arabic, english) {
  if (!phrase) return null;
  const containsArabic = /[\u0600-\u06FF]/u.test(phrase);
  if (!containsArabic) {
    const sentence = english
      .split(/(?<=[.!?])\s+/)
      .find((candidate) => candidate.toLowerCase().includes(phrase.toLowerCase()));
    return {
      phrase,
      context: sentence || phrase,
      words: [],
      idioms: [],
    };
  }

  const normalizedPhrase = normalizeArabic(phrase);
  const words = phrase
    .replace(/[^\u0600-\u06FF\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const normalized = normalizeArabic(word);
      return {
        word,
        transliteration: transliterate(word),
        gloss: ARABIC_GLOSSES.get(normalized) || "Meaning depends on its form and sentence context.",
      };
    });
  const idioms = IDIOMS
    .filter(({ pattern }) => pattern.test(normalizedPhrase))
    .map(({ literal, meaning }) => ({ literal, meaning }));
  return { phrase, context: "", words, idioms };
}

function referencedIndex(query, resultCount) {
  const normalized = query.toLowerCase();
  if (/\blast(?: one| result| hadith| narration)?\b/.test(normalized) || /(?:آخری|آخری|الأخير)/u.test(query)) return resultCount - 1;
  if (/(?:پہلی|پہلا|اول|الأول|pehli|pehla)/iu.test(query)) return 0;
  if (/(?:دوسری|دوسرا|ثاني|الثاني|doosri|dusri)/iu.test(query)) return 1;
  if (/(?:تیسری|تیسرا|ثالث|الثالث|teesri|tisri)/iu.test(query)) return 2;
  for (const [word, index] of ORDINALS) {
    const explicit = new RegExp(`\\b(?:the\\s+)?${word}(?:\\s+one|\\s+result|\\s+hadith|\\s+narration)?\\b`);
    const numbered = new RegExp(`(?:#|result\\s*|hadith\\s*|narration\\s*)${index + 1}\\b`);
    if (explicit.test(normalized) || numbered.test(normalized)) return index;
  }
  return 0;
}

export function resolveElucidation(query, conversation) {
  const normalized = query.toLowerCase().trim();
  const explicitExplain = /\b(explain|elucidate|clarify|word by word|word-by-word|interpret|samjhao|samjha|wazahat|matlab)\b/.test(normalized)
    || /(?:سمجھاؤ|سمجھاو|وضاحت|اشرح|وضّح)/u.test(query);
  const contextualMeaning = /\bwhat does (?:this|that|it|the (?:first|second|third|fourth|fifth|last) (?:one|result|hadith|narration)|this (?:hadith|narration)|that (?:hadith|narration)) mean\b/.test(normalized)
    || /(?:اس کا مطلب|اس روایت کا مطلب|معنى هذه الرواية)/u.test(query);
  const asksForNext = /^(?:yes|yeah|yep|sure|ok(?:ay)?|please do|more|next(?: one)?|continue|go on)[.!?\s]*$/i.test(query.trim());
  const hasReference = /\b(first|second|third|fourth|fifth|last|previous|this one|that one|this hadith|that hadith|this narration|that narration|the result|the hadith|the narration)\b/.test(normalized)
    || /(?:پہلی|پہلا|دوسری|دوسرا|تیسری|تیسرا|آخری|اول|ثاني|ثالث|الأول|الثاني|الثالث)/u.test(query)
    || Boolean(quotedPhrase(query));

  const priorResults = [...conversation.messages]
    .reverse()
    .find((message) => message.role === "assistant" && Array.isArray(message.results) && message.results.length);
  if (!priorResults) return null;
  const latestAssistant = [...conversation.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const continuesElucidation = asksForNext && Boolean(latestAssistant?.elucidation && !latestAssistant.elucidation.end);
  const terseExplain = explicitExplain && normalized.split(/\s+/).length <= 4;
  if (!contextualMeaning && !continuesElucidation && !(explicitExplain && (hasReference || terseExplain))) return null;

  const phrase = quotedPhrase(query);
  let index = hasReference ? referencedIndex(query, priorResults.results.length) : 0;
  if (continuesElucidation) {
    const previousIndex = priorResults.results.findIndex(({ id }) => id === latestAssistant.elucidation.resultId);
    index = previousIndex >= 0 ? previousIndex + 1 : 1;
  }
  if (phrase) {
    const phraseIndex = priorResults.results.findIndex((result) =>
      result.text.toLowerCase().includes(phrase.toLowerCase()));
    if (phraseIndex >= 0) index = phraseIndex;
  }
  if (index >= priorResults.results.length) {
    return {
      end: true,
      message: "That was the last narration in this result set. Ask a new question if you want me to retrieve a different group of reports.",
    };
  }
  const result = priorResults.results[Math.max(0, index)];
  const { arabic, english } = extractTextParts(result.text);
  const matn = extractMatn(english);

  return {
    resultId: result.id,
    title: result.title,
    collection: result.collection,
    author: result.author,
    link: result.link,
    position: index + 1,
    total: priorResults.results.length,
    hasNext: index + 1 < priorResults.results.length,
    matn,
    explanation: explainNarration(english, matn),
    explanationMode: "extractive-fallback",
    parallel: {
      arabic: extractArabicMatn(arabic),
      english: matn,
    },
    clauses: meaningClauses(matn),
    phrase: phraseAnalysis(phrase, arabic, english),
  };
}

