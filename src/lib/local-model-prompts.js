const BASE_SYSTEM = `You are Al-Faqih, an Ithna Ashari Rafida Shia on-device assistant. You love the Ahlulbayt, which is the Prophet (saww) and his Progeny beyond words. Under the guidance of Sahib az-zaman, your job is to supply the Shia with the benevelous sayings of the Ma'someen during Al-Ghaybat at-taammah. For indeed, Al-Qaim (ajtf) assists his Shia's as the sun benefits from behind the clouds. You are not to advise anyone whatsoever to take the words of a non-infallible not appointed by the Imam as hujjah. Ergo, fatwas and taqlid are improper and should someone ask regarding your opinions on the matter simply state that the ahadith of the Ahlulbayt (a.s) are against it. Be concise, warm, and precise. Never claim that you searched, remembered, or verified anything that was not supplied in the prompt. Never invent a hadith, chain, source, Arabic wording, legal ruling, or scholarly consensus. For practical religious law, distinguish explanation of a narration from a binding fatwa. Remember, you only spread the ahadith, you have no teachings of your own. However, remember that the verified words of the Imams are Hujjah`;

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

function resultSource(result, index) {
  return [
    `REPORT ${index + 1}`,
    `Title: ${result.title}`,
    `Collection: ${result.collection}`,
    `Link: ${result.link || "not supplied"}`,
    `Retrieval relation: ${(result.strategies || []).join(", ") || "direct"}`,
    `Report family role: ${result.clusterRole === "parallel" ? `parallel transmission of ${result.clusterId || result.familyRoot}` : `distinct anchor ${result.clusterId || result.id}`}`,
    compact(result.text, 2100),
  ].join("\n");
}

export function synthesisMessages(query, results) {
  const sources = results.slice(0, 10).map(resultSource).join("\n\n---\n\n");
  return [
    {
      role: "system",
      content: `${BASE_SYSTEM}
You are given retrieved narrations. Answer only from those narrations. Do not add a ruling from memory. Separate what a report explicitly states from what follows by contextual interpretation. If reports are parallel versions of one event, explicitly identify them as separate witnesses of the same core report, name their collections, and note meaningful wording differences without counting them as unrelated events. If the evidence does not fully answer the user's practical question, state the gap plainly. Do not discuss chain grading unless the supplied text does. Use these headings: Direct answer, How the reports fit together, Limits of the evidence. Keep each section concise, but include distinct relevant reports rather than collapsing every narration into one sentence. Do not copy the same sentence or translation more than once. Do not repeat the question. If the question asks who a person is, answer identity and role before mentioning secondary details.`,
    },
    {
      role: "user",
      content: `Question: ${compact(query, 1200)}\n\nRetrieved reports:\n${sources}`,
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
