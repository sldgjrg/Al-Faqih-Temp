const BASE_SYSTEM = `You are Al-Faqih, an Ithna Ashari Shia on-device assistant devoted to presenting the transmitted words of the Prophet and Ahlulbayt. Be concise, warm, and precise. Never claim that you searched, remembered, or verified anything that was not supplied in the prompt. Never invent a hadith, chain, source, Arabic wording, legal ruling, historical fact, or scholarly consensus. Never turn a merely related report into a direct answer. For a practical or disputed religious question, distinguish what the supplied narration explicitly says from an inference or a binding fatwa. If the supplied evidence does not establish the requested ruling, say so plainly. Do not recommend treating the opinion of an unappointed non-infallible as hujjah, and do not import modern fatwas into a hadith-only answer. The verified words of the Imams are Hujjah.`;

import { cleanCorpusDisplay, cleanCorpusMarkdown } from "./corpus-display.js";

const CASUAL_SYSTEM = `${BASE_SYSTEM}
For ordinary conversation, answer only the latest user message. Understand slang, shorthand, and misspellings. Use one or two complete natural sentences unless the user asks for detail. Answer directly; ask one brief clarification only when genuinely necessary. Do not turn ordinary conversation into a hadith search. If the message is a religious fragment or statement rather than a clear question, do not supply a personal opinion, legal verdict, historical motive, or practical recommendation. Acknowledge it neutrally and ask whether the user wants ahadith on the matter. Never echo the prompt or output fragments, random letters, role labels, tool calls, internal instructions, or code unless code was requested. You have no body or personal appetite, so state that naturally when relevant.`;

const UNSAFE_HISTORY = /<\s*\/?\s*(?:tool_call|function_call|function|assistant|system|user)\b|<\|[^>]+\|>|\b(?:tool_call|function_call)\s*[:=]|(.{2,12})\1{3,}/iu;
const SHORT_CODE_FRAGMENT = /(?:^|\s)(?:const|let|var|function|class|import|export|return|async|await|appbar|binding)\b|\b\w+_\w+\b|\b[a-z]+[A-Z][A-Za-z0-9]*\b/u;
const SAFE_ONE_WORD_REPLIES = new Set("yes no sure okay ok thanks welcome hello hey hi goodbye bye pizza tacos both neither true false maybe absolutely".split(" "));

function compact(value, limit = 9000) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).replace(/\s+\S*$/, "")}…`;
}

function normalizedWords(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function safeHistoryContent(content, role) {
  const value = compact(content, role === "assistant" ? 700 : 900);
  if (!value || UNSAFE_HISTORY.test(value)) return "";
  if (role === "assistant" && value.split(/\s+/).length <= 14 && SHORT_CODE_FRAGMENT.test(value)) return "";
  return value;
}

function plausibleAssistantReply(userContent, assistantContent) {
  const userWords = normalizedWords(userContent);
  const answerWords = normalizedWords(assistantContent);
  if (!answerWords.length) return false;
  if (userWords.join(" ") === answerWords.join(" ")) return false;
  if (/^[A-Z]{3,}(?:[.!?])?$/u.test(String(assistantContent || "").trim())) return false;
  if (answerWords.length === 1) {
    const [answer] = answerWords;
    const optionAnswer = /\bor\b/iu.test(userContent) && userWords.includes(answer);
    const compactAnswer = SAFE_ONE_WORD_REPLIES.has(answer) || optionAnswer || /^\d+(?:\.\d+)?$/.test(answer);
    if (!compactAnswer) return false;
    return true;
  }
  const yesNoQuestion = /^(?:am|are|is|was|were|do|does|did|can|could|will|would|should|have|has|had|may|might)\b/iu.test(userContent.trim());
  if (yesNoQuestion && /[?؟]\s*$/u.test(assistantContent.trim())
    && !/^(?:yes|no|maybe|sometimes|usually|i |i'm|im |it |that )/iu.test(assistantContent.trim())) {
    return false;
  }
  if (answerWords.length >= 3) return true;
  return /\b(?:i|im|i'm|yes|no|sure|okay|thanks|hello|hey|here|ready|sorry)\b/iu.test(assistantContent)
    || answerWords.some((word) => userWords.includes(word));
}

function safeConversationTurns(history) {
  const completeTurns = [];
  for (let index = 0; index < history.length - 1; index += 1) {
    const user = history[index];
    const assistant = history[index + 1];
    if (user?.role !== "user" || assistant?.role !== "assistant") continue;
    const userContent = safeHistoryContent(user.content, "user");
    const assistantContent = safeHistoryContent(assistant.content, "assistant");
    if (!userContent || !assistantContent || !plausibleAssistantReply(userContent, assistantContent)) continue;
    completeTurns.push(
      { role: "user", content: userContent },
      { role: "assistant", content: assistantContent },
    );
    index += 1;
  }
  return completeTurns.slice(-2);
}

function memoryContext(memory = {}) {
  const entries = [];
  if (memory?.profile?.name) entries.push(`The user's saved name is ${compact(memory.profile.name, 80)}.`);
  if (memory?.profile?.preference) {
    entries.push(`The user's saved preference is: ${compact(memory.profile.preference, 180)}.`);
  }
  for (const fact of (memory?.facts || []).slice(-8)) {
    if (fact?.value) entries.push(`Saved fact: ${compact(fact.value, 180)}`);
  }
  return entries.join(" ");
}

export function conversationMessages(query, history = [], language = "english", memory = {}, offerHadith = false) {
  const recent = safeConversationTurns(history);
  const remembered = memoryContext(memory);
  return [
    {
      role: "system",
      content: `${CASUAL_SYSTEM}\nReply in ${language || "the user's language"}.${offerHadith ? " This is a religious fragment: do not infer an answer; end with exactly: Would you like ahadith on the matter?" : ""}${remembered ? ` Device-local memory: ${remembered}` : ""}`,
    },
    ...recent,
    { role: "user", content: compact(query, 1200) },
  ];
}

export function appendHadithOffer(value, enabled = false) {
  const text = String(value || "").trim();
  if (!enabled) return text;
  const withoutDuplicate = text
    .replace(/\s*would you like (?:me to (?:find|show|give) )?(?:some )?a?h+a?dith(?:s)? (?:on|about|regarding) (?:the matter|this|it)\??\s*$/i, "")
    .trim();
  return `${withoutDuplicate ? `${withoutDuplicate}\n\n` : ""}Would you like ahadith on the matter?`;
}

