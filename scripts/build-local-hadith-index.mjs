// import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
// import { dirname, join } from "node:path";
// import { fileURLToPath } from "node:url";

// import {
//   BODY_SLOTS,
//   PASSAGE_SIZE,
//   PASSAGE_SLOTS,
//   PASSAGE_STRIDE,
//   featuresForTokens,
//   hashFeature,
//   inverseDocumentFrequency,
//   tokenize,
// } from "../public/hadith-retrieval-core.mjs";

// const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// const INPUT = join(ROOT, "hadith_corpus.md");
// const OUTPUT = join(ROOT, "public", "hadith-data");
// const SHARD_SIZE = 128;
// const INDEX_SCHEMA = "local-rag-v13-passages";
// const PHRASE_BUCKETS = 1 << 22;
// const PHRASE_BUCKET_MASK = PHRASE_BUCKETS - 1;

// const CP1252 = new Map([
//   [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
//   [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
//   [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
//   [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
//   [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
//   [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
//   [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
// ]);

// const AUTHORS = [
//   [/al-kafi/i, "Muhammad ibn Ya'qub al-Kulayni"],
//   [/man la yahduruhu|al-faqih/i, "Shaykh al-Saduq"],
//   [/al-amali|ma.ani al-akhbar|al-tawhid|uyun akhbar/i, "Shaykh al-Saduq"],
//   [/tahdhib|al-istibsar/i, "Shaykh al-Tusi"],
//   [/nahj al-balagha/i, "Al-Sharif al-Radi"],
//   [/kitab al-irshad/i, "Shaykh al-Mufid"],
//   [/al-khisal/i, "Shaykh al-Saduq"],
// ];

// const IMAMS = [
//   ["Prophet Muhammad", /\b(messenger of allah|prophet(?: muhammad)?|rasul allah)\b/i],
//   ["Imam Ali", /\b(amir al-mu[‘’']?minin|commander of the faithful|ali ibn abi talib|ali b\. abi talib)\b/i],
//   ["Lady Fatima", /\b(fatima al-zahra|lady fatima|fatimah)\b/i],
//   ["Imam Hasan", /\b(hasan ibn ali|al-hasan ibn ali|imam hasan)\b/i],
//   ["Imam Husayn", /\b(husayn ibn ali|al-husayn ibn ali|imam husayn)\b/i],
//   ["Imam al-Sajjad", /\b(ali ibn al-husayn|zayn al-abidin|al-sajjad)\b/i],
//   ["Imam al-Baqir", /\b(abu ja[`‘’']?far|muhammad al-baqir|al-baqir)\b/i],
//   ["Imam al-Sadiq", /\b(abu\s*[`‘’']?\s*abd(?:\s+allah|illah)|ja[`‘’']?far al-sadiq|al-sadiq)\b/i],
//   ["Imam al-Kazim", /\b(abu al-hassan musa|musa al-kazim|al-kazim)\b/i],
//   ["Imam al-Rida", /\b(ali (?:ibn|b\.) musa al-rida|imam al-rida|al-ridha)\b/i],
//   ["Imam al-Jawad", /\b(muhammad al-jawad|al-jawad|abu ja['’]?far al-thani)\b/i],
//   ["Imam al-Hadi", /\b(ali al-hadi|al-hadi|abu al-hassan al-thalith)\b/i],
//   ["Imam al-Askari", /\b(hasan al-askari|al-askari|abu muhammad)\b/i],
//   ["Imam al-Mahdi", /\b(al-mahdi|imam mahdi|al-qa[‘’']?im|master of the age)\b/i],
// ];

// function repairMojibake(value) {
//   let text = value;
//   for (let pass = 0; pass < 2 && /[ÃÂØÙâ]/.test(text); pass += 1) {
//     const bytes = [];
//     let convertible = true;
//     for (const character of text) {
//       const code = character.codePointAt(0);
//       if (code <= 0xff) bytes.push(code);
//       else if (CP1252.has(code)) bytes.push(CP1252.get(code));
//       else {
//         convertible = false;
//         break;
//       }
//     }
//     if (!convertible) break;
//     const repaired = Buffer.from(bytes).toString("utf8");
//     if ((repaired.match(/\uFFFD/g) || []).length > (text.match(/\uFFFD/g) || []).length) break;
//     text = repaired;
//   }
//   return text;
// }

