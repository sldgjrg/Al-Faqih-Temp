import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = join(ROOT, "hadith_corpus.md");
const OUTPUT = join(ROOT, "public", "hadith-data");
const DENSE_SIZE = 192;
const LEXICAL_SLOTS = 96;
const SHARD_SIZE = 128;
const INDEX_SCHEMA = "local-rag-v6";

const CP1252 = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

const STOP_WORDS = new Set(
  "a an and are as at be been but by can did do does for from had has have he her him his i if in into is it its may me my no not of on or our said she so than that the their them then there these they this to us was we were what when where which who will with would you your ibn abu bin b narrated following imam allah".split(" ")
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

const AUTHORS = [
  [/al-kafi/i, "Muhammad ibn Ya'qub al-Kulayni"],
  [/man la yahduruhu|al-faqih/i, "Shaykh al-Saduq"],
  [/al-amali|ma.ani al-akhbar|al-tawhid|uyun akhbar/i, "Shaykh al-Saduq"],
  [/tahdhib|al-istibsar/i, "Shaykh al-Tusi"],
  [/nahj al-balagha/i, "Al-Sharif al-Radi"],
  [/kitab al-irshad/i, "Shaykh al-Mufid"],
  [/al-khisal/i, "Shaykh al-Saduq"],
];

const IMAMS = [
  ["Prophet Muhammad", /\b(messenger of allah|prophet(?: muhammad)?|rasul allah)\b/i],
  ["Imam Ali", /\b(amir al-mu[‘’']?minin|commander of the faithful|ali ibn abi talib|ali b\. abi talib)\b/i],
  ["Lady Fatima", /\b(fatima al-zahra|lady fatima|fatimah)\b/i],
  ["Imam Hasan", /\b(hasan ibn ali|al-hasan ibn ali|imam hasan)\b/i],
  ["Imam Husayn", /\b(husayn ibn ali|al-husayn ibn ali|imam husayn)\b/i],
  ["Imam al-Sajjad", /\b(ali ibn al-husayn|zayn al-abidin|al-sajjad)\b/i],
  ["Imam al-Baqir", /\b(abu ja[`‘’']?far|muhammad al-baqir|al-baqir)\b/i],
  ["Imam al-Sadiq", /\b(abu\s*[`‘’']?\s*abd(?:\s+allah|illah)|ja[`‘’']?far al-sadiq|al-sadiq)\b/i],
  ["Imam al-Kazim", /\b(abu al-hassan musa|musa al-kazim|al-kazim)\b/i],
  ["Imam al-Rida", /\b(ali (?:ibn|b\.) musa al-rida|imam al-rida|al-ridha)\b/i],
  ["Imam al-Jawad", /\b(muhammad al-jawad|al-jawad|abu ja['’]?far al-thani)\b/i],
  ["Imam al-Hadi", /\b(ali al-hadi|al-hadi|abu al-hassan al-thalith)\b/i],
  ["Imam al-Askari", /\b(hasan al-askari|al-askari|abu muhammad)\b/i],
  ["Imam al-Mahdi", /\b(al-mahdi|imam mahdi|al-qa[‘’']?im|master of the age)\b/i],
];

function repairMojibake(value) {
  let text = value;
  for (let pass = 0; pass < 2 && /[ÃÂØÙâ]/.test(text); pass += 1) {
    const bytes = [];
    let convertible = true;
    for (const char of text) {
      const code = char.codePointAt(0);
      if (code <= 0xff) bytes.push(code);
      else if (CP1252.has(code)) bytes.push(CP1252.get(code));
      else {
        convertible = false;
        break;
      }
    }
    if (!convertible) break;
    const repaired = Buffer.from(bytes).toString("utf8");
    if ((repaired.match(/\uFFFD/g) || []).length > (text.match(/\uFFFD/g) || []).length) break;
    text = repaired;
  }
  return text;
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

function hash(value, seed = 2166136261) {
  let result = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function collectionFrom(title) {
  const withoutVolume = title.split(/\s+-\s+Volume/i)[0];
  return withoutVolume.split(":")[0].replace(/^The\s+/i, "").trim() || "Unknown collection";
}

function authorFrom(collection) {
  return AUTHORS.find(([pattern]) => pattern.test(collection))?.[1] || "Compiler not identified";
}

function detectImams(text) {
  let mask = 0;
  IMAMS.forEach(([, pattern], index) => {
    if (pattern.test(text)) mask |= 1 << index;
  });
  return mask;
}

function detectIntent(text) {
  const normalized = normalize(text);
  let mask = 0;
  if (
    /do you know how to (?:perform )?(?:pray|salah)|teach me (?:how to perform )?(?:the prayer|prayer|salah)|pray this way|perform salah like this|stood (?:up straight )?facing the (?:direction of )?qibla/.test(normalized)
  ) {
    mask |= 1;
  }
  const proceduralTerms = ["qibla", "takbir", "ruku", "sajd", "prostrat", "rakah", "recit"];
  const proceduralMatches = proceduralTerms.filter((term) => normalized.includes(term)).length;
  if (proceduralMatches >= 4 && /\b(pray|prayer|salah)\b/.test(normalized)) mask |= 2;
  return mask;
}

function parseRecord(block, id) {
  const repaired = repairMojibake(block).trim();
  const title = repaired.match(/^###\s+(.+)$/m)?.[1]?.trim() || `Narration ${id + 1}`;
  const link = repaired.match(/\[Link\]\((https?:\/\/[^)]+)\)/i)?.[1] || "";
  const collection = collectionFrom(title);
  const volume = title.match(/\bVolume\s+([^:,-]+)/i)?.[1]?.trim() || "";
  const chapter = title.includes(":") ? title.slice(title.indexOf(":") + 1).trim() : title;
  return {
    id,
    title,
    collection,
    author: authorFrom(collection),
    volume,
    chapter,
    imamMask: detectImams(repaired),
    intentMask: detectIntent(repaired),
    link,
    text: repaired,
  };
}

function denseVector(record, tokens) {
  const vector = new Float32Array(DENSE_SIZE);
  const titleTokens = tokensFor(`${record.title} ${record.chapter}`);
  const add = (feature, weight) => {
    const h = hash(feature);
    const index = h % DENSE_SIZE;
    const sign = hash(feature, 0x9e3779b9) & 1 ? 1 : -1;
    vector[index] += sign * weight;
  };

  for (const token of tokens) add(`w:${token}`, token.startsWith("concept_") ? 2.3 : 1);
  for (const token of titleTokens) add(`w:${token}`, 2.6);
  for (let index = 0; index < tokens.length - 1; index += 1) {
    add(`b:${tokens[index]}_${tokens[index + 1]}`, 0.55);
  }

  const title = normalize(record.title);
  for (let index = 0; index < title.length - 2; index += 1) {
    add(`c:${title.slice(index, index + 3)}`, 0.25);
  }

  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vector, (value) => Math.max(-127, Math.min(127, Math.round((value / norm) * 110))));
}

async function main() {
  const raw = await readFile(INPUT, "utf8");
  const blocks = raw.split(/^\s*---\s*$/m).filter((block) => block.trim());
  const records = blocks.map(parseRecord);
  const tokenCache = new Array(records.length);
  const documentFrequency = new Map();

  console.log(`Parsing ${records.length.toLocaleString()} narrations...`);
  records.forEach((record, index) => {
    const tokens = tokensFor(`${record.title} ${record.text}`);
    tokenCache[index] = tokens;
    const hashes = new Set(tokens.map((token) => hash(token)));
    hashes.forEach((termHash) => documentFrequency.set(termHash, (documentFrequency.get(termHash) || 0) + 1));
  });

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(join(OUTPUT, "shards"), { recursive: true });

  const dense = new Int8Array(records.length * DENSE_SIZE);
  const lexicalHashes = new Uint32Array(records.length * LEXICAL_SLOTS);
  const lexicalTf = new Uint8Array(records.length * LEXICAL_SLOTS);
  const docLengths = new Uint16Array(records.length);

  const strings = {
    titles: [],
    collections: [],
    authors: [],
    volumes: [],
    chapters: [],
  };
  const stringMaps = Object.fromEntries(Object.keys(strings).map((key) => [key, new Map()]));
  const intern = (kind, value) => {
    const known = stringMaps[kind].get(value);
    if (known !== undefined) return known;
    const index = strings[kind].length;
    strings[kind].push(value);
    stringMaps[kind].set(value, index);
    return index;
  };

  const metadata = records.map((record, index) => {
    const tokens = tokenCache[index];
    docLengths[index] = Math.min(65535, tokens.length);
    dense.set(denseVector(record, tokens), index * DENSE_SIZE);

    const counts = new Map();
    for (const token of tokens) {
      const termHash = hash(token);
      counts.set(termHash, Math.min(255, (counts.get(termHash) || 0) + 1));
    }
    const rankedTerms = [...counts.entries()]
      .map(([termHash, tf]) => {
        const df = documentFrequency.get(termHash) || 1;
        const idf = Math.log(1 + (records.length - df + 0.5) / (df + 0.5));
        return [termHash, tf, (1 + Math.log(tf)) * idf];
      })
      .sort((a, b) => b[2] - a[2])
      .slice(0, LEXICAL_SLOTS);
    rankedTerms.forEach(([termHash, tf], slot) => {
      const offset = index * LEXICAL_SLOTS + slot;
      lexicalHashes[offset] = termHash;
      lexicalTf[offset] = tf;
    });

    return [
      intern("titles", record.title),
      intern("collections", record.collection),
      intern("authors", record.author),
      intern("volumes", record.volume),
      intern("chapters", record.chapter),
      record.imamMask,
      Math.floor(index / SHARD_SIZE),
      record.link,
      record.intentMask,
    ];
  });

  const shardCount = Math.ceil(records.length / SHARD_SIZE);
  for (let shard = 0; shard < shardCount; shard += 1) {
    const start = shard * SHARD_SIZE;
    const payload = records.slice(start, start + SHARD_SIZE).map(({ id, text }) => [id, text]);
    await writeFile(
      join(OUTPUT, "shards", `${String(shard).padStart(3, "0")}.json`),
      JSON.stringify(payload),
    );
  }

  const averageLength = docLengths.reduce((sum, length) => sum + length, 0) / records.length;
  const df = Object.fromEntries(
    [...documentFrequency.entries()]
      .filter(([, frequency]) => frequency < records.length * 0.75)
      .map(([termHash, frequency]) => [termHash.toString(36), frequency]),
  );
  const version = `${INDEX_SCHEMA}-${records.length}-${hash(`${INDEX_SCHEMA}:${raw}`).toString(36)}`;
  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    documentCount: records.length,
    denseSize: DENSE_SIZE,
    lexicalSlots: LEXICAL_SLOTS,
    shardSize: SHARD_SIZE,
    shardCount,
    averageLength,
    imams: IMAMS.map(([name]) => name),
    strings,
    metadata,
    df,
  };

  await Promise.all([
    writeFile(join(OUTPUT, "manifest.json"), JSON.stringify(manifest)),
    writeFile(join(OUTPUT, "dense.bin"), dense),
    writeFile(join(OUTPUT, "lexical-hashes.bin"), Buffer.from(lexicalHashes.buffer)),
    writeFile(join(OUTPUT, "lexical-tf.bin"), lexicalTf),
    writeFile(join(OUTPUT, "document-lengths.bin"), Buffer.from(docLengths.buffer)),
  ]);

  console.log(`Local index ${version} written to ${OUTPUT}`);
  console.log(`${shardCount} shards, ${DENSE_SIZE} dense dimensions, ${LEXICAL_SLOTS} lexical slots`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
