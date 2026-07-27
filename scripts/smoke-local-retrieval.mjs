import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "public", "hadith-data");
const STOP_WORDS = new Set(
  "a an and are as at be been but by can did do does for from had has have he her him his i if in into is it its may me my no not of on or our said she so than that the their them then there these they this to us was we were what when where which who will with would you your ibn abu bin b narrated following imam allah".split(" "),
);
const CONCEPTS = {
  ablution: ["wudu", "wudhu", "wuzu", "ablution"],
  prayer: ["salah", "salat", "namaz", "prayer"],
  taqiyyah: ["taqiyya", "taqiyyah", "taqiyah", "dissimulation"],
  purity: ["taharah", "tahara", "purity", "clean"],
  marriage: ["nikah", "marriage", "wife", "husband"],
  water: ["water", "pani", "maa", "ma"],
  well: ["well", "bir", "bi'r", "kuan", "kuaa", "khooh"],
  dog: ["dog", "kalb", "kutta", "kutte"],
};
const ALIASES = new Map();
for (const [concept, values] of Object.entries(CONCEPTS)) {
  values.forEach((value) => ALIASES.set(value, concept));
}

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g, "")
    .toLowerCase().replace(/[^\p{L}\p{N}']+/gu, " ").trim();
}

function stem(token) {
  if (token.length < 5 || /[^\u0000-\u007f]/.test(token)) return token;
  return token.replace(/(?:ization|ational|fulness|ousness|iveness)$/u, "")
    .replace(/(?:ingly|edly|ments|ment|ation|ities)$/u, "")
    .replace(/(?:ing|ers|ies|ied|ed|es|s)$/u, "");
}

function tokensFor(value) {
  return normalize(value).split(/\s+/).filter((token) => token && !STOP_WORDS.has(token)).flatMap((raw) => {
    const token = stem(raw);
    const concept = ALIASES.get(raw) || ALIASES.get(token);
    return concept ? [token, `concept_${concept}`] : [token];
  });
}

function expandInstructionalIntent(query, tokens) {
  const normalized = normalize(query);
  const expanded = [...tokens];
  if (
    /\b(how|teach|learn|demonstrat|perform|method|way)\b/.test(normalized)
    && /\b(pray|prayer|salah|salat|namaz)\b/.test(normalized)
  ) {
    expanded.push("hammad", "teach", "prayer", "qibla", "bow", "prostrate", "ruku", "sujud", "rakah", "concept_prayer");
  }
  if (/\b(sadiq|abu abdillah|abu abd allah)\b/.test(normalized)) expanded.push("abdillah", "sadiq");
  if (isWellContaminationQuery(query)) {
    expanded.push(
      "well", "water", "dog", "bucket", "draw", "taste", "smell", "change",
      "concept_well", "concept_water", "concept_dog", "concept_ablution", "concept_purity",
    );
  }
  return expanded;
}

function isWellContaminationQuery(query) {
  const normalized = normalize(query);
  return /\b(well|bir|kuan|kuaa|khooh)\b/.test(normalized)
    && /\b(dog|kalb|kutta|kutte|animal|fell|fall)\b/.test(normalized)
    && /\b(water|pani|wudu|wudhu|wuzu|ablution|purity)\b/.test(normalized);
}

function hash(value, seed = 2166136261) {
  let result = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

const manifest = JSON.parse(await readFile(join(ROOT, "manifest.json"), "utf8"));
const denseFile = await readFile(join(ROOT, "dense.bin"));
const dense = new Int8Array(denseFile.buffer, denseFile.byteOffset, denseFile.byteLength);
const hashesFile = await readFile(join(ROOT, "lexical-hashes.bin"));
const lexicalHashes = new Uint32Array(
  hashesFile.buffer,
  hashesFile.byteOffset,
  hashesFile.byteLength / Uint32Array.BYTES_PER_ELEMENT,
);
const lexicalTfFile = await readFile(join(ROOT, "lexical-tf.bin"));
const lexicalTf = new Uint8Array(lexicalTfFile.buffer, lexicalTfFile.byteOffset, lexicalTfFile.byteLength);
const lengthsFile = await readFile(join(ROOT, "document-lengths.bin"));
const documentLengths = new Uint16Array(
  lengthsFile.buffer,
  lengthsFile.byteOffset,
  lengthsFile.byteLength / Uint16Array.BYTES_PER_ELEMENT,
);

function vectorFor(query, tokens) {
  const vector = new Float32Array(manifest.denseSize);
  const add = (feature, weight) => {
    const featureHash = hash(feature);
    const sign = hash(feature, 0x9e3779b9) & 1 ? 1 : -1;
    vector[featureHash % manifest.denseSize] += sign * weight;
  };
  tokens.forEach((token) => add(`w:${token}`, token.startsWith("concept_") ? 2.3 : 1));
  for (let index = 0; index < tokens.length - 1; index += 1) add(`b:${tokens[index]}_${tokens[index + 1]}`, 0.55);
  const normalized = normalize(query);
  for (let index = 0; index < normalized.length - 2; index += 1) add(`c:${normalized.slice(index, index + 3)}`, 0.25);
  const norm = Math.hypot(...vector) || 1;
  return Array.from(vector, (value) => Math.round((value / norm) * 110));
}

async function search(query) {
  const tokens = [...new Set(expandInstructionalIntent(query, tokensFor(query)))];
  const wellContamination = isWellContaminationQuery(query);
  const normalizedQueryForIntent = normalize(query);
  const prayerInstruction = /\b(how|teach|learn|demonstrat|perform|method|way)\b/.test(normalizedQueryForIntent)
    && /\b(pray|prayer|salah|salat|namaz)\b/.test(normalizedQueryForIntent);
  const queryHashes = new Set(tokens.map(hash));
  const vector = vectorFor(query, tokens);
  const candidates = [];
  for (let id = 0; id < manifest.documentCount; id += 1) {
    let semantic = 0;
    const denseOffset = id * manifest.denseSize;
    for (let dimension = 0; dimension < manifest.denseSize; dimension += 1) {
      semantic += dense[denseOffset + dimension] * vector[dimension];
    }
    semantic /= 12100;
    let lexical = 0;
    const lexicalOffset = id * manifest.lexicalSlots;
    for (let slot = 0; slot < manifest.lexicalSlots; slot += 1) {
      const termHash = lexicalHashes[lexicalOffset + slot];
      if (queryHashes.has(termHash)) {
        const tf = lexicalTf[lexicalOffset + slot];
        const df = manifest.df[termHash.toString(36)] || manifest.documentCount;
        const idf = Math.log(1 + (manifest.documentCount - df + 0.5) / (df + 0.5));
        const lengthNorm = 0.25 + 0.75 * (documentLengths[id] / manifest.averageLength);
        lexical += idf * ((tf * 2.2) / (tf + 1.2 * lengthNorm));
      }
    }
    const intentMask = manifest.metadata[id][8] || 0;
    const intentBoost = prayerInstruction ? ((intentMask & 1) ? 0.72 : (intentMask & 2) ? 0.16 : 0) : 0;
    const titleIndex = manifest.metadata[id][0];
    const chapterIndex = manifest.metadata[id][4];
    const titleText = normalize(`${manifest.strings.titles[titleIndex]} ${manifest.strings.chapters[chapterIndex]}`);
    const scenarioBoost = wellContamination && /\bwell\b/.test(titleText) ? 0.62 : 0;
    const combined = semantic * 0.48 + (1 - Math.exp(-lexical / 7)) * 0.37 + intentBoost + scenarioBoost;
    candidates.push({ id, semantic, lexical, combined });
  }
  const lanes = [
    [...candidates].sort((a, b) => b.semantic - a.semantic).slice(0, 60),
    [...candidates].filter(({ lexical }) => lexical > 0).sort((a, b) => b.lexical - a.lexical).slice(0, 60),
    [...candidates].sort((a, b) => b.combined - a.combined).slice(0, 60),
  ];
  const fused = new Map();
  lanes.forEach((lane, laneIndex) => lane.forEach((candidate, rank) => {
    const known = fused.get(candidate.id) || { ...candidate, score: candidate.combined };
    known.score += (2.4 * (laneIndex === 1 ? 1.35 : 1)) / (35 + rank);
    fused.set(candidate.id, known);
  }));
  const top = [...fused.values()].sort((a, b) => b.score - a.score).slice(0, 20);
  const shards = new Map();
  for (const candidate of top) {
    const shard = manifest.metadata[candidate.id][6];
    if (!shards.has(shard)) {
      const payload = JSON.parse(await readFile(join(ROOT, "shards", `${String(shard).padStart(3, "0")}.json`), "utf8"));
      shards.set(shard, new Map(payload));
    }
    candidate.preview = shards.get(shard).get(candidate.id).split("\n").find((line) => line && !line.startsWith("#"))?.slice(0, 100);
    candidate.link = manifest.metadata[candidate.id][7];
    candidate.title = manifest.strings.titles[manifest.metadata[candidate.id][0]];
    candidate.chapter = manifest.strings.chapters[manifest.metadata[candidate.id][4]];
  }
  const normalizedQuery = normalize(query);
  const plainTokens = tokens.filter((token) => !token.startsWith("concept_"));
  top.forEach((candidate) => {
    const text = shards.get(manifest.metadata[candidate.id][6]).get(candidate.id);
    const normalizedText = normalize(text);
    const coverage = plainTokens.filter((token) => normalizedText.includes(token)).length / (plainTokens.length || 1);
    const phrase = normalizedText.includes(normalizedQuery) ? 1 : 0;
    const scenarioScore = wellContamination
      ? (/\bwell\b/.test(normalize(`${candidate.title} ${candidate.chapter}`)) ? 0.45 : 0)
        + (/\b(dog|kalb)\b/.test(normalizedText) ? 0.2 : 0)
        + (/\bwater\b/.test(normalizedText) ? 0.15 : 0)
        + (/\b(bucket|draw|taste|smell|change)\b/.test(normalizedText) ? 0.2 : 0)
      : 0;
    candidate.score = candidate.combined * 0.42 + coverage * 0.3 + phrase * 0.18 + scenarioScore * 0.72;
  });
  return top.sort((a, b) => b.score - a.score).slice(0, 5);
}

for (const query of process.argv.slice(2)) {
  console.log(`\nQUERY: ${query}`);
  for (const result of await search(query)) {
    console.log(`${result.score.toFixed(3)} ${result.link} ${result.title}`);
  }
}