// function collectionFrom(title) {
//   const withoutVolume = title.split(/\s+-\s+Volume/i)[0];
//   return withoutVolume.split(":")[0].replace(/^The\s+/i, "").trim() || "Unknown collection";
// }

// function authorFrom(collection) {
//   return AUTHORS.find(([pattern]) => pattern.test(collection))?.[1] || "Compiler not identified";
// }

// function detectImams(text) {
//   let mask = 0;
//   IMAMS.forEach(([, pattern], index) => {
//     if (pattern.test(text)) mask |= 1 << index;
//   });
//   return mask;
// }

// function parseRecord(block, id) {
//   const repaired = repairMojibake(block).trim();
//   const title = repaired.match(/^###\s+(.+)$/m)?.[1]?.trim() || `Narration ${id + 1}`;
//   const link = repaired.match(/\[Link\]\((https?:\/\/[^)]+)\)/i)?.[1] || "";
//   const collection = collectionFrom(title);
//   const volume = title.match(/\bVolume\s+([^:,-]+)/i)?.[1]?.trim() || "";
//   const chapter = title.includes(":") ? title.slice(title.indexOf(":") + 1).trim() : title;
//   return {
//     id,
//     title,
//     collection,
//     author: authorFrom(collection),
//     volume,
//     chapter,
//     imamMask: detectImams(repaired),
//     link,
//     text: repaired,
//   };
// }

// function bodyFromRecord(text) {
//   return text
//     .replace(/^###\s+.*(?:\r?\n|$)/, "")
//     .replace(/\r?\n?\[Link\]\(https?:\/\/[^)]+\)\s*$/i, "")
//     .trim();
// }

// function passagesForTokens(tokens) {
//   if (!tokens.length) return [[]];
//   if (tokens.length <= PASSAGE_SIZE) return [tokens];
//   const finalStart = tokens.length - PASSAGE_SIZE;
//   const starts = [];
//   for (let start = 0; start <= finalStart; start += PASSAGE_STRIDE) {
//     starts.push(start);
//   }
//   if (starts.at(-1) !== finalStart) {
//     if (finalStart - starts.at(-1) < PASSAGE_STRIDE / 2) starts[starts.length - 1] = finalStart;
//     else starts.push(finalStart);
//   }
//   return starts.map((start) => tokens.slice(start, start + PASSAGE_SIZE));
// }

// function increment(map, key) {
//   map.set(key, (map.get(key) || 0) + 1);
// }

// function isLatinToken(token) {
//   return /^[a-z][a-z0-9]{2,}$/u.test(token);
// }

// function isArabicToken(token) {
//   return token.length >= 2 && /[\u0600-\u06ff]/u.test(token);
// }

// function associationScore(totalDocuments, sourceFrequency, targetFrequency, cooccurrence) {
//   const lift = (cooccurrence * totalDocuments) / (sourceFrequency * targetFrequency);
//   if (lift <= 1) return 0;
//   const pointwiseInformation = Math.log(lift);
//   const normalizedInformation = pointwiseInformation / Math.max(1, Math.log(totalDocuments / cooccurrence));
//   const overlap = (2 * cooccurrence) / (sourceFrequency + targetFrequency);
//   return Math.max(0, normalizedInformation) * 0.72 + overlap * 0.28;
// }

// function buildCrossLanguageAssociations(records, tokenCache, tokenDocumentFrequency) {
//   const latinDocuments = new Map();
//   const arabicDocuments = new Map();
//   const latinByDocument = new Array(records.length);
//   const arabicByDocument = new Array(records.length);