export function queryAnalysisMessages(query) {
  return [
    {
      role: "system",
      content: `Convert the user's religious-corpus request into a search query. Do not answer it.
Correct spelling and transliteration dynamically. Translate modern wording into literal acts, objects, people, conditions, older vocabulary, and observable descriptions that a translated hadith corpus may use. Never guess a legal verdict.
Decompose the request by meaning:
- exact_subjects: the exact thing asked about;
- evidence_subjects: narrow acts or conditions that could directly answer one part;
- answer_criteria: wording or facts an answer-bearing report must contain, such as procedural steps, a time boundary, an identifying description, permission, prohibition, an exception, or a reported precedent;
- evidence_queries: independent searches for distinct evidence roles. Each entry must include required_subjects naming the subject that every result for that role must actually mention. Always include a direct role. For legal-status questions also search separately for explicit permission, explicit prohibition, reported practice or precedent, and limiting context. Do not make any one role dominate merely because it matches a broad theme.
For a reported-practice query, preserve the actor, the physical act, its target, its reason, and any stated outcome. A blow inflicted on someone is not the same relation as someone striking himself, and an enemy's conduct is not automatically the Imam's practice.
For a time-definition query, search both the stated prayer/time boundary and the observable sign that defines it (including direction, shape, colour, or a comparison in a footnote when the report supplies one).
If the exact modern term may be absent, preserve the distinction and search for its described physical act or historical wording. For an unfamiliar named concept, keep the original name in the retrieval query and add descriptions, attributes, companions, and explicit contrasts found in the request; never return an empty plan merely because the phrase is not an exact corpus token. Do not turn analogy into identity.
Return only JSON:
{"retrieval_query":"...","exact_subjects":["..."],"evidence_subjects":["..."],"answer_criteria":["..."],"evidence_queries":[{"role":"direct","query":"...","required_subjects":["..."]}],"relation":"definition|method|time-definition|authorship|identity|legal-status|quotation|general","confidence":0.0}
Each exact_subjects entry must name the same subject as the user, not a broader topic. For an unfamiliar term, keep it unchanged instead of guessing.`,
    },
    { role: "user", content: compact(query, 800) },
  ];
}

export function parseQueryAnalysisJson(value) {
  const raw = String(value || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || raw;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(fenced.slice(start, end + 1));
    const retrievalQuery = compact(parsed?.retrieval_query, 500);
    const exactSubjects = Array.isArray(parsed?.exact_subjects)
      ? parsed.exact_subjects
          .map((entry) => compact(entry, 100))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    const evidenceSubjects = Array.isArray(parsed?.evidence_subjects)
      ? parsed.evidence_subjects
          .map((entry) => compact(entry, 100))
          .filter(Boolean)
          .slice(0, 8)
      : [];
    const answerCriteria = Array.isArray(parsed?.answer_criteria)
      ? parsed.answer_criteria
          .map((entry) => compact(entry, 120))
          .filter(Boolean)
          .slice(0, 8)
      : [];
    const evidenceQueries = Array.isArray(parsed?.evidence_queries)
      ? parsed.evidence_queries
          .map((entry) => {
            if (typeof entry === "string") {
              return { role: "supporting", query: compact(entry, 240), requiredSubjects: [] };
            }
            return {
              role: compact(entry?.role, 40) || "supporting",
              query: compact(entry?.query, 240),
              requiredSubjects: Array.isArray(entry?.required_subjects)
                ? entry.required_subjects
                    .map((subject) => compact(subject, 100))
                    .filter(Boolean)
                    .slice(0, 4)
                : [],
            };
          })
          .filter((entry) => entry.query)
          .slice(0, 4)
      : [];
    if (!retrievalQuery || !exactSubjects.length) return null;
    return {
      retrievalQuery,
      exactSubjects,
      evidenceSubjects,
      answerCriteria,
      evidenceQueries,
      relation: compact(parsed?.relation, 40) || "general",
      confidence: Math.max(0, Math.min(1, Number(parsed?.confidence) || 0)),
    };
  } catch {
    return null;
  }
}

function evidenceExcerpt(value, terms = []) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= 1300) return text;
  const normalizedTerms = [...new Set(
    terms
      .map((term) => String(term || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim())
      .filter((term) => term.length >= 3),
  )];
  const lower = text.toLowerCase();
  let bestIndex = -1;
  let bestScore = -1;
  for (const term of normalizedTerms) {
    let index = lower.indexOf(term);
    while (index >= 0) {
      const start = Math.max(0, index - 420);
      const end = Math.min(text.length, index + 880);
      const window = lower.slice(start, end);
      const score = normalizedTerms.filter((candidate) => window.includes(candidate)).length;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
      index = lower.indexOf(term, index + term.length);
    }
  }
  if (bestIndex < 0) return compact(text, 1300);
  const start = Math.max(0, bestIndex - 420);
  const end = Math.min(text.length, bestIndex + 880);
  const excerpt = text.slice(start, end)
    .replace(/^\S*\s/, start ? "…" : "")
    .replace(/\s\S*$/, end < text.length ? "…" : "");
  return excerpt;
}

