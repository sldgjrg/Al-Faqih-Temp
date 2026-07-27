/* Al-Faqih local search worker. All retrieval runs in the browser. */

const DB_NAME = "al-faqih-local";
const DB_VERSION = 1;
const STORE = "assets";
const STOP_WORDS = new Set(
  "a an and are as at be been but by can did do does for from had has have he her him his i if in into is it its may me my no not of on or our said she so than that the their them then there these they this to us was we were what when where which who will with would you your ibn abu bin b narrated following imam allah".split(" "),
);
const CONCEPTS = {
  ablution: ["wudu", "wudhu", "wuzu", "wuḍu", "ablution", "وضوء", "وضو"],
  prayer: ["salah", "salat", "namaz", "prayer", "صلاة", "نماز"],
  fasting: ["sawm", "roza", "fast", "fasting", "صوم", "روزہ"],
  charity: ["zakat", "khums", "charity", "alms", "زكاة", "خمس"],
  taqiyyah: ["taqiyya", "taqiyyah", "taqiyah", "dissimulation", "تقية", "تقیہ"],
  purity: ["taharah", "tahara", "purity", "clean", "نجاسة", "طهارة", "پاک"],
  marriage: ["nikah", "marriage", "wife", "husband", "زواج", "نكاح", "شادی"],
  divorce: ["talaq", "divorce", "طلاق"],
  pilgrimage: ["hajj", "umrah", "pilgrimage", "حج", "عمرہ"],
  resurrection: ["qiyamah", "resurrection", "judgment", "قيامة", "قیامت"],
  leadership: ["imamate", "imamah", "wilayah", "guardianship", "امامة", "ولاية"],
  water: ["water", "pani", "maa", "ma", "ماء", "پانی"],
  well: ["well", "bir", "bi'r", "kuan", "kuaa", "khooh", "بئر", "کنواں", "کھوہ"],
  dog: ["dog", "kalb", "kutta", "kutte", "كلب", "کتا", "کُتّا"],
};
const ALIAS_TO_CONCEPT = new Map();
for (const [concept, aliases] of Object.entries(CONCEPTS)) {
  for (const alias of aliases) ALIAS_TO_CONCEPT.set(alias, concept);
}