//   tokenCache.forEach((tokens, documentId) => {
//     const unique = [...new Set(tokens)];
//     const latin = unique
//       .filter((token) => {
//         const frequency = tokenDocumentFrequency.get(token) || 0;
//         return isLatinToken(token) && frequency >= 2 && frequency <= 1_200;
//       })
//       .sort((left, right) => (
//         (tokenDocumentFrequency.get(left) || 0) - (tokenDocumentFrequency.get(right) || 0)
//         || left.localeCompare(right)
//       ))
//       .slice(0, 128);
//     const arabic = unique
//       .filter((token) => {
//         const frequency = tokenDocumentFrequency.get(token) || 0;
//         return isArabicToken(token) && frequency >= 2 && frequency <= 2_000;
//       })
//       .sort((left, right) => (
//         (tokenDocumentFrequency.get(left) || 0) - (tokenDocumentFrequency.get(right) || 0)
//         || left.localeCompare(right)
//       ))
//       .slice(0, 128);
//     latinByDocument[documentId] = latin;
//     arabicByDocument[documentId] = arabic;

//     for (const token of latin) {
//       const documents = latinDocuments.get(token);
//       if (documents) documents.push(documentId);
//       else latinDocuments.set(token, [documentId]);
//     }
//     for (const token of arabic) {
//       const documents = arabicDocuments.get(token);
//       if (documents) documents.push(documentId);
//       else arabicDocuments.set(token, [documentId]);
//     }
//   });

//   // A bilingual edge must be strong in both directions. This prevents a rare
//   // English word from inheriting every Arabic word in a long parallel record.
//   const reciprocalSources = new Map();
//   for (const [targetToken, documents] of arabicDocuments) {
//     const cooccurrence = new Map();
//     for (const documentId of documents) {
//       for (const sourceToken of latinByDocument[documentId]) increment(cooccurrence, sourceToken);
//     }
//     const targetFrequency = tokenDocumentFrequency.get(targetToken) || documents.length;
//     const ranked = [...cooccurrence.entries()]
//       .map(([sourceToken, count]) => [
//         sourceToken,
//         associationScore(
//           records.length,
//           tokenDocumentFrequency.get(sourceToken) || 1,
//           targetFrequency,
//           count,
//         ),
//         count,
//       ])
//       .filter(([, score, count]) => score >= 0.12 && (count >= 2 || targetFrequency <= 3))
//       .sort((left, right) => right[1] - left[1] || right[2] - left[2])
//       .slice(0, 12);
//     if (ranked.length) {
//       reciprocalSources.set(targetToken, new Map(ranked.map(([token, score]) => [token, score])));
//     }
//   }

//   const associations = {};
//   const reverseCandidates = new Map();
//   let associationCount = 0;
//   for (const [sourceToken, documents] of latinDocuments) {
//     const cooccurrence = new Map();
//     for (const documentId of documents) {
//       for (const targetToken of arabicByDocument[documentId]) increment(cooccurrence, targetToken);
//     }
//     const sourceFrequency = tokenDocumentFrequency.get(sourceToken) || documents.length;
//     const limit = sourceFrequency <= 3 ? 8 : 6;
//     const ranked = [...cooccurrence.entries()]
//       .map(([targetToken, count]) => {
//         const targetFrequency = tokenDocumentFrequency.get(targetToken) || 1;
//         const forward = associationScore(
//           records.length,
//           sourceFrequency,
//           targetFrequency,
//           count,
//         );
//         const reverse = reciprocalSources.get(targetToken)?.get(sourceToken) || 0;
//         return [
//           targetToken,
//           Math.sqrt(forward * reverse),
//           count,
//         ];
//       })
//       .filter(([, score, count]) => score >= 0.12 && (count >= 2 || sourceFrequency <= 3))
//       .sort((left, right) => right[1] - left[1] || right[2] - left[2])
//       .slice(0, limit)
//       .map(([targetToken, score]) => [
//         hashFeature(`u:${targetToken}`),
//         Math.max(1, Math.min(255, Math.round(score * 255))),
//       ]);
//     if (!ranked.length) continue;
//     const sourceFeatureHash = hashFeature(`u:${sourceToken}`);
//     associations[sourceFeatureHash.toString(36)] = ranked;
//     for (const [targetFeatureHash, encodedWeight] of ranked) {
//       const reverse = reverseCandidates.get(targetFeatureHash) || [];
//       reverse.push([sourceFeatureHash, encodedWeight]);
//       reverseCandidates.set(targetFeatureHash, reverse);
//     }
//     associationCount += ranked.length;
//   }