function publishedTranslation(value, evidenceTerms = []) {
  const lines = cleanCorpusMarkdown(String(value || ""))
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^###\s/.test(line))
    .filter((line) => !/^\[?Link\]?\s*(?:\(|$)/i.test(line));
  const english = lines.filter((line) => {
    const arabicCharacters = (line.match(/[\u0600-\u06ff]/g) || []).length;
    return arabicCharacters / Math.max(1, line.length) < 0.12;
  });
  return evidenceExcerpt((english.length ? english : lines).join(" "), evidenceTerms);
}

function directPublishedTranslation(value) {
  const excerpt = publishedTranslation(value, [
    "demonstrate", "description", "method", "procedure", "first", "then",
    "wash", "wipe", "recite", "stand", "bow", "prostrate", "perform",
  ]);
  const attributionEnd = excerpt.search(/(?:has said the following|said the following|who said):?\s*[“"]/iu);
  if (attributionEnd >= 0) {
    const quoteStart = excerpt.slice(attributionEnd).search(/[“"]/u);
    if (quoteStart >= 0) return excerpt.slice(attributionEnd + quoteStart).trim();
  }
  return excerpt;
}

export function methodEvidenceSynthesis(results) {
  const direct = (Array.isArray(results) ? results : []).find((result) => (
    /\b(?:demonstrat|description|method|procedure|how to|first|then)\b/iu.test(
      `${result?.title || ""} ${result?.chapter || ""} ${result?.text || ""}`,
    )
  )) || results?.[0];
  if (!direct) return "";
  const reportNumber = Math.max(1, (results || []).indexOf(direct) + 1);
  const translation = directPublishedTranslation(direct.text);
  const parallelCount = (results || []).filter((result) => (
    result !== direct
    && (result.clusterId || result.familyRoot) === (direct.clusterId || direct.familyRoot)
  )).length;
  return [
    "## Direct answer",
    "",
    `Report ${reportNumber} directly gives the requested procedure. Its published translation says:`,
    "",
    translation
      .split(/\n+/)
      .map((line) => `> ${line}`)
      .join("\n>"),
    "",
    "## Evidence",
    "",
    `Report ${reportNumber}, ${direct.collection}, “${direct.chapter || direct.title}.”${parallelCount ? ` ${parallelCount} displayed report${parallelCount === 1 ? "" : "s"} preserve${parallelCount === 1 ? "s" : ""} a parallel transmission of the same procedure.` : ""}`,
    "",
    "## Limits of the evidence",
    "",
    "This answer reproduces the retrieved report’s procedure; it does not add a chain grade or a separate fatwa.",
  ].join("\n");
}

export function timeDefinitionEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const direct = [...available]
    .map((result, index) => {
      const text = `${result?.title || ""} ${result?.chapter || ""} ${result?.text || ""}`;
      const boundaryScore = [
        /\btrue\s+dawn\b/i,
        /\bwhite\s+(?:line|light|thread)\b/i,
        /\bhorizon|horizontal(?:ly)?\b/i,
        /\b(?:rays?\s+of\s+sun|sunrise|sunset)\b/i,
        /\b(?:dawn|fajr|morning)\s+(?:begins?|is|appears?|time)\b/i,
        /\buntil\s+(?:the\s+)?(?:sun|sunrise|rays?)\b/i,
      ].reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
      const genericTimeScore = /\b(?:time|begin|start|end|until|before|after|appear|light|darkness)\b/i.test(text) ? 1 : 0;
      return { result, index, score: boundaryScore * 4 + genericTimeScore };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.result || available[0];
  if (!direct) return "";
  const reportNumber = available.indexOf(direct) + 1;
  const translation = publishedTranslation(direct.text, [
    "time", "begin", "start", "end", "until", "before", "after",
    "appear", "horizon", "light", "darkness", "dawn", "sunrise", "sunset",
  ]);
  return [
    "## Direct answer",
    "",
    `Report ${reportNumber} gives the requested time or observable boundary in its published translation:`,
    "",
    translation
      .split(/\n+/)
      .map((line) => `> ${line}`)
      .join("\n>"),
    "",
    "## Evidence",
    "",
    `Report ${reportNumber}, ${direct.collection}, “${direct.chapter || direct.title}.”`,
    "",
    "## Limits of the evidence",
    "",
    "This reproduces the retrieved narration’s stated boundary or sign; it does not calculate a clock time for a location.",
  ].join("\n");
}

function strongestEvidence(results, patterns) {
  return (Array.isArray(results) ? results : [])
    .map((result, index) => {
      const text = `${result?.title || ""} ${result?.chapter || ""} ${result?.text || ""}`;
      const score = patterns.reduce(
        (total, pattern) => total + (pattern.test(text) ? 1 : 0),
        0,
      );
      return { result, index, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.result;
}

export function definitionEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const direct = strongestEvidence(available, [
    /\bis a creature\b/i,
    /\bgreater than\b/i,
    /\b(?:different|other) from\b/i,
    /\b(?:with|accompan(?:y|ies|ied)) the (?:prophet|messenger|imams?)\b/i,
    /\b(?:through|with) (?:the )?(?:holy )?spirit\b/i,
    /\bdoes not (?:sleep|become unaware|trifle)\b/i,
  ]) || available[0];
  if (!direct) return "";
  const reportNumber = available.indexOf(direct) + 1;
  const translation = publishedTranslation(direct.text, [
    "is a creature", "greater than", "different from", "angel", "with the imams",
    "through the holy spirit", "protects", "knowledge", "does not sleep",
  ]);
  return [
    "## Direct answer",
    "",
    `Report ${reportNumber} gives the clearest retrieved description in its published translation:`,
    "",
    translation
      .split(/\n+/)
      .map((line) => `> ${line}`)
      .join("\n>"),
    "",
    "## Evidence",
    "",
    `Report ${reportNumber}, ${direct.collection}, “${direct.chapter || direct.title}.” The displayed reports below provide the other retrieved descriptions and transmissions.`,
    "",
    "## Limits of the evidence",
    "",
    "This reproduces what the retrieved narrations say; it does not add a chain grade or identify unstated details.",
  ].join("\n");
}

export function biographicalEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const direct = strongestEvidence(available, [
    /\bwas born\b/i,
    /\bborn in the month\b/i,
    /\bin the year\b/i,
    /\b(?:his|her) mother\b/i,
    /\bat the age of\b/i,
    /\b(?:died|passed away|martyred)\b/i,
  ]) || available[0];
  if (!direct) return "";
  const reportNumber = available.indexOf(direct) + 1;
  const translation = publishedTranslation(direct.text, [
    "was born", "born in the month", "in the year", "mother", "age", "died",
    "passed away", "martyred",
  ]);
  return [
    "## Direct answer",
    "",
    `Report ${reportNumber} supplies the clearest retrieved biographical details:`,
    "",
    translation
      .split(/\n+/)
      .map((line) => `> ${line}`)
      .join("\n>"),
    "",
    "## Evidence",
    "",
    `Report ${reportNumber}, ${direct.collection}, “${direct.chapter || direct.title}.” The additional displayed reports are from the same requested biographical subject.`,
    "",
    "## Limits of the evidence",
    "",
    "This answer preserves the dates and alternatives stated by the retrieved corpus translation without reconciling them from outside sources.",
  ].join("\n");
}

function topicEvidenceSynthesis(results, patterns, label) {
  const available = Array.isArray(results) ? results : [];
  const direct = strongestEvidence(available, patterns) || available[0];
  if (!direct) return "";
  const reportNumber = available.indexOf(direct) + 1;
  const translation = publishedTranslation(direct.text, ["taqiy", "religion", "faith", "piety", "shia", "love", "clay", "virtue", "merit"]);
  return [
    "## Direct answer", "",
    `The retrieved narrations address ${label}. Report ${reportNumber} is the clearest displayed evidence:`, "",
    translation.split(/\n+/).map((line) => `> ${line}`).join("\n>"), "",
    "## Evidence", "",
    `Report ${reportNumber}, ${direct.collection}, “${direct.chapter || direct.title}.” The remaining displayed reports are additional narrations or parallel evidence on the same subject.`, "",
    "## Limits of the evidence", "",
    "This reproduces the retrieved narrations and does not add a chain grade or an independent legal ruling.",
  ].join("\n");
}

export function virtueEvidenceSynthesis(results) {
  return topicEvidenceSynthesis(results, [/\b(?:shia|shiite|love|virtue|merit|praise|clay)\b/i], "the virtues and qualities requested");
}

export function importanceEvidenceSynthesis(results) {
  return topicEvidenceSynthesis(results, [/\b(?:taqiy|religion|faith|piety|important|necessity|denial)\b/i], "the requested importance or religious significance");
}

export function reportedEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const direct = available.find((result) => result?.evidenceRole === "reported-practice") || available[0];
  if (!direct) return "";
  const reportNumber = available.indexOf(direct) + 1;
  const translation = publishedTranslation(direct.text, direct.evidenceTerms || []);
  return [
    "## Direct answer", "",
    `Report ${reportNumber} most directly preserves the requested act or event in a narrated scene:`, "",
    translation.split(/\n+/).map((line) => `> ${line}`).join("\n>"), "",
    "## Evidence", "",
    `Report ${reportNumber}, ${direct.collection}, â€œ${direct.chapter || direct.title}.â€ The remaining displayed reports provide other direct narrations or parallel transmissions about the same requested subject.`, "",
    "## Limits of the evidence", "",
    "This reproduces the retrieved reports without adding a chain grade or a ruling that their wording does not state.",
  ].join("\n");
}

function quotedEvidence(result, results, evidenceTerms = []) {
  if (!result) return [];
  const number = Math.max(1, results.indexOf(result) + 1);
  return [
    `Report ${number}, ${result.collection}, “${result.chapter || result.title}”:`,
    "",
    publishedTranslation(result.text, evidenceTerms)
      .split(/\n+/)
      .map((line) => `> ${line}`)
      .join("\n>"),
  ];
}

export function bookReliabilityEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const validation = available.find((result) => result?.evidenceRole === "transmitted-validation"
      && /(?:said|spoke|told).*truth|confirm(?:ed|s)?.*truth|truth.*(?:read|book|transmission)|mercy.*(?:transmitter|author|compiler)/i.test(result?.text || ""))
    || strongestEvidence(available, [/said the truth/i, /may Allah have mercy on him/i]);
  const transmission = available.find((result) => result?.evidenceRole === "corpus-transmission"
      && /from (?:the )?book|taken from (?:the )?book|من كتاب|كتاب سليم/iu.test(result?.text || ""))
    || strongestEvidence(available, [/from the book of/i, /from the book entitled/i]);
  const reception = available.find((result) => result?.evidenceRole === "source-reception"
      && /important (?:books?|sources?)|sources?.{0,100}(?:depended|relied|referred)/i.test(result?.text || ""))
    || strongestEvidence(available, [/important books/i, /sources.*depended/i]);
  if (!validation && !transmission && !reception) return "";
  const sections = [
    "## Direct answer", "",
    "Based on the displayed corpus evidence, the named work is presented as an important, relied-upon Shia source. An Imam confirms the truth of one particular transmission read from it and prays for its transmitter. This is strong evidence for the work's reception, but it is not an Imam's blanket grading of every report or every surviving recension as authentic.",
  ];
  if (validation) {
    sections.push("", "## Confirmation of a transmitted report", "", ...quotedEvidence(validation, available, [
      "book of Sulaym", "Sulaym has said the truth", "mercy on him", "read it to Ali ibn al-Husayn",
    ]));
  }
  if (transmission && transmission !== validation) {
    sections.push("", "## Express transmission from the book", "", ...quotedEvidence(transmission, available, [
      "from the book of Sulaym", "Sulaym ibn Qays", "Aban ibn Abi Ayyash",
    ]));
  }
  if (reception && ![validation, transmission].includes(reception)) {
    sections.push("", "## Later source-reception note", "", ...quotedEvidence(reception, available, [
      "important books", "sources", "depended", "referred",
    ]));
  }
  sections.push(
    "", "## Limits of the evidence", "",
    "The Imam's quoted confirmation concerns the particular transmission read before him; it is not an explicit blanket chain-grade for every report or every surviving recension of the book. The source-reception passage is compiler commentary, not a separate saying of an Imam. Broader praise formulas should only be displayed if their actual reports are present after Kitab Sulaym or another source containing them is added to the corpus.",
  );
  return sections.join("\n");
}

export function followUpRetrievalSynthesis(mode, resultCount = 0, familyCount = 0) {
  const results = Math.max(0, Number(resultCount) || 0);
  const families = Math.max(0, Number(familyCount) || results);
  const familyLabel = `${families} additional distinct report ${families === 1 ? "family" : "families"}`;
  if (mode === "exhaustive-check") {
    return results
      ? `No. Those were not all the reports available to me in the current corpus; I found ${familyLabel} below.`
      : "Yes. Those were all the distinct report families I could find in the current corpus for this topic.";
  }
  if (mode === "more") {
    return results
      ? `I found ${familyLabel} not shown in the earlier result set.`
      : "I could not find any additional distinct report families in the current corpus for this topic; the earlier set was all I could retrieve.";
  }
  return "";
}

export function hajjCompanionshipEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const safety = available.find((result) => result?.evidenceRole === "without-guardian-safety")
    || strongestEvidence(available, [/without.*guardians?/i, /if she is safe/i]);
  const company = available.find((result) => result?.evidenceRole === "trustworthy-company")
    || strongestEvidence(available, [/trustworthy people/i]);
  if (!safety && !company) return "";
  const sections = [
    "## Direct answer", "",
    "The retrieved reports address the companionship question itself, rather than a type or procedure of Hajj. One says a woman may go without one of her guardians if she is safe; another states that going with trustworthy people is not harmful.",
  ];
  if (safety) sections.push("", ...quotedEvidence(safety, available, ["without", "guardians", "safe"]));
  if (company && company !== safety) {
    sections.push("", "## Trustworthy company", "", ...quotedEvidence(company, available, ["trustworthy people", "not harmful"]));
  }
  sections.push(
    "", "## Limits of the evidence", "",
    "This reproduces the conditions stated in the displayed reports. It does not silently replace safety or trustworthy company with an unrelated modern travel condition.",
  );
  return sections.join("\n");
}

export function ritualNullifierEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const prayer = available.find((result) => result?.evidenceRole === "prayer-nullifier")
    || strongestEvidence(available, [/prayer is broken by wind/i, /flatulence/i]);
  const ablution = available.find((result) => result?.evidenceRole === "ablution-nullifier")
    || strongestEvidence(available, [/invalidates the ablution.*farting/i, /farting.*sleeping/i]);
  const sensory = available.find((result) => {
    const text = String(result?.text || "");
    const hasPairedCriterion = /hear\w*\s+(?:a\s+)?sound[\s\S]{0,180}(?:smell|odou?r)|(?:smell|odou?r)[\s\S]{0,180}hear\w*\s+(?:a\s+)?sound/i.test(text);
    const hasRitualContext = /prayer|salah|wud[uh]?|ablution|wind|flatulence|fart/i.test(text);
    return hasPairedCriterion && hasRitualContext;
  });
  const certainty = available.find((result) => result?.evidenceRole === "certainty-not-doubt")
    || strongestEvidence(available, [/does not destroy certainty with doubt/i, /certain.*then doubts/i]);
  if (!prayer && !ablution && !sensory && !certainty) return "";
  const sections = [
    "## Direct answer", "",
    "Here 'wind' means emitted gas, not weather. Actual emission invalidates wudu and therefore the prayer. Mere uncertainty is different: the retrieved certainty reports say not to overturn a known state with doubt.",
  ];
  if (prayer) sections.push("", ...quotedEvidence(prayer, available, ["wind", "flatulence", "breaks the wudu"]));
  if (ablution && ablution !== prayer) {
    sections.push("", "## Ablution context", "", ...quotedEvidence(ablution, available, ["invalidates the ablution", "farting", "sleeping"]));
  }
  if (sensory && ![prayer, ablution].includes(sensory)) {
    sections.push("", "## Sensory criterion for doubt", "", ...quotedEvidence(sensory, available, ["hear", "sound", "smell", "odor", "odour"]));
  } else if (certainty && ![prayer, ablution].includes(certainty)) {
    sections.push("", "## Certainty is not displaced by doubt", "", ...quotedEvidence(certainty, available, ["certainty", "doubt", "continue"]));
  }
  sections.push(
    "", "## Limits of the evidence", "",
    sensory
      ? "The answer distinguishes an actual nullifier from suspicion and preserves the sensory criterion stated in the displayed report."
      : "The exact 'hear a sound or detect an odor' wording is not present in the displayed current-corpus results. The displayed certainty report supplies the general doubt principle, but its immediate example must not be falsely quoted as if it explicitly discussed wind.",
  );
  return sections.join("\n");
}

export function ritualTestimonyEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const scope = available.find((result) => result?.evidenceRole === "wording-scope")
    || strongestEvidence(available, [/best you know/i, /not.*definite/i]);
  const minimum = available.find((result) => result?.evidenceRole === "minimum-wording")
    || strongestEvidence(available, [/minimum.*sufficient.*Tashahhud/i, /two testimonies/i]);
  const boundary = available.find((result) => result?.evidenceRole === "prayer-boundary")
    || strongestEvidence(available, [/whatever you say of Allah and the Holy prophet/i]);
  const prophetic = available.find((result) => result?.evidenceRole === "prophetic-tashahhud")
    || strongestEvidence(available, [/In the name of Allah, with.*Allah/i, /beautiful names belong to Allah/i]);
  const covenant = available.find((result) => result?.evidenceRole === "primordial-testimony")
    || strongestEvidence(available, [/covenant.*Muhammad.*Ali/i, /Ali.*commander of the believers/i]);
  const proclamation = available.find((result) => result?.evidenceRole === "creation-proclamation")
    || strongestEvidence(available, [/announcer.*Muhammad.*Ali/i]);
  const inscription = available.find((result) => result?.evidenceRole === "inscribed-testimony")
    || strongestEvidence(available, [/Muhammad.*Messenger of Allah.*Ali.*friend of Allah/i, /Aliyyun wali Allah/i]);
  if (!scope && !minimum && !boundary && !prophetic && !covenant && !proclamation && !inscription) return "";
  const sections = [
    "## Direct answer", "",
    "The tashahhud-specific reports state flexibility in its praise and testimony, identify two testimonies as the minimum sufficient wording, and preserve a longer transmitted form beginning 'In the name of Allah, with Allah' followed by salawat upon Muhammad and his family. Separate covenant, proclamation, and inscription reports place tawhid, Muhammad's messengership, and Ali's wilayah or command together.",
  ];
  if (scope) sections.push("", ...quotedEvidence(scope, available, ["what should I say", "best you know", "definite"]));
  if (minimum && minimum !== scope) {
    sections.push("", "## Minimum stated wording", "", ...quotedEvidence(minimum, available, ["minimum", "sufficient", "two testimonies"]));
  }
  if (boundary && boundary !== scope && boundary !== minimum) {
    sections.push("", "## Prayer boundary", "", ...quotedEvidence(boundary, available, ["Allah", "Holy prophet", "of Salah", "ended Salah"]));
  }
  if (prophetic && ![scope, minimum, boundary].includes(prophetic)) {
    sections.push("", "## Transmitted tashahhud wording", "", ...quotedEvidence(prophetic, available, [
      "In the name of Allah", "with Allah", "beautiful names", "Muhammad", "family of Muhammad",
    ]));
  }
  const pairedDeclarations = [covenant, proclamation, inscription]
    .filter((result, index, values) => result && values.indexOf(result) === index && ![scope, minimum, boundary, prophetic].includes(result));
  for (const result of pairedDeclarations) {
    sections.push("", "## Tawhid, risalah, and Ali's authority together", "", ...quotedEvidence(result, available, [
      "no one deserves worship", "Muhammad", "messenger", "Ali", "commander", "friend of Allah", "covenant", "announcer",
    ]));
  }
  sections.push(
    "", "## Limits of the evidence", "",
    "The paired-declaration reports establish that the three declarations occur together in transmitted settings outside this ritual passage. Unless a displayed report explicitly instructs their insertion into ritual tashahhud, they should not be misquoted as doing so. The tashahhud reports supply its transmitted wording, scope, minimum, and prayer boundary without inventing a categorical prohibition or permission absent from their words.",
  );
  return sections.join("\n");
}

export function quranTransmissionEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const extent = available.find((result) => result?.evidenceRole === "reported-extent")
    || strongestEvidence(available, [/seventeen thousand verses/i]);
  const collection = available.find((result) => result?.evidenceRole === "collection-as-revealed")
    || strongestEvidence(available, [/collected the whole.*Quran.*as it was revealed/i]);
  const mushafDistinction = available.find((result) => result?.evidenceRole === "mushaf-not-quran")
    || strongestEvidence(available, [/Mushaf of Fatima.*not even a single letter/i, /not.*anything from the Holy Quran/i]);
  const mushafContent = available.find((result) => result?.evidenceRole === "mushaf-content")
    || strongestEvidence(available, [/nothing in it.*lawful and unlawful/i, /knowledge of things.*future/i]);
  if (!extent && !collection && !mushafDistinction && !mushafContent) return "";
  const sections = [
    "## Direct answer", "",
    "The retrieved reports do not all make one identical claim. One reports seventeen thousand verses; another speaks of collecting and preserving the whole Qur'an “as it was revealed.” Separately, the Mushaf Fāṭimah reports explicitly say that it contains no letter or nothing from the Qur'an. Mushaf Fāṭimah therefore cannot be presented, from these reports, as Qur'anic material that was removed.",
  ];
  if (extent) sections.push("", "## Reported extent", "", ...quotedEvidence(extent, available, ["seventeen thousand verses"]));
  if (collection && collection !== extent) {
    sections.push("", "## Collection as revealed", "", ...quotedEvidence(collection, available, ["whole of the Quran", "as it was revealed", "Ali", "Imams"]));
  }
  if (mushafDistinction && mushafDistinction !== extent && mushafDistinction !== collection) {
    sections.push("", "## Mushaf Fāṭimah is distinguished from the Qur'an", "", ...quotedEvidence(mushafDistinction, available, ["Mushaf of Fatima", "single letter", "Quran"]));
  }
  if (mushafContent && ![extent, collection, mushafDistinction].includes(mushafContent)) {
    sections.push("", "## Its stated content", "", ...quotedEvidence(mushafContent, available, ["lawful and unlawful", "future", "angel", "write"]));
  }
  sections.push(
    "", "## Limits of the evidence", "",
    "The displayed reports are evidence to be analyzed, not a chain-graded conclusion about the history of the received text. They also do not, by themselves, formulate the precise thesis “nothing was added and only material was removed.” Any such conclusion must distinguish wording, interpretation, collection, arrangement and textual extent rather than treating them as synonyms.",
  );
  return sections.join("\n");
}

export function juristAuthorityEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const adjudication = available.find((result) => result?.evidenceRole === "dispute-adjudication")
    || strongestEvidence(available, [/two people with a dispute/i, /made him.*ruler/i]);
  const judge = available.find((result) => result?.evidenceRole === "appointed-judge")
    || strongestEvidence(available, [/made him to judge/i, /seek adjudication/i]);
  const referral = available.find((result) => result?.evidenceRole === "occultation-referral")
    || strongestEvidence(available, [/problems.*future.*refer.*narrators/i, /my proofs? on you/i]);
  const divineScope = available.find((result) => result?.evidenceRole === "divine-authority-scope")
    || strongestEvidence(available, [/earth without a Leader with Your Authority/i, /person with Your Authority/i]);
  const mixedAuthority = available.find((result) => result?.evidenceRole === "mixed-truth-authority-warning")
    || strongestEvidence(available, [/truth.*falsehood.*mixed/i, /yield to other people as high authority/i]);
  if (!adjudication && !judge && !referral && !divineScope && !mixedAuthority) return "";
  const sections = [
    "## Direct answer", "",
    "The relevant reports must be separated by scope. The ʿUmar ibn Ḥanẓalah and Abū Khadījah reports expressly concern disputes and adjudication by someone versed in the Imams' reports and judgments. The occultation letter tells believers to refer future problems to narrators of the Imams' traditions. Other reports reserve divinely designated authority to the continuing Leader or Imam.",
  ];
  if (adjudication) sections.push("", "## Dispute adjudication", "", ...quotedEvidence(adjudication, available, ["dispute", "narrated our Hadith", "lawful and unlawful", "judge", "ruler"]));
  if (judge && judge !== adjudication) {
    sections.push("", "## Appointed judge", "", ...quotedEvidence(judge, available, ["people of injustice", "our judgment", "judge", "adjudication"]));
  }
  if (referral && ![adjudication, judge].includes(referral)) {
    sections.push("", "## Referral during occultation", "", ...quotedEvidence(referral, available, ["problems", "future", "narrators of our traditions", "proofs"]));
  }
  if (divineScope && ![adjudication, judge, referral].includes(divineScope)) {
    sections.push("", "## Divinely designated authority", "", ...quotedEvidence(divineScope, available, ["earth", "Leader", "Authority", "creatures", "hidden"]));
  }
  if (mixedAuthority && ![adjudication, judge, referral, divineScope].includes(mixedAuthority)) {
    sections.push("", "## Warning about human authority and mixed truth", "", ...quotedEvidence(mixedAuthority, available, [
      "mischief", "desires", "invented rules", "high authority", "truth", "falsehood", "mixed",
    ]));
  }
  sections.push(
    "", "## Limits of the evidence", "",
    "The Imam Ali sermon supplies a conceptual warning about invented rules, mixed truth and falsehood, and people taking other people as high authority; it does not itself name the later constitutional theory. None of the displayed passages uses the modern formula 'absolute political guardianship of the jurist.' Judicial appointment, referral for religious problems and universal political sovereignty are not interchangeable propositions.",
  );
  return sections.join("\n");
}

