import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  applyQueryAnalysisToSearchPlan,
  resolveLocalConversation,
} from "../src/lib/local-conversation.js";
import { cleanCorpusDisplay, cleanCorpusMarkdown } from "../src/lib/corpus-display.js";
import {
  appendHadithOffer,
  biographicalEvidenceSynthesis,
  bookReliabilityEvidenceSynthesis,
  contestedLineageMarriageEvidenceSynthesis,
  conversationMessages,
  definitionEvidenceSynthesis,
  followUpRetrievalSynthesis,
  hajjCompanionshipEvidenceSynthesis,
  importanceEvidenceSynthesis,
  juristAuthorityEvidenceSynthesis,
  legalEvidenceSynthesis,
  lineageMarriageEvidenceSynthesis,
  methodEvidenceSynthesis,
  overlappingMarriageEvidenceSynthesis,
  parseQueryAnalysisJson,
  quranTransmissionEvidenceSynthesis,
  reportedEvidenceSynthesis,
  ritualNullifierEvidenceSynthesis,
  ritualTestimonyEvidenceSynthesis,
  signsEvidenceSynthesis,
  synthesisMessages,
  timeDefinitionEvidenceSynthesis,
  visualDepictionEvidenceSynthesis,
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
const localModelWorkerSource = await readFile(
  new URL("../public/local-llm.worker.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(
  genericRuntimeSources.join("\n"),
  /\b(?:tatbir|tatbeer|zanjeer|zanjir|female\s+wax|sell\s+alcohol|mourningQuestion)\b/i,
  "runtime retrieval and synthesis must not contain topic-specific branches",
);
assert.doesNotMatch(
  localModelWorkerSource.split("self.onmessage")[0],
  /\nensureEngine\(\)\.catch/,
  "the WebGPU model must not allocate itself merely because the page opened",
);
assert.match(
  localModelWorkerSource,
  /data\.type === "configure"[\s\S]+preferSmallModel/,
  "the model worker must accept the mobile-safe model preference before loading",
);
assert.match(
  localModelWorkerSource,
  /data\.type === "cancel"[\s\S]+interruptGenerate/,
  "a timed-out generation must be interruptible instead of blocking later requests",
);
assert.match(
  localModelWorkerSource,
  /storage buffer|gpu buffer|buffer.*allocation/i,
  "WebGPU buffer allocation failures must be classified as recoverable resource failures",
);
assert.match(
  genericRuntimeSources[2],
  /mobileRetrievalOnlyRef[\s\S]+WebGPU generation is disabled/,
  "mobile browsers must keep corpus retrieval available without allocating the WebGPU model",
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

for (const query of [
  "can a syed woman marry a non syed man",
  "syedani ka nikah ghair syed se",
  "does caste or family lineage prevent a marriage",
]) {
  const lineageMarriage = await routedSearch(query);
  assert.equal(lineageMarriage.route.retrievalProfile.facet, "lineage-marriage");
  assert.equal(
    lineageMarriage.route.retrievalProfile.needsQueryAnalysis,
    false,
    "lineage-compatibility questions must stay on the fast deterministic evidence path",
  );
  assert.ok(
    lineageMarriage.results[0]?.link.includes("/5/3/21/1"),
    `lineage marriage must lead with the believer-compatibility precedent; got ${lineageMarriage.results.map(({ link }) => link).join(", ")}`,
  );
  assert.ok(
    hasLink(lineageMarriage.results, "/5/3/22/1") || hasLink(lineageMarriage.results, "/5/3/22/2"),
    "lineage marriage must include the Prophet's marriage of Miqdad and Duba'ah",
  );
  assert.ok(
    hasLink(lineageMarriage.results, "/5/3/25/1"),
    "lineage marriage must retain the stated chaste-and-affluent compatibility criterion",
  );
  assert.match(lineageMarriageEvidenceSynthesis(lineageMarriage.results), /Miqdad|Duba/i);
}

for (const query of [
  "picture of imam for mourning",
  "depictions of the imam for mourning",
  "tasveer e imam azadari mein",
  "can a portrait or depiction be displayed",
]) {
  const depiction = await routedSearch(query);
  assert.equal(depiction.route.retrievalProfile.facet, "visual-depiction");
  assert.equal(depiction.route.retrievalProfile.needsQueryAnalysis, false);
  assert.ok(
    depiction.results.slice(0, 4).some(({ link }) => link.includes("/6/7/65/6")),
    "a depiction query must include the direct picture-on-furnishings report",
  );
  assert.ok(
    hasLink(depiction.results, "/6/7/28/4") && hasLink(depiction.results, "/6/7/28/7"),
    "a display/use query must include both reported furnishing-use precedents",
  );
  assert.ok(
    depiction.results.slice(0, 5).every((result) => /picture|statue|portrait|form(?:s|ed)?/i.test(`${result.title} ${result.chapter} ${result.text}`)),
    "mourning vocabulary must not promote unrelated Karbala-merit or elegy reports into a depiction answer",
  );
}
const depictionSynthesis = visualDepictionEvidenceSynthesis(
  (await routedSearch("picture of imam for mourning")).results,
);
assert.match(depictionSynthesis, /does not identify any portrait as an authentic likeness/i);
assert.match(depictionSynthesis, /does not specifically describe.*mourning procession/i);
assert.doesNotMatch(depictionSynthesis, /therefore.*(?:allowed|forbidden|haram)/i);
assert.doesNotMatch(depictionSynthesis, /interfer(?:e|es|ing).*prayer|you should|I (?:think|believe)/i);

const contestedMarriage = await routedSearch(
  "Imam al Kadhim did not marry his daughters because there was no sayyid suitor",
);
assert.equal(contestedMarriage.route.retrievalProfile.facet, "contested-lineage-marriage");
assert.equal(contestedMarriage.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(
  hasLink(contestedMarriage.results, "/11/2/5/1"),
  "the claim must be tested against Imam al-Kazim's transmitted will",
);
assert.ok(
  hasLink(contestedMarriage.results, "/9/3/105/4"),
  "the response must include Imam al-Sadiq's daughter/Umayyad precedent",
);
assert.ok(
  hasLink(contestedMarriage.results, "/5/3/22/1") || hasLink(contestedMarriage.results, "/5/3/22/2"),
  "the response must retain the Miqdad and Duba'ah precedent",
);
const contestedSynthesis = contestedLineageMarriageEvidenceSynthesis(contestedMarriage.results);
assert.match(contestedSynthesis, /claim.*not stated|claim.*not established/i);
assert.match(contestedSynthesis, /Imam al-Rida|Ali Al-Ridha/i);
assert.match(contestedSynthesis, /Umayyad/i);
assert.match(contestedSynthesis, /Miqdad|Duba/i);
assert.doesNotMatch(contestedSynthesis, /because (?:he was )?imprisoned|because of taqiyyah/i);

for (const query of [
  "if a woman in a mutah is married nikah what to do",
  "woman already in muta then her family marries her to another husband",
  "what if she is still in temporary marriage but a second nikah is done",
]) {
  const overlappingMarriage = await routedSearch(query);
  assert.equal(overlappingMarriage.route.retrievalProfile.facet, "overlapping-marriage-contracts");
  assert.equal(overlappingMarriage.route.retrievalProfile.needsQueryAnalysis, false);
  assert.ok(
    overlappingMarriage.results[0]?.link.includes("/5/3/111/6"),
    `an overlapping marriage-contract question must lead with the matching case; got ${overlappingMarriage.results.map(({ link }) => link).join(", ")}`,
  );
  assert.ok(
    hasLink(overlappingMarriage.results, "/5/3/105/5"),
    "the evidence must include the reverse case of entering mut'ah while a husband remains",
  );
  assert.ok(
    hasLink(overlappingMarriage.results, "/5/3/104/1"),
    "the evidence must contrast a second marriage after the mut'ah term expires",
  );
}
const overlappingMarriageAnswer = overlappingMarriageEvidenceSynthesis(
  (await routedSearch("if a woman in a mutah is married nikah what to do")).results,
);
assert.match(overlappingMarriageAnswer, /without (?:the woman's|her) permission/i);
assert.match(overlappingMarriageAnswer, /waiting period/i);
assert.match(overlappingMarriageAnswer, /newly solemnized|all over again/i);
assert.match(overlappingMarriageAnswer, /materially different case/i);

const religiousFragment = resolveLocalConversation(
  "Islam in contemporary visual culture and community traditions",
  { messages: [] },
  {},
  manifest,
);
assert.equal(religiousFragment.intent, "local-llm");
assert.equal(religiousFragment.offerHadith, true);
assert.match(
  conversationMessages("Islam in contemporary visual culture and community traditions", [], "english", {}, true)[0].content,
  /do not supply a personal opinion|do not infer an answer/i,
);
assert.equal(
  appendHadithOffer("That is a religious topic.", true),
  "That is a religious topic.\n\nWould you like ahadith on the matter?",
);

const ridaMartyrdom = await routedSearch("Can you inform me about the event of the martyrdom of imam rida");
assert.equal(ridaMartyrdom.route.retrievalProfile.facet, "biographical-event");
assert.equal(
  ridaMartyrdom.route.retrievalProfile.needsQueryAnalysis,
  false,
  "a plainly stated martyrdom question must stay on the fast deterministic retrieval path",
);
assert.ok(
  ridaMartyrdom.results.slice(0, 8).some(({ link }) => link.includes("/12/1/33/1")),
  `Imam al-Rida's martyrdom must include Abu Salt's direct poisoned-grapes account from Uyun; got ${ridaMartyrdom.results.map(({ link }) => link).join(", ")}`,
);
assert.ok(
  ["/12/1/31/1", "/12/1/32/1", "/12/1/34/1"].filter((link) => hasLink(ridaMartyrdom.results, link)).length >= 2,
  "the martyrdom event must include multiple direct Uyun report families when available",
);

const terseRidaMartyrdom = resolveLocalConversation("martyrdom imam rida", { messages: [] }, {}, manifest);
assert.equal(terseRidaMartyrdom.retrievalProfile.facet, "biographical-event");
assert.equal(terseRidaMartyrdom.retrievalProfile.needsQueryAnalysis, false);

const elegyReports = await routedSearch("what has been said regarding reciting elegies of karbala");
assert.equal(elegyReports.route.retrievalProfile.facet, "reported-evidence");
assert.equal(
  elegyReports.route.retrievalProfile.needsQueryAnalysis,
  false,
  "a direct request for narrated evidence must remain on the fast deterministic path",
);
assert.ok(
  elegyReports.results.slice(0, 4).some(({ link }) => link.includes("/24/2/33/1")),
  `an elegy query must lead with the report where the Imam requests the grief-stricken recitation and asks for more; got ${elegyReports.results.map(({ link }) => link).join(", ")}`,
);
assert.ok(
  ["/29/1/29/6", "/8/1/263/1", "/23/2/146/", "/12/1/36/34", "/24/2/29/2", "/24/2/29/10"]
    .filter((link) => hasLink(elegyReports.results, link)).length >= 2,
  "the exact scene report must be accompanied by other directly relevant elegy report families",
);
assert.ok(
  !hasLink(elegyReports.results, "/12/1/13/1") && !hasLink(elegyReports.results, "/24/2/72/8"),
  "generic poetry and Qur'an recitation reports must not leak into a Karbala elegy answer",
);
const elegySynthesis = reportedEvidenceSynthesis(elegyReports.results);
assert.match(elegySynthesis, /recite (?:a )?poem|recite \[an elegy\]/i);
assert.match(elegySynthesis, /cried|wept/i);
assert.doesNotMatch(elegySynthesis, /Qul Huwa Allah|fifteenth of Sha/i);

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

const fajr = await routedSearch("what time should I pray fajr");
assert.equal(fajr.route.retrievalProfile.facet, "time-definition");
assert.equal(
  fajr.route.retrievalProfile.needsQueryAnalysis,
  false,
  "time questions must expand their matching corpus chapter without waiting for the model",
);
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
assert.match(
  legalEvidenceSynthesis(novelPracticalEvidence.results),
  /no broader yes-or-no ruling has been added/i,
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

const shrimp = await routedSearch("is shrimp halal");
assert.equal(shrimp.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(
  shrimp.results[0]?.link.includes("/6/3/12/5"),
  "a short corpus-anchored food question must take the fast path to the direct shrimp report",
);

const signs = await routedSearch("gimme all the signs of the reappearance");
assert.equal(signs.route.retrievalProfile.facet, "signs-events");
assert.equal(signs.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(hasLink(signs.results, "/8/1/483/1"), "the signs answer must include the five-sign report");
assert.ok(
  new Set(signs.results.map((result) => result.evidenceRole).filter((role) => role && role !== "direct")).size >= 4,
  "an exhaustive signs request must cover distinct evidence roles instead of one long report",
);
assert.doesNotMatch(signsEvidenceSynthesis(signs.results), /keep calm|you should/i);
const signsFollowUp = resolveLocalConversation(
  "is that all of them",
  { messages: [{ role: "user", text: "gimme all the signs of the reappearance" }, { role: "assistant", results: signs.results }] },
  {},
  manifest,
);
assert.equal(signsFollowUp.retrievalProfile.facet, "signs-events");
assert.equal(signsFollowUp.retrievalProfile.exhaustive, true);
assert.equal(signsFollowUp.retrievalProfile.followUpMode, "exhaustive-check");
assert.ok(signsFollowUp.retrievalProfile.excludeResultKeys.includes(String(signs.results[0].link)));
assert.match(signsFollowUp.synthesisQuery, /signs of the reappearance.*is that all/i);
const signsContinuation = await search(signsFollowUp.searchQuery, {
  resultLimit: signsFollowUp.retrievalProfile.resultLimit,
  retrievalProfile: signsFollowUp.retrievalProfile,
});
const initialSignKeys = new Set(signs.results.flatMap((result) => [
  result.link,
  String(result.id),
  String(result.clusterId || ""),
]));
assert.ok(
  signsContinuation.results.every((result) => ![
    result.link,
    String(result.id),
    String(result.clusterId || ""),
  ].some((key) => key && initialSignKeys.has(key))),
  "an exhaustive follow-up must not repeat a displayed report or parallel family",
);
assert.ok(
  !hasLink(signsContinuation.results, "/24/2/71/1"),
  "an Ashura ziyara report must not satisfy a compound Qaim-on-Ashura evidence lane",
);
for (const followUp of ["that's it?", "are there any more?", "is this everything?", "only those?"]) {
  const continued = resolveLocalConversation(
    followUp,
    { messages: [{ role: "user", text: "gimme all the signs of the reappearance" }, { role: "assistant", text: "Earlier results" }] },
    {},
    manifest,
  );
  assert.equal(continued.retrievalProfile.facet, "signs-events", `${followUp} must retain the religious subject`);
  assert.equal(continued.retrievalProfile.exhaustive, true, `${followUp} must request exhaustive retrieval`);
}

const bookAssessment = await routedSearch("how good is kitab sulaymn");
assert.equal(bookAssessment.route.retrievalProfile.facet, "book-reliability");
assert.equal(bookAssessment.route.retrievalProfile.evidenceOnly, true);
assert.ok(hasLink(bookAssessment.results, "/27/1/30/11"));
assert.ok(hasLink(bookAssessment.results, "/22/2/4/8"));
assert.ok(hasLink(bookAssessment.results, "/22/2/4/30"));
assert.equal(bookAssessment.results.length, 3);
assert.deepEqual(
  bookAssessment.results.map((result) => result.evidenceRole),
  ["transmitted-validation", "corpus-transmission", "source-reception"],
);
assert.ok(!hasLink(bookAssessment.results, "/31/1/1/2"), "book assessment must not append unrelated direct results");
const bookAssessmentAnswer = bookReliabilityEvidenceSynthesis(bookAssessment.results);
assert.match(bookAssessmentAnswer, /Sulaym has said the truth|confirms the truth of the particular will/i);
assert.match(bookAssessmentAnswer, /particular transmission.*not an explicit blanket/is);
assert.match(bookAssessmentAnswer, /compiler commentary/i);
assert.match(bookAssessmentAnswer, /important, relied-upon Shia source/i);
const misspelledBookAssessment = resolveLocalConversation("how authntic is kitab sulaymn ibn qays", { messages: [] }, {}, manifest);
assert.equal(misspelledBookAssessment.retrievalProfile.facet, "book-reliability");
const bookPraiseFollowUp = resolveLocalConversation(
  "is that all of the hadith?",
  { messages: [{ role: "user", text: "how reliable is kitab sulaymn ibn qays" }, { role: "assistant", text: "Earlier results" }] },
  {},
  manifest,
);
assert.equal(bookPraiseFollowUp.retrievalProfile.facet, "book-reliability");
assert.equal(bookPraiseFollowUp.retrievalProfile.exhaustive, true);
assert.equal(bookPraiseFollowUp.retrievalProfile.followUpMode, "exhaustive-check");
assert.match(followUpRetrievalSynthesis("exhaustive-check", 0, 0), /^Yes\./);
assert.match(followUpRetrievalSynthesis("exhaustive-check", 2, 2), /^No\./);
assert.match(followUpRetrievalSynthesis("more", 0, 0), /earlier set was all/i);
for (const followUp of [
  "gimme more ahadith on the matter",
  "give me more reports on this",
  "more ahadith",
  "show me the rest",
]) {
  const continued = resolveLocalConversation(
    followUp,
    { messages: [{ role: "user", text: "how good is kitab sulaymn" }, { role: "assistant", results: bookAssessment.results }] },
    {},
    manifest,
  );
  assert.equal(continued.retrievalProfile.followUpMode, "more", `${followUp} must request unseen reports`);
  assert.equal(continued.retrievalProfile.facet, "book-reliability", `${followUp} must retain the book subject`);
  assert.equal(continued.searchQuery, bookAssessment.route.searchQuery, `${followUp} must not pollute the retrieval query`);
}

const womanHajj = await routedSearch("can a woman perform hajj alone");
assert.equal(womanHajj.route.retrievalProfile.facet, "hajj-companionship");
assert.equal(womanHajj.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(hasLink(womanHajj.results, "/4/3/44/4"));
assert.ok(hasLink(womanHajj.results, "/4/3/44/5"));
assert.doesNotMatch(
  womanHajj.results.slice(0, 3).map((result) => result.chapter).join(" "),
  /Ifrad|Qiran|Tamattu/i,
);
assert.match(hajjCompanionshipEvidenceSynthesis(womanHajj.results), /safe.*trustworthy|trustworthy.*safe/is);
const colloquialWomanHajj = await routedSearch("what did imam say about a woman doing hajj with trusty people");
assert.equal(colloquialWomanHajj.route.retrievalProfile.facet, "hajj-companionship");
assert.ok(hasLink(colloquialWomanHajj.results, "/4/3/44/5"));

const bandagedWudu = await routedSearch("how do i do wuzu if i got a bandage on my arm");
assert.equal(bandagedWudu.route.retrievalProfile.facet, "method");
assert.ok(hasLink(bandagedWudu.results, "/3/1/21/1") || hasLink(bandagedWudu.results, "/3/1/21/2"));
assert.doesNotMatch(
  bandagedWudu.results.map((result) => result.chapter).join(" "),
  /Description of Wudu before Eating Food/i,
);

const thirdTestimony = await routedSearch("can you recite shahadat as salisah in tashahhud");
assert.equal(thirdTestimony.route.retrievalProfile.facet, "ritual-testimony");
assert.equal(thirdTestimony.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(hasLink(thirdTestimony.results, "/3/4/30/2"));
assert.ok(hasLink(thirdTestimony.results, "/3/4/30/3"));
assert.ok(hasLink(thirdTestimony.results, "/3/4/30/6"));
assert.ok(hasLink(thirdTestimony.results, "/3/4/100/1"));
assert.ok(hasLink(thirdTestimony.results, "/1/4/107/4"));
assert.ok(hasLink(thirdTestimony.results, "/1/4/111/8"));
assert.ok(hasLink(thirdTestimony.results, "/29/1/95/14"));
const thirdTestimonyAnswer = ritualTestimonyEvidenceSynthesis(thirdTestimony.results);
assert.match(thirdTestimonyAnswer, /In the name of Allah, with Allah/i);
assert.match(thirdTestimonyAnswer, /tawhid, risalah, and Ali's authority together/i);
assert.match(thirdTestimonyAnswer, /outside this ritual passage.*not be misquoted/is);

const windInPrayer = await routedSearch("wind during salah");
assert.equal(windInPrayer.route.retrievalProfile.facet, "ritual-nullifier");
assert.equal(windInPrayer.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(hasLink(windInPrayer.results, "/29/1/93/12"));
assert.ok(hasLink(windInPrayer.results, "/3/4/40/3"));
assert.ok(!hasLink(windInPrayer.results, "/29/1/86/15"), "generic hearing and smell reports must not impersonate the wind-doubt criterion");
const windAnswer = ritualNullifierEvidenceSynthesis(windInPrayer.results);
assert.match(windAnswer, /Actual emission invalidates wudu/i);
assert.match(windAnswer, /certainty.*doubt/is);
assert.match(windAnswer, /exact 'hear a sound or detect an odor' wording is not present/i);
assert.doesNotMatch(
  windInPrayer.results.slice(0, 2).map((result) => `${result.chapter} ${result.text}`).join(" "),
  /tree.*wind|wind.*tree|weather/i,
);

const quranTransmission = await routedSearch("was there tahreef of the quran");
assert.equal(quranTransmission.route.retrievalProfile.facet, "quran-transmission");
assert.equal(quranTransmission.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(hasLink(quranTransmission.results, "/2/3/14/28"));
assert.ok(hasLink(quranTransmission.results, "/1/4/35/1"));
assert.ok(hasLink(quranTransmission.results, "/1/4/40/1"));
const quranTransmissionAnswer = quranTransmissionEvidenceSynthesis(quranTransmission.results);
assert.match(quranTransmissionAnswer, /seventeen thousand verses/i);
assert.match(quranTransmissionAnswer, /Mushaf Fāṭimah therefore cannot be presented.*removed/is);
assert.match(quranTransmissionAnswer, /do not.*formulate.*nothing was added/is);

const juristAuthority = await routedSearch("what about wilayat al faqih");
assert.equal(juristAuthority.route.retrievalProfile.facet, "jurist-authority");
assert.equal(juristAuthority.route.retrievalProfile.needsQueryAnalysis, false);
assert.ok(
  hasLink(juristAuthority.results, "/1/2/21/10") || hasLink(juristAuthority.results, "/7/6/8/5"),
  "jurist authority must include the Umar ibn Hanzala dispute-adjudication report",
);
assert.ok(hasLink(juristAuthority.results, "/7/6/8/4"));
assert.ok(hasLink(juristAuthority.results, "/27/1/37/3"));
assert.ok(hasLink(juristAuthority.results, "/1/2/19/1"));
const juristAuthorityAnswer = juristAuthorityEvidenceSynthesis(juristAuthority.results);
assert.match(juristAuthorityAnswer, /disputes and adjudication/i);
assert.match(juristAuthorityAnswer, /not interchangeable propositions/i);
assert.match(juristAuthorityAnswer, /mixed truth and falsehood/i);
assert.doesNotMatch(juristAuthorityAnswer, /therefore.*(?:true|false|haram|invalid)/i);

const narratorSovereignty = resolveLocalConversation(
  "does the narrators are my proof report mean total political sovereignty",
  { messages: [] },
  {},
  manifest,
);
assert.equal(narratorSovereignty.retrievalProfile.facet, "jurist-authority");

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