//   for (const [sourceFeatureHash, candidates] of reverseCandidates) {
//     const ranked = candidates
//       .sort((left, right) => right[1] - left[1])
//       .slice(0, 6);
//     associations[sourceFeatureHash.toString(36)] = ranked;
//     associationCount += ranked.length;
//   }

//   return { associations, associationCount };
// }

// function phraseTypeWeight(feature) {
//   if (feature.startsWith("t:")) return 1.2;
//   if (feature.startsWith("b:")) return 1.05;
//   return 0.9;
// }

// async function main() {
//   const [raw, coreSource] = await Promise.all([
//     readFile(INPUT, "utf8"),
//     readFile(join(ROOT, "public", "hadith-retrieval-core.mjs"), "utf8"),
//   ]);
//   const blocks = raw.split(/^\s*---\s*$/m).filter((block) => block.trim());
//   const records = blocks.map(parseRecord);
//   const tokenCache = new Array(records.length);
//   const tokenDocumentFrequency = new Map();
//   const bodyFeatureFrequency = new Map();
//   const phraseFrequency = new Uint32Array(PHRASE_BUCKETS);
//   let passageCount = 0;
//   let totalPassageLength = 0;

//   console.log(`Parsing ${records.length.toLocaleString()} narrations into local passages...`);
//   records.forEach((record, index) => {
//     const tokens = tokenize(bodyFromRecord(record.text));
//     tokenCache[index] = tokens;
//     for (const token of new Set(tokens)) increment(tokenDocumentFrequency, token);

//     for (const passage of passagesForTokens(tokens)) {
//       passageCount += 1;
//       totalPassageLength += passage.length;
//       const bodyHashes = new Set();
//       const phraseBuckets = new Set();
//       for (const feature of featuresForTokens(passage)) {
//         const featureHash = hashFeature(feature.feature);
//         if (feature.type === "body") bodyHashes.add(featureHash);
//         else phraseBuckets.add(featureHash & PHRASE_BUCKET_MASK);
//       }
//       for (const featureHash of bodyHashes) increment(bodyFeatureFrequency, featureHash);
//       for (const bucket of phraseBuckets) phraseFrequency[bucket] += 1;
//     }
//   });

//   console.log(`Learning cross-language terms from ${records.length.toLocaleString()} parallel records...`);
//   const { associations: crossLanguage, associationCount } = buildCrossLanguageAssociations(
//     records,
//     tokenCache,
//     tokenDocumentFrequency,
//   );

//   await rm(OUTPUT, { recursive: true, force: true });
//   await mkdir(join(OUTPUT, "shards"), { recursive: true });

//   const passageHashes = new Uint32Array(passageCount * PASSAGE_SLOTS);
//   const passageWeights = new Uint8Array(passageCount * PASSAGE_SLOTS);
//   const passageDocuments = new Uint16Array(passageCount);
//   const passageLengths = new Uint8Array(passageCount);
//   const strings = {
//     titles: [],
//     collections: [],
//     authors: [],
//     volumes: [],
//     chapters: [],
//   };
//   const stringMaps = Object.fromEntries(Object.keys(strings).map((key) => [key, new Map()]));
//   const intern = (kind, value) => {
//     const known = stringMaps[kind].get(value);
//     if (known !== undefined) return known;
//     const index = strings[kind].length;
//     strings[kind].push(value);
//     stringMaps[kind].set(value, index);
//     return index;
//   };

