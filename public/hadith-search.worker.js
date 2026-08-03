// import {
//   normalizeText,
//   rankPassageCandidates,
//   rerankLoadedRecords,
// } from "./hadith-retrieval-core.mjs";

// /* Al-Faqih local passage search worker. All retrieval runs in the browser. */

// const DB_NAME = "al-faqih-local";
// const DB_VERSION = 1;
// const STORE = "assets";

// let manifest;
// let passageHashes;
// let passageWeights;
// let passageDocuments;
// let passageLengths;
// let databasePromise;
// let initializationPromise;
// let ready = false;
// const loadedShards = new Map();

// function openDatabase() {
//   if (databasePromise) return databasePromise;
//   databasePromise = new Promise((resolve, reject) => {
//     const request = indexedDB.open(DB_NAME, DB_VERSION);
//     request.onupgradeneeded = () => {
//       if (!request.result.objectStoreNames.contains(STORE)) {
//         request.result.createObjectStore(STORE);
//       }
//     };
//     request.onsuccess = () => resolve(request.result);
//     request.onerror = () => reject(request.error);
//   });
//   return databasePromise;
// }

// async function readStored(key) {
//   const database = await openDatabase();
//   return new Promise((resolve, reject) => {
//     const transaction = database.transaction(STORE, "readonly");
//     const request = transaction.objectStore(STORE).get(key);
//     request.onsuccess = () => resolve(request.result);
//     request.onerror = () => reject(request.error);
//   });
// }

// async function writeStored(key, value) {
//   const database = await openDatabase();
//   return new Promise((resolve, reject) => {
//     const transaction = database.transaction(STORE, "readwrite");
//     transaction.objectStore(STORE).put(value, key);
//     transaction.oncomplete = resolve;
//     transaction.onerror = () => reject(transaction.error);
//   });
// }

// async function fetchAndStore(key, path, format = "arrayBuffer") {
//   let stored;
//   try {
//     stored = await readStored(key);
//   } catch {
//     stored = undefined;
//   }
//   if (stored !== undefined) return stored;
//   const response = await fetch(path);
//   if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
//   const value = await response[format]();
//   writeStored(key, value).catch(() => {});
//   return value;
// }

// function resolveFilter(value, options) {
//   const needle = normalizeText(value);
//   if (!needle) return "";
//   return options.find((option) => normalizeText(option).includes(needle)) || "";
// }

// function parseInlineFilters(query, suppliedFilters = {}) {
//   const filters = {
//     collection: suppliedFilters.collection || "",
//     author: suppliedFilters.author || "",
//     imam: suppliedFilters.imam ?? "",
//   };
//   let cleanQuery = String(query || "");
//   const pattern = /\b(book|author|imam)\s*:\s*(?:"([^"]+)"|'([^']+)'|([^\s]+))/giu;
//   cleanQuery = cleanQuery.replace(pattern, (clause, field, doubleQuoted, singleQuoted, bare) => {
//     const value = doubleQuoted || singleQuoted || bare || "";
//     if (field.toLowerCase() === "book") {
//       const resolved = resolveFilter(value, manifest.strings.collections);
//       if (resolved) filters.collection = resolved;
//     } else if (field.toLowerCase() === "author") {
//       const resolved = resolveFilter(value, manifest.strings.authors);
//       if (resolved) filters.author = resolved;
//     } else {
//       const resolvedIndex = manifest.imams.findIndex((imam) => normalizeText(imam).includes(normalizeText(value)));
//       if (resolvedIndex >= 0) filters.imam = String(resolvedIndex);
//     }
//     return " ";
//   });
//   cleanQuery = cleanQuery.replace(/\s+/g, " ").trim() || String(query || "").trim();
//   return { cleanQuery, filters };
// }

// function readyManifest() {
//   return {
//     version: manifest.version,
//     documentCount: manifest.documentCount,
//     shardCount: manifest.shardCount,
//     collections: manifest.strings.collections,
//     authors: manifest.strings.authors,
//     imams: manifest.imams,
//     mode: "hybrid",
//   };
// }

// function postReady() {
//   self.postMessage({ type: "ready", manifest: readyManifest() });
// }

// async function loadManifest() {
//   let latestManifest;
//   try {
//     const response = await fetch("/hadith-data/manifest.json", { cache: "no-cache" });
//     if (!response.ok) throw new Error("Manifest request failed");
//     latestManifest = await response.json();
//     writeStored("manifest-current", latestManifest).catch(() => {});
//   } catch {
//     latestManifest = await readStored("manifest-current");
//   }
//   if (!latestManifest) throw new Error("The local corpus has not been installed yet.");
//   if (!latestManifest.passageCount || !latestManifest.passageSlots) {
//     throw new Error("The local corpus index is out of date. Rebuild the hadith index and reload.");
//   }
//   return latestManifest;
// }

