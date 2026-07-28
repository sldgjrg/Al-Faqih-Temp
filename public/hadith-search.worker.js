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
  return {
    version: manifest.version,
    documentCount: manifest.documentCount,
    shardCount: manifest.shardCount,
    collections: manifest.strings.collections,
    authors: manifest.strings.authors,
    imams: manifest.imams,
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

async function search({ requestId, query, filters }) {
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
    limit: 240,
  });
  self.postMessage({
    type: "status",
    requestId,
    message: `Checking the best ${candidates.length} narrations for direct evidence`,
  });
  const directRecords = await loadCandidateRecords(candidates);
  const seedResults = rerankLoadedRecords({
    manifest,
    plan,
    candidates,
    records: directRecords,
    resultLimit: 8,
  }).slice(0, 4);

  self.postMessage({
    type: "status",
    requestId,
    message: "Following corpus links to parallel reports",
  });
  const expandedCandidates = expandRelatedCandidates({
    manifest,
    candidates,
    seedResults,
    filters: parsed.filters,
    limit: 320,
    perSeed: 18,
  });
  const records = await loadCandidateRecords(expandedCandidates);
  const results = rerankLoadedRecords({
    manifest,
    plan,
    candidates: expandedCandidates,
    records,
    resultLimit: 5,
  });
  self.postMessage({
    type: "results",
    requestId,
    results,
    candidateCount: candidates.length,
    expandedCandidateCount: expandedCandidates.length,
    elapsedMs: Math.round(performance.now() - started),
    appliedFilters: parsed.filters,
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