export function signsEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  if (!available.length) return "";
  const principal = available.find((result) => result?.evidenceRole === "five-principal-signs")
    || strongestEvidence(available, [/five signs/i, /pure soul.*Yamani/i]);
  const call = available.find((result) => result?.evidenceRole === "heavenly-call-details");
  const risings = available.find((result) => result?.evidenceRole === "three-risings");
  const general = available.find((result) => result?.evidenceRole === "general-preceding-events");
  const day = available.find((result) => result?.evidenceRole === "appearance-day");
  const sections = [
    "## Direct answer", "",
    "The displayed reports include the five principal signs and separate details about the heavenly call, the related risings, broader preceding upheavals, and the reported day of appearance. Parallel transmissions of the same five-sign report are not counted as additional signs.",
  ];
  for (const [heading, result, terms] of [
    ["Five principal signs", principal, ["five signs", "scream", "Sufyani", "sinking", "pure soul", "Yamani"]],
    ["Heavenly call", call, ["cry", "Heaven", "Ramadan", "Gabriel", "Qaim"]],
    ["Related risings", risings, ["Sufyani", "Yamani", "Khurasani", "same year", "guidance"]],
    ["Broader preceding events", general, ["terror", "earthquakes", "seditions", "calamities", "plague"]],
    ["Reported appearance day", day, ["Qaim", "Ashura"]],
  ]) {
    if (!result) continue;
    sections.push("", `## ${heading}`, "", ...quotedEvidence(result, available, terms));
  }
  sections.push(
    "", "## Limits of the evidence", "",
    "“All signs” cannot honestly mean every report ever transmitted or every sign in books absent from the corpus. This answer groups the distinct answer-bearing report families retrieved from the current corpus and does not add motivational advice or an invented exhaustive claim.",
  );
  return sections.join("\n");
}