//   const metadata = records.map((record, index) => [
//     intern("titles", record.title),
//     intern("collections", record.collection),
//     intern("authors", record.author),
//     intern("volumes", record.volume),
//     intern("chapters", record.chapter),
//     record.imamMask,
//     Math.floor(index / SHARD_SIZE),
//     record.link,
//   ]);

//   console.log(`Selecting evidence features for ${passageCount.toLocaleString()} passages...`);
//   let passageId = 0;
//   tokenCache.forEach((tokens, documentId) => {
//     for (const passage of passagesForTokens(tokens)) {
//       passageDocuments[passageId] = documentId;
//       passageLengths[passageId] = Math.min(255, passage.length);
//       const features = featuresForTokens(passage);
//       const body = features
//         .filter(({ type }) => type === "body")
//         .map((feature) => {
//           const featureHash = hashFeature(feature.feature);
//           const frequency = bodyFeatureFrequency.get(featureHash) || 1;
//           const idf = inverseDocumentFrequency(passageCount, frequency);
//           const isUnigram = feature.feature.startsWith("u:");
//           return { ...feature, featureHash, idf, rank: idf * (isUnigram ? 1 : 0.24), isUnigram };
//         });
//       const unigrams = body
//         .filter(({ isUnigram }) => isUnigram)
//         .sort((left, right) => right.rank - left.rank);
//       const prefixes = body
//         .filter(({ isUnigram }) => !isUnigram)
//         .sort((left, right) => right.rank - left.rank);
//       const selectedBody = unigrams.slice(0, BODY_SLOTS);
//       if (selectedBody.length < BODY_SLOTS) {
//         selectedBody.push(...prefixes.slice(0, BODY_SLOTS - selectedBody.length));
//       }
//       const selectedPhrases = features
//         .filter(({ type }) => type === "phrase")
//         .map((feature) => {
//           const featureHash = hashFeature(feature.feature);
//           const frequency = Math.max(1, phraseFrequency[featureHash & PHRASE_BUCKET_MASK]);
//           const idf = inverseDocumentFrequency(passageCount, frequency);
//           return {
//             ...feature,
//             featureHash,
//             idf,
//             rank: idf * phraseTypeWeight(feature.feature) * (1 + Math.log(Math.max(1, feature.tf))),
//           };
//         })
//         .sort((left, right) => right.rank - left.rank)
//         .slice(0, PASSAGE_SLOTS - BODY_SLOTS);
//       [...selectedBody, ...selectedPhrases].forEach((feature, slot) => {
//         const offset = passageId * PASSAGE_SLOTS + slot;
//         passageHashes[offset] = feature.featureHash;
//         const termWeight = feature.idf * (1 + Math.log(Math.max(1, feature.tf)));
//         passageWeights[offset] = Math.max(1, Math.min(255, Math.round(termWeight * 28)));
//       });
//       passageId += 1;
//     }
//   });

//   const shardCount = Math.ceil(records.length / SHARD_SIZE);
//   for (let shard = 0; shard < shardCount; shard += 1) {
//     const start = shard * SHARD_SIZE;
//     const payload = records.slice(start, start + SHARD_SIZE).map(({ id, text }) => [id, text]);
//     await writeFile(
//       join(OUTPUT, "shards", `${String(shard).padStart(3, "0")}.json`),
//       JSON.stringify(payload),
//     );
//   }

//   const df = Object.fromEntries(
//     [...bodyFeatureFrequency.entries()]
//       .filter(([, frequency]) => frequency < passageCount * 0.9)
//       .map(([featureHash, frequency]) => [featureHash.toString(36), frequency]),
//   );
//   const version = `${INDEX_SCHEMA}-${records.length}-${hashFeature(`${INDEX_SCHEMA}:${coreSource}:${raw}`).toString(36)}`;
//   const manifest = {
//     version,
//     generatedAt: new Date().toISOString(),
//     documentCount: records.length,
//     passageCount,
//     passageSize: PASSAGE_SIZE,
//     passageStride: PASSAGE_STRIDE,
//     passageSlots: PASSAGE_SLOTS,
//     bodySlots: BODY_SLOTS,
//     shardSize: SHARD_SIZE,
//     shardCount,
//     averagePassageLength: totalPassageLength / passageCount,
//     imams: IMAMS.map(([name]) => name),
//     strings,
//     metadata,
//     df,
//     crossLanguage,
//   };