let manifest;
let dense;
let lexicalHashes;
let lexicalTf;
let documentLengths;
let databasePromise;

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
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeStored(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(value, key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function fetchAndStore(key, path, format = "arrayBuffer") {
  const stored = await readStored(key);
  if (stored !== undefined) return stored;
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  const value = await response[format]();
  await writeStored(key, value);
  return value;
}

function normalize(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim();
}

function stem(token) {
  if (token.length < 5 || /[^\u0000-\u007f]/.test(token)) return token;
  return token
    .replace(/(?:ization|ational|fulness|ousness|iveness)$/u, "")
    .replace(/(?:ingly|edly|ments|ment|ation|ities)$/u, "")
    .replace(/(?:ing|ers|ies|ied|ed|es|s)$/u, "");
}

function tokensFor(value) {
  const output = [];
  for (const raw of normalize(value).split(/\s+/)) {
    if (!raw || STOP_WORDS.has(raw)) continue;
    const token = stem(raw);
    output.push(token);
    const concept = ALIAS_TO_CONCEPT.get(raw) || ALIAS_TO_CONCEPT.get(token);
    if (concept && concept !== token) output.push(`concept_${concept}`);
  }
  return output;
}

function expandInstructionalIntent(query, tokens) {
  const normalized = normalize(query);
  const expanded = [...tokens];
  if (
    /\b(how|teach|learn|demonstrat|perform|method|way)\b/.test(normalized)
    && /\b(pray|prayer|salah|salat|namaz)\b/.test(normalized)
  ) {
    expanded.push(
      "hammad",
      "teach",
      "prayer",
      "qibla",
      "bow",
      "prostrate",
      "ruku",
      "sujud",
      "rakah",
      "concept_prayer",
    );
  }
  if (/\b(sadiq|abu abdillah|abu abd allah)\b/.test(normalized)) {
    expanded.push("abdillah", "sadiq");
  }
  if (isWellContaminationQuery(query)) {
    expanded.push(
      "well",
      "water",
      "dog",
      "bucket",
      "draw",
      "taste",
      "smell",
      "change",
      "concept_well",
      "concept_water",
      "concept_dog",
      "concept_ablution",
      "concept_purity",
    );
  }
  return expanded;
}

function isWellContaminationQuery(query) {
  const normalized = normalize(query);
  const hasWell = /\b(well|bir|kuan|kuaa|khooh)\b/.test(normalized) || /(?:بئر|کنواں|کھوہ)/u.test(query);
  const hasContaminant = /\b(dog|kalb|kutta|kutte|animal|fell|fall)\b/.test(normalized) || /(?:كلب|کتا|جانور|گرا)/u.test(query);
  const hasWaterUse = /\b(water|pani|wudu|wudhu|wuzu|ablution|purity)\b/.test(normalized) || /(?:ماء|پانی|وضو)/u.test(query);
  return hasWell && hasContaminant && hasWaterUse;
}

function isPrayerInstructionQuery(query) {
  const normalized = normalize(query);
  return (
    /\b(how|teach|learn|demonstrat|perform|method|way)\b/.test(normalized)
    && /\b(pray|prayer|salah|salat|namaz)\b/.test(normalized)
  );
}

function hash(value, seed = 2166136261) {
  let result = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function queryVector(tokens, rawQuery) {
  const vector = new Float32Array(manifest.denseSize);
  const add = (feature, weight) => {
    const h = hash(feature);
    const index = h % manifest.denseSize;
    const sign = hash(feature, 0x9e3779b9) & 1 ? 1 : -1;
    vector[index] += sign * weight;
  };
  for (const token of tokens) add(`w:${token}`, token.startsWith("concept_") ? 2.3 : 1);
  for (let index = 0; index < tokens.length - 1; index += 1) {
    add(`b:${tokens[index]}_${tokens[index + 1]}`, 0.55);
  }
  const normalizedQuery = normalize(rawQuery);
  for (let index = 0; index < normalizedQuery.length - 2; index += 1) {
    add(`c:${normalizedQuery.slice(index, index + 3)}`, 0.25);
  }
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vector, (value) => Math.max(-127, Math.min(127, Math.round((value / norm) * 110))));
}

function filterMatches(meta, filters) {
  if (!filters) return true;
  const [, collectionIndex, authorIndex, , , imamMask] = meta;
  if (filters.collection && manifest.strings.collections[collectionIndex] !== filters.collection) return false;
  if (filters.author && manifest.strings.authors[authorIndex] !== filters.author) return false;
  if (filters.imam !== "" && filters.imam !== undefined) {
    const bit = 1 << Number(filters.imam);
    if ((imamMask & bit) === 0) return false;
  }
  return true;
}

function parseInlineFilters(query, suppliedFilters) {
  const filters = { ...(suppliedFilters || {}) };
  let cleanQuery = query;
  const fields = [
    ["book", "collection", manifest.strings.collections],
    ["author", "author", manifest.strings.authors],
    ["imam", "imam", manifest.imams],
  ];
  for (const [syntax, key, options] of fields) {
    const pattern = new RegExp(`\\b${syntax}:("[^"]+"|'[^']+'|[^\\s]+)`, "i");
    const match = cleanQuery.match(pattern);
    if (!match) continue;
    const requested = match[1].replace(/^['"]|['"]$/g, "");
    const index = options.findIndex((option) => normalize(option).includes(normalize(requested)));
    if (index >= 0) filters[key] = key === "imam" ? String(index) : options[index];
    cleanQuery = cleanQuery.replace(match[0], " ");
  }
  return { cleanQuery: cleanQuery.trim() || query, filters };
}

function topCandidates(query, filters) {
  const tokens = expandInstructionalIntent(query, tokensFor(query));
  const prayerInstruction = isPrayerInstructionQuery(query);
  const wellContamination = isWellContaminationQuery(query);
  const uniqueTokens = [...new Set(tokens)];
  const queryHashes = new Map();
  for (const token of tokens) {
    const termHash = hash(token);
    queryHashes.set(termHash, (queryHashes.get(termHash) || 0) + 1);
  }
  const vector = queryVector(tokens, query);
  const candidates = [];
  const total = manifest.documentCount;
  const averageLength = manifest.averageLength || 1;

  for (let id = 0; id < total; id += 1) {
    const meta = manifest.metadata[id];
    if (!filterMatches(meta, filters)) continue;

    const denseOffset = id * manifest.denseSize;
    let semantic = 0;
    for (let dimension = 0; dimension < manifest.denseSize; dimension += 1) {
      semantic += dense[denseOffset + dimension] * vector[dimension];
    }
    semantic = semantic / 12100;

    const lexicalOffset = id * manifest.lexicalSlots;
    let lexical = 0;
    let matchedTerms = 0;
    for (let slot = 0; slot < manifest.lexicalSlots; slot += 1) {
      const termHash = lexicalHashes[lexicalOffset + slot];
      if (!termHash || !queryHashes.has(termHash)) continue;
      const tf = lexicalTf[lexicalOffset + slot];
      const df = manifest.df[termHash.toString(36)] || total;
      const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
      const lengthNorm = 1 - 0.75 + 0.75 * (documentLengths[id] / averageLength);
      lexical += idf * ((tf * 2.2) / (tf + 1.2 * lengthNorm));
      matchedTerms += 1;
    }

    const [titleIndex, , , , chapterIndex] = meta;
    const titleText = normalize(`${manifest.strings.titles[titleIndex]} ${manifest.strings.chapters[chapterIndex]}`);
    const titleMatches = uniqueTokens.reduce((sum, token) => sum + (titleText.includes(token.replace("concept_", "")) ? 1 : 0), 0);
    const scenarioBoost = wellContamination && /\bwell\b/.test(titleText) ? 0.62 : 0;
    const lexicalNormalized = lexical ? 1 - Math.exp(-lexical / 7) : 0;
    const coverage = uniqueTokens.length ? matchedTerms / uniqueTokens.length : 0;
    const intentMask = meta[8] || 0;
    const intentBoost = prayerInstruction
      ? ((intentMask & 1) ? 0.72 : (intentMask & 2) ? 0.16 : 0)
      : 0;
    const combined = semantic * 0.48
      + lexicalNormalized * 0.37
      + coverage * 0.1
      + Math.min(0.12, titleMatches * 0.025)
      + intentBoost
      + scenarioBoost;
    if (combined > 0.015 || lexical > 0) {
      candidates.push({ id, semantic, lexical, coverage, combined, matchedTerms });
    }
  }

  // Reciprocal-rank fusion preserves independent dense and rare-keyword lanes.
  // A semantically broad match cannot push an exact concrete match out of reranking.
  const lanes = [
    [...candidates].sort((a, b) => b.semantic - a.semantic).slice(0, 60),
    [...candidates].filter(({ lexical }) => lexical > 0).sort((a, b) => b.lexical - a.lexical).slice(0, 60),
    [...candidates].sort((a, b) => b.combined - a.combined).slice(0, 60),
  ];
  const fused = new Map();
  lanes.forEach((lane, laneIndex) => {
    const laneWeight = laneIndex === 1 ? 1.35 : 1;
    lane.forEach((candidate, rank) => {
      const known = fused.get(candidate.id) || { ...candidate, fusion: candidate.combined };
      known.fusion += (2.4 * laneWeight) / (35 + rank);
      fused.set(candidate.id, known);
    });
  });
  const ranked = [...fused.values()].sort((a, b) => b.fusion - a.fusion);
  return { candidates: ranked.slice(0, 20), tokens: uniqueTokens };
}

async function loadShard(shard) {
  const key = `${manifest.version}:shard:${shard}`;
  const stored = await readStored(key);
  if (stored) return stored;
  const response = await fetch(`/hadith-data/shards/${String(shard).padStart(3, "0")}.json`);
  if (!response.ok) throw new Error(`Could not load narration shard ${shard}`);
  const payload = await response.json();
  await writeStored(key, payload);
  return payload;
}

function minimumTokenWindow(textTokens, queryTokens) {
  const wanted = new Set(queryTokens.filter((token) => !token.startsWith("concept_")));
  if (!wanted.size) return 0;
  let left = 0;
  let best = Infinity;
  const counts = new Map();
  let found = 0;
  for (let right = 0; right < textTokens.length; right += 1) {
    const token = textTokens[right];
    if (wanted.has(token)) {
      counts.set(token, (counts.get(token) || 0) + 1);
      if (counts.get(token) === 1) found += 1;
    }
    while (found === wanted.size && left <= right) {
      best = Math.min(best, right - left + 1);
      const leftToken = textTokens[left];
      if (wanted.has(leftToken)) {
        counts.set(leftToken, counts.get(leftToken) - 1);
        if (counts.get(leftToken) === 0) found -= 1;
      }
      left += 1;
    }
  }
  return Number.isFinite(best) ? best : 0;
}

function taqiyyahEvidence(text) {
  const normalized = normalize(text);
  const explicit = /\b(taqiyya|taqiyyah|taqiyah|dissimulation)\b/.test(normalized) || /تقي[هة]/.test(text);
  const narratorCriticism = /\b(liar|lying|called .{0,50} a liar|accused .{0,50} of lying)\b/i.test(text);
  const contextual = /\b(fear|danger|ruler|secretly|save lives|compelled|contradict(?:s|ed|ory)?)\b/i.test(text);
  if (explicit) {
    return {
      level: "explicit",
      note: "The narration explicitly mentions taqiyyah or dissimulation.",
    };
  }
  if (narratorCriticism) {
    return {
      level: "review",
      note: "Narrator criticism appears in this text. That alone does not establish taqiyyah; contextual review is needed.",
    };
  }
  if (contextual) {
    return {
      level: "context",
      note: "The text contains a coercion, danger, secrecy, or contradiction cue. Scholarly contextual review is needed.",
    };
  }
  return null;
}

async function rerank(query, candidates, queryTokens) {
  const shardIds = [...new Set(candidates.map(({ id }) => manifest.metadata[id][6]))];
  const shards = await Promise.all(shardIds.map(async (shard) => [shard, await loadShard(shard)]));
  const recordMap = new Map(shards.flatMap(([, records]) => records));
  const normalizedQuery = normalize(query);
  const plainQueryTokens = queryTokens.filter((token) => !token.startsWith("concept_"));
  const wellContamination = isWellContaminationQuery(query);

  const ranked = candidates
    .map((candidate) => {
      const meta = manifest.metadata[candidate.id];
      const text = recordMap.get(candidate.id) || "";
      const normalizedText = normalize(text);
      const textTokens = tokensFor(text);
      const matched = plainQueryTokens.filter((token) => normalizedText.includes(token));
      const exactCoverage = plainQueryTokens.length ? new Set(matched).size / new Set(plainQueryTokens).size : 0;
      const phrase = normalizedQuery.length > 3 && normalizedText.includes(normalizedQuery) ? 1 : 0;
      const window = minimumTokenWindow(textTokens, plainQueryTokens);
      const proximity = window ? Math.min(1, plainQueryTokens.length / window) : 0;
      const [titleIndex, collectionIndex, authorIndex, volumeIndex, chapterIndex, imamMask] = meta;
      const title = manifest.strings.titles[titleIndex];
      const chapter = manifest.strings.chapters[chapterIndex];
      const scenarioScore = wellContamination
        ? (/\bwell\b/.test(normalize(`${title} ${chapter}`)) ? 0.45 : 0)
          + (/\b(dog|kalb)\b/.test(normalizedText) ? 0.2 : 0)
          + (/\bwater\b/.test(normalizedText) ? 0.15 : 0)
          + (/\b(bucket|draw|taste|smell|change)\b/.test(normalizedText) ? 0.2 : 0)
        : 0;
      const score = candidate.combined * 0.42
        + exactCoverage * 0.3
        + phrase * 0.18
        + proximity * 0.1
        + scenarioScore * 0.72;
      const strategies = [];
      if (candidate.semantic > 0.08) strategies.push("dense");
      if (candidate.lexical > 0) strategies.push("keyword");
      if (phrase) strategies.push("exact phrase");
      if (Object.values(meta).some(Boolean)) strategies.push("metadata");
      if (meta[8] & 1) strategies.push("instructional intent");
      if (scenarioScore > 0.7) strategies.push("scenario fidelity");
      return {
        id: candidate.id,
        score,
        title,
        collection: manifest.strings.collections[collectionIndex],
        author: manifest.strings.authors[authorIndex],
        volume: manifest.strings.volumes[volumeIndex],
        chapter,
        imams: manifest.imams.filter((_, index) => imamMask & (1 << index)),
        link: meta[7],
        text,
        strategies: [...new Set(strategies)],
        taqiyyah: taqiyyahEvidence(text),
      };
    })
    .sort((a, b) => b.score - a.score);

  // Keep closely related evidence while preventing one repeated chapter from
  // filling the entire answer for a broad question.
  const selected = [];
  const chapterCounts = new Map();
  const chapterLimit = wellContamination ? 5 : 2;
  for (const result of ranked) {
    const chapterKey = normalize(`${result.collection} ${result.chapter}`);
    const count = chapterCounts.get(chapterKey) || 0;
    if (count >= chapterLimit) continue;
    const resultTokens = new Set(tokensFor(result.text));
    const nearDuplicate = selected.some((known) => {
      const knownTokens = new Set(tokensFor(known.text));
      let intersection = 0;
      resultTokens.forEach((token) => {
        if (knownTokens.has(token)) intersection += 1;
      });
      const union = resultTokens.size + knownTokens.size - intersection;
      return union > 0 && intersection / union > 0.9;
    });
    if (nearDuplicate) continue;
    selected.push(result);
    chapterCounts.set(chapterKey, count + 1);
    if (selected.length === 5) break;
  }
  return selected;
}

async function initialize() {
  self.postMessage({ type: "status", message: "Loading local corpus index" });
  let latestManifest;
  try {
    const response = await fetch("/hadith-data/manifest.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Manifest request failed");
    latestManifest = await response.json();
    await writeStored("manifest-current", latestManifest);
  } catch {
    latestManifest = await readStored("manifest-current");
  }
  if (!latestManifest) throw new Error("The local corpus has not been installed yet.");
  manifest = latestManifest;
  const prefix = manifest.version;
  const [denseBuffer, hashBuffer, tfBuffer, lengthBuffer] = await Promise.all([
    fetchAndStore(`${prefix}:dense`, "/hadith-data/dense.bin"),
    fetchAndStore(`${prefix}:lexical-hashes`, "/hadith-data/lexical-hashes.bin"),
    fetchAndStore(`${prefix}:lexical-tf`, "/hadith-data/lexical-tf.bin"),
    fetchAndStore(`${prefix}:document-lengths`, "/hadith-data/document-lengths.bin"),
  ]);
  dense = new Int8Array(denseBuffer);
  lexicalHashes = new Uint32Array(hashBuffer);
  lexicalTf = new Uint8Array(tfBuffer);
  documentLengths = new Uint16Array(lengthBuffer);
  self.postMessage({
    type: "ready",
    manifest: {
      version: manifest.version,
      documentCount: manifest.documentCount,
      shardCount: manifest.shardCount,
      collections: manifest.strings.collections,
      authors: manifest.strings.authors,
      imams: manifest.imams,
    },
  });
}

async function search({ requestId, query, filters }) {
  if (!manifest) await initialize();
  const parsed = parseInlineFilters(query, filters);
  self.postMessage({ type: "status", requestId, message: "Comparing dense and keyword candidates" });
  const started = performance.now();
  const { candidates, tokens } = topCandidates(parsed.cleanQuery, parsed.filters);
  self.postMessage({ type: "status", requestId, message: "Reranking the best 20 narrations" });
  const results = await rerank(parsed.cleanQuery, candidates, tokens);
  self.postMessage({
    type: "results",
    requestId,
    results,
    candidateCount: candidates.length,
    elapsedMs: Math.round(performance.now() - started),
    appliedFilters: parsed.filters,
  });
}

async function downloadAll() {
  if (!manifest) await initialize();
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