export function lineageMarriageEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const compatibility = available.find((result) => result?.evidenceRole === "faith-compatibility")
    || strongestEvidence(available, [/believers? are good match/i, /give your daughter/i]);
  const propheticPrecedent = available.find((result) => result?.evidenceRole === "prophetic-precedent")
    || strongestEvidence(available, [/Miqdad/i, /Duba/i]);
  if (!compatibility && !propheticPrecedent) return "";
  const sections = [
    "## Direct answer",
    "",
    "The retrieved al-Kafi reports directly address marriage compatibility across inherited social or lineage distinctions. Their stated measures are Islam, belief and piety, and they preserve marriages arranged to demonstrate that principle.",
    "",
    ...quotedEvidence(compatibility, available, [
      "from Adam", "tribes", "genealogy", "pious", "give your daughter", "good match",
    ]),
  ];
  if (propheticPrecedent && propheticPrecedent !== compatibility) {
    sections.push(
      "",
      "## Prophetic precedent",
      "",
      ...quotedEvidence(propheticPrecedent, available, [
        "Miqdad", "Duba", "rules of marriage", "most pious",
      ]),
    );
  }
  sections.push(
    "",
    "## Limits of the evidence",
    "",
    "This reports the transmitted compatibility principles and precedents in the displayed narrations. It does not add a chain grade or decide an impediment that those reports do not mention.",
  );
  return sections.join("\n");
}

