import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  expandRelatedCandidates,
  rankPassageCandidates,
  rerankLoadedRecords,
} from "../public/hadith-retrieval-core.mjs";

const DATA_ROOT = join(import.meta.dirname, "..", "public", "hadith-data");

async function readTypedArray(filename, Type) {
  const file = await readFile(join(DATA_ROOT, filename));
  return new Type(file.buffer, file.byteOffset, file.byteLength / Type.BYTES_PER_ELEMENT);
}

const [manifest, passageHashes, passageWeights, passageDocuments, passageLengths] = await Promise.all([
  readFile(join(DATA_ROOT, "manifest.json"), "utf8").then(JSON.parse),
  readTypedArray("passage-hashes.bin", Uint32Array),
  readTypedArray("passage-weights.bin", Uint8Array),
  readTypedArray("passage-documents.bin", Uint16Array),
  readTypedArray("passage-lengths.bin", Uint8Array),
]);

const loadedShards = new Map();

function parseCorpusChapter(link = "") {
  const match = String(link).match(/\/hadith\/(\d+)\/(\d+)\/(\d+)\/(\d+)/);
  return match ? { volumeKey: `${match[1]}/${match[2]}`, chapter: Number(match[3]) } : null;
}

const chapterDocuments = (() => {
  const byVolume = new Map();
  for (let id = 0; id < manifest.metadata.length; id += 1) {
    const location = parseCorpusChapter(manifest.metadata[id]?.[7]);
    if (!location) continue;
    const chapters = byVolume.get(location.volumeKey) || new Map();
    const documents = chapters.get(location.chapter) || [];
    documents.push(id);
    chapters.set(location.chapter, documents);
    byVolume.set(location.volumeKey, chapters);
  }
  return byVolume;
})();

function methodActionScore(result = {}) {
  return (`${result.title || ""} ${result.chapter || ""} ${result.text || ""}`
    .match(/\b(?:demonstrat|description|procedure|first|then|wash(?:ed|ing)?|wipe(?:d|s)?|slaughter(?:ed|ing)?|shav(?:e|ed|ing)|name(?:d|ing)?)\b/gi) || []).length;
}

function hasDirectMethodInstruction(results = []) {
  return results.slice(0, 1).some((result) => methodActionScore(result) > 0);
}

function foldTransliteration(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/ee/g, "i")
    .replace(/([aeiou])\1+/g, "$1")
    .replace(/ou/g, "u")
    .replace(/(?:dh|th|zh|kh|gh)/g, (pair) => pair[0])
    .replace(/q/g, "k")
    .replace(/h$/g, "");
}

function transliterationSkeleton(value = "") {
  return foldTransliteration(value).replace(/[aeiou]+/g, "");
}