//   await Promise.all([
//     writeFile(join(OUTPUT, "manifest.json"), JSON.stringify(manifest)),
//     writeFile(join(OUTPUT, "passage-hashes.bin"), Buffer.from(passageHashes.buffer)),
//     writeFile(join(OUTPUT, "passage-weights.bin"), passageWeights),
//     writeFile(join(OUTPUT, "passage-documents.bin"), Buffer.from(passageDocuments.buffer)),
//     writeFile(join(OUTPUT, "passage-lengths.bin"), passageLengths),
//   ]);

//   console.log(`Local index ${version} written to ${OUTPUT}`);
//   console.log(
//     `${shardCount} shards, ${passageCount.toLocaleString()} passages, `
//     + `${PASSAGE_SLOTS} features/passage, ${associationCount.toLocaleString()} learned translations`,
//   );
// }

// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });

import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BODY_SLOTS,
  PASSAGE_SIZE,
  PASSAGE_SLOTS,
  PASSAGE_STRIDE,
  featuresForTokens,
  hashFeature,
  inverseDocumentFrequency,
  tokenize,
} from "../public/hadith-retrieval-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = join(ROOT, "hadith_corpus.md");
const OUTPUT = join(ROOT, "public", "hadith-data");
const RELATED_TEMP = join(ROOT, ".hadith-related.tmp.json");
const CROSS_LANGUAGE_TEMP = join(ROOT, ".hadith-cross-language.tmp.json");
const SHARD_SIZE = 128;
const INDEX_SCHEMA = "local-rag-v14-related-passages";
const PHRASE_BUCKETS = 1 << 22;
const PHRASE_BUCKET_MASK = PHRASE_BUCKETS - 1;

const CP1252 = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

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
    for (const character of text) {
      const code = character.codePointAt(0);
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
    link,
    text: repaired,
  };
}

function bodyFromRecord(text) {
  return text
    .replace(/^###\s+.*(?:\r?\n|$)/, "")
    .replace(/\r?\n?\[Link\]\(https?:\/\/[^)]+\)\s*$/i, "")
    .trim();
}

