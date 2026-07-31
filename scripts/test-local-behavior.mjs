import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  applyQueryAnalysisToSearchPlan,
  resolveLocalConversation,
} from "../src/lib/local-conversation.js";
import { cleanCorpusDisplay, cleanCorpusMarkdown } from "../src/lib/corpus-display.js";
import {
  biographicalEvidenceSynthesis,
  definitionEvidenceSynthesis,
  importanceEvidenceSynthesis,
  methodEvidenceSynthesis,
  parseQueryAnalysisJson,
  synthesisMessages,
  timeDefinitionEvidenceSynthesis,
  virtueEvidenceSynthesis,
} from "../src/lib/local-model-prompts.js";
import { resolveQueryTokens } from "../public/hadith-retrieval-core.mjs";
import { validateGeneratedReply } from "../public/local-output-guard.mjs";
import { search } from "./test-hadith-search.mjs";

const manifest = JSON.parse(await readFile(
  new URL("../public/hadith-data/manifest.json", import.meta.url),
  "utf8",
));
const genericRuntimeSources = await Promise.all([
  "../src/lib/local-conversation.js",
  "../src/lib/local-model-prompts.js",
  "../src/app/chat/page.js",
  "../public/hadith-search.worker.js",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
assert.doesNotMatch(
  genericRuntimeSources.join("\n"),
  /\b(?:tatbir|tatbeer|zanjeer|zanjir|female\s+wax|sell\s+alcohol|mourningQuestion)\b/i,
  "runtime retrieval and synthesis must not contain topic-specific branches",
);

async function routedSearch(query, profileUpdate = {}) {
  const route = resolveLocalConversation(query, { messages: [] }, {}, manifest);
  assert.equal(route.intent, "religious-search", `${query} must use corpus retrieval`);
  const retrievalProfile = { ...route.retrievalProfile, ...profileUpdate };
  const payload = await search(route.searchQuery, {
    resultLimit: retrievalProfile.resultLimit,
    retrievalProfile,
  });
  return { route, ...payload };
}

async function analyzedSearch(query, analysis, profileUpdate = {}) {
  const route = resolveLocalConversation(query, { messages: [] }, {}, manifest);
  assert.equal(route.intent, "religious-search", `${query} must use corpus retrieval`);
  const refined = applyQueryAnalysisToSearchPlan(
    route.searchQuery,
    { ...route.retrievalProfile, ...profileUpdate },
    analysis,
  );
  const payload = await search(refined.searchQuery, {
    resultLimit: refined.retrievalProfile.resultLimit,
    retrievalProfile: refined.retrievalProfile,
  });
  return { route, refined, ...payload };
}

function hasLink(results, fragment) {
  return results.some(({ link }) => link.includes(fragment));
}

for (const [variant, expected] of [
  ["aqeeqah", "aqiqah"],
  ["akikah", "aqiqah"],
  ["wudhu", "wudu"],
]) {
  const resolution = resolveQueryTokens(variant, manifest);
  assert.ok(
    resolution.tokens.includes(expected),
    `${variant} must resolve from corpus vocabulary to ${expected}`,
  );
}
assert.equal(
  resolveQueryTokens("taqleed", manifest).tokens.includes("table"),
  false,
  "fuzzy correction must not turn an unfamiliar transliteration into an unrelated common word",
);
assert.deepEqual(
  resolveQueryTokens("tatbir", manifest).corrections,
  [],
  "tatbir must not be silently rewritten as takbir",
);

const aqiqah = await routedSearch("find ahadith on aqeeqah");
assert.ok(hasLink(aqiqah.results, "/6/1/16/") || hasLink(aqiqah.results, "/6/1/17/"));

for (const query of [
  "how do I do aqeeqah",
  "how aqeeqa done",
  "aqiqa procedure",
  "how perform aqiqah",
  "aqikah how do",
]) {
  const route = resolveLocalConversation(query, { messages: [] }, {}, manifest);
  assert.equal(route.intent, "religious-search", `${query} must not fall through to casual chat`);
  assert.equal(route.retrievalProfile.facet, "method", `${query} must preserve the requested method relation`);
  assert.equal(route.retrievalProfile.needsQueryAnalysis, false, `${query} must stay on the fast retrieval path`);
  assert.equal(route.retrievalProfile.expandMethodContext, true, `${query} must expand to action-bearing corpus context`);
}

const wudu = await routedSearch("how to do wudhu");
assert.ok(wudu.results.length > 0);
assert.ok(
  wudu.results.length === 2
    && wudu.results.every((result) => /description of wudu/i.test(`${result.title} ${result.chapter}`)),
  "a misspelled how-to question must rank direct descriptions of wudu first",
);

const aqeeqahProcedure = await routedSearch("procedure for aqeeqah");
assert.equal(aqeeqahProcedure.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(
  aqeeqahProcedure.results[0]?.link.includes("/6/1/17/")
    && /seventh day|slaughter|shave|name/i.test(aqeeqahProcedure.results[0]?.text || ""),
  "a short aqeeqah procedure search must stay fast and lead with an actual procedure, not only the inability exception",
);

const naturalAqeeqahProcedure = await routedSearch("how do I do aqeeqah");
assert.ok(
  naturalAqeeqahProcedure.results[0]?.link.includes("/6/1/17/")
    && /seventh day|slaughter|shave|name/i.test(naturalAqeeqahProcedure.results[0]?.text || ""),
  "a natural how-to phrasing must lead with the action-bearing aqeeqah procedure",
);

const fajr = await analyzedSearch("what time should I pray fajr", {
  retrievalQuery: "Fajr morning prayer time true dawn white light spreading horizontally across horizon until sunrise",
  exactSubjects: ["Fajr prayer time"],
  evidenceSubjects: ["true dawn white light across the horizon", "beginning and end of morning prayer time"],
  answerCriteria: ["observable beginning of prayer time", "white light across the horizon", "ending at sunrise"],
  evidenceQueries: [
    { role: "direct", query: "time of morning Salah dawn appears until rays of sun", requiredSubjects: ["morning Salah time"] },
    { role: "observable-sign", query: "true dawn white line horizontal like fine linen horizon rays sunrise", requiredSubjects: ["true dawn"] },
  ],
  relation: "time-definition",
  confidence: 0.95,
});
assert.equal(fajr.route.retrievalProfile.facet, "time-definition");
assert.ok(
  fajr.results.slice(0, 3).some((result) => result.link.includes("/3/4/7/")),
  "a time question must rank the chapter defining morning prayer time",
);
assert.ok(
  fajr.results.slice(0, 4).some((result) => /white|dawn|horizon|rays of sun/i.test(result.text)),
  "Fajr evidence must contain the observable dawn boundary rather than generic prayer advice",
);
assert.ok(
  fajr.results.some((result) => result.link.includes("/3/4/7/3")),
  "Fajr evidence must include the horizontal true-dawn report",
);
const fajrSynthesis = timeDefinitionEvidenceSynthesis(fajr.results);
assert.match(fajrSynthesis, /published translation/i);
assert.match(fajrSynthesis, /dawn|white|rays of sun/i);
assert.doesNotMatch(fajrSynthesis, /when you wake|perform ablution/i);
for (const query of [
  "when does morning salah begin?",
  "what is the latest time for the dawn prayer?",
  "how do I know the time of subh prayer has entered?",
]) {
  assert.equal(
    resolveLocalConversation(query, { messages: [] }, {}, manifest).retrievalProfile.facet,
    "time-definition",
    `${query} must use the general time-definition relation`,
  );
}

const clay = await routedSearch("what clay are the believers made of");
assert.ok(
  hasLink(clay.results, "/2/1/1/") || hasLink(clay.results, "/2/1/72/"),
  "the believer-clay reports must be returned",
);

const taqlid = await routedSearch("what do you think about taqlid");
assert.ok(
  taqlid.results.some((result) => /taqlid|following the opinions/i.test(`${result.title} ${result.chapter}`)),
  "taqlid must return a report that directly names the subject",
);

const taqiyyahImportance = await routedSearch("how important is taqiyyah");
assert.equal(taqiyyahImportance.route.retrievalProfile.facet, "importance");
assert.equal(taqiyyahImportance.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(
  taqiyyahImportance.results.some((result) => result.link.includes("/26/1/3/1"))
    && taqiyyahImportance.results.some((result) => result.link.includes("/2/1/97/")),
  "taqiyyah importance must include the Sifat al-Shia denial report and Al-Kafi taqiyyah reports",
);
assert.match(importanceEvidenceSynthesis(taqiyyahImportance.results), /retrieved narrations|religious significance/i);

const shiaVirtues = await routedSearch("give me hadith in priase of the shia");
assert.equal(shiaVirtues.route.retrievalProfile.facet, "virtues");
assert.equal(shiaVirtues.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(
  shiaVirtues.results.some((result) => result.link.includes("/25/1/"))
    && shiaVirtues.results.some((result) => result.link.includes("/26/1/")),
  "Shia praise must search both dedicated Fada'il and Sifat collections",
);
assert.match(virtueEvidenceSynthesis(shiaVirtues.results), /virtues|qualities/i);

const fastRuhRoute = resolveLocalConversation(
  "what is ruh ul qudus",
  { messages: [] },
  {},
  manifest,
);
assert.equal(fastRuhRoute.retrievalProfile.facet, "definition");
assert.equal(fastRuhRoute.retrievalProfile.needsQueryAnalysis, false);
assert.equal(fastRuhRoute.searchQuery, "holy spirit");
assert.ok(
  fastRuhRoute.retrievalProfile.secondaryQueries.some((query) => /spirit.*greater.*angel/i.test(query)),
  "a Roman-Arabic definition must compose a translated definition-evidence lane",
);
assert.equal(
  resolveLocalConversation("zikre aliyun ibadah", { messages: [] }, {}, manifest).retrievalProfile.needsQueryAnalysis,
  true,
  "an unfamiliar quotation request without a compositional gloss must still use semantic decomposition",
);

const fastRuh = await routedSearch("what is ruh ul qudus");
assert.ok(
  fastRuh.results.slice(0, 6).some((result) => result.link.includes("/1/4/93/1"))
    && fastRuh.results.some((result) => result.link.includes("/1/4/55/"))
    && fastRuh.results.some((result) => result.link.includes("/1/4/56/")),
  "Ruh ul-Qudus must return the greater-than-Jibril report and the chapters describing its qualities",
);
const fastRuhSynthesis = definitionEvidenceSynthesis(fastRuh.results);
assert.match(fastRuhSynthesis, /creature|greater than|spirit/i);

const askariBirth = await routedSearch("how and when was imam askari born");
assert.equal(askariBirth.route.retrievalProfile.facet, "biographical-event");
assert.equal(askariBirth.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(askariBirth.results[0]?.link.includes("/1/4/124/0"));
assert.ok(askariBirth.results.slice(0, 3).some((result) => result.link.includes("/1/4/124/1")));
assert.ok(
  askariBirth.results.every((result) => result.link.includes("/1/4/124/")),
  "a named Imam's birth question must stay within that Imam's matching biographical chapter",
);
const askariSynthesis = biographicalEvidenceSynthesis(askariBirth.results);
assert.match(askariSynthesis, /born|month|year/i);

const ruh = await analyzedSearch("what is ruh al quddus", {
  retrievalQuery: "Ruh al-Qudus Holy Spirit spirit permanently with the Imams",
  exactSubjects: ["Ruh al-Qudus"],
  evidenceSubjects: ["Holy Spirit spirit with the Imams"],
  answerCriteria: ["what Ruh al-Qudus is", "how the Imams describe its relation to them"],
  evidenceQueries: [
    { role: "direct", query: "Ruh al-Qudus Holy Spirit spirit permanently with the Imams", requiredSubjects: ["Holy Spirit"] },
    { role: "description", query: "spirit that accompanies the Imams Holy Spirit", requiredSubjects: ["Holy Spirit"] },
    { role: "distinction", query: "Ruh al-Qudus not Gabriel Jibril spirit", requiredSubjects: ["Holy Spirit"] },
  ],
  relation: "definition",
  confidence: 0.95,
});
assert.ok(
  ruh.results.some((result) => /holy spirit|ruh al[- ]quddus/i.test(`${result.title} ${result.chapter} ${result.text}`)),
  "Ruh al-Qudus must retrieve reports that describe the Holy Spirit and its relation to the Imams",
);

const zanjeer = await analyzedSearch("is zanjeer haram", {
  retrievalQuery: "zanjeer chain striking mourning grief Husayn physical lamentation legal status",
  exactSubjects: ["zanjeer mourning with chains"],
  evidenceSubjects: ["physical mourning for Husayn", "lamentation and grief for Husayn"],
  answerCriteria: ["explicit permission or prohibition", "reported physical mourning precedent", "limits on lamentation"],
  evidenceQueries: [
    { role: "practice", query: "in grief tore his shirt hit himself on the head mourning death", requiredSubjects: ["hit himself on the head in grief"] },
    { role: "commendation", query: "lament mourn cry elegy Husayn reward", requiredSubjects: ["lamentation for Husayn"] },
    { role: "limitation", query: "impatience wayl beating face chest pulling hair", requiredSubjects: ["impatience and lamentation"] },
  ],
  relation: "legal-status",
  confidence: 0.92,
});
assert.ok(
  zanjeer.results.slice(0, 3).some((result) => /patience|impatience|lament|mourning|grief/i.test(`${result.title} ${result.chapter} ${result.text}`)),
  "zanjeer must retrieve mourning and grief evidence rather than an empty or takbir result",
);

const rewrittenRuh = await search(
  "what is ruh al quddus Holy Spirit spirit permanently with the Imams",
  {
    resultLimit: 10,
    retrievalProfile: {
      ...resolveLocalConversation("what is ruh al quddus", { messages: [] }, {}, manifest).retrievalProfile,
      rewritten: true,
      requireSubjectMatch: true,
      subjectTermGroups: ["Holy Spirit"],
      minimumFocusCoverage: 0.45,
    },
  },
);
assert.ok(
  rewrittenRuh.results.some((result) => /holy spirit/i.test(result.text)),
  "a generic exact-subject rewrite must retrieve reports describing the Holy Spirit",
);

const alKafi = resolveLocalConversation("who is the author of al-kafi", { messages: [] }, {}, manifest);
assert.equal(alKafi.intent, "book-info");
assert.equal(alKafi.author, "Muhammad ibn Ya'qub al-Kulayni");
assert.equal(alKafi.source, "corpus metadata");

const wasail = resolveLocalConversation("wasail as shia author", { messages: [] }, {}, manifest);
assert.equal(wasail.intent, "book-info");
assert.match(wasail.author, /al-Hurr al-Amili/i);

const fadail = resolveLocalConversation("who is the author of fadail as shia", { messages: [] }, {}, manifest);
assert.equal(fadail.intent, "book-info");
assert.match(fadail.author, /Shaykh al-Saduq/i);

const manLaYahdurulFaqih = resolveLocalConversation(
  "author of man la yahdurul faqih",
  { messages: [] },
  {},
  manifest,
);
assert.equal(manLaYahdurulFaqih.intent, "book-info");
assert.match(manLaYahdurulFaqih.author, /Shaykh al-Saduq/i);

const novelPracticalQuestion = resolveLocalConversation(
  "can a female wax another female as part of her work",
  { messages: [] },
  {},
  manifest,
);
assert.equal(novelPracticalQuestion.intent, "religious-search");
assert.equal(novelPracticalQuestion.retrievalProfile.facet, "legal-practical");
const novelPracticalEvidence = await analyzedSearch(
  "can a female wax another female as part of her work",
  {
    retrievalQuery: "woman removes another woman's body hair depilatory lime paste nurah bathhouse worker privacy employment",
    exactSubjects: ["a woman waxing another woman for work"],
    evidenceSubjects: ["applying depilatory lime paste to another person's body", "bathhouse worker providing hair removal"],
    answerCriteria: ["reported service by another person", "bodily privacy limits", "explicit permission or prohibition"],
    evidenceQueries: [
      { role: "practice", query: "bathhouse manager call me apply other parts body", requiredSubjects: ["bathhouse manager applying to another person's body"] },
      { role: "practice", query: "owner of bathhouse apply lime oil uncovered body loincloth", requiredSubjects: ["bathhouse owner applying lime or oil"] },
      { role: "limits", query: "woman sees another woman body private parts bathhouse", requiredSubjects: ["woman seeing another woman's body"] },
    ],
    relation: "legal-status",
    confidence: 0.94,
  },
);
assert.ok(
  novelPracticalEvidence.results.slice(0, 5).some((result) => (
    /(?:lime(?:\s+paste)?|depilatory|under arms|hair remover|nurah)/i.test(`${result.title} ${result.chapter} ${result.text}`)
  )),
  "a modern waxing question must surface the corpus's grooming evidence instead of an empty result set",
);
assert.ok(
  novelPracticalEvidence.results.some((result) => result.link.includes("/6/7/43/7")),
  "a provider-context grooming question must include the bathhouse manager report",
);
assert.ok(
  novelPracticalEvidence.results.some((result) => result.link.includes("/6/7/43/22")),
  "a provider-context grooming question must include the bathhouse owner report",
);
const modernVocabularyEvidence = await search(
  "female waxing another female body hair removal depilatory lime paste privacy work",
  {
    resultLimit: 6,
    retrievalProfile: {
      ...novelPracticalQuestion.retrievalProfile,
      rewritten: true,
      requireSubjectMatch: true,
      subjectTermGroups: ["depilatory", "hair removal", "bodily privacy"],
      requireFocusCoverage: false,
    },
  },
);
assert.ok(
  modernVocabularyEvidence.results.some((result) => (
    /\b(?:depilatory|lime paste|hair remover|noorah|nurah)\b/i.test(`${result.title} ${result.text}`)
  )),
  "a modern practical question must be able to retrieve its older corpus vocabulary",
);

const unknownBook = resolveLocalConversation(
  "who wrote the completely unknown book xyz",
  { messages: [] },
  {},
  manifest,
);
assert.equal(unknownBook.intent, "book-lookup");
assert.equal(unknownBook.known, false);
assert.equal(
  resolveLocalConversation("who wrote this hadith", { messages: [] }, {}, manifest).intent,
  "religious-search",
  "an ambiguous narration-authorship question must not be mistaken for a book title",
);

const followUp = resolveLocalConversation(
  "no find the hadith",
  {
    messages: [
      { role: "user", text: "what clay are the believers made of" },
      { role: "assistant", conversation: { text: "An unsupported answer." } },
    ],
  },
  {},
  manifest,
);
assert.equal(followUp.intent, "religious-search");
assert.match(followUp.searchQuery, /clay.*believers/i);

const parsedAnalysis = parseQueryAnalysisJson(JSON.stringify({
  retrieval_query: "modern act literal historical corpus vocabulary",
  exact_subjects: ["the modern act asked about"],
  evidence_subjects: ["literal physical act", "governing condition"],
  answer_criteria: ["explicit statement about the requested relation"],
  evidence_queries: [
    { role: "direct", query: "literal physical act governing condition", required_subjects: ["literal physical act"] },
    { role: "context", query: "historical precedent and limits", required_subjects: ["historical precedent"] },
  ],
  relation: "legal-status",
  confidence: 0.82,
}));
assert.deepEqual(parsedAnalysis.evidenceSubjects, ["literal physical act", "governing condition"]);
assert.equal(parsedAnalysis.evidenceQueries[0].role, "direct");
assert.deepEqual(parsedAnalysis.evidenceQueries[0].requiredSubjects, ["literal physical act"]);
assert.deepEqual(parsedAnalysis.answerCriteria, ["explicit statement about the requested relation"]);

const wuduMethodAnswer = methodEvidenceSynthesis(wudu.results);
assert.match(wuduMethodAnswer, /directly gives the requested procedure/i);
assert.match(wuduMethodAnswer, /washed his right forearm/i);
assert.match(wuduMethodAnswer, /wiped his head and feet/i);
assert.doesNotMatch(wuduMethodAnswer, /doctor|medical supervision/i);
for (const clean of [cleanCorpusDisplay, cleanCorpusMarkdown]) {
  assert.doesNotMatch(
    clean("Chapter title (The following chapters are best explained by fatwa.)"),
    /best explained by fatwa/i,
  );
  assert.doesNotMatch(
    clean("Chapter title (For such Ahadith, one must consult fatwas of one’s Mujtahid.)"),
    /consult fatwas/i,
  );
}

const music = await analyzedSearch("is music haram", {
  retrievalQuery: "music singing ghina instruments legal status permission prohibition",
  exactSubjects: ["music"],
  evidenceSubjects: ["singing", "musical instruments"],
  answerCriteria: ["explicit prohibition", "explicit allowance or exception", "context of performance"],
  evidenceQueries: [
    { role: "prohibition", query: "singing ghina promised fire distracting speech", requiredSubjects: ["singing"] },
    { role: "permission", query: "singing feast joy no problem disobedience", requiredSubjects: ["singing"] },
    { role: "context", query: "tambourine wedding joy singing", requiredSubjects: ["singing or tambourine"] },
  ],
  relation: "legal-status",
  confidence: 0.95,
});
assert.ok(
  music.results.slice(0, 5).every((result) => /music|singing/i.test(`${result.title} ${result.chapter}`)),
  "a legal question about music must return the dedicated music reports",
);
const nuancedMusic = await analyzedSearch("is music absolutely forbidden under all circumstances?", {
  retrievalQuery: "music singing ghina instruments all circumstances exceptions joy feast legal status",
  exactSubjects: ["music under all circumstances"],
  evidenceSubjects: ["singing", "musical instruments"],
  answerCriteria: ["explicit prohibition", "permitted occasion", "condition or exception"],
  evidenceQueries: [
    { role: "prohibition", query: "singing promised fire distracting speech", requiredSubjects: ["singing"] },
    { role: "permission", query: "singing feast joy no problem unless disobedience", requiredSubjects: ["singing"] },
    { role: "practice", query: "tambourine wedding Fatimah joy", requiredSubjects: ["tambourine at a wedding"] },
  ],
  relation: "legal-status",
  confidence: 0.95,
});
assert.ok(
  nuancedMusic.results.slice(0, 5).some((result) => /music|singing/i.test(`${result.title} ${result.chapter} ${result.text}`)),
  "a longer music question must retain the music corpus subject instead of ranking generic wording",
);

const tatbir = await analyzedSearch("is tatbir haram", {
  retrievalQuery: "tatbir physical mourning grief Husayn striking head blood lamentation legal status",
  exactSubjects: ["tatbir"],
  evidenceSubjects: ["physical mourning for Husayn", "striking oneself in grief", "lamentation for Husayn"],
  answerCriteria: ["explicit permission or prohibition", "reported physical mourning precedent", "specific limit on lamentation"],
  evidenceQueries: [
    { role: "practice", query: "in grief tore his shirt hit himself on the head mourning death", requiredSubjects: ["hit himself on the head in grief"] },
    { role: "commendation", query: "lament mourn cry elegy Husayn reward", requiredSubjects: ["lamentation for Husayn"] },
    { role: "gathering", query: "Husayn mourning ceremony memorial service matam", requiredSubjects: ["mourning ceremony for Husayn"] },
    { role: "limitation", query: "impatience wayl beating face chest pulling hair", requiredSubjects: ["impatience and lamentation"] },
  ],
  relation: "legal-status",
  confidence: 0.93,
});
assert.ok(
  tatbir.results.slice(0, 3).some((result) => /patience|impatience|lament|mourning|grief/i.test(`${result.title} ${result.chapter} ${result.text}`)),
  "tatbir must retrieve direct mourning and grief evidence rather than takbir reports",
);
assert.ok(
  !tatbir.results.slice(0, 3).some((result) => /\btakbir\b/i.test(`${result.title} ${result.chapter}`)),
  "tatbir top results must not be takbir chapters",
);
assert.ok(
  tatbir.results.some((result) => /mourning ceremonies|memorial service/i.test(`${result.title} ${result.chapter}`)),
  "tatbir retrieval must retain direct mourning-ceremony evidence so it cannot be confused with a blanket ban on majlis",
);
assert.ok(
  tatbir.results.some((result) => /tore his shirt and hit himself on the head/i.test(result.text)),
  "a physical-mourning evidence role must retrieve the self-directed act instead of an unrelated blow inflicted on someone",
);
const alcohol = await analyzedSearch("can I sell alcohol", {
  retrievalQuery: "sell alcohol wine intoxicant khamr trade purchase legal status",
  exactSubjects: ["selling alcohol"],
  evidenceSubjects: ["selling wine", "trading intoxicants"],
  answerCriteria: ["explicit sale permission or prohibition", "earnings from wine"],
  evidenceQueries: [
    { role: "direct", query: "selling wine trade purchase prohibition", requiredSubjects: ["selling wine"] },
    { role: "earnings", query: "price earnings wine unlawful", requiredSubjects: ["earnings from wine"] },
  ],
  relation: "legal-status",
  confidence: 0.96,
});
assert.ok(
  alcohol.results.slice(0, 5).some((result) => /selling juice and wine|wine|intoxic/i.test(`${result.title} ${result.chapter}`)),
  "alcohol-sale questions must retrieve the corpus's wine-sale reports",
);
const unrelatedSale = resolveLocalConversation("can I sell dates", { messages: [] }, {}, manifest);
assert.doesNotMatch(
  unrelatedSale.searchQuery,
  /wine|alcohol|intoxicant|khamr/i,
  "generic sale questions must not inherit the alcohol vocabulary bridge",
);
const unrelatedWork = resolveLocalConversation("can I work as a bookkeeper", { messages: [] }, {}, manifest);
assert.doesNotMatch(
  unrelatedWork.searchQuery,
  /bathhouse|lime|depilatory|nurah/i,
  "generic work questions must not inherit grooming-provider reports",
);

const syntheticResults = Array.from({ length: 10 }, (_, index) => ({
  id: index,
  title: `Relevant report ${index + 1}`,
  collection: "Test Collection",
  author: "Test Compiler",
  chapter: "Test Chapter",
  link: `https://example.invalid/${index + 1}`,
  text: `A directly relevant published translation ${index + 1}. `.repeat(90),
  evidenceTerms: ["relevant"],
  strategies: ["literal"],
}));
const packed = synthesisMessages("What do these reports establish?", syntheticResults);
const packedReports = (packed[1].content.match(/^REPORT \d+/gm) || []).length;
assert.ok(packedReports >= 5, `context-aware packing should use the available window (${packedReports} reports)`);
assert.ok(packedReports <= 10);

const unsupportedPermission = validateGeneratedReply(
  "Direct answer\n\nZanjeer is not haram and should be regarded as allowed.\n\nEvidence\n\nThe supplied report describes a person experiencing intense grief and sorrow.\n\nLimits of the evidence\n\nThe passage gives no additional details.",
  {
    mode: "synthesis",
    latestUserMessage: "Question: Is zanjeer haram?\n\nRetrieved reports:\nA report describes grief but gives no legal ruling.",
  },
);
assert.equal(unsupportedPermission.ok, false);
assert.equal(unsupportedPermission.reason, "unsupported-legal-verdict");

const cautiousLegalAnswer = validateGeneratedReply(
  "Direct answer\n\nIt cannot be concluded that the act is permissible from these reports.\n\nEvidence\n\nThe supplied report describes grief but contains no legal wording.\n\nLimits of the evidence\n\nA legal verdict would require direct evidence.",
  {
    mode: "synthesis",
    latestUserMessage: "Question: Is the act allowed?\n\nRetrieved reports:\nA report describes grief but gives no legal ruling.",
  },
);
assert.equal(cautiousLegalAnswer.ok, true);

const unsupportedMedicalAdvice = validateGeneratedReply(
  "Direct answer\n\nThere are no instructions for wudhu without consulting a doctor or obtaining medical supervision.\n\nEvidence\n\nThe narration discusses wudhu with a wound.\n\nLimits of the evidence\n\nMedical supervision is therefore required.",
  {
    mode: "synthesis",
    latestUserMessage: "Question: How to do wudhu?\n\nRetrieved reports:\nA report describes washing the face and arms and wiping the head and feet.",
  },
);
assert.equal(unsupportedMedicalAdvice.ok, false);
assert.match(unsupportedMedicalAdvice.reason, /^unsupported-new-concept:/);

console.log("PASS: dynamic routing, fuzzy transliteration, exact-subject gating, book metadata, legal grounding, and prompt budgets");