// async function initialize() {
//   if (ready) {
//     postReady();
//     return;
//   }
//   if (initializationPromise) return initializationPromise;

//   initializationPromise = (async () => {
//     self.postMessage({ type: "status", message: "Loading corpus catalog" });
//     manifest = await loadManifest();
//     const prefix = manifest.version;
//     self.postMessage({ type: "status", message: "Loading passage retrieval index" });
//     const [hashBuffer, weightBuffer, documentBuffer, lengthBuffer] = await Promise.all([
//       fetchAndStore(`${prefix}:passage-hashes`, "/hadith-data/passage-hashes.bin"),
//       fetchAndStore(`${prefix}:passage-weights`, "/hadith-data/passage-weights.bin"),
//       fetchAndStore(`${prefix}:passage-documents`, "/hadith-data/passage-documents.bin"),
//       fetchAndStore(`${prefix}:passage-lengths`, "/hadith-data/passage-lengths.bin"),
//     ]);
//     passageHashes = new Uint32Array(hashBuffer);
//     passageWeights = new Uint8Array(weightBuffer);
//     passageDocuments = new Uint16Array(documentBuffer);
//     passageLengths = new Uint8Array(lengthBuffer);
//     if (
//       passageHashes.length !== manifest.passageCount * manifest.passageSlots
//       || passageWeights.length !== manifest.passageCount * manifest.passageSlots
//       || passageDocuments.length !== manifest.passageCount
//       || passageLengths.length !== manifest.passageCount
//     ) {
//       throw new Error("The local passage index is incomplete. Rebuild it and reload.");
//     }
//     ready = true;
//     self.postMessage({ type: "status", message: "Passage retrieval index ready" });
//     postReady();
//   })();

//   try {
//     return await initializationPromise;
//   } catch (error) {
//     initializationPromise = null;
//     throw error;
//   }
// }

// async function loadShard(shard) {
//   if (loadedShards.has(shard)) return loadedShards.get(shard);
//   const key = `${manifest.version}:shard:${shard}`;
//   let payload;
//   try {
//     payload = await readStored(key);
//   } catch {
//     payload = undefined;
//   }
//   if (payload === undefined) {
//     const path = `/hadith-data/shards/${String(shard).padStart(3, "0")}.json`;
//     const response = await fetch(path);
//     if (!response.ok) throw new Error(`Could not load corpus shard ${shard} (${response.status})`);
//     payload = await response.json();
//     await writeStored(key, payload).catch(() => {});
//   }
//   loadedShards.set(shard, payload);
//   return payload;
// }

// async function loadCandidateRecords(candidates) {
//   const shards = [...new Set(candidates.map(({ id }) => manifest.metadata[id][6]))];
//   const payloads = await Promise.all(shards.map(loadShard));
//   const wanted = new Set(candidates.map(({ id }) => id));
//   const records = new Map();
//   for (const payload of payloads) {
//     for (const [documentId, text] of payload) {
//       if (wanted.has(documentId)) records.set(documentId, text);
//     }
//   }
//   return records;
// }

// async function search({ requestId, query, filters }) {
//   if (!ready) await initialize();
//   const parsed = parseInlineFilters(query, filters);
//   self.postMessage({ type: "status", requestId, message: "Finding the closest narration passages" });
//   const started = performance.now();
//   const { plan, candidates } = rankPassageCandidates({
//     manifest,
//     passageHashes,
//     passageWeights,
//     passageDocuments,
//     passageLengths,
//     query: parsed.cleanQuery,
//     filters: parsed.filters,
//     limit: 240,
//   });
//   self.postMessage({
//     type: "status",
//     requestId,
//     message: `Checking the best ${candidates.length} narrations for direct evidence`,
//   });
//   const records = await loadCandidateRecords(candidates);
//   const results = rerankLoadedRecords({
//     manifest,
//     plan,
//     candidates,
//     records,
//     resultLimit: 5,
//   });
//   self.postMessage({
//     type: "results",
//     requestId,
//     results,
//     candidateCount: candidates.length,
//     elapsedMs: Math.round(performance.now() - started),
//     appliedFilters: parsed.filters,
//   });
// }

// async function downloadAll() {
//   if (!ready) await initialize();
//   for (let shard = 0; shard < manifest.shardCount; shard += 1) {
//     await loadShard(shard);
//     if (shard % 4 === 0 || shard === manifest.shardCount - 1) {
//       self.postMessage({
//         type: "download-progress",
//         current: shard + 1,
//         total: manifest.shardCount,
//       });
//     }
//   }
//   self.postMessage({ type: "download-complete" });
// }

