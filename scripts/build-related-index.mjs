import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { inverseDocumentFrequency, tokenize } from "../public/hadith-retrieval-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = join(ROOT, "hadith_corpus.md");
const OUTPUT = join(ROOT, ".hadith-related.tmp.json");

const RELATION_STOP_WORDS = new Set(
  "allah imam prophet messenger abu ibn bin narrated narration said says following asked replied report reported peace holy upon from father fathers people man one two three chapter volume hadith thaqalayn link muhammad ali abdullah ja far sadiq baqir hasan husayn musa ahmad ibrahim book thing things".split(" "),
);

function bodyFromRecord(text) {
  return text
    .replace(/^###\s+.*(?:\r?\n|$)/, "")
    .replace(/\r?\n?\[Link\]\(https?:\/\/[^)]+\)\s*$/i, "")
    .trim();
}

function collectionFrom(title) {
  const withoutVolume = title.split(/\s+-\s+Volume/i)[0];
  return withoutVolume.split(":")[0].replace(/^The\s+/i, "").trim() || "Unknown collection";
}

function parseRecord(block) {
  const text = block.trim();
  const title = text.match(/^###\s+(.+)$/m)?.[1]?.trim() || "Untitled narration";
  const collection = collectionFrom(title);
  const chapter = title.includes(":") ? title.slice(title.indexOf(":") + 1).trim() : title;
  return { title, collection, chapter, text };
}

function englishTextFromRecord(text) {
  return bodyFromRecord(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => {
      const latin = (paragraph.match(/[A-Za-z]/g) || []).length;
      const arabic = (paragraph.match(/[\u0600-\u06ff]/g) || []).length;
      return latin > 30 && latin > arabic;
    })
    .join(" ");
}

function arabicTextFromRecord(text) {
  return bodyFromRecord(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => {
      const latin = (paragraph.match(/[A-Za-z]/g) || []).length;
      const arabic = (paragraph.match(/[\u0600-\u06ff]/g) || []).length;
      return arabic > 30 && arabic > latin;
    })
    .join(" ");
}

function matnFromEnglish(english) {
  const quoteIndex = english.search(/[“"]/u);
  if (quoteIndex >= 0 && quoteIndex < english.length * 0.82) return english.slice(quoteIndex);
  const markers = [
    /has said the following\s*:\s*/giu,
    /said the following\s*:\s*/giu,
    /who has said\s*:\s*/giu,
    /who said\s*:\s*/giu,
    /he said\s*:\s*/giu,
    /she said\s*:\s*/giu,
  ];
  let best = -1;
  let bestLength = 0;
  for (const pattern of markers) {
    for (const match of english.matchAll(pattern)) {
      if ((match.index || 0) >= best) {
        best = match.index || 0;
        bestLength = match[0].length;
      }
    }
  }
  return best >= 0 ? english.slice(best + bestLength) : english;
}

function relationTokensForRecord(record) {
  const matn = matnFromEnglish(englishTextFromRecord(record.text));
  const arabic = arabicTextFromRecord(record.text);
  const heading = `${record.chapter} ${record.title}`;
  return [...new Set(tokenize(`${heading} ${matn} ${arabic}`))]
    .filter((token) => token.length >= 3 && !RELATION_STOP_WORDS.has(token) && !/^\d+$/u.test(token));
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function buildRelatedReports(records, relationTokenCache, tokenDocumentFrequency) {
  const selectedTokens = relationTokenCache.map((tokens) => tokens
    .filter((token) => {
      const frequency = tokenDocumentFrequency.get(token) || 0;
      return frequency >= 2 && frequency <= 96;
    })
    .sort((left, right) => (
      (tokenDocumentFrequency.get(left) || 0) - (tokenDocumentFrequency.get(right) || 0)
      || left.localeCompare(right)
    ))
    .slice(0, 32));

  const inverted = new Map();
  selectedTokens.forEach((tokens, documentId) => {
    for (const token of tokens) {
      const documents = inverted.get(token);
      if (documents) documents.push(documentId);
      else inverted.set(token, [documentId]);
    }
  });

  const chapterDocuments = new Map();
  records.forEach((record, documentId) => {
    const key = `${record.collection}\u0000${record.chapter}`.toLowerCase();
    const documents = chapterDocuments.get(key);
    if (documents) documents.push(documentId);
    else chapterDocuments.set(key, [documentId]);
  });

  const relationSets = selectedTokens.map((tokens) => new Set(tokens));
  const tokenWeight = (token) => inverseDocumentFrequency(
    records.length,
    tokenDocumentFrequency.get(token) || records.length,
  );
  const totalWeights = selectedTokens.map((tokens) => tokens.reduce(
    (sum, token) => sum + tokenWeight(token),
    0,
  ));
  const chapterPositions = new Int32Array(records.length);
  for (const documents of chapterDocuments.values()) {
    documents.forEach((documentId, index) => { chapterPositions[documentId] = index; });
  }
  const related = new Array(records.length);
  let relationCount = 0;

  records.forEach((record, documentId) => {
    const candidates = new Map();
    for (const token of selectedTokens[documentId]) {
      const weight = tokenWeight(token);
      for (const otherId of inverted.get(token) || []) {
        if (otherId === documentId) continue;
        candidates.set(otherId, (candidates.get(otherId) || 0) + weight);
      }
    }

    const chapterKey = `${record.collection}\u0000${record.chapter}`.toLowerCase();
    const chapterPeers = chapterDocuments.get(chapterKey) || [];
    const chapterPosition = chapterPositions[documentId];
    const start = Math.max(0, chapterPosition - 6);
    const end = Math.min(chapterPeers.length, chapterPosition + 7);
    for (let index = start; index < end; index += 1) {
      const otherId = chapterPeers[index];
      if (otherId !== documentId) candidates.set(otherId, (candidates.get(otherId) || 0) + 1.4);
    }

    const ranked = [...candidates.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 40)
      .map(([otherId]) => {
        const left = relationSets[documentId];
        const right = relationSets[otherId];
        let sharedWeight = 0;
        let sharedTerms = 0;
        for (const token of left) {
          if (!right.has(token)) continue;
          sharedTerms += 1;
          sharedWeight += tokenWeight(token);
        }
        const containment = sharedWeight / Math.max(1, Math.min(totalWeights[documentId], totalWeights[otherId]));
        const sameChapter = records[otherId].collection === record.collection
          && records[otherId].chapter === record.chapter;
        const score = Math.min(1, containment * 0.9 + (sameChapter ? 0.12 : 0));
        return { otherId, score, sharedTerms, sameChapter };
      })
      .filter(({ score, sharedTerms, sameChapter }) => (
        (sharedTerms >= 3 && score >= 0.28)
        || (sameChapter && sharedTerms >= 2 && score >= 0.24)
      ))
      .sort((left, right) => right.score - left.score || right.sharedTerms - left.sharedTerms)
      .slice(0, 12)
      .map(({ otherId, score }) => [otherId, Math.max(1, Math.min(255, Math.round(score * 255)))]);

    related[documentId] = ranked;
    relationCount += ranked.length;
  });

  return { related, relationCount };
}

const raw = await readFile(INPUT, "utf8");
const records = raw.split(/^\s*---\s*$/m).filter((block) => block.trim()).map(parseRecord);
const relationTokenCache = records.map(relationTokensForRecord);
const tokenDocumentFrequency = new Map();
for (const tokens of relationTokenCache) {
  for (const token of tokens) increment(tokenDocumentFrequency, token);
}
console.log(`Building related-report graph for ${records.length.toLocaleString()} narrations...`);
const started = performance.now();
const payload = buildRelatedReports(records, relationTokenCache, tokenDocumentFrequency);
await writeFile(OUTPUT, JSON.stringify(payload));
console.log(`Related-report graph written (${payload.relationCount.toLocaleString()} links, ${Math.round(performance.now() - started)} ms).`);