export function contestedLineageMarriageEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const testament = available.find((result) => result?.evidenceRole === "testament-evidence")
    || strongestEvidence(available, [/Musa Ibn Ja.far.s Will/i, /marriage of none of my daughters/i]);
  const ahlulbaytPrecedent = available.find((result) => result?.evidenceRole === "ahlulbayt-precedent")
    || strongestEvidence(available, [/daughter.*Umayyad/i, /Umayyad.*daughter/i]);
  const propheticPrecedent = available.find((result) => result?.evidenceRole === "prophetic-precedent")
    || strongestEvidence(available, [/Miqdad/i, /Duba/i]);
  const compatibility = available.find((result) => result?.evidenceRole === "compatibility-principle")
    || strongestEvidence(available, [/Juwaya?bir/i, /tribes.*genealogy/i]);
  if (!testament && !ahlulbaytPrecedent && !propheticPrecedent && !compatibility) return "";

  const sections = [
    "## Direct answer",
    "",
    "The claim that Imam Musa al-Kazim left his daughters unmarried because no Sayyid suitor existed is not stated by the retrieved reports. His transmitted will does not impose a Sayyid-lineage condition; it places their marriage affairs under Imam al-Rida's counsel and authority.",
  ];
  if (testament) {
    sections.push(
      "",
      "## Imam al-Kazim's testament",
      "",
      ...quotedEvidence(testament, available, [
        "marry off his sister", "my daughters", "Ali Al-Ridha", "marry them off if he pleases",
      ]),
    );
  }
  if (ahlulbaytPrecedent) {
    sections.push(
      "",
      "## Ahlulbayt precedent",
      "",
      ...quotedEvidence(ahlulbaytPrecedent, available, [
        "married off your daughter", "Umayyad", "example",
      ]),
    );
  }
  if (propheticPrecedent) {
    sections.push(
      "",
      "## Prophetic precedent",
      "",
      ...quotedEvidence(propheticPrecedent, available, [
        "Miqdad", "Duba", "rules of marriage", "most pious",
      ]),
    );
  }
  if (compatibility) {
    sections.push(
      "",
      "## Stated compatibility principle",
      "",
      ...quotedEvidence(compatibility, available, [
        "tribes", "genealogy", "pious", "give your daughter",
      ]),
    );
  }
  sections.push(
    "",
    "## Limits of the evidence",
    "",
    "These reports do not provide a marriage history for every individual daughter or state why any particular daughter may not have married. Imprisonment, Abbasid pressure, or taqiyyah must not be presented as the report's stated reason unless a source directly supplies that explanation.",
  );
  return sections.join("\n");
}

