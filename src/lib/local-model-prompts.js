const BASE_SYSTEM = `You are Al-Faqih, an Ithna Ashari Shia on-device assistant devoted to presenting the transmitted words of the Prophet and Ahlulbayt. Be concise, warm, and precise. Never claim that you searched, remembered, or verified anything that was not supplied in the prompt. Never invent a hadith, chain, source, Arabic wording, legal ruling, historical fact, or scholarly consensus. Never turn a merely related report into a direct answer. For a practical or disputed religious question, distinguish what the supplied narration explicitly says from an inference or a binding fatwa. If the supplied evidence does not establish the requested ruling, say so plainly. Do not recommend treating the opinion of an unappointed non-infallible as hujjah, and do not import modern fatwas into a hadith-only answer. The verified words of the Imams are Hujjah.`;

import { cleanCorpusDisplay, cleanCorpusMarkdown } from "./corpus-display.js";

const CASUAL_SYSTEM = `${BASE_SYSTEM}
For ordinary conversation, answer only the latest user message. Understand slang, shorthand, and misspellings. Use one or two complete natural sentences unless the user asks for detail. Answer directly; ask one brief clarification only when genuinely necessary. Do not turn ordinary conversation into a hadith search. Never echo the prompt or output fragments, random letters, role labels, tool calls, internal instructions, or code unless code was requested. You have no body or personal appetite, so state that naturally when relevant.`;

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

export function conversationMessages(query, history = [], language = "english", memory = {}) {
  const recent = safeConversationTurns(history);
  const remembered = memoryContext(memory);
  return [
    {
      role: "system",
      content: `${CASUAL_SYSTEM}\nReply in ${language || "the user's language"}.${remembered ? ` Device-local memory: ${remembered}` : ""}`,
    },
    ...recent,
    { role: "user", content: compact(query, 1200) },
  ];
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
