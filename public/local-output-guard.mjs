const CONTROL_MARKUP = /<\s*\/?\s*(?:tool_call|function_call|function|assistant|system|user)\b|<\|[^>]+\|>|\b(?:tool_call|function_call)\s*[:=]/iu;
const ROLE_PREFIX = /^(?:assistant|system|user)\s*[:：]\s*/iu;
const TECHNICAL_REQUEST = /\b(?:code|script|program|function|class|component|react|next\.?js|javascript|typescript|python|java|c\+\+|html|css|api|debug|error|compile|terminal|command|json|xml|sql|regex|database|server|worker|appbar|binding)\b|[`{}[\];]/iu;
const CODE_FRAGMENT = /(?:^|\s)(?:const|let|var|function|class|import|export|return|async|await|appbar|binding)\b|[`{}[\];]|\b\w+_\w+\b|\b[a-z]+[A-Z][A-Za-z0-9]*\b/u;
const ENGLISH_FUNCTION_WORDS = new Set(
  "a about after again all am an and any are as at be because been before being but by can could did do does doing dont for from get got had has have he her here him his how i if im in into is it its just know like may me might more my no not now of on one or our out please ready really right say see she should so some sounds than that the their them then there these they thing this to too up us was we well were what when where which who why will with would yeah yes you your youre".split(" "),
);
const NATURAL_SHORT_REPLIES = new Set(
  "yes no sure okay ok thanks welcome hello hey hi goodbye bye pizza tacos both neither true false maybe absolutely definitely probably".split(" "),
);
const CONVERSATIONAL_MARKERS = /\b(?:i|i'm|im|i am|i can|i do|i don't|here|ready|yes|no|sure|hey|hello|thanks|welcome|sounds|that|you|your|let's|lets|could|would|can|what|why|how|because|sorry|please|maybe)\b/iu;
const WH_QUESTION = /^(?:what|why|how|who|where|when|which|whose)\b/iu;
const YES_NO_QUESTION = /^(?:am|are|is|was|were|do|does|did|can|could|will|would|should|have|has|had|may|might)\b/iu;
const CASUAL_ACTIVITY_QUESTION = /\b(?:what(?:'s| is| are)?\s*(?:you|u)\s*(?:doing|up to)|whatchu\s+up\s+to|what\s+you\s+doing|wyd|wya)\b/iu;
const SOCIAL_PROMPT = /^(?:hi|hello|hey|yo|hiya|sup|wassup|wsp|what'?s up|whats up|how are you|how'?s it going|huh|bruh|thanks|thank you|bye|goodbye)\b|\b(?:whatchu up to|what are you doing|what you doing|wyd|wya|are you shia|who are you|what are you|do you like|you like|favorite|favourite)\b/iu;

export function normalizeForComparison(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function wordsOf(value) {
  return normalizeForComparison(value).split(/\s+/).filter(Boolean);
}

function removeRepeatedSentences(value) {
  const text = String(value || "").replace(/\r/g, "").trim();
  if (!text) return "";

  const seen = new Set();
  const paragraphs = [];
  for (const rawParagraph of text.split(/\n{2,}/u)) {
    const sentences = rawParagraph
      .split(/(?<=[.!?؟])\s+(?=[\p{L}\p{N}#*])/u)
      .map((sentence) => sentence.replace(/[ \t]+/g, " ").trim())
      .filter(Boolean);
    const kept = [];
    for (const sentence of sentences) {
      const key = normalizeForComparison(sentence);
      if (key.length >= 12 && seen.has(key)) continue;
      if (key.length >= 12) seen.add(key);
      kept.push(sentence);
    }
    if (kept.length) paragraphs.push(kept.join(" "));
  }
  return paragraphs.join("\n\n").replace(/[ \t]+([,.;:!?؟])/g, "$1").trim();
}

function removeRepeatedWordRuns(value) {
  return String(value || "")
    .replace(/\b([\p{L}\p{N}]{1,24})(?:[ \t]+\1){2,}\b/giu, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanGeneratedText(value, latestUserMessage = "") {
  let text = String(value || "")
    .replace(/<\|(?:im_start|im_end|endoftext)\|>/giu, "")
    .replace(ROLE_PREFIX, "")
    .trim();
  text = removeRepeatedWordRuns(removeRepeatedSentences(text));

  const answer = normalizeForComparison(text);
  const question = normalizeForComparison(latestUserMessage);
  if (!answer) return "";
  if (question && answer === question) return "";
  if (question.length >= 12 && answer.startsWith(question) && answer.length <= question.length + 18) return "";
  return text;
}

function repeatedPattern(value) {
  const compact = String(value || "").replace(/\s+/g, "");
  if (/(.{2,12})\1{3,}/iu.test(compact)) return true;
  if (/([A-Z]{1,4})\1{4,}/u.test(compact)) return true;
  return false;
}

function lowWordDiversity(value) {
  const words = wordsOf(value);
  if (words.length < 9) return false;
  return new Set(words).size / words.length < 0.48;
}

function containsOversizedGarbageToken(value) {
  return String(value || "")
    .split(/\s+/)
    .some((token) => token.length > 42 && !/^https?:\/\//i.test(token));
}

function hasExcessiveSymbols(value) {
  const text = String(value || "");
  if (!text) return false;
  const visible = [...text].filter((character) => !/\s/u.test(character));
  if (!visible.length) return false;
  const symbols = visible.filter((character) => !/[\p{L}\p{N}.,!?؟'’"“”()\-—:;/\\]/u.test(character));
  return symbols.length / visible.length > 0.12;
}

function likelyCasualPrompt(value) {
  const words = wordsOf(value);
  return words.length <= 18 && !TECHNICAL_REQUEST.test(value);
}

function likelyEnglish(value) {
  const text = String(value || "");
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const nonLatin = (text.match(/[\p{L}]/gu) || []).length - latin;
  return latin >= 2 && latin >= nonLatin * 2;
}

function malformedEnglishTokens(value) {
  const tokens = String(value || "")
    .replace(/[^A-Za-z'’-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return false;

  let suspicious = 0;
  for (const rawToken of tokens) {
    const token = rawToken.toLowerCase().replace(/['’]/g, "");
    if (token.length <= 2 || ENGLISH_FUNCTION_WORDS.has(token) || NATURAL_SHORT_REPLIES.has(token)) continue;
    if (/^[a-z]+$/.test(token) && /[aeiouy]/.test(token)) continue;
    if (/^[A-Z]{2,6}$/.test(rawToken)) continue;
    suspicious += 1;
  }
  return suspicious >= 2 && suspicious / tokens.length > 0.45;
}

function oneWordReplyIsSupported(answerWords, latestUserMessage) {
  if (answerWords.length !== 1) return true;
  const [answer] = answerWords;
  if (/^\d+(?:\.\d+)?$/.test(answer)) return true;
  if (NATURAL_SHORT_REPLIES.has(answer)) return true;
  const question = normalizeForComparison(latestUserMessage);
  const questionWords = wordsOf(latestUserMessage);
  if (/\bor\b/u.test(question) && questionWords.includes(answer)) return true;
  return false;
}

function shortReplyLooksNatural(text, latestUserMessage) {
  const answerWords = wordsOf(text);
  const questionWords = wordsOf(latestUserMessage);
  const trimmed = String(text || "").trim();
  const titleCaseEntity = /^[A-Z][a-z]{2,}(?:[.!?])?$/u.test(trimmed)
    && !ENGLISH_FUNCTION_WORDS.has(answerWords[0] || "");
  if (!oneWordReplyIsSupported(answerWords, latestUserMessage) && !titleCaseEntity) return false;
  if (answerWords.length >= 4) return true;
  if (CONVERSATIONAL_MARKERS.test(text)) return true;
  if (answerWords.some((word) => questionWords.includes(word))) return true;
  if (answerWords.every((word) => NATURAL_SHORT_REPLIES.has(word) || /^\d/.test(word))) return true;
  return false;
}

function answerCompletenessFailure(text, latestUserMessage) {
  const answerWords = wordsOf(text);
  const question = normalizeForComparison(latestUserMessage);
  const trimmed = String(text || "").trim();
  if (!answerWords.length) return "empty";
  if (/^(?:i am|im|it is|that is|you are|we are|they are|i do|i can|i will|i would|because)$/u.test(normalizeForComparison(text))) {
    return "dangling-fragment";
  }

  if (CASUAL_ACTIVITY_QUESTION.test(question) && answerWords.length < 4) {
    return "incomplete-activity-answer";
  }
  if (answerWords.length === 1 && (
    oneWordReplyIsSupported(answerWords, latestUserMessage)
    || (/^[A-Z][a-z]{2,}(?:[.!?])?$/u.test(trimmed)
      && !ENGLISH_FUNCTION_WORDS.has(answerWords[0] || ""))
  )) {
    return "";
  }
  if (WH_QUESTION.test(question) && answerWords.length < 3 && !/^\d/.test(answerWords[0] || "")) {
    return "incomplete-wh-answer";
  }
  if (YES_NO_QUESTION.test(question) && answerWords.length === 1 && !/^(?:yes|no|maybe|sometimes|usually)$/u.test(answerWords[0])) {
    return "incomplete-yes-no-answer";
  }
  if (!shortReplyLooksNatural(text, latestUserMessage)) return "orphan-fragment";
  return "";
}

function probablePromptLeak(text, latestUserMessage) {
  const answer = normalizeForComparison(text);
  const question = normalizeForComparison(latestUserMessage);
  if (!answer || !question) return false;
  if (answer === question) return true;
  if (question.length >= 10 && answer.includes(question) && answer.length < question.length * 1.45) return true;
  return false;
}


function socialReplyLooksRelevant(text, latestUserMessage) {
  const question = normalizeForComparison(latestUserMessage);
  if (!SOCIAL_PROMPT.test(question)) return true;
  if (CONVERSATIONAL_MARKERS.test(text)) return true;
  const ignored = new Set("a an the are is am do does did can could will would should have has had you your i me my it that this what which who how up to".split(" "));
  const questionTerms = wordsOf(question).filter((word) => word.length > 2 && !ignored.has(word));
  const answerTerms = new Set(wordsOf(text).filter((word) => word.length > 2 && !ignored.has(word)));
  return questionTerms.some((word) => answerTerms.has(word));
}

function yesNoAnswerIsRelevant(text, latestUserMessage) {
  const question = normalizeForComparison(latestUserMessage);
  if (!YES_NO_QUESTION.test(question)) return true;
  const answer = normalizeForComparison(text);
  if (/^(?:yes|no|maybe|sometimes|usually|often|rarely|sure|absolutely|not exactly|i am|im|i do|i dont|i can|i cant|it is|it isnt|that is|that isnt)\b/u.test(answer)) {
    return true;
  }
  const ignored = new Set("a an the are is am do does did can could will would should have has had you your i me my it that this what which who how".split(" "));
  const questionTerms = wordsOf(question).filter((word) => word.length > 2 && !ignored.has(word));
  const answerTerms = new Set(wordsOf(answer).filter((word) => word.length > 2 && !ignored.has(word)));
  return questionTerms.some((word) => answerTerms.has(word));
}

export function validateGeneratedReply(value, {
  latestUserMessage = "",
  mode = "conversation",
} = {}) {
  const raw = String(value || "").trim();
  if (!raw) return { ok: false, text: "", reason: "empty" };
  if (CONTROL_MARKUP.test(raw)) return { ok: false, text: "", reason: "control-markup" };
  if (raw.includes("\uFFFD")) return { ok: false, text: "", reason: "invalid-character" };
  if (repeatedPattern(raw)) return { ok: false, text: "", reason: "repeated-pattern" };
  if (hasExcessiveSymbols(raw) && !(mode === "conversation" && TECHNICAL_REQUEST.test(latestUserMessage))) {
    return { ok: false, text: "", reason: "excessive-symbols" };
  }

  const text = cleanGeneratedText(raw, latestUserMessage);
  if (!text) return { ok: false, text: "", reason: "empty-after-cleaning" };
  if (probablePromptLeak(text, latestUserMessage)) return { ok: false, text: "", reason: "prompt-echo" };
  if (lowWordDiversity(text)) return { ok: false, text: "", reason: "low-diversity" };
  if (containsOversizedGarbageToken(text)) return { ok: false, text: "", reason: "oversized-token" };

  if (mode === "conversation") {
    const technical = TECHNICAL_REQUEST.test(latestUserMessage);
    const casual = likelyCasualPrompt(latestUserMessage);
    const words = wordsOf(text);
    if (casual && words.length > 80) return { ok: false, text: "", reason: "casual-answer-too-long" };
    if (!technical && casual && CODE_FRAGMENT.test(text)) {
      return { ok: false, text: "", reason: "unexpected-code-fragment" };
    }
    if (/\b(?:assistant|system|user)\s*:/iu.test(text)) {
      return { ok: false, text: "", reason: "role-leak" };
    }
    if (!technical && likelyEnglish(latestUserMessage) && malformedEnglishTokens(text)) {
      return { ok: false, text: "", reason: "malformed-english" };
    }
    if (!technical && likelyEnglish(latestUserMessage)) {
      const completenessReason = answerCompletenessFailure(text, latestUserMessage);
      if (completenessReason) return { ok: false, text: "", reason: completenessReason };
      if (!yesNoAnswerIsRelevant(text, latestUserMessage)) {
        return { ok: false, text: "", reason: "irrelevant-yes-no-answer" };
      }
      if (!socialReplyLooksRelevant(text, latestUserMessage)) {
        return { ok: false, text: "", reason: "irrelevant-social-answer" };
      }
    }
  }

  if (mode === "synthesis") {
    const required = ["direct answer", "how the reports fit together", "limits of the evidence"];
    const normalized = normalizeForComparison(text);
    if (!required.every((heading) => normalized.includes(heading))) {
      return { ok: false, text: "", reason: "missing-synthesis-structure" };
    }
  }

  if (mode === "elucidation" && !text.includes("{")) {
    return { ok: false, text: "", reason: "missing-json" };
  }

  return { ok: true, text, reason: "" };
}