function hasMethodSubject(result, terms = []) {
  if (!terms.length) return true;
  const tokens = `${result?.title || ""} ${result?.chapter || ""} ${result?.text || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4);
  return terms.some((term) => {
    const normalized = String(term).toLowerCase();
    const folded = foldTransliteration(normalized);
    const skeleton = transliterationSkeleton(normalized);
    return tokens.some((token) => token.includes(normalized)
      || (folded.length >= 4 && foldTransliteration(token) === folded)
      || (skeleton.length >= 3 && transliterationSkeleton(token) === skeleton));
  });
}

function neighbouringMethodCandidates(seedResults, candidates) {
  const existing = new Set(candidates.map((candidate) => candidate.id));
  const topScore = candidates[0]?.candidateScore || 1;
  const related = [];
  for (const seed of seedResults.slice(0, 2)) {
    const location = parseCorpusChapter(seed.link);
    const chapters = location && chapterDocuments.get(location.volumeKey);
    if (!chapters) continue;
    for (const offset of [-1, 1, -2, 2, -3, 3, -4, 4]) {
      for (const id of chapters.get(location.chapter + offset) || []) {
        if (existing.has(id)) continue;
        existing.add(id);
        related.push({
          id, passageId: -1, passageScore: 0, supportingPassageScore: 0, phraseMatches: 0, crossLanguageMatches: 0,
          candidateScore: topScore * (1.12 - Math.abs(offset) * 0.08),
          relationScore: 0.72 - Math.abs(offset) * 0.05,
          relationTo: seed.id, familyRoot: seed.id, familyDepth: 1, familyScore: 0.72 - Math.abs(offset) * 0.05,
        });
      }
    }
  }
  return related.slice(0, 48);
}

async function loadShard(shard) {
  if (!loadedShards.has(shard)) {
    const filename = `${String(shard).padStart(3, "0")}.json`;
    const payload = JSON.parse(await readFile(join(DATA_ROOT, "shards", filename), "utf8"));
    loadedShards.set(shard, payload);
  }
  return loadedShards.get(shard);
}

async function loadCandidateRecords(candidates) {
  const wanted = new Set(candidates.map(({ id }) => id));
  const shards = [...new Set(candidates.map(({ id }) => manifest.metadata[id][6]))];
  const records = new Map();
  for (const shard of shards) {
    for (const [documentId, text] of await loadShard(shard)) {
      if (wanted.has(documentId)) records.set(documentId, text);
    }
  }
  return records;
}

async function search(query, { resultLimit = 5, filters, retrievalProfile } = {}) {
  const { plan, candidates } = rankPassageCandidates({
    manifest,
    passageHashes,
    passageWeights,
    passageDocuments,
    passageLengths,
    query,
    filters,
    retrievalProfile,
    limit: 240,
  });
  const directRecords = await loadCandidateRecords(candidates);
  const seeds = rerankLoadedRecords({
    manifest,
    plan,
    candidates,
    records: directRecords,
    resultLimit: 8,
  }).slice(0, 4);
  const methodNeighbours = retrievalProfile?.facet === "method"
    && retrievalProfile?.expandMethodContext
    ? neighbouringMethodCandidates(seeds, candidates)
    : [];
  const expandedCandidates = expandRelatedCandidates({
    manifest,
    candidates: [...candidates, ...methodNeighbours],
    seedResults: seeds,
    filters,
    limit: 320,
    perSeed: 18,
  });
  const records = await loadCandidateRecords(expandedCandidates);
  let results = rerankLoadedRecords({
    manifest,
    plan,
    candidates: expandedCandidates,
    records,
    resultLimit,
  }).map((result) => ({ ...result, evidenceRole: "direct" }));
  if (retrievalProfile?.expandMethodContext) {
    const procedureCandidates = expandedCandidates
      .filter((candidate) => hasMethodSubject({ text: records.get(candidate.id) || "" }, retrievalProfile?.methodSubjectTerms)
        && methodActionScore({ text: records.get(candidate.id) || "" }) > 0)
      .sort((left, right) => methodActionScore({ text: records.get(right.id) || "" }) - methodActionScore({ text: records.get(left.id) || "" })
        || right.candidateScore - left.candidateScore)
      .slice(0, 48);
    const contextualProcedureResults = procedureCandidates
      .slice(0, 12)
      .flatMap((candidate) => rerankLoadedRecords({
        manifest,
        plan,
        candidates: [candidate],
        records,
        resultLimit: 1,
      }))
      .filter((result) => hasDirectMethodInstruction([result])
        && hasMethodSubject(result, retrievalProfile?.methodSubjectTerms))
      .sort((left, right) => methodActionScore(right) - methodActionScore(left) || right.score - left.score)
      .map((result) => ({ ...result, evidenceRole: "procedure-context" }));
    if (contextualProcedureResults.length) {
      const seenContext = new Set();
      results = [...contextualProcedureResults, ...results.filter((result) => hasMethodSubject(result, retrievalProfile?.methodSubjectTerms))].filter((result) => {
        const key = result.link || result.id;
        if (seenContext.has(key)) return false;
        seenContext.add(key);
        return true;
      }).slice(0, resultLimit);
    }
  }
  const secondaryQueries = [
    ...(Array.isArray(retrievalProfile?.secondaryQueries) ? retrievalProfile.secondaryQueries : []),
    ...(retrievalProfile?.secondaryQuery ? [retrievalProfile.secondaryQuery] : []),
  ].filter((query, index, all) => query && all.indexOf(query) === index);
  const isTimingEvidence = retrievalProfile?.facet === "time-definition";
  if (secondaryQueries.length) {
    const supplementalBuckets = [];
    for (let queryIndex = 0; queryIndex < secondaryQueries.length; queryIndex += 1) {
      const secondaryQuery = secondaryQueries[queryIndex];
      const evidenceRole = retrievalProfile?.evidenceRoles?.[queryIndex] || "supporting";
      const requiredSubjects = retrievalProfile?.evidenceQuerySubjects?.[queryIndex] || [];
      const secondary = await search(secondaryQuery, {
      resultLimit: isTimingEvidence ? 8 : 5,
      filters,
      retrievalProfile: {
        ...retrievalProfile,
        secondaryQuery: "",
        secondaryQueries: [],
        boostTerms: isTimingEvidence ? [] : secondaryQuery.split(/\s+/).filter(Boolean),
        requireSubjectMatch: isTimingEvidence ? false : true,
        subjectTermGroups: isTimingEvidence ? [] : (requiredSubjects.length ? requiredSubjects : [secondaryQuery]),
        minimumSubjectCoverage: 0.5,
        requireFocusCoverage: isTimingEvidence ? false : true,
        minimumFocusCoverage: 0.34,
        disableFocus: false,
        requireFocusFacetProximity: false,
        rewritten: true,
        relaxed: true,
      },
      });
      supplementalBuckets.push(secondary.results.map((result) => ({ ...result, evidenceRole })));
    }
    const supplementalResults = [];
    const maxBucketLength = Math.max(0, ...supplementalBuckets.map((bucket) => bucket.length));
    for (let index = 0; index < maxBucketLength; index += 1) {
      for (const bucket of supplementalBuckets) {
        if (bucket[index]) supplementalResults.push(bucket[index]);
      }
    }
    const seenSupplemental = new Set();
    const promotedSupplemental = supplementalResults.filter((result) => {
      const key = result.link || result.id;
      if (seenSupplemental.has(key)) return false;
      seenSupplemental.add(key);
      return true;
    }).slice(0, Math.max(1, Math.min(isTimingEvidence ? 8 : 6, Number(retrievalProfile?.secondaryPromotionLimit) || 3)));
    const promotedKeys = new Set(promotedSupplemental.map((result) => result.link || result.id));
    results = [
      ...promotedSupplemental,
      ...results.filter((result) => !promotedKeys.has(result.link || result.id)),
    ].slice(0, resultLimit);
  }
  return { candidates, expandedCandidates, results };
}

const REGRESSIONS = [
  {
    name: "direct ablution ruling",
    query: "if a dog fell in a well can I do wudhu from it",
    links: ["/3/1/4/6"],
    requiredLinks: ["/3/1/4/6", "/3/1/4/3"],
    forbiddenLinks: ["/6/5/14/3"],
    maximumRank: 1,
    minimumResults: 2,
  },
  {
    name: "prayer demonstration",
    query: "how do i pray",
    links: ["/3/4/20/8", "/29/1/64/13"],
    requiredLinks: ["/3/4/20/8", "/29/1/64/13"],
    maximumRank: 3,
    minimumResults: 2,
  },
  {
    name: "early salam in isha",
    query: "I accidentally prayed only two rakat of isha, what should I do?",
    links: ["/3/4/42/1", "/3/4/42/6"],
    maximumRank: 5,
    minimumResults: 1,
  },
  {
    name: "appearance of Imam al-Mahdi",
    query: "what does Imam Mahdi look like, was his hair curly?",
    links: ["/27/1/35/8", "/22/2/18/14"],
    maximumRank: 5,
    minimumResults: 1,
  },
];

const argumentsWithoutFlags = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const assertionMode = process.argv.includes("--assert");
const queries = argumentsWithoutFlags.length
  ? argumentsWithoutFlags.map((query) => ({ query }))
  : assertionMode ? REGRESSIONS : [];

let failed = false;
for (const fixture of queries) {
  const { candidates, expandedCandidates, results } = await search(fixture.query);
  console.log(`\nQUERY: ${fixture.query}`);
  console.log(`Direct candidates: ${candidates.length}; expanded candidates: ${expandedCandidates.length}`);
  results.forEach((result, index) => {
    console.log(
      `${String(index + 1).padStart(2, "0")}  ${(result.score * 100).toFixed(1)}%  `
      + `${result.strategies.join(",")}  ${result.link}  ${result.title}`,
    );
  });

  if (assertionMode && fixture.links) {
    const rank = results.findIndex((result) => fixture.links.some((link) => result.link.includes(link))) + 1;
    if (!rank || rank > fixture.maximumRank) {
      failed = true;
      console.error(
        `FAIL: ${fixture.name} expected ${fixture.links.join(" or ")} `
        + `within rank ${fixture.maximumRank}; observed ${rank || "not returned"}.`,
      );
    } else if (results.length < (fixture.minimumResults || 1)) {
      failed = true;
      console.error(`FAIL: ${fixture.name} returned only ${results.length} result(s).`);
    } else {
      const missingRequired = (fixture.requiredLinks || [])
        .filter((link) => !results.some((result) => result.link.includes(link)));
      const returnedForbidden = (fixture.forbiddenLinks || [])
        .filter((link) => results.some((result) => result.link.includes(link)));
      if (missingRequired.length) {
        failed = true;
        console.error(`FAIL: ${fixture.name} omitted required reports: ${missingRequired.join(", ")}.`);
      } else if (returnedForbidden.length) {
        failed = true;
        console.error(`FAIL: ${fixture.name} returned known off-topic reports: ${returnedForbidden.join(", ")}.`);
      } else {
        console.log(`PASS: ${fixture.name} (rank ${rank}; ${results.length} result(s))`);
      }
    }
  }
}

if (failed) process.exitCode = 1;

export { search };