export function visualDepictionEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const display = available.find((result) => result?.evidenceRole === "display-context")
    || strongestEvidence(available, [/pictures?.*furnishings/i, /not unlawful/i]);
  const reportedUse = available.find((result) => result?.evidenceRole === "reported-use-context")
    || strongestEvidence(available, [/picture.decorated pillows/i, /picture furnishings/i]);
  const sacredPersonImage = available.find((result) => result?.evidenceRole === "sacred-person-image-context")
    || strongestEvidence(available, [/pictures of all of the prophets/i, /green rock/i]);
  const making = available.find((result) => result?.evidenceRole === "making-context")
    || strongestEvidence(available, [/forms? (?:a )?(?:picture|statue)/i, /blow.*spirit/i]);
  if (!display && !reportedUse && !sacredPersonImage && !making) return "";
  const sections = [
    "## Direct answer",
    "",
    "The displayed corpus evidence concerns pictures and statues generally. It does not identify any portrait as an authentic likeness of an Imam, and it does not specifically describe using a sacred-person depiction or reenactment in a mourning procession.",
    "",
    "## General picture evidence",
    "",
    ...quotedEvidence(display, available, [
      "pictures", "furnishings", "not unlawful", "under the feet", "house",
    ]),
  ];
  if (reportedUse && reportedUse !== display) {
    sections.push(
      "",
      "## Reported use",
      "",
      ...quotedEvidence(reportedUse, available, [
        "picture-decorated pillows", "floor furnishings", "sat on them", "do not consider it important",
      ]),
    );
  }
  if (sacredPersonImage && sacredPersonImage !== display && sacredPersonImage !== reportedUse) {
    sections.push(
      "",
      "## Sacred-person image wording",
      "",
      ...quotedEvidence(sacredPersonImage, available, [
        "green rock", "pictures of all of the prophets",
      ]),
    );
  }
  if (making && making !== display) {
    sections.push(
      "",
      ...quotedEvidence(making, available, [
        "forms", "picture", "statue", "blow the spirit", "creator",
      ]),
    );
  }
  sections.push(
    "",
    "## Limits of the evidence",
    "",
    "None of the displayed narrations establishes that a modern image captures an Imam's actual appearance, or specifically rules on shabih and Karbala reenactment. Generic mourning reports cannot fill that evidentiary gap.",
  );
  return sections.join("\n");
}

export function legalEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  if (!available.length) return "";
  const distinctRoles = [];
  const seenRoles = new Set();
  for (const result of available) {
    const role = result?.evidenceRole || "direct";
    if (seenRoles.has(role)) continue;
    seenRoles.add(role);
    distinctRoles.push(result);
    if (distinctRoles.length >= 3) break;
  }
  return [
    "## Direct answer",
    "",
    "The displayed narrations are the closest retrieved evidence. Their exact wording is reproduced below; no broader yes-or-no ruling has been added beyond what they state.",
    "",
    "## Evidence",
    "",
    ...distinctRoles.flatMap((result, index) => [
      ...(index ? [""] : []),
      ...quotedEvidence(result, available, result.evidenceTerms || []),
    ]),
    "",
    "## Limits of the evidence",
    "",
    "A related report is not automatically a ruling on every modern form of the act. The displayed wording, actor, object, conditions and exceptions must all match the question.",
  ].join("\n");
}

export function overlappingMarriageEvidenceSynthesis(results) {
  const available = Array.isArray(results) ? results : [];
  const activeConflict = available.find((result) => result?.evidenceRole === "active-contract-conflict")
    || strongestEvidence(available, [/family.*marriage.*without.*permission/i, /remaining.*time.*waiting period/i]);
  const reverseConflict = available.find((result) => result?.evidenceRole === "reverse-contract-conflict")
    || strongestEvidence(available, [/has a husband who lives with her/i]);
  const expiredContrast = available.find((result) => result?.evidenceRole === "expired-contract-contrast")
    || strongestEvidence(available, [/appointed time expires.*another man marries/i]);
  if (!activeConflict) return legalEvidenceSynthesis(available);

  const sections = [
    "## Direct answer",
    "",
    "The first report directly addresses an existing mut'ah followed by a second public marriage. In that report the family imposed the second marriage without the woman's permission: the Imam distinguishes the unexpired mut'ah term, its waiting period, release of the remaining term, and a newly solemnized marriage after her consent.",
    "",
    ...quotedEvidence(activeConflict, available, [
      "without her permission", "until the condition", "waiting period", "remaining of the time", "all over again", "correct manner",
    ]),
  ];
  if (reverseConflict && reverseConflict !== activeConflict) {
    sections.push(
      "",
      "## Reverse case",
      "",
      ...quotedEvidence(reverseConflict, available, ["has a husband", "must not give her anything"]),
    );
  }
  if (expiredContrast && expiredContrast !== activeConflict && expiredContrast !== reverseConflict) {
    sections.push(
      "",
      "## Contrast after expiry",
      "",
      ...quotedEvidence(expiredContrast, available, ["appointed time expires", "another man marries her"]),
    );
  }
  sections.push(
    "",
    "## Limits of the evidence",
    "",
    "The direct report expressly involves a marriage imposed by the family without permission. Its wording should not be silently generalized to a materially different case involving consent, a completed term, or a different sequence of contracts.",
  );
  return sections.join("\n");
}