function passagesForTokens(tokens) {
  if (!tokens.length) return [[]];
  if (tokens.length <= PASSAGE_SIZE) return [tokens];
  const finalStart = tokens.length - PASSAGE_SIZE;
  const starts = [];
  for (let start = 0; start <= finalStart; start += PASSAGE_STRIDE) {
    starts.push(start);
  }
  if (starts.at(-1) !== finalStart) {
    if (finalStart - starts.at(-1) < PASSAGE_STRIDE / 2) starts[starts.length - 1] = finalStart;
    else starts.push(finalStart);
  }
  return starts.map((start) => tokens.slice(start, start + PASSAGE_SIZE));
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function runBuilder(scriptName, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, "scripts", scriptName)], {
      cwd: ROOT,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} builder exited with code ${code}.`));
    });
  });
}

function runRelatedBuilder() {
  return runBuilder("build-related-index.mjs", "Related-report");
}

function runCrossLanguageBuilder() {
  return runBuilder("build-cross-language-index.mjs", "Cross-language");
}

function phraseTypeWeight(feature) {
  if (feature.startsWith("t:")) return 1.2;
  if (feature.startsWith("b:")) return 1.05;
  return 0.9;
}

async function main() {
  await runRelatedBuilder();
  await runCrossLanguageBuilder();
  const [raw, coreSource] = await Promise.all([
    readFile(INPUT, "utf8"),
    readFile(join(ROOT, "public", "hadith-retrieval-core.mjs"), "utf8"),
  ]);
  const blocks = raw.split(/^\s*---\s*$/m).filter((block) => block.trim());
  const records = blocks.map(parseRecord);
  const tokenCache = new Array(records.length);
  const tokenDocumentFrequency = new Map();
  const bodyFeatureFrequency = new Map();
  const phraseFrequency = new Uint32Array(PHRASE_BUCKETS);
  let passageCount = 0;
  let totalPassageLength = 0;

  console.log(`Parsing ${records.length.toLocaleString()} narrations into local passages...`);
  console.time("parse-passages");
  records.forEach((record, index) => {
    const tokens = tokenize(bodyFromRecord(record.text));
    tokenCache[index] = tokens;
    for (const token of new Set(tokens)) increment(tokenDocumentFrequency, token);
    for (const passage of passagesForTokens(tokens)) {
      passageCount += 1;
      totalPassageLength += passage.length;
      const bodyHashes = new Set();
      const phraseBuckets = new Set();
      for (const feature of featuresForTokens(passage)) {
        const featureHash = hashFeature(feature.feature);
        if (feature.type === "body") bodyHashes.add(featureHash);
        else phraseBuckets.add(featureHash & PHRASE_BUCKET_MASK);
      }
      for (const featureHash of bodyHashes) increment(bodyFeatureFrequency, featureHash);
      for (const bucket of phraseBuckets) phraseFrequency[bucket] += 1;
    }
  });

  console.timeEnd("parse-passages");
  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(join(OUTPUT, "shards"), { recursive: true });

  const passageHashes = new Uint32Array(passageCount * PASSAGE_SLOTS);
  const passageWeights = new Uint8Array(passageCount * PASSAGE_SLOTS);
  const passageDocuments = new Uint16Array(passageCount);
  const passageLengths = new Uint8Array(passageCount);
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

  const metadata = records.map((record, index) => [
    intern("titles", record.title),
    intern("collections", record.collection),
    intern("authors", record.author),
    intern("volumes", record.volume),
    intern("chapters", record.chapter),
    record.imamMask,
    Math.floor(index / SHARD_SIZE),
    record.link,
  ]);

  console.log(`Selecting evidence features for ${passageCount.toLocaleString()} passages...`);
  console.time("feature-write");
  let passageId = 0;
  tokenCache.forEach((tokens, documentId) => {
    for (const passage of passagesForTokens(tokens)) {
      passageDocuments[passageId] = documentId;
      passageLengths[passageId] = Math.min(255, passage.length);
      const features = featuresForTokens(passage);
      const body = features
        .filter(({ type }) => type === "body")
        .map((feature) => {
          const featureHash = hashFeature(feature.feature);
          const frequency = bodyFeatureFrequency.get(featureHash) || 1;
          const idf = inverseDocumentFrequency(passageCount, frequency);
          const isUnigram = feature.feature.startsWith("u:");
          return { ...feature, featureHash, idf, rank: idf * (isUnigram ? 1 : 0.24), isUnigram };
        });
      const unigrams = body
        .filter(({ isUnigram }) => isUnigram)
        .sort((left, right) => right.rank - left.rank);
      const prefixes = body
        .filter(({ isUnigram }) => !isUnigram)
        .sort((left, right) => right.rank - left.rank);
      const selectedBody = unigrams.slice(0, BODY_SLOTS);
      if (selectedBody.length < BODY_SLOTS) {
        selectedBody.push(...prefixes.slice(0, BODY_SLOTS - selectedBody.length));
      }
      const selectedPhrases = features
        .filter(({ type }) => type === "phrase")
        .map((feature) => {
          const featureHash = hashFeature(feature.feature);
          const frequency = Math.max(1, phraseFrequency[featureHash & PHRASE_BUCKET_MASK]);
          const idf = inverseDocumentFrequency(passageCount, frequency);
          return {
            ...feature,
            featureHash,
            idf,
            rank: idf * phraseTypeWeight(feature.feature) * (1 + Math.log(Math.max(1, feature.tf))),
          };
        })
        .sort((left, right) => right.rank - left.rank)
        .slice(0, PASSAGE_SLOTS - BODY_SLOTS);
      [...selectedBody, ...selectedPhrases].forEach((feature, slot) => {
        const offset = passageId * PASSAGE_SLOTS + slot;
        passageHashes[offset] = feature.featureHash;
        const termWeight = feature.idf * (1 + Math.log(Math.max(1, feature.tf)));
        passageWeights[offset] = Math.max(1, Math.min(255, Math.round(termWeight * 28)));
      });
      passageId += 1;
    }
  });

  console.timeEnd("feature-write");

  const shardCount = Math.ceil(records.length / SHARD_SIZE);
  for (let shard = 0; shard < shardCount; shard += 1) {
    const start = shard * SHARD_SIZE;
    const payload = records.slice(start, start + SHARD_SIZE).map(({ id, text }) => [id, text]);
    await writeFile(
      join(OUTPUT, "shards", `${String(shard).padStart(3, "0")}.json`),
      JSON.stringify(payload),
    );
  }

  const df = Object.fromEntries(
    [...bodyFeatureFrequency.entries()]
      .filter(([, frequency]) => frequency < passageCount * 0.9)
      .map(([featureHash, frequency]) => [featureHash.toString(36), frequency]),
  );
  const lexicon = [...tokenDocumentFrequency.entries()]
    .filter(([token, frequency]) => (
      frequency >= 2
      && token.length >= 2
      && token.length <= 36
      && !/^\d+$/u.test(token)
      && (
        /^[a-z][a-z0-9]*$/u.test(token)
        || (frequency >= 5 && /[\u0600-\u06ff]/u.test(token))
      )
    ))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const [relatedPayload, crossLanguagePayload] = await Promise.all([
    readFile(RELATED_TEMP, "utf8").then(JSON.parse),
    readFile(CROSS_LANGUAGE_TEMP, "utf8").then(JSON.parse),
  ]);
  const { related, relationCount } = relatedPayload;
  const { crossLanguage, associationCount } = crossLanguagePayload;
  const version = `${INDEX_SCHEMA}-${records.length}-${hashFeature(`${INDEX_SCHEMA}:${coreSource}:${raw}`).toString(36)}`;
  const manifest = {
    version,
    generatedAt: new Date().toISOString(),
    documentCount: records.length,
    passageCount,
    passageSize: PASSAGE_SIZE,
    passageStride: PASSAGE_STRIDE,
    passageSlots: PASSAGE_SLOTS,
    bodySlots: BODY_SLOTS,
    shardSize: SHARD_SIZE,
    shardCount,
    averagePassageLength: totalPassageLength / passageCount,
    imams: IMAMS.map(([name]) => name),
    strings,
    metadata,
    df,
    lexicon,
    crossLanguage,
    related,
  };

  await Promise.all([
    writeFile(join(OUTPUT, "manifest.json"), JSON.stringify(manifest)),
    writeFile(join(OUTPUT, "passage-hashes.bin"), Buffer.from(passageHashes.buffer)),
    writeFile(join(OUTPUT, "passage-weights.bin"), passageWeights),
    writeFile(join(OUTPUT, "passage-documents.bin"), Buffer.from(passageDocuments.buffer)),
    writeFile(join(OUTPUT, "passage-lengths.bin"), passageLengths),
  ]);

  await Promise.all([rm(RELATED_TEMP, { force: true }), rm(CROSS_LANGUAGE_TEMP, { force: true })]);

  console.log(`Local index ${version} written to ${OUTPUT}`);
  console.log(
    `${shardCount} shards, ${passageCount.toLocaleString()} passages, `
    + `${PASSAGE_SLOTS} features/passage, ${associationCount.toLocaleString()} learned translations, `
    + `${relationCount.toLocaleString()} related-report links`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
