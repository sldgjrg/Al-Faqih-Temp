import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
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

async function loadShard(shard) {
  if (!loadedShards.has(shard)) {
    const filename = `${String(shard).padStart(3, "0")}.json`;
    const payload = JSON.parse(await readFile(join(DATA_ROOT, "shards", filename), "utf8"));
    loadedShards.set(shard, payload);
  }
  return loadedShards.get(shard);
}

async function loadCandidateRecords(candidates) {
  const shards = [...new Set(candidates.map(({ id }) => manifest.metadata[id][6]))];
  const records = new Map();
  for (const shard of shards) {
    for (const [documentId, text] of await loadShard(shard)) records.set(documentId, text);
  }
  return records;
}

async function search(query, { resultLimit = 5, filters } = {}) {
  const { plan, candidates } = rankPassageCandidates({
    manifest,
    passageHashes,
    passageWeights,
    passageDocuments,
    passageLengths,
    query,
    filters,
    limit: 240,
  });
  const records = await loadCandidateRecords(candidates);
  const results = rerankLoadedRecords({
    manifest,
    plan,
    candidates,
    records,
    resultLimit,
  });
  return { candidates, results };
}

const REGRESSIONS = [
  {
    name: "direct ablution ruling",
    query: "if a dog fell in a well can I do wudhu from it",
    links: ["/3/1/4/6"],
    maximumRank: 1,
  },
  {
    name: "prayer demonstration",
    query: "how do i pray",
    links: ["/3/4/20/8", "/29/1/64/13"],
    maximumRank: 3,
  },
  {
    name: "early salam in isha",
    query: "I accidentally prayed only two rakat of isha, what should I do?",
    links: ["/3/4/42/1", "/3/4/42/6"],
    maximumRank: 5,
  },
  {
    name: "appearance of Imam al-Mahdi",
    query: "what does Imam Mahdi look like, was his hair curly?",
    links: ["/27/1/35/8", "/22/2/18/14"],
    maximumRank: 5,
  },
];

const argumentsWithoutFlags = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const assertionMode = process.argv.includes("--assert");
const queries = argumentsWithoutFlags.length
  ? argumentsWithoutFlags.map((query) => ({ query }))
  : assertionMode ? REGRESSIONS : [];

let failed = false;
for (const fixture of queries) {
  const { candidates, results } = await search(fixture.query);
  console.log(`\nQUERY: ${fixture.query}`);
  console.log(`Candidates: ${candidates.length}`);
  results.forEach((result, index) => {
    console.log(
      `${String(index + 1).padStart(2, "0")}  ${result.score.toFixed(3)}  `
      + `${result.link}  ${result.title}`,
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
    } else {
      console.log(`PASS: ${fixture.name} (rank ${rank})`);
    }
  }
}

if (failed) process.exitCode = 1;

export { search };