function resultSource(result, index) {
  return [
    `REPORT ${index + 1}`,
    `Title: ${cleanCorpusDisplay(result.title || "")}`,
    `Collection: ${cleanCorpusDisplay(result.collection || "")}`,
    `Author/compiler: ${result.author || "not supplied"}`,
    `Chapter: ${cleanCorpusDisplay(result.chapter || "not supplied")}`,
    `Link: ${result.link || "not supplied"}`,
    `Evidence role: ${result.evidenceRole || "direct"}`,
    `Retrieval relation: ${(result.strategies || []).join(", ") || "direct"}`,
    `Report family role: ${result.clusterRole === "parallel" ? `parallel transmission of ${result.clusterId || result.familyRoot}` : `distinct anchor ${result.clusterId || result.id}`}`,
    `Published translation excerpt: ${publishedTranslation(result.text, result.evidenceTerms)}`,
  ].join("\n");
}

function estimatePromptTokens(value) {
  const text = String(value || "");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const nonAscii = (text.match(/[^\x00-\x7f]/g) || []).length;
  return Math.ceil(Math.max(words * 1.35, (text.length + nonAscii * 0.8) / 3.2));
}

export function synthesisMessages(query, results) {
  const systemContent = `${BASE_SYSTEM}
You are given retrieved narrations. Answer only from those narrations and their supplied metadata. Do not add a ruling, person, profession, requirement, exception, or fact from memory. Do not introduce a concept that is absent from both the question and the evidence. Retrieval relevance is not proof: first check whether each excerpt actually addresses the requested subject and relation.
For a method question, prioritize reports that demonstrate the ordinary procedure; do not substitute a special case. For a time question, quote the observable beginning, ending, or sign rather than replacing it with generic advice about prayer. For a legal question, compare distinct evidence roles: explicit permission, explicit prohibition, reported practice or precedent, and limitations or context. Preserve the actor and direction of an act: harm inflicted on a person is not self-directed conduct, and an opponent's behavior is not the Imam's practice. Do not turn a caution about one named form into a blanket ban on a broader practice, and do not turn a broader commendation into a ruling on an unmentioned exact act. State the transmitted evidence in its best-supported context without importing a modern school, nationality, clerical policy, or fatwa.
Separate what a report explicitly states from contextual interpretation. If reports are parallel versions of one event, identify them as witnesses of the same core report without counting them as unrelated events. If the evidence does not answer the practical question, say "These retrieved reports do not establish that ruling" and describe only the related evidence. Absence of a prohibition is not proof of permission, and absence of permission is not proof of prohibition. Do not discuss chain grading unless supplied. Use these headings: Direct answer, Evidence, Limits of the evidence. Keep each section concise. Cite report numbers and collection names. Do not repeat the question. For an author or compiler question, answer from the Author/compiler metadata.`;
  const compactQuestion = compact(query, 1200);
  const sourceTokenBudget = Math.max(
    900,
    4096
      - 460
      - 240
      - estimatePromptTokens(systemContent)
      - estimatePromptTokens(`Question: ${compactQuestion}\n\nRetrieved reports:`),
  );
  const selected = [];
  let sourceTokens = 0;
  for (const result of results.slice(0, 10)) {
    const source = resultSource(result, selected.length);
    const estimatedTokens = estimatePromptTokens(source) + 8;
    if (selected.length && sourceTokens + estimatedTokens > sourceTokenBudget) break;
    selected.push(source);
    sourceTokens += estimatedTokens;
  }
  const sources = selected.join("\n\n---\n\n");
  return [
    {
      role: "system",
      content: systemContent,
    },
    {
      role: "user",
      content: `Question: ${compactQuestion}\n\nRetrieved reports:\n${sources}`,
    },
  ];
}

export function elucidationMessages(query, elucidation, nearbyResults = []) {
  const related = nearbyResults
    .filter((result) => result.id !== elucidation.resultId)
    .slice(0, 2)
    .map(resultSource)
    .join("\n\n---\n\n");
  return [
    {
      role: "system",
      content: `${BASE_SYSTEM}
Explain the supplied narration without merely paraphrasing it and without importing facts that are absent. Reason in four layers:
1. what the wording directly establishes;
2. what its immediate narrative context implies;
3. plausible applications or examples, clearly labeled as possibilities rather than facts;
4. what the report does not settle.
This permits context-sensitive explanation such as recognizing that taqiyyah may concern meaningful social or reputational harm when the wording supports protective concealment, or that an unspecified concealed bodily feature need not be assumed to be the private parts. Never present a possible example as the actual hidden fact.
Return only valid JSON with this shape:
{"overview":"...","points":[{"title":"What the text establishes","text":"..."},{"title":"Context and implication","text":"..."},{"title":"Possible scope","text":"..."},{"title":"What remains unsettled","text":"..."}],"takeaway":"..."}`,
    },
    {
      role: "user",
      content: `User request: ${compact(query, 1200)}
Selected narration:
Title: ${elucidation.title}
Collection: ${elucidation.collection}
Arabic text: ${compact(elucidation.parallel?.arabic, 2600)}
Published translation: ${compact(elucidation.parallel?.english || elucidation.matn, 2600)}
${related ? `\nPotentially related retrieved reports:\n${related}` : ""}`,
    },
  ];
}

export function parseElucidationJson(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || raw;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(fenced.slice(start, end + 1));
    if (!parsed || typeof parsed.overview !== "string" || typeof parsed.takeaway !== "string") return null;
    const points = Array.isArray(parsed.points)
      ? parsed.points
          .filter((point) => point && typeof point.title === "string" && typeof point.text === "string")
          .slice(0, 4)
      : [];
    if (points.length < 2) return null;
    return {
      overview: parsed.overview.trim(),
      points: points.map((point) => ({ title: point.title.trim(), text: point.text.trim() })),
      takeaway: parsed.takeaway.trim(),
    };
  } catch {
    return null;
  }
}
