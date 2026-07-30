import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { resolveLocalConversation } from "../src/lib/local-conversation.js";
import { synthesisMessages } from "../src/lib/local-model-prompts.js";
import { resolveQueryTokens } from "../public/hadith-retrieval-core.mjs";
import { validateGeneratedReply } from "../public/local-output-guard.mjs";
import { search } from "./test-hadith-search.mjs";

const manifest = JSON.parse(await readFile(
  new URL("../public/hadith-data/manifest.json", import.meta.url),
  "utf8",
));

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

const aqiqah = await routedSearch("find ahadith on aqeeqah");
assert.ok(hasLink(aqiqah.results, "/6/1/16/") || hasLink(aqiqah.results, "/6/1/17/"));

const wudu = await routedSearch("how to do wudhu");
assert.ok(wudu.results.length > 0);
assert.ok(
  wudu.results.length === 2
    && wudu.results.every((result) => /description of wudu/i.test(`${result.title} ${result.chapter}`)),
  "a misspelled how-to question must rank direct descriptions of wudu first",
);

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

for (const query of ["is zanjeer haram", "what is ruh al quddus", "zikre aliyun ibadah"]) {
  const unresolved = await routedSearch(query);
  assert.equal(
    unresolved.results.length,
    0,
    `${query} must request a constrained rewrite instead of displaying loosely related reports`,
  );
}

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