// self.onmessage = async ({ data }) => {
//   try {
//     if (data.type === "init") await initialize();
//     if (data.type === "search") await search(data);
//     if (data.type === "download-all") await downloadAll();
//   } catch (error) {
//     self.postMessage({
//       type: "error",
//       requestId: data.requestId,
//       message: error instanceof Error ? error.message : "Local search failed",
//     });
//   }
// };

import {
  expandRelatedCandidates,
  normalizeText,
  rankPassageCandidates,
  rerankLoadedRecords,
  stemToken,
} from "./hadith-retrieval-core.mjs";

/* Al-Faqih local passage search worker. All retrieval runs in the browser. */

const DB_NAME = "al-faqih-local";
const DB_VERSION = 1;
const STORE = "assets";

let manifest;
let passageHashes;
let passageWeights;
let passageDocuments;
let passageLengths;
let databasePromise;
let initializationPromise;
let ready = false;
const loadedShards = new Map();
let chapterDocuments;

const REPORTED_FEEDBACK_STOP_WORDS = new Set(
  "about after al an and are as at be been book by chapter collection for from had has have into is it its hadith imam make making narration not of on one ones or others over people regarding report reward said says section that the their them these this those to under upon volume was were who with".split(" "),
);

function reportedFeedbackExpansion(result = {}) {
  const terms = [...new Set(normalizeText(result.chapter || result.title || "")
    .split(/\s+/)
    .filter((term) => term.length >= 3
      && !/^\d+$/.test(term)
      && !REPORTED_FEEDBACK_STOP_WORDS.has(term)))]
    .slice(0, 6);
  if (terms.length < 2) return null;
  const vocabulary = new Set((manifest?.lexicon || []).map(([term]) => term));
  const variants = terms.map((term) => {
    const candidates = new Set([term, stemToken(term)]);
    if (/e$/.test(term) && term.length > 4) candidates.add(term.slice(0, -1));
    if (/y$/.test(term) && term.length > 3) {
      candidates.add(`${term.slice(0, -1)}ied`);
      candidates.add(`${term.slice(0, -1)}ies`);
    }
    if (/s$/.test(term) && term.length > 4) candidates.add(term.slice(0, -1));
    const attested = [...candidates].filter((candidate) => vocabulary.has(candidate));
    return attested.length ? attested.slice(0, 3) : [term];
  });
  let subjectGroups = [""];
  for (const choices of variants.slice(0, Math.min(3, variants.length))) {
    subjectGroups = subjectGroups
      .flatMap((prefix) => choices.map((choice) => `${prefix} ${choice}`.trim()))
      .slice(0, 12);
  }
  return {
    query: `${[...new Set(variants.flat())].join(" ")} asked instructed told replied continued cried wept`,
    subjectGroups,
    literalAnchors: variants[Math.min(2, variants.length - 1)],
  };
}

function parseCorpusChapter(link = "") {
  const match = String(link).match(/\/hadith\/(\d+)\/(\d+)\/(\d+)\/(\d+)/);
  if (!match) return null;
  return {
    volumeKey: `${match[1]}/${match[2]}`,
    chapter: Number(match[3]),
  };
}

function buildChapterDocuments() {
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
}

function methodActionScore(result = {}) {
  const text = `${result.title || ""} ${result.chapter || ""} ${result.text || ""}`;
  return (text.match(/\b(?:demonstrat|description|procedure|first|then|wash(?:ed|ing)?|wipe(?:d|s)?|slaughter(?:ed|ing)?|shav(?:e|ed|ing)|name(?:d|ing)?)\b/gi) || []).length;
}

function hasDirectMethodInstruction(results = []) {
  return results.slice(0, 1).some((result) => methodActionScore(result) > 0);
}

function foldTransliteration(value = "") {
  return normalizeText(value)
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
  const text = `${result?.title || ""} ${result?.chapter || ""} ${result?.text || ""}`;
  const tokens = normalizeText(text).split(/\s+/).filter((token) => token.length >= 4);
  return terms.some((term) => {
    const normalized = normalizeText(term);
    const folded = foldTransliteration(normalized);
    const skeleton = transliterationSkeleton(normalized);
    return tokens.some((token) => token.includes(normalized)
      || (folded.length >= 4 && foldTransliteration(token) === folded)
      || (skeleton.length >= 3 && transliterationSkeleton(token) === skeleton));
  });
}

function neighbouringMethodCandidates(seedResults, candidates) {
  if (!chapterDocuments || !seedResults.length) return [];
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
          id,
          passageId: -1,
          passageScore: 0,
          supportingPassageScore: 0,
          phraseMatches: 0,
          crossLanguageMatches: 0,
          candidateScore: topScore * (1.12 - Math.abs(offset) * 0.08),
          relationScore: 0.72 - Math.abs(offset) * 0.05,
          relationTo: seed.id,
          familyRoot: seed.id,
          familyDepth: 1,
          familyScore: 0.72 - Math.abs(offset) * 0.05,
        });
      }
    }
  }
  return related.slice(0, 48);
}

