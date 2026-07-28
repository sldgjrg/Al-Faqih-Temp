import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hashFeature, tokenize } from "../public/hadith-retrieval-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = join(ROOT, "hadith_corpus.md");
const OUTPUT = join(ROOT, ".hadith-cross-language.tmp.json");

const CP1252 = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

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

function bodyFromRecord(text) {
  return text
    .replace(/^###\s+.*(?:\r?\n|$)/, "")
    .replace(/\r?\n?\[Link\]\(https?:\/\/[^)]+\)\s*$/i, "")
    .trim();
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function isLatinToken(token) {
  return /^[a-z][a-z0-9]{2,}$/u.test(token);
}

function isArabicToken(token) {
  return token.length >= 2 && /[\u0600-\u06ff]/u.test(token);
}

function associationScore(totalDocuments, sourceFrequency, targetFrequency, cooccurrence) {
  const lift = (cooccurrence * totalDocuments) / (sourceFrequency * targetFrequency);
  if (lift <= 1) return 0;
  const pointwiseInformation = Math.log(lift);
  const normalizedInformation = pointwiseInformation / Math.max(1, Math.log(totalDocuments / cooccurrence));
  const overlap = (2 * cooccurrence) / (sourceFrequency + targetFrequency);
  return Math.max(0, normalizedInformation) * 0.72 + overlap * 0.28;
}

function buildCrossLanguageAssociations(tokenCache, tokenDocumentFrequency) {
  const totalDocuments = tokenCache.length;
  const latinDocuments = new Map();
  const arabicDocuments = new Map();
  const latinByDocument = new Array(totalDocuments);
  const arabicByDocument = new Array(totalDocuments);

  tokenCache.forEach((tokens, documentId) => {
    const unique = [...new Set(tokens)];
    const latin = unique
      .filter((token) => {
        const frequency = tokenDocumentFrequency.get(token) || 0;
        return isLatinToken(token) && frequency >= 2 && frequency <= 600;
      })
      .sort((left, right) => (
        (tokenDocumentFrequency.get(left) || 0) - (tokenDocumentFrequency.get(right) || 0)
        || left.localeCompare(right)
      ))
      .slice(0, 28);
    const arabic = unique
      .filter((token) => {
        const frequency = tokenDocumentFrequency.get(token) || 0;
        return isArabicToken(token) && frequency >= 2 && frequency <= 900;
      })
      .sort((left, right) => (
        (tokenDocumentFrequency.get(left) || 0) - (tokenDocumentFrequency.get(right) || 0)
        || left.localeCompare(right)
      ))
      .slice(0, 28);
    latinByDocument[documentId] = latin;
    arabicByDocument[documentId] = arabic;

    for (const token of latin) {
      const documents = latinDocuments.get(token);
      if (documents) documents.push(documentId);
      else latinDocuments.set(token, [documentId]);
    }
    for (const token of arabic) {
      const documents = arabicDocuments.get(token);
      if (documents) documents.push(documentId);
      else arabicDocuments.set(token, [documentId]);
    }
  });

  const reciprocalSources = new Map();
  for (const [targetToken, documents] of arabicDocuments) {
    const cooccurrence = new Map();
    for (const documentId of documents) {
      for (const sourceToken of latinByDocument[documentId]) increment(cooccurrence, sourceToken);
    }
    const targetFrequency = tokenDocumentFrequency.get(targetToken) || documents.length;
    const ranked = [...cooccurrence.entries()]
      .map(([sourceToken, count]) => [
        sourceToken,
        associationScore(
          totalDocuments,
          tokenDocumentFrequency.get(sourceToken) || 1,
          targetFrequency,
          count,
        ),
        count,
      ])
      .filter(([, score, count]) => score >= 0.12 && (count >= 2 || targetFrequency <= 3))
      .sort((left, right) => right[1] - left[1] || right[2] - left[2])
      .slice(0, 12);
    if (ranked.length) {
      reciprocalSources.set(targetToken, new Map(ranked.map(([token, score]) => [token, score])));
    }
  }

  const crossLanguage = {};
  const reverseCandidates = new Map();
  let associationCount = 0;
  for (const [sourceToken, documents] of latinDocuments) {
    const cooccurrence = new Map();
    for (const documentId of documents) {
      for (const targetToken of arabicByDocument[documentId]) increment(cooccurrence, targetToken);
    }
    const sourceFrequency = tokenDocumentFrequency.get(sourceToken) || documents.length;
    const limit = sourceFrequency <= 3 ? 8 : 6;
    const ranked = [...cooccurrence.entries()]
      .map(([targetToken, count]) => {
        const targetFrequency = tokenDocumentFrequency.get(targetToken) || 1;
        const forward = associationScore(totalDocuments, sourceFrequency, targetFrequency, count);
        const reverse = reciprocalSources.get(targetToken)?.get(sourceToken) || 0;
        return [targetToken, Math.sqrt(forward * reverse), count];
      })
      .filter(([, score, count]) => score >= 0.12 && (count >= 2 || sourceFrequency <= 3))
      .sort((left, right) => right[1] - left[1] || right[2] - left[2])
      .slice(0, limit)
      .map(([targetToken, score]) => [
        hashFeature(`u:${targetToken}`),
        Math.max(1, Math.min(255, Math.round(score * 255))),
      ]);
    if (!ranked.length) continue;
    const sourceFeatureHash = hashFeature(`u:${sourceToken}`);
    crossLanguage[sourceFeatureHash.toString(36)] = ranked;
    for (const [targetFeatureHash, encodedWeight] of ranked) {
      const reverse = reverseCandidates.get(targetFeatureHash) || [];
      reverse.push([sourceFeatureHash, encodedWeight]);
      reverseCandidates.set(targetFeatureHash, reverse);
    }
    associationCount += ranked.length;
  }

  for (const [sourceFeatureHash, candidates] of reverseCandidates) {
    const ranked = candidates.sort((left, right) => right[1] - left[1]).slice(0, 6);
    crossLanguage[sourceFeatureHash.toString(36)] = ranked;
    associationCount += ranked.length;
  }

  return { crossLanguage, associationCount };
}

const raw = await readFile(INPUT, "utf8");
const blocks = raw.split(/^\s*---\s*$/m).filter((block) => block.trim());
console.log(`Learning cross-language terms from ${blocks.length.toLocaleString()} parallel records...`);
console.time("cross-language");
const tokenCache = new Array(blocks.length);
const tokenDocumentFrequency = new Map();
blocks.forEach((block, documentId) => {
  const tokens = tokenize(bodyFromRecord(repairMojibake(block)));
  tokenCache[documentId] = tokens;
  for (const token of new Set(tokens)) increment(tokenDocumentFrequency, token);
});
const payload = buildCrossLanguageAssociations(tokenCache, tokenDocumentFrequency);
await writeFile(OUTPUT, JSON.stringify(payload));
console.timeEnd("cross-language");
console.log(`Cross-language graph written (${payload.associationCount.toLocaleString()} associations).`);