function sameChapterCandidates(seedResults, candidates) {
  if (!chapterDocuments || !seedResults.length) return [];
  const existing = new Set(candidates.map((candidate) => candidate.id));
  const topScore = candidates[0]?.candidateScore || 1;
  const related = [];
  for (const seed of seedResults.slice(0, 3)) {
    const location = parseCorpusChapter(seed.link);
    const chapters = location && chapterDocuments.get(location.volumeKey);
    if (!chapters) continue;
    for (const id of chapters.get(location.chapter) || []) {
      if (existing.has(id)) continue;
      existing.add(id);
      related.push({
        id,
        passageId: -1,
        passageScore: 0,
        supportingPassageScore: 0,
        phraseMatches: 0,
        crossLanguageMatches: 0,
        candidateScore: topScore * 0.9,
        relationScore: 0.84,
        relationTo: seed.id,
        familyRoot: seed.id,
        familyDepth: 1,
        familyScore: 0.84,
      });
    }
  }
  return related.slice(0, 48);
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

async function readStored(key) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeStored(key, value) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(value, key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function fetchAndStore(key, path, format = "arrayBuffer") {
  let stored;
  try {
    stored = await readStored(key);
  } catch {
    stored = undefined;
  }
  if (stored !== undefined) return stored;
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  const value = await response[format]();
  writeStored(key, value).catch(() => {});
  return value;
}

function resolveFilter(value, options) {
  const needle = normalizeText(value);
  if (!needle) return "";
  return options.find((option) => normalizeText(option).includes(needle)) || "";
}

function parseInlineFilters(query, suppliedFilters = {}) {
  const filters = {
    collection: suppliedFilters.collection || "",
    author: suppliedFilters.author || "",
    imam: suppliedFilters.imam ?? "",
  };
  let cleanQuery = String(query || "");
  const pattern = /\b(book|author|imam)\s*:\s*(?:"([^"]+)"|'([^']+)'|([^\s]+))/giu;
  cleanQuery = cleanQuery.replace(pattern, (clause, field, doubleQuoted, singleQuoted, bare) => {
    const value = doubleQuoted || singleQuoted || bare || "";
    if (field.toLowerCase() === "book") {
      const resolved = resolveFilter(value, manifest.strings.collections);
      if (resolved) filters.collection = resolved;
    } else if (field.toLowerCase() === "author") {
      const resolved = resolveFilter(value, manifest.strings.authors);
      if (resolved) filters.author = resolved;
    } else {
      const resolvedIndex = manifest.imams.findIndex((imam) => normalizeText(imam).includes(normalizeText(value)));
      if (resolvedIndex >= 0) filters.imam = String(resolvedIndex);
    }
    return " ";
  });
  cleanQuery = cleanQuery.replace(/\s+/g, " ").trim() || String(query || "").trim();
  return { cleanQuery, filters };
}

function readyManifest() {
  const bibliography = [];
  const seenBooks = new Set();
  for (const metadata of manifest.metadata || []) {
    const collection = manifest.strings.collections?.[metadata[1]];
    const author = manifest.strings.authors?.[metadata[2]];
    const key = `${collection || ""}\u0000${author || ""}`;
    if (!collection || !author || seenBooks.has(key)) continue;
    seenBooks.add(key);
    bibliography.push([collection, author]);
  }
  return {
    version: manifest.version,
    documentCount: manifest.documentCount,
    shardCount: manifest.shardCount,
    collections: manifest.strings.collections,
    authors: manifest.strings.authors,
    imams: manifest.imams,
    bibliography,
    lexicon: manifest.lexicon,
    mode: "hybrid-related",
  };
}

function postReady() {
  self.postMessage({ type: "ready", manifest: readyManifest() });
}

async function loadManifest() {
  let latestManifest;
  try {
    const response = await fetch("/hadith-data/manifest.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Manifest request failed");
    latestManifest = await response.json();
    writeStored("manifest-current", latestManifest).catch(() => {});
  } catch {
    latestManifest = await readStored("manifest-current");
  }
  if (!latestManifest) throw new Error("The local corpus has not been installed yet.");
  if (!latestManifest.passageCount || !latestManifest.passageSlots || !latestManifest.related) {
    throw new Error("The local corpus index is out of date. Rebuild the hadith index and reload.");
  }
  return latestManifest;
}

async function initialize() {
  if (ready) {
    postReady();
    return;
  }
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    self.postMessage({ type: "status", message: "Loading corpus catalog" });
    manifest = await loadManifest();
    chapterDocuments = buildChapterDocuments();
    const prefix = manifest.version;
    self.postMessage({ type: "status", message: "Loading passage retrieval index" });
    const [hashBuffer, weightBuffer, documentBuffer, lengthBuffer] = await Promise.all([
      fetchAndStore(`${prefix}:passage-hashes`, "/hadith-data/passage-hashes.bin"),
      fetchAndStore(`${prefix}:passage-weights`, "/hadith-data/passage-weights.bin"),
      fetchAndStore(`${prefix}:passage-documents`, "/hadith-data/passage-documents.bin"),
      fetchAndStore(`${prefix}:passage-lengths`, "/hadith-data/passage-lengths.bin"),
    ]);
    passageHashes = new Uint32Array(hashBuffer);
    passageWeights = new Uint8Array(weightBuffer);
    passageDocuments = new Uint16Array(documentBuffer);
    passageLengths = new Uint8Array(lengthBuffer);
    if (
      passageHashes.length !== manifest.passageCount * manifest.passageSlots
      || passageWeights.length !== manifest.passageCount * manifest.passageSlots
      || passageDocuments.length !== manifest.passageCount
      || passageLengths.length !== manifest.passageCount
    ) {
      throw new Error("The local passage index is incomplete. Rebuild it and reload.");
    }
    ready = true;
    self.postMessage({ type: "status", message: "Passage retrieval index ready" });
    postReady();
  })();

  try {
    return await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

async function loadShard(shard) {
  if (loadedShards.has(shard)) return loadedShards.get(shard);
  const key = `${manifest.version}:shard:${shard}`;
  let payload;
  try {
    payload = await readStored(key);
  } catch {
    payload = undefined;
  }
  if (payload === undefined) {
    const path = `/hadith-data/shards/${String(shard).padStart(3, "0")}.json`;
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load corpus shard ${shard} (${response.status})`);
    payload = await response.json();
    await writeStored(key, payload).catch(() => {});
  }
  loadedShards.set(shard, payload);
  return payload;
}

async function loadCandidateRecords(candidates) {
  const shards = [...new Set(candidates.map(({ id }) => manifest.metadata[id][6]))];
  const payloads = await Promise.all(shards.map(loadShard));
  const wanted = new Set(candidates.map(({ id }) => id));
  const records = new Map();
  for (const payload of payloads) {
    for (const [documentId, text] of payload) {
      if (wanted.has(documentId)) records.set(documentId, text);
    }
  }
  return records;
}

async function search({ requestId, query, filters, retrievalProfile }) {
  if (!ready) await initialize();
  const parsed = parseInlineFilters(query, filters);
  self.postMessage({ type: "status", requestId, message: "Finding the closest narration passages" });
  const started = performance.now();
  const { plan, candidates } = rankPassageCandidates({
    manifest,
    passageHashes,
    passageWeights,
    passageDocuments,
    passageLengths,
    query: parsed.cleanQuery,
    filters: parsed.filters,
    retrievalProfile,
    limit: Math.max(120, Math.min(480, Number(retrievalProfile?.candidateLimit) || 300)),
  });
  if (!candidates.length && retrievalProfile?.rewritten && !retrievalProfile?.relaxed
    && plan.subjectSourceGroups?.some((group) => group.hashes.size > 0)) {
    self.postMessage({
      type: "status",
      requestId,
      message: "The exact modern wording was not indexed; broadening to governing corpus evidence",
    });
    return search({
      requestId,
      query,
      filters,
      retrievalProfile: {
        ...retrievalProfile,
        relaxed: true,
        requireSubjectMatch: true,
        // Keep the semantic subject anchors while relaxing only the scoring
        // gates.  `secondaryQuery` is scoped to the supplemental loop below
        // and must never be referenced by this generic fallback.
        subjectTermGroups: Array.isArray(retrievalProfile?.subjectTermGroups)
          ? retrievalProfile.subjectTermGroups
          : [],
        minimumSubjectCoverage: 0.5,
        requireFocusCoverage: false,
        disableFocus: true,
      },
    });
  }
  if (!candidates.length && !retrievalProfile?.rewritten) {
    self.postMessage({
      type: "rewrite-needed",
      requestId,
      queryDiagnostics: {
        corrections: plan.queryCorrections || [],
        unresolved: plan.unresolvedFocusTokens || [],
      },
    });
    return;
  }
  self.postMessage({
    type: "status",
    requestId,
    message: `Checking the best ${candidates.length} narrations for direct evidence`,
  });
  const directRecords = await loadCandidateRecords(candidates);
  const seedPool = rerankLoadedRecords({
    manifest,
    plan,
    candidates,
    records: directRecords,
    resultLimit: Math.max(6, Math.min(16, Number(retrievalProfile?.seedLimit) || 12)),
  });
  const seedCount = Math.max(3, Math.min(10, Number(retrievalProfile?.seedCount) || 8));
  const seedResults = [
    ...seedPool.filter((result) => result.clusterRole !== "parallel"),
    ...seedPool.filter((result) => result.clusterRole === "parallel"),
  ].slice(0, seedCount);

  self.postMessage({
    type: "status",
    requestId,
    message: "Following corpus links to parallel reports",
  });
  const methodNeighbours = retrievalProfile?.facet === "method"
    && retrievalProfile?.expandMethodContext
    ? neighbouringMethodCandidates(seedResults, candidates)
    : [];
  const timeChapterCandidates = retrievalProfile?.facet === "time-definition"
    ? sameChapterCandidates(seedResults, candidates)
    : [];
  const expandedCandidates = expandRelatedCandidates({
    manifest,
    candidates: [...candidates, ...methodNeighbours, ...timeChapterCandidates],
    seedResults,
    filters: parsed.filters,
    limit: Math.max(240, Math.min(640, Number(retrievalProfile?.expandedLimit) || 420)),
    perSeed: Math.max(12, Math.min(64, Number(retrievalProfile?.perSeed) || 32)),
    maxDepth: Math.max(1, Math.min(3, Number(retrievalProfile?.familyDepth) || 2)),
    propagationThreshold: Math.max(0.35, Math.min(0.8, Number(retrievalProfile?.familyPropagationThreshold) || 0.48)),
  });
  const records = await loadCandidateRecords(expandedCandidates);
  let results = rerankLoadedRecords({
    manifest,
    plan,
    candidates: expandedCandidates,
    records,
    resultLimit: Math.max(2, Math.min(14, Number(retrievalProfile?.resultLimit) || 10)),
  }).map((result) => ({ ...result, evidenceRole: "direct" }));
  if (retrievalProfile?.expandMethodContext) {
    const procedureCandidates = expandedCandidates
      .filter((candidate) => hasMethodSubject({ text: records.get(candidate.id) || "" }, retrievalProfile?.methodSubjectTerms)
        && methodActionScore({ text: records.get(candidate.id) || "" }) > 0)
      .sort((left, right) => (
        methodActionScore({ text: records.get(right.id) || "" }) - methodActionScore({ text: records.get(left.id) || "" })
        || right.candidateScore - left.candidateScore
      ))
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
      results = [
        ...contextualProcedureResults,
        ...results.filter((result) => hasMethodSubject(result, retrievalProfile?.methodSubjectTerms)),
      ].filter((result) => {
        const key = result.link || result.id;
        if (seenContext.has(key)) return false;
        seenContext.add(key);
        return true;
      }).slice(0, Math.max(2, Math.min(14, Number(retrievalProfile?.resultLimit) || 10)));
    }
  }
  const secondaryQueries = [
    ...(Array.isArray(retrievalProfile?.secondaryQueries) ? retrievalProfile.secondaryQueries : []),
    ...(retrievalProfile?.secondaryQuery ? [retrievalProfile.secondaryQuery] : []),
  ].filter((query, index, all) => query && all.indexOf(query) === index);
  if (secondaryQueries.length) {
    const plannedSecondaryCount = secondaryQueries.length;
    const supplementalBuckets = [];
    const dynamicEvidenceRoles = [...(retrievalProfile?.evidenceRoles || [])];
    const dynamicSubjectGroups = [...(retrievalProfile?.evidenceQuerySubjects || [])];
    const dynamicLiteralAnchors = [...(retrievalProfile?.evidenceQueryLiteralAnchors || [])];
    while (dynamicLiteralAnchors.length < plannedSecondaryCount) dynamicLiteralAnchors.push([]);
    const isTimingEvidence = retrievalProfile?.facet === "time-definition";
    const isBiographicalEvidence = retrievalProfile?.facet === "biographical-event";
    const isReportedEvidence = retrievalProfile?.facet === "reported-evidence";
    for (let queryIndex = 0; queryIndex < secondaryQueries.length; queryIndex += 1) {
      const secondaryQuery = secondaryQueries[queryIndex];
      const evidenceRole = dynamicEvidenceRoles[queryIndex] || "supporting";
      const requiredSubjects = dynamicSubjectGroups[queryIndex] || [];
      const requiredLiteralAnchors = dynamicLiteralAnchors[queryIndex] || [];
      const secondaryProfile = {
        ...retrievalProfile,
        secondaryQuery: "",
        secondaryQueries: [],
        // Score each evidence role by its own vocabulary and require its
        // subject anchor so broad relation words cannot promote an unrelated
        boostTerms: isTimingEvidence
          ? []
          : retrievalProfile?.facet === "definition"
            ? [
                ...(Array.isArray(retrievalProfile?.boostTerms) ? retrievalProfile.boostTerms : []),
                ...secondaryQuery.split(/\s+/).filter(Boolean),
              ]
            : secondaryQuery.split(/\s+/).filter(Boolean),
        // Timing reports often state the observable sign without repeating
        // the prayer's English name (for example, a white horizontal dawn
        // description). The timing query itself remains the focus gate.
        requireSubjectMatch: isTimingEvidence ? requiredSubjects.length > 0 : true,
        subjectTermGroups: requiredSubjects.length ? requiredSubjects : (isTimingEvidence ? [] : [secondaryQuery]),
        minimumSubjectCoverage: isReportedEvidence || retrievalProfile?.semanticGlossExpansion ? 1 : 0.5,
        allowFullRecordSubjectMatch: !isReportedEvidence || queryIndex < plannedSecondaryCount,
        requireFocusCoverage: isTimingEvidence || isBiographicalEvidence || isReportedEvidence ? false : true,
        minimumFocusCoverage: 0.34,
        disableFocus: isBiographicalEvidence || isReportedEvidence,
        requireFocusFacetProximity: false,
        // A named person can appear under a kunya, epithet, or a different
        // transliteration in the chapter heading. The supplemental query
        // already requires the entity subject, so do not reapply the main
        // query's rigid canonical-title phrase here.
        requiredTitlePhrase: isBiographicalEvidence ? "" : retrievalProfile?.requiredTitlePhrase,
        requireEntityMatch: isBiographicalEvidence ? false : retrievalProfile?.requireEntityMatch,
        familyMinRelation: isBiographicalEvidence ? 0.9 : retrievalProfile?.familyMinRelation,
        clusterOverlapThreshold: isBiographicalEvidence ? 0.9 : retrievalProfile?.clusterOverlapThreshold,
        sameChapterOverlapThreshold: isBiographicalEvidence ? 0.86 : retrievalProfile?.sameChapterOverlapThreshold,
        minUniqueResults: isBiographicalEvidence || isReportedEvidence ? 6 : retrievalProfile?.minUniqueResults,
        maxUniqueResults: isBiographicalEvidence ? 8 : retrievalProfile?.maxUniqueResults,
        parallelReserve: isBiographicalEvidence || isReportedEvidence ? 1 : retrievalProfile?.parallelReserve,
        maxFamilyMembers: isReportedEvidence ? 2 : retrievalProfile?.maxFamilyMembers,
        rewritten: true,
        relaxed: true,
      };
      const secondaryParsed = parseInlineFilters(secondaryQuery, filters);
      const secondaryRanked = rankPassageCandidates({
        manifest,
        passageHashes,
        passageWeights,
        passageDocuments,
        passageLengths,
        query: secondaryParsed.cleanQuery,
        filters: secondaryParsed.filters,
        retrievalProfile: secondaryProfile,
        limit: Math.max(120, Math.min(360, Number(retrievalProfile?.candidateLimit) || 240)),
      });
      if (!secondaryRanked.candidates.length) continue;
      const secondaryRecords = await loadCandidateRecords(secondaryRanked.candidates);
      let supplementalBucket = rerankLoadedRecords({
        manifest,
        plan: secondaryRanked.plan,
        candidates: secondaryRanked.candidates,
        records: secondaryRecords,
        resultLimit: isTimingEvidence || retrievalProfile?.facet === "definition" || isBiographicalEvidence || isReportedEvidence ? 8 : 5,
      }).map((result) => ({ ...result, evidenceRole }));
      if (requiredLiteralAnchors.length) {
        supplementalBucket = supplementalBucket.filter((result) => {
          const literalTokens = new Set(normalizeText(`${result.title} ${result.chapter} ${result.text}`).split(/\s+/));
          return requiredLiteralAnchors.some((anchor) => literalTokens.has(anchor));
        });
      }
      supplementalBuckets.push(supplementalBucket);
      // Use a high-confidence result heading as corpus-native relevance
      // feedback. This discovers translation variants used by other reports
      // (without a hand-maintained topic synonym table) and runs at most once.
      const hasCompoundReportedSubject = requiredSubjects.some((group) => (
        normalizeText(group).split(/\s+/).filter(Boolean).length >= 2
      ));
      if (isReportedEvidence && queryIndex === 0 && hasCompoundReportedSubject && supplementalBucket[0]) {
        const feedback = reportedFeedbackExpansion(supplementalBucket[0]);
        if (feedback?.query && !secondaryQueries.includes(feedback.query)) {
          secondaryQueries.push(feedback.query);
          dynamicEvidenceRoles.push(evidenceRole);
          dynamicSubjectGroups.push(feedback.subjectGroups);
          dynamicLiteralAnchors.push(feedback.literalAnchors);
        }
      }
    }
    const usedReportedFeedback = isReportedEvidence
      && supplementalBuckets.length > plannedSecondaryCount
      && supplementalBuckets[plannedSecondaryCount]?.length;
    let mergeBuckets = supplementalBuckets;
    if (usedReportedFeedback) {
      const feedbackKeys = new Set(supplementalBuckets.slice(1).flat()
        .map((result) => result.link || result.id));
      const initialAnchorKey = supplementalBuckets[0][0]?.link || supplementalBuckets[0][0]?.id;
      const anchoredOriginal = supplementalBuckets[0].filter((result) => {
        const key = result.link || result.id;
        return key === initialAnchorKey || feedbackKeys.has(key);
      });
      mergeBuckets = [anchoredOriginal, ...supplementalBuckets.slice(1)];
    }
    const supplementalResults = [];
    const maxBucketLength = Math.max(0, ...mergeBuckets.map((bucket) => bucket.length));
    for (let index = 0; index < maxBucketLength; index += 1) {
      for (const bucket of mergeBuckets) {
        if (bucket[index]) supplementalResults.push(bucket[index]);
      }
    }
    const seenSupplemental = new Set();
    let promotedSupplemental = supplementalResults.filter((result) => {
      const key = result.link || result.id;
      if (seenSupplemental.has(key)) return false;
      seenSupplemental.add(key);
      return true;
    }).slice(0, Math.max(1, Math.min(
      retrievalProfile?.facet === "biographical-event" || retrievalProfile?.facet === "reported-evidence" ? 10 : 6,
      Number(retrievalProfile?.secondaryPromotionLimit) || 3,
    )));
    if (retrievalProfile?.onePerEvidenceRole) {
      promotedSupplemental = dynamicEvidenceRoles
        .map((role) => promotedSupplemental.find((result) => result.evidenceRole === role))
        .filter(Boolean);
    }
    const promotedKeys = new Set(promotedSupplemental.map((result) => result.link || result.id));
    // A secondary query is allowed to promote a report already found by the
    // original wording.  The old global `seen` filter silently discarded that
    // stronger supplemental ranking, leaving loosely related reports ahead of
    // the answer-bearing narration.
    results = [
      ...promotedSupplemental,
      ...(usedReportedFeedback && promotedSupplemental.length
        ? []
        : results.filter((result) => !promotedKeys.has(result.link || result.id))),
    ].slice(0, Math.max(2, Math.min(14, Number(retrievalProfile?.resultLimit) || 10)));
  }
  if (!results.length && !retrievalProfile?.rewritten) {
    self.postMessage({
      type: "rewrite-needed",
      requestId,
      queryDiagnostics: {
        corrections: plan.queryCorrections || [],
        unresolved: plan.unresolvedFocusTokens || [],
      },
    });
    return;
  }
  if (!results.length && retrievalProfile?.rewritten && !retrievalProfile?.relaxed
    && plan.subjectSourceGroups?.some((group) => group.hashes.size > 0)) {
    self.postMessage({
      type: "status",
      requestId,
      message: "The exact modern wording was not indexed; broadening to governing corpus evidence",
    });
    return search({
      requestId,
      query,
      filters,
      retrievalProfile: {
        ...retrievalProfile,
        relaxed: true,
        requireSubjectMatch: false,
        requireFocusCoverage: false,
        disableFocus: true,
      },
    });
  }
  const anchors = results.filter((result) => result.clusterRole !== "parallel");
  const parallels = results.filter((result) => result.clusterRole === "parallel");
  const synthesisResults = [...anchors, ...parallels].slice(0, 10);
  self.postMessage({
    type: "results",
    requestId,
    results,
    synthesisResults,
    clusterCount: new Set(results.map((result) => result.clusterId || result.id)).size,
    candidateCount: candidates.length,
    expandedCandidateCount: expandedCandidates.length,
    elapsedMs: Math.round(performance.now() - started),
    appliedFilters: parsed.filters,
    retrievalProfile: retrievalProfile || null,
  });
}

async function downloadAll() {
  if (!ready) await initialize();
  for (let shard = 0; shard < manifest.shardCount; shard += 1) {
    await loadShard(shard);
    if (shard % 4 === 0 || shard === manifest.shardCount - 1) {
      self.postMessage({
        type: "download-progress",
        current: shard + 1,
        total: manifest.shardCount,
      });
    }
  }
  self.postMessage({ type: "download-complete" });
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") await initialize();
    if (data.type === "search") await search(data);
    if (data.type === "download-all") await downloadAll();
  } catch (error) {
    self.postMessage({
      type: "error",
      requestId: data.requestId,
      message: error instanceof Error ? error.message : "Local search failed",
    });
  }
};
