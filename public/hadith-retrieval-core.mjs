// /*
//  * Shared retrieval primitives for the index builder, browser worker, and
//  * regression suite.  The ranker deliberately uses corpus evidence rather than
//  * query-specific intent rules or narration IDs.
//  */

// export const PASSAGE_SIZE = 64;
// export const PASSAGE_STRIDE = 48;
// export const PASSAGE_SLOTS = 80;
// export const BODY_SLOTS = 64;
// export const PHRASE_SLOTS = PASSAGE_SLOTS - BODY_SLOTS;

// const LATIN_STOP_WORDS = new Set(
//   "a al an and are as at be been but by can did do does for from had has have he her him his i if in into is it its like may me my of on or our said she so than that the their them then there these they this to us was we were what when where which who will with would you your ibn abu bin b narrated following link http https thaqalayn net hadith volume".split(" "),
// );

// const ARABIC_STOP_WORDS = new Set(
//   "عن من في الى ان ابن بن ابو ابي قال قالت قلت يقول عليه عليها عليهم السلام صلى سلم حدثنا اخبرنا رواه هذا هذه ذلك التي الذي ما لا لم لن له لها به بها ثم و او".split(" "),
// );

// const LOGICAL_TOKENS = new Set(
//   "no not only except unless without before after already still never neither either both fewer less more remaining first last".split(" "),
// );

// const IRREGULAR_LEMMAS = new Map(Object.entries({
//   fell: "fall",
//   fallen: "fall",
//   forgot: "forget",
//   forgotten: "forget",
//   knew: "know",
//   known: "know",
//   taught: "teach",
//   thought: "think",
//   spoken: "speak",
//   spoke: "speak",
//   went: "go",
//   gone: "go",
//   made: "make",
//   done: "do",
// }));

// const NUMBER_WORDS = new Map(Object.entries({
//   zero: "0",
//   one: "1",
//   first: "1",
//   two: "2",
//   second: "2",
//   three: "3",
//   third: "3",
//   four: "4",
//   fourth: "4",
//   five: "5",
//   fifth: "5",
//   six: "6",
//   sixth: "6",
//   seven: "7",
//   seventh: "7",
//   eight: "8",
//   eighth: "8",
//   nine: "9",
//   ninth: "9",
//   ten: "10",
//   tenth: "10",
// }));

// export function normalizeText(value) {
//   return String(value || "")
//     .replace(/\bwon[’']t\b/giu, "will not")
//     .replace(/\b(can|could|did|does|do|had|has|have|is|might|must|should|was|were|would)n[’']t\b/giu, "$1 not")
//     .normalize("NFKD")
//     .replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, "")
//     .replace(/(\p{L})[‘’ʻʼʿ`'’](?=\p{L})/gu, "$1")
//     .replace(/[إأآٱ]/g, "ا")
//     .replace(/ى/g, "ي")
//     .replace(/ة/g, "ه")
//     .toLowerCase()
//     .replace(/[^\p{L}\p{N}]+/gu, " ")
//     .trim();
// }

// export function stemToken(rawToken) {
//   const irregular = IRREGULAR_LEMMAS.get(rawToken);
//   if (irregular) return irregular;
//   if (rawToken.length < 5 || /[^\u0000-\u007f]/.test(rawToken)) return rawToken;
//   const stemmed = rawToken
//     .replace(/(?:ization|ational|fulness|ousness|iveness)$/u, "")
//     .replace(/(?:ingly|edly|ments|ment|ation|ities)$/u, "")
//     .replace(/(?:ing|ers|ied|ies|ed|es|s)$/u, "");
//   return stemmed.length >= 3 ? stemmed : rawToken;
// }

// export function tokenize(value, { keepStops = false } = {}) {
//   const normalized = normalizeText(value);
//   if (!normalized) return [];
//   const output = [];
//   for (const rawToken of normalized.split(/\s+/)) {
//     const arabic = /[\u0600-\u06ff]/u.test(rawToken);
//     if (!keepStops && (arabic ? ARABIC_STOP_WORDS : LATIN_STOP_WORDS).has(rawToken)) continue;
//     const token = stemToken(rawToken);
//     if (!token || token.length === 1 && !/\d/.test(token)) continue;
//     output.push(NUMBER_WORDS.get(rawToken) || token);
//   }
//   return output;
// }

// export function hashFeature(value, seed = 2166136261) {
//   let result = seed >>> 0;
//   for (let index = 0; index < value.length; index += 1) {
//     result ^= value.charCodeAt(index);
//     result = Math.imul(result, 16777619);
//   }
//   return result >>> 0;
// }

// export function unigramFeature(token) {
//   return `u:${token}`;
// }

// function addFeature(map, feature, type, amount = 1) {
//   const known = map.get(feature);
//   if (known) {
//     known.tf = Math.min(255, known.tf + amount);
//     return;
//   }
//   map.set(feature, { feature, type, tf: amount });
// }

// export function featuresForTokens(tokens, { query = false } = {}) {
//   const features = new Map();
//   for (const token of tokens) {
//     addFeature(features, unigramFeature(token), "body");
//   }

//   const distance = query ? 4 : 4;
//   for (let first = 0; first < tokens.length; first += 1) {
//     const end = Math.min(tokens.length, first + distance + 1);
//     for (let second = first + 1; second < end; second += 1) {
//       const prefix = second === first + 1 ? "b" : "s";
//       addFeature(features, `${prefix}:${tokens[first]}_${tokens[second]}`, "phrase");
//       for (let third = second + 1; third < end; third += 1) {
//         addFeature(features, `t:${tokens[first]}_${tokens[second]}_${tokens[third]}`, "phrase");
//       }
//     }
//   }
//   return [...features.values()];
// }

// export function passagesForText(value) {
//   const tokens = tokenize(value);
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

// export function inverseDocumentFrequency(total, frequency) {
//   return Math.log(1 + (total - frequency + 0.5) / (frequency + 0.5));
// }

// function dfForHash(manifest, featureHash) {
//   return manifest.df[featureHash.toString(36)] || 0;
// }

// function queryFeatureBaseWeight(feature) {
//   if (feature.startsWith("t:")) return 1.65;
//   if (feature.startsWith("b:")) return 1.25;
//   if (feature.startsWith("s:")) return 0.9;
//   if (feature.startsWith("p:")) return 0.28;
//   return 1;
// }

// export function buildQueryPlan(query, manifest) {
//   const tokens = tokenize(query);
//   const uniqueTokens = [...new Set(tokens)];
//   const featureWeights = new Map();
//   const literalHashes = new Map();
//   const phraseHashes = new Set();
//   const adjacentPhraseWeights = new Map();
//   let phraseWeightTotal = 0;
//   const crossLanguageHashes = new Set();
//   const crossLanguageSources = new Map();
//   const sourceWeights = new Map();
//   const sourceTokens = new Map();

//   for (const { feature } of featuresForTokens(tokens, { query: true })) {
//     const featureHash = hashFeature(feature);
//     const bodyFeature = feature.startsWith("u:") || feature.startsWith("p:");
//     if (bodyFeature && !dfForHash(manifest, featureHash)) continue;
//     const weight = queryFeatureBaseWeight(feature);
//     featureWeights.set(featureHash, Math.max(featureWeights.get(featureHash) || 0, weight));
//     if (feature.startsWith("u:")) {
//       const token = feature.slice(2);
//       const logicWeight = LOGICAL_TOKENS.has(token) ? 2.15 : 1;
//       featureWeights.set(featureHash, weight * logicWeight);
//       literalHashes.set(featureHash, token);
//       const frequency = dfForHash(manifest, featureHash) || manifest.passageCount;
//       sourceWeights.set(
//         featureHash.toString(36),
//         Math.min(5.5, inverseDocumentFrequency(manifest.passageCount, frequency)) * logicWeight,
//       );
//       sourceTokens.set(featureHash.toString(36), token);
//     } else if (feature.startsWith("b:") || feature.startsWith("s:") || feature.startsWith("t:")) {
//       phraseHashes.add(featureHash);
//     }
//   }

//   for (let index = 0; index < tokens.length - 1; index += 1) {
//     const pair = `b:${tokens[index]}_${tokens[index + 1]}`;
//     const pairWeight = LOGICAL_TOKENS.has(tokens[index]) || LOGICAL_TOKENS.has(tokens[index + 1])
//       ? 1.8
//       : 1;
//     adjacentPhraseWeights.set(hashFeature(pair), pairWeight);
//     phraseWeightTotal += pairWeight;
//     if (index >= tokens.length - 2) continue;
//     const triple = `t:${tokens[index]}_${tokens[index + 1]}_${tokens[index + 2]}`;
//     const tripleWeight = [tokens[index], tokens[index + 1], tokens[index + 2]]
//       .some((token) => LOGICAL_TOKENS.has(token))
//       ? 4.2
//       : 2.4;
//     adjacentPhraseWeights.set(hashFeature(triple), tripleWeight);
//     phraseWeightTotal += tripleWeight;
//   }

//   for (const token of uniqueTokens) {
//     const featureHash = hashFeature(unigramFeature(token));
//     const sourceHash = featureHash.toString(36);
//     if (sourceWeights.has(sourceHash)) continue;
//     const logicWeight = LOGICAL_TOKENS.has(token) ? 2.15 : 1;
//     sourceWeights.set(sourceHash, 5.5 * logicWeight);
//     sourceTokens.set(sourceHash, token);
//     literalHashes.set(featureHash, token);
//   }

//   for (const token of uniqueTokens) {
//     const sourceHash = hashFeature(unigramFeature(token)).toString(36);
//     const associations = manifest.crossLanguage?.[sourceHash] || [];
//     for (const [targetHash, encodedWeight] of associations) {
//       const weight = (encodedWeight / 255) * 0.42;
//       if (!dfForHash(manifest, targetHash)) continue;
//       featureWeights.set(targetHash, Math.max(featureWeights.get(targetHash) || 0, weight));
//       crossLanguageHashes.add(targetHash);
//       const sources = crossLanguageSources.get(targetHash);
//       if (sources) sources.set(sourceHash, encodedWeight / 255);
//       else crossLanguageSources.set(targetHash, new Map([[sourceHash, encodedWeight / 255]]));
//     }
//   }

//   return {
//     query,
//     tokens,
//     uniqueTokens,
//     featureWeights,
//     literalHashes,
//     phraseHashes,
//     adjacentPhraseWeights,
//     phraseWeightTotal,
//     crossLanguageHashes,
//     crossLanguageSources,
//     sourceWeights,
//     sourceTokens,
//   };
// }

// function filterMetadata(manifest, documentId, filters) {
//   if (!filters) return true;
//   const metadata = manifest.metadata[documentId];
//   const [, collectionIndex, authorIndex, , , imamMask] = metadata;
//   if (filters.collection && manifest.strings.collections[collectionIndex] !== filters.collection) return false;
//   if (filters.author && manifest.strings.authors[authorIndex] !== filters.author) return false;
//   if (filters.imam !== "" && filters.imam !== undefined) {
//     const bit = 1 << Number(filters.imam);
//     if ((imamMask & bit) === 0) return false;
//   }
//   return true;
// }

// export function rankPassageCandidates({
//   manifest,
//   passageHashes,
//   passageWeights,
//   passageDocuments,
//   passageLengths,
//   query,
//   filters,
//   limit = 240,
// }) {
//   const plan = buildQueryPlan(query, manifest);
//   if (!plan.featureWeights.size) return { plan, candidates: [] };

//   const byDocument = new Map();
//   for (let passageId = 0; passageId < manifest.passageCount; passageId += 1) {
//     const documentId = passageDocuments[passageId];
//     if (!filterMetadata(manifest, documentId, filters)) continue;
//     const offset = passageId * manifest.passageSlots;
//     let lexical = 0;
//     let literalMatches = 0;
//     let phraseMatches = 0;
//     const crossLanguageContributions = new Map();
//     for (let slot = 0; slot < manifest.passageSlots; slot += 1) {
//       const featureHash = passageHashes[offset + slot];
//       if (!featureHash) continue;
//       const queryWeight = plan.featureWeights.get(featureHash);
//       if (!queryWeight) continue;
//       const indexedWeight = (passageWeights[offset + slot] || 1) / 28;
//       const contribution = indexedWeight * queryWeight;
//       if (plan.crossLanguageHashes.has(featureHash)) {
//         for (const sourceHash of plan.crossLanguageSources.get(featureHash)?.keys() || []) {
//           crossLanguageContributions.set(
//             sourceHash,
//             Math.max(crossLanguageContributions.get(sourceHash) || 0, contribution),
//           );
//         }
//       } else {
//         lexical += contribution;
//         literalMatches += 1;
//         if (plan.phraseHashes.has(featureHash)) phraseMatches += 1;
//       }
//     }
//     const crossLanguageMatches = crossLanguageContributions.size;
//     for (const contribution of crossLanguageContributions.values()) lexical += contribution;
//     const matched = literalMatches + crossLanguageMatches;
//     if (!matched) continue;
//     const score = lexical
//       + Math.log1p(matched) * 0.45
//       + Math.log1p(phraseMatches) * 0.32
//       + (crossLanguageMatches >= 2 ? 1.15 : 0);
//     const known = byDocument.get(documentId);
//     if (!known) {
//       byDocument.set(documentId, {
//         id: documentId,
//         passageId,
//         passageScore: score,
//         supportingPassageScore: 0,
//         phraseMatches,
//         crossLanguageMatches,
//       });
//     } else if (score > known.passageScore) {
//       known.supportingPassageScore = known.passageScore;
//       known.passageScore = score;
//       known.passageId = passageId;
//       known.phraseMatches = phraseMatches;
//       known.crossLanguageMatches = crossLanguageMatches;
//     } else if (score > known.supportingPassageScore) {
//       known.supportingPassageScore = score;
//     }
//   }

//   const ranked = [...byDocument.values()]
//     .map((candidate) => ({
//       ...candidate,
//       candidateScore: candidate.passageScore,
//     }))
//     .sort((left, right) => right.candidateScore - left.candidateScore);
//   const candidateMap = new Map(ranked.slice(0, limit).map((candidate) => [candidate.id, candidate]));

//   // Reserve recall lanes for evidence that is easy to suppress in the blended
//   // score: multiple learned translations, or a rare ordered phrase. The lanes
//   // are derived entirely from query/corpus matches and apply to every subject.
//   const crossLanguageLane = ranked
//     .filter((candidate) => candidate.crossLanguageMatches >= 2)
//     .sort((left, right) => (
//       right.crossLanguageMatches - left.crossLanguageMatches
//       || right.passageScore - left.passageScore
//     ))
//     .slice(0, Math.min(48, Math.ceil(limit * 0.2)));
//   const phraseLane = ranked
//     .filter((candidate) => candidate.phraseMatches > 0)
//     .sort((left, right) => (
//       right.phraseMatches - left.phraseMatches
//       || right.passageScore - left.passageScore
//     ))
//     .slice(0, Math.min(32, Math.ceil(limit * 0.14)));
//   for (const candidate of [...crossLanguageLane, ...phraseLane]) {
//     candidateMap.set(candidate.id, candidate);
//   }
//   const candidates = [...candidateMap.values()]
//     .sort((left, right) => right.candidateScore - left.candidateScore);
//   return { plan, candidates };
// }

// function phraseEvidenceForTokens(tokens, plan) {
//   let matchedWeight = 0;
//   for (const { feature } of featuresForTokens(tokens)) {
//     if (!/^[bst]:/.test(feature)) continue;
//     const featureHash = hashFeature(feature);
//     if (!plan.adjacentPhraseWeights.has(featureHash)) continue;
//     matchedWeight += plan.adjacentPhraseWeights.get(featureHash);
//   }
//   return {
//     weight: matchedWeight,
//     ratio: plan.phraseWeightTotal ? Math.min(1, matchedWeight / plan.phraseWeightTotal) : 0,
//   };
// }

// export function bestEvidenceWindow(tokens, plan, manifest, windowSize = 28) {
//   if (!tokens.length) {
//     return {
//       start: 0,
//       end: 0,
//       coverage: 0,
//       density: 0,
//       phraseEvidence: 0,
//       matchedLiteral: 0,
//       crossLanguage: 0,
//       matchedSources: [],
//       matchedTerms: [],
//     };
//   }

//   const tokenHashes = tokens.map((token) => hashFeature(unigramFeature(token)));
//   const totalWeight = [...plan.sourceWeights.values()].reduce((sum, weight) => sum + weight, 0);
//   let bestWeight = 0;
//   let bestStart = 0;
//   const windowWeights = new Float32Array(tokenHashes.length);
//   for (let start = 0; start < tokenHashes.length; start += 1) {
//     const sourceEvidence = new Map();
//     const end = Math.min(tokenHashes.length, start + windowSize);
//     for (let index = start; index < end; index += 1) {
//       const featureHash = tokenHashes[index];
//       const literalSource = featureHash.toString(36);
//       if (plan.literalHashes.has(featureHash) && plan.sourceWeights.has(literalSource)) {
//         sourceEvidence.set(literalSource, plan.sourceWeights.get(literalSource));
//       }
//       for (const [sourceHash, confidence] of plan.crossLanguageSources.get(featureHash) || []) {
//         const translatedWeight = (plan.sourceWeights.get(sourceHash) || 0) * confidence * 0.92;
//         sourceEvidence.set(sourceHash, Math.max(sourceEvidence.get(sourceHash) || 0, translatedWeight));
//       }
//     }
//     const weight = [...sourceEvidence.values()].reduce((sum, value) => sum + value, 0);
//     windowWeights[start] = weight;
//     if (weight > bestWeight) {
//       bestWeight = weight;
//       bestStart = start;
//     }
//   }

//   const eligibleStarts = [...windowWeights.keys()]
//     .filter((start) => windowWeights[start] >= bestWeight * 0.9);
//   const sampleStride = Math.max(1, Math.ceil(eligibleStarts.length / 24));
//   let bestObjective = bestWeight;
//   for (let index = 0; index < eligibleStarts.length; index += sampleStride) {
//     const candidateStart = eligibleStarts[index];
//     const candidateEnd = Math.min(tokens.length, candidateStart + windowSize);
//     const phrase = phraseEvidenceForTokens(tokens.slice(candidateStart, candidateEnd), plan);
//     const objective = windowWeights[candidateStart] + phrase.ratio * Math.min(7, totalWeight) * 0.24;
//     if (objective > bestObjective) {
//       bestObjective = objective;
//       bestStart = candidateStart;
//     }
//   }

//   const start = Math.max(0, bestStart - 3);
//   const end = Math.min(tokens.length, bestStart + windowSize + 3);
//   const windowTokens = tokens.slice(start, end);
//   const windowHashes = new Set(windowTokens.map((token) => hashFeature(unigramFeature(token))));
//   const matchedLiteral = [...plan.literalHashes.keys()].filter((featureHash) => windowHashes.has(featureHash)).length;
//   const sourceEvidence = new Map();
//   const literalSources = new Set();
//   const matchedCrossLanguageSources = new Set();
//   for (const featureHash of windowHashes) {
//     const literalSource = featureHash.toString(36);
//     if (plan.literalHashes.has(featureHash) && plan.sourceWeights.has(literalSource)) {
//       literalSources.add(literalSource);
//       sourceEvidence.set(literalSource, plan.sourceWeights.get(literalSource));
//     }
//     for (const [sourceHash, confidence] of plan.crossLanguageSources.get(featureHash) || []) {
//       if (literalSources.has(sourceHash)) continue;
//       matchedCrossLanguageSources.add(sourceHash);
//       const translatedWeight = (plan.sourceWeights.get(sourceHash) || 0) * confidence * 0.92;
//       sourceEvidence.set(sourceHash, Math.max(sourceEvidence.get(sourceHash) || 0, translatedWeight));
//     }
//   }
//   for (const sourceHash of literalSources) matchedCrossLanguageSources.delete(sourceHash);
//   const crossLanguage = matchedCrossLanguageSources.size;
//   const evidenceWeight = [...sourceEvidence.values()].reduce((sum, weight) => sum + weight, 0);
//   const phrase = phraseEvidenceForTokens(windowTokens, plan);
//   const matchedSources = [...sourceEvidence.keys()];
//   return {
//     start,
//     end,
//     coverage: totalWeight ? Math.min(1, evidenceWeight / totalWeight) : 0,
//     density: Math.min(1, (matchedLiteral + crossLanguage * 0.65) / Math.max(2, Math.sqrt(windowTokens.length))),
//     phraseEvidence: phrase.ratio,
//     matchedLiteral,
//     crossLanguage,
//     matchedSources,
//     matchedTerms: matchedSources.map((sourceHash) => plan.sourceTokens.get(sourceHash) || sourceHash),
//   };
// }

// function overlapRatio(leftTokens, rightTokens) {
//   const left = new Set(leftTokens);
//   const right = new Set(rightTokens);
//   let intersection = 0;
//   for (const token of left) if (right.has(token)) intersection += 1;
//   const union = left.size + right.size - intersection;
//   return union ? intersection / union : 0;
// }

// export function rerankLoadedRecords({
//   manifest,
//   plan,
//   candidates,
//   records,
//   resultLimit = 5,
// }) {
//   if (!candidates.length) return [];
//   const recordMap = records instanceof Map ? records : new Map(records);
//   const topCandidateScore = candidates[0]?.candidateScore || 1;
//   const ranked = candidates
//     .map((candidate) => {
//       const metadata = manifest.metadata[candidate.id];
//       const text = recordMap.get(candidate.id) || "";
//       const textTokens = tokenize(text.replace(/^###.*$/m, "").replace(/\[Link\].*$/m, ""));
//       const evidence = bestEvidenceWindow(textTokens, plan, manifest);
//       const [titleIndex, collectionIndex, authorIndex, volumeIndex, chapterIndex, imamMask] = metadata;
//       const title = manifest.strings.titles[titleIndex];
//       const chapter = manifest.strings.chapters[chapterIndex];
//       const titleEvidence = bestEvidenceWindow(tokenize(`${title} ${chapter}`), plan, manifest, 20);
//       const candidateEvidence = Math.min(1, candidate.candidateScore / topCandidateScore);
//       const phraseConjunction = evidence.phraseEvidence >= 0.2
//         ? Math.min(0.14, evidence.phraseEvidence * 0.42)
//         : 0;
//       const rawScore = evidence.coverage * 0.42
//         + evidence.phraseEvidence * 0.3
//         + evidence.density * 0.1
//         + candidateEvidence * 0.07
//         + titleEvidence.coverage * 0.02
//         + phraseConjunction
//         + (evidence.crossLanguage >= 2 ? 0.22 : 0);
//       const strategies = [];
//       if (evidence.matchedLiteral) strategies.push("literal");
//       if (evidence.phraseEvidence > 0.05) strategies.push("phrase");
//       if (evidence.crossLanguage) strategies.push("cross-language");
//       if (titleEvidence.coverage > 0.1) strategies.push("heading");
//       return {
//         id: candidate.id,
//         rawScore,
//         score: Math.max(0.01, Math.min(0.99, rawScore)),
//         title,
//         collection: manifest.strings.collections[collectionIndex],
//         author: manifest.strings.authors[authorIndex],
//         volume: manifest.strings.volumes[volumeIndex],
//         chapter,
//         imams: manifest.imams.filter((_, index) => imamMask & (1 << index)),
//         link: metadata[7],
//         text,
//         strategies,
//         taqiyyah: taqiyyahEvidence(text),
//         _tokens: textTokens,
//         _matchedSources: new Set([
//           ...evidence.matchedSources,
//           ...titleEvidence.matchedSources,
//         ]).size,
//       };
//     })
//     .filter((result) => result._matchedSources > 0 && result.rawScore >= 0.08)
//     .sort((left, right) => right.rawScore - left.rawScore);

//   const selected = [];
//   const chapterCounts = new Map();
//   for (const result of ranked) {
//     const chapterKey = normalizeText(`${result.collection} ${result.chapter}`);
//     if ((chapterCounts.get(chapterKey) || 0) >= 2) continue;
//     if (selected.some((known) => overlapRatio(known._tokens, result._tokens) > 0.9)) continue;
//     selected.push(result);
//     chapterCounts.set(chapterKey, (chapterCounts.get(chapterKey) || 0) + 1);
//     if (selected.length === resultLimit) break;
//   }

//   const best = selected[0]?.rawScore || 1;
//   return selected.map(({ rawScore, _tokens, _matchedSources, ...result }, index) => ({
//     ...result,
//     score: Math.max(0.05, Math.min(0.98, 0.42 + rawScore * 0.48 + (index === 0 ? Math.min(0.08, best * 0.08) : 0))),
//   }));
// }

// export function taqiyyahEvidence(text) {
//   const normalized = normalizeText(text);
//   const explicit = /\b(taqiyya|taqiyyah|taqiyah|dissimulation)\b/.test(normalized)
//     || /تقي[هة]/u.test(text);
//   const narratorCriticism = /\b(liar|lying|called .{0,50} a liar|accused .{0,50} of lying)\b/i.test(text);
//   const contextual = /\b(fear|danger|ruler|secretly|save lives|compelled|contradict(?:s|ed|ory)?)\b/i.test(text);
//   if (explicit) return { level: "explicit", note: "The narration explicitly mentions taqiyyah or dissimulation." };
//   if (narratorCriticism) {
//     return {
//       level: "review",
//       note: "Narrator criticism appears in this text. That alone does not establish taqiyyah; contextual review is needed.",
//     };
//   }
//   if (contextual) {
//     return {
//       level: "context",
//       note: "The text contains a coercion, danger, secrecy, or contradiction cue. Scholarly contextual review is needed.",
//     };
//   }
//   return null;
// }

/*
 * Shared retrieval primitives for the index builder, browser worker, and
 * regression suite.  The ranker deliberately uses corpus evidence rather than
 * query-specific intent rules or narration IDs.
 */
/*
 * Shared retrieval primitives for the index builder, browser worker, and
 * regression suite.  The ranker deliberately uses corpus evidence rather than
 * query-specific intent rules or narration IDs.
 */
/*
 * Shared retrieval primitives for the index builder, browser worker, and
 * regression suite.  The ranker deliberately uses corpus evidence rather than
 * query-specific intent rules or narration IDs.
 */

export const PASSAGE_SIZE = 64;
export const PASSAGE_STRIDE = 48;
export const PASSAGE_SLOTS = 80;
export const BODY_SLOTS = 64;
export const PHRASE_SLOTS = PASSAGE_SLOTS - BODY_SLOTS;

const LATIN_STOP_WORDS = new Set(
  "a al an and are as at be been but by can did do does for from had has have he her him his i if in into is it its like may me my of on or our said she so than that the their them then there these they this to us was we were what when where which who will with would you your ibn abu bin b narrated following link http https thaqalayn net hadith volume".split(" "),
);

const ARABIC_STOP_WORDS = new Set(
  "عن من في الى ان ابن بن ابو ابي قال قالت قلت يقول عليه عليها عليهم السلام صلى سلم حدثنا اخبرنا رواه هذا هذه ذلك التي الذي ما لا لم لن له لها به بها ثم و او".split(" "),
);

const LOGICAL_TOKENS = new Set(
  "no not only except unless without before after already still never neither either both fewer less more remaining first last".split(" "),
);

const GENERIC_ENTITY_QUERY_TOKENS = new Set(
  "imam prophet messenger lady say tell ask explain mean know look hadith narration report muhammad ali fatima hasan hassan husayn hussain sajjad baqir sadiq kazim rida ridha jawad hadi askari mahdi zaman qaim".split(" "),
);


const IMAM_QUERY_ALIASES = [
  ["Prophet Muhammad", /\b(?:prophet muhammad|messenger of allah|rasul(?:ullah)?|holy prophet)\b/u],
  ["Imam Ali", /\b(?:imam ali|amir al muminin|commander of the faithful|ali ibn abi talib)\b/u],
  ["Lady Fatima", /\b(?:lady fatima|fatima al zahra|fatimah al zahra)\b/u],
  ["Imam Hasan", /\b(?:imam hasan|imam hassan|hasan ibn ali)\b/u],
  ["Imam Husayn", /\b(?:imam husayn|imam hussain|husayn ibn ali|hussain ibn ali)\b/u],
  ["Imam al-Sajjad", /\b(?:imam al sajjad|imam sajjad|zayn al abidin)\b/u],
  ["Imam al-Baqir", /\b(?:imam al baqir|imam baqir|muhammad al baqir)\b/u],
  ["Imam al-Sadiq", /\b(?:imam al sadiq|imam sadiq|jafar al sadiq)\b/u],
  ["Imam al-Kazim", /\b(?:imam al kazim|imam kazim|musa al kazim)\b/u],
  ["Imam al-Rida", /\b(?:imam al rida|imam rida|imam ridha|ali al rida)\b/u],
  ["Imam al-Jawad", /\b(?:imam al jawad|imam jawad|muhammad al jawad)\b/u],
  ["Imam al-Hadi", /\b(?:imam al hadi|imam hadi|ali al hadi)\b/u],
  ["Imam al-Askari", /\b(?:imam al askari|imam askari|hasan al askari)\b/u],
  ["Imam al-Mahdi", /\b(?:imam al mahdi|imam mahdi|imam zaman|imam al zaman|sahib al zaman|al qaim|al qa im|master of the age)\b/u],
];

function requestedImamIndex(query, manifest) {
  const normalized = normalizeText(query);
  for (const [name, pattern] of IMAM_QUERY_ALIASES) {
    if (!pattern.test(normalized)) continue;
    const index = manifest.imams.indexOf(name);
    if (index >= 0) return index;
  }
  return -1;
}

const IRREGULAR_LEMMAS = new Map(Object.entries({
  fell: "fall",
  fallen: "fall",
  forgot: "forget",
  forgotten: "forget",
  knew: "know",
  known: "know",
  taught: "teach",
  thought: "think",
  spoken: "speak",
  spoke: "speak",
  went: "go",
  gone: "go",
  made: "make",
  done: "do",
}));

const NUMBER_WORDS = new Map(Object.entries({
  zero: "0",
  one: "1",
  first: "1",
  two: "2",
  second: "2",
  three: "3",
  third: "3",
  four: "4",
  fourth: "4",
  five: "5",
  fifth: "5",
  six: "6",
  sixth: "6",
  seven: "7",
  seventh: "7",
  eight: "8",
  eighth: "8",
  nine: "9",
  ninth: "9",
  ten: "10",
  tenth: "10",
}));

export function normalizeText(value) {
  return String(value || "")
    .replace(/\bwon[’']t\b/giu, "will not")
    .replace(/\b(can|could|did|does|do|had|has|have|is|might|must|should|was|were|would)n[’']t\b/giu, "$1 not")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/(\p{L})[‘’ʻʼʿ`'’](?=\p{L})/gu, "$1")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function stemToken(rawToken) {
  const irregular = IRREGULAR_LEMMAS.get(rawToken);
  if (irregular) return irregular;
  if (rawToken.length < 5 || /[^\u0000-\u007f]/.test(rawToken)) return rawToken;
  const stemmed = rawToken
    .replace(/(?:ization|ational|fulness|ousness|iveness)$/u, "")
    .replace(/(?:ingly|edly|ments|ment|ation|ities)$/u, "")
    .replace(/(?:ing|ers|ied|ies|ed|es|s)$/u, "");
  return stemmed.length >= 3 ? stemmed : rawToken;
}

export function tokenize(value, { keepStops = false } = {}) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  const output = [];
  for (const rawToken of normalized.split(/\s+/)) {
    const arabic = /[\u0600-\u06ff]/u.test(rawToken);
    if (!keepStops && (arabic ? ARABIC_STOP_WORDS : LATIN_STOP_WORDS).has(rawToken)) continue;
    const token = stemToken(rawToken);
    if (!token || token.length === 1 && !/\d/.test(token)) continue;
    output.push(NUMBER_WORDS.get(rawToken) || token);
  }
  return output;
}

export function hashFeature(value, seed = 2166136261) {
  let result = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function unigramFeature(token) {
  return `u:${token}`;
}

function addFeature(map, feature, type, amount = 1) {
  const known = map.get(feature);
  if (known) {
    known.tf = Math.min(255, known.tf + amount);
    return;
  }
  map.set(feature, { feature, type, tf: amount });
}

export function featuresForTokens(tokens, { query = false } = {}) {
  const features = new Map();
  for (const token of tokens) {
    addFeature(features, unigramFeature(token), "body");
  }

  const distance = query ? 3 : 2;
  for (let first = 0; first < tokens.length; first += 1) {
    const end = Math.min(tokens.length, first + distance + 1);
    for (let second = first + 1; second < end; second += 1) {
      const prefix = second === first + 1 ? "b" : "s";
      addFeature(features, `${prefix}:${tokens[first]}_${tokens[second]}`, "phrase");
      for (let third = second + 1; third < end; third += 1) {
        addFeature(features, `t:${tokens[first]}_${tokens[second]}_${tokens[third]}`, "phrase");
      }
    }
  }
  return [...features.values()];
}

export function passagesForText(value) {
  const tokens = tokenize(value);
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

export function inverseDocumentFrequency(total, frequency) {
  return Math.log(1 + (total - frequency + 0.5) / (frequency + 0.5));
}

function dfForHash(manifest, featureHash) {
  return manifest.df[featureHash.toString(36)] || 0;
}

function queryFeatureBaseWeight(feature) {
  if (feature.startsWith("t:")) return 1.65;
  if (feature.startsWith("b:")) return 1.25;
  if (feature.startsWith("s:")) return 0.9;
  if (feature.startsWith("p:")) return 0.28;
  return 1;
}

export function buildQueryPlan(query, manifest, retrievalProfile = {}) {
  const profile = retrievalProfile && typeof retrievalProfile === "object" ? retrievalProfile : {};
  const boostText = Array.isArray(profile.boostTerms) ? profile.boostTerms.join(" ") : "";
  const boostStrength = Math.max(0, Math.min(0.5, Number(profile.boostStrength) || (profile.strictFacet ? 0.38 : 0.16)));
  const tokens = tokenize(query);
  const uniqueTokens = [...new Set(tokens)];
  const boostTokens = [...new Set(tokenize(boostText))];
  const entityTokens = [...new Set(tokenize(Array.isArray(profile.entityTerms) ? profile.entityTerms.join(" ") : ""))];
  const featureWeights = new Map();
  const literalHashes = new Map();
  const phraseHashes = new Set();
  const adjacentPhraseWeights = new Map();
  let phraseWeightTotal = 0;
  const crossLanguageHashes = new Set();
  const crossLanguageSources = new Map();
  const sourceWeights = new Map();
  const sourceTokens = new Map();

  for (const { feature } of featuresForTokens(tokens, { query: true })) {
    const featureHash = hashFeature(feature);
    const bodyFeature = feature.startsWith("u:") || feature.startsWith("p:");
    if (bodyFeature && !dfForHash(manifest, featureHash)) continue;
    const weight = queryFeatureBaseWeight(feature);
    featureWeights.set(featureHash, Math.max(featureWeights.get(featureHash) || 0, weight));
    if (feature.startsWith("u:")) {
      const token = feature.slice(2);
      const logicWeight = LOGICAL_TOKENS.has(token) ? 2.15 : 1;
      featureWeights.set(featureHash, weight * logicWeight);
      literalHashes.set(featureHash, token);
      const frequency = dfForHash(manifest, featureHash) || manifest.passageCount;
      sourceWeights.set(
        featureHash.toString(36),
        Math.min(5.5, inverseDocumentFrequency(manifest.passageCount, frequency)) * logicWeight,
      );
      sourceTokens.set(featureHash.toString(36), token);
    } else if (feature.startsWith("b:") || feature.startsWith("s:") || feature.startsWith("t:")) {
      phraseHashes.add(featureHash);
    }
  }

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const pair = `b:${tokens[index]}_${tokens[index + 1]}`;
    const pairWeight = LOGICAL_TOKENS.has(tokens[index]) || LOGICAL_TOKENS.has(tokens[index + 1])
      ? 1.8
      : 1;
    adjacentPhraseWeights.set(hashFeature(pair), pairWeight);
    phraseWeightTotal += pairWeight;
    if (index >= tokens.length - 2) continue;
    const triple = `t:${tokens[index]}_${tokens[index + 1]}_${tokens[index + 2]}`;
    const tripleWeight = [tokens[index], tokens[index + 1], tokens[index + 2]]
      .some((token) => LOGICAL_TOKENS.has(token))
      ? 4.2
      : 2.4;
    adjacentPhraseWeights.set(hashFeature(triple), tripleWeight);
    phraseWeightTotal += tripleWeight;
  }

  for (const token of uniqueTokens) {
    const featureHash = hashFeature(unigramFeature(token));
    const sourceHash = featureHash.toString(36);
    if (sourceWeights.has(sourceHash)) continue;
    const logicWeight = LOGICAL_TOKENS.has(token) ? 2.15 : 1;
    sourceWeights.set(sourceHash, 5.5 * logicWeight);
    sourceTokens.set(sourceHash, token);
    literalHashes.set(featureHash, token);
  }

  const addAuxiliaryTokens = (auxiliaryTokens, featureStrength, sourceStrength) => {
    for (const token of auxiliaryTokens) {
      const featureHash = hashFeature(unigramFeature(token));
      const sourceHash = featureHash.toString(36);
      const frequency = dfForHash(manifest, featureHash);
      if (!frequency) continue;
      featureWeights.set(featureHash, Math.max(featureWeights.get(featureHash) || 0, featureStrength));
      literalHashes.set(featureHash, token);
      sourceWeights.set(
        sourceHash,
        Math.max(
          sourceWeights.get(sourceHash) || 0,
          Math.min(3.2, inverseDocumentFrequency(manifest.passageCount, frequency)) * sourceStrength,
        ),
      );
      sourceTokens.set(sourceHash, token);
    }
  };
  addAuxiliaryTokens(boostTokens, boostStrength, profile.strictFacet ? 0.58 : 0.3);
  addAuxiliaryTokens(entityTokens, 0.24, 0.24);

  const addAssociations = (associationTokens, scale) => {
    for (const token of associationTokens) {
      const sourceHash = hashFeature(unigramFeature(token)).toString(36);
      const associations = manifest.crossLanguage?.[sourceHash] || [];
      for (const [targetHash, encodedWeight] of associations) {
        const weight = (encodedWeight / 255) * scale;
        if (!dfForHash(manifest, targetHash)) continue;
        featureWeights.set(targetHash, Math.max(featureWeights.get(targetHash) || 0, weight));
        crossLanguageHashes.add(targetHash);
        const sources = crossLanguageSources.get(targetHash);
        if (sources) sources.set(sourceHash, encodedWeight / 255);
        else crossLanguageSources.set(targetHash, new Map([[sourceHash, encodedWeight / 255]]));
      }
    }
  };
  addAssociations(uniqueTokens, 0.42);
  addAssociations(boostTokens, profile.strictFacet ? 0.2 : 0.08);
  addAssociations(entityTokens, 0.12);

  const sourceHashesForTerms = (terms) => new Set(
    tokenize(Array.isArray(terms) ? terms.join(" ") : "")
      .map((token) => hashFeature(unigramFeature(token)).toString(36)),
  );
  const boostFacetSourceHashes = sourceHashesForTerms(profile.boostTerms);
  const requiredFacetSourceHashes = sourceHashesForTerms(profile.requiredTerms);
  const entitySourceHashes = sourceHashesForTerms(profile.entityTerms);

  const requiredImamIndex = requestedImamIndex(query, manifest);
  const shouldRequireFocus = !profile.disableFocus && uniqueTokens.length >= 3 && uniqueTokens.length <= 5;
  const focusSourceHash = shouldRequireFocus
    ? [...sourceWeights.entries()]
        .filter(([sourceHash]) => {
          const token = sourceTokens.get(sourceHash);
          return !GENERIC_ENTITY_QUERY_TOKENS.has(token) && !LOGICAL_TOKENS.has(token);
        })
        .sort((left, right) => right[1] - left[1])[0]?.[0] || ""
    : "";

  return {
    query,
    tokens,
    requiredImamIndex,
    focusSourceHash,
    uniqueTokens,
    featureWeights,
    literalHashes,
    phraseHashes,
    adjacentPhraseWeights,
    phraseWeightTotal,
    crossLanguageHashes,
    crossLanguageSources,
    sourceWeights,
    sourceTokens,
    retrievalProfile: profile,
    boostFacetSourceHashes,
    requiredFacetSourceHashes,
    entitySourceHashes,
  };
}

function filterMetadata(manifest, documentId, filters) {
  if (!filters) return true;
  const metadata = manifest.metadata[documentId];
  const [, collectionIndex, authorIndex, , , imamMask] = metadata;
  if (filters.collection && manifest.strings.collections[collectionIndex] !== filters.collection) return false;
  if (filters.author && manifest.strings.authors[authorIndex] !== filters.author) return false;
  if (filters.imam !== "" && filters.imam !== undefined) {
    const bit = 1 << Number(filters.imam);
    if ((imamMask & bit) === 0) return false;
  }
  return true;
}

export function rankPassageCandidates({
  manifest,
  passageHashes,
  passageWeights,
  passageDocuments,
  passageLengths,
  query,
  filters,
  retrievalProfile,
  limit = 240,
}) {
  const plan = buildQueryPlan(query, manifest, retrievalProfile);
  if (!plan.featureWeights.size) return { plan, candidates: [] };

  const byDocument = new Map();
  for (let passageId = 0; passageId < manifest.passageCount; passageId += 1) {
    const documentId = passageDocuments[passageId];
    if (!filterMetadata(manifest, documentId, filters)) continue;
    if (plan.requiredImamIndex >= 0) {
      const imamMask = manifest.metadata[documentId][5];
      if ((imamMask & (1 << plan.requiredImamIndex)) === 0) continue;
    }
    const offset = passageId * manifest.passageSlots;
    let lexical = 0;
    let literalMatches = 0;
    let phraseMatches = 0;
    const crossLanguageContributions = new Map();
    for (let slot = 0; slot < manifest.passageSlots; slot += 1) {
      const featureHash = passageHashes[offset + slot];
      if (!featureHash) continue;
      const queryWeight = plan.featureWeights.get(featureHash);
      if (!queryWeight) continue;
      const indexedWeight = (passageWeights[offset + slot] || 1) / 28;
      const contribution = indexedWeight * queryWeight;
      if (plan.crossLanguageHashes.has(featureHash)) {
        for (const sourceHash of plan.crossLanguageSources.get(featureHash)?.keys() || []) {
          crossLanguageContributions.set(
            sourceHash,
            Math.max(crossLanguageContributions.get(sourceHash) || 0, contribution),
          );
        }
      } else {
        lexical += contribution;
        literalMatches += 1;
        if (plan.phraseHashes.has(featureHash)) phraseMatches += 1;
      }
    }
    const crossLanguageMatches = crossLanguageContributions.size;
    for (const contribution of crossLanguageContributions.values()) lexical += contribution;
    const matched = literalMatches + crossLanguageMatches;
    if (!matched) continue;
    const score = lexical
      + Math.log1p(matched) * 0.45
      + Math.log1p(phraseMatches) * 0.32
      + (crossLanguageMatches >= 2 ? 1.15 : 0);
    const known = byDocument.get(documentId);
    if (!known) {
      byDocument.set(documentId, {
        id: documentId,
        passageId,
        passageScore: score,
        supportingPassageScore: 0,
        phraseMatches,
        crossLanguageMatches,
      });
    } else if (score > known.passageScore) {
      known.supportingPassageScore = known.passageScore;
      known.passageScore = score;
      known.passageId = passageId;
      known.phraseMatches = phraseMatches;
      known.crossLanguageMatches = crossLanguageMatches;
    } else if (score > known.supportingPassageScore) {
      known.supportingPassageScore = score;
    }
  }

  const ranked = [...byDocument.values()]
    .map((candidate) => ({
      ...candidate,
      candidateScore: candidate.passageScore,
    }))
    .sort((left, right) => right.candidateScore - left.candidateScore);
  const candidateMap = new Map(ranked.slice(0, limit).map((candidate) => [candidate.id, candidate]));

  // Reserve recall lanes for evidence that is easy to suppress in the blended
  // score: multiple learned translations, or a rare ordered phrase. The lanes
  // are derived entirely from query/corpus matches and apply to every subject.
  const crossLanguageLane = ranked
    .filter((candidate) => candidate.crossLanguageMatches >= 2)
    .sort((left, right) => (
      right.crossLanguageMatches - left.crossLanguageMatches
      || right.passageScore - left.passageScore
    ))
    .slice(0, Math.min(48, Math.ceil(limit * 0.2)));
  const phraseLane = ranked
    .filter((candidate) => candidate.phraseMatches > 0)
    .sort((left, right) => (
      right.phraseMatches - left.phraseMatches
      || right.passageScore - left.passageScore
    ))
    .slice(0, Math.min(32, Math.ceil(limit * 0.14)));
  for (const candidate of [...crossLanguageLane, ...phraseLane]) {
    candidateMap.set(candidate.id, candidate);
  }
  const candidates = [...candidateMap.values()]
    .sort((left, right) => right.candidateScore - left.candidateScore);
  return { plan, candidates };
}

export function expandRelatedCandidates({
  manifest,
  candidates,
  seedResults,
  filters,
  limit = 320,
  perSeed = 18,
}) {
  const combined = new Map(candidates.map((candidate) => [candidate.id, { ...candidate }]));
  for (let seedIndex = 0; seedIndex < seedResults.length; seedIndex += 1) {
    const seed = seedResults[seedIndex];
    const links = manifest.related?.[seed.id] || [];
    for (const [documentId, encodedScore] of links.slice(0, perSeed)) {
      if (!filterMetadata(manifest, documentId, filters)) continue;
      const relationScore = encodedScore / 255;
      if (relationScore < 0.22) continue;
      const known = combined.get(documentId);
      const relationCandidateScore = (seed.score || 0.5) * 0.8 + relationScore * 1.2 - seedIndex * 0.03;
      if (known) {
        if (relationScore > (known.relationScore || 0)) {
          known.relationScore = relationScore;
          known.relationTo = seed.id;
        }
        known.candidateScore = Math.max(known.candidateScore || 0, relationCandidateScore);
      } else {
        combined.set(documentId, {
          id: documentId,
          passageId: -1,
          passageScore: 0,
          supportingPassageScore: 0,
          phraseMatches: 0,
          crossLanguageMatches: 0,
          candidateScore: relationCandidateScore,
          relationScore,
          relationTo: seed.id,
        });
      }
    }
  }
  return [...combined.values()]
    .sort((left, right) => right.candidateScore - left.candidateScore)
    .slice(0, limit);
}

function phraseEvidenceForTokens(tokens, plan) {
  let matchedWeight = 0;
  for (const { feature } of featuresForTokens(tokens)) {
    if (!/^[bst]:/.test(feature)) continue;
    const featureHash = hashFeature(feature);
    if (!plan.adjacentPhraseWeights.has(featureHash)) continue;
    matchedWeight += plan.adjacentPhraseWeights.get(featureHash);
  }
  return {
    weight: matchedWeight,
    ratio: plan.phraseWeightTotal ? Math.min(1, matchedWeight / plan.phraseWeightTotal) : 0,
  };
}

export function bestEvidenceWindow(tokens, plan, manifest, windowSize = 28) {
  if (!tokens.length) {
    return {
      start: 0,
      end: 0,
      coverage: 0,
      density: 0,
      phraseEvidence: 0,
      matchedLiteral: 0,
      crossLanguage: 0,
      matchedSources: [],
      matchedTerms: [],
    };
  }

  const tokenHashes = tokens.map((token) => hashFeature(unigramFeature(token)));
  const totalWeight = [...plan.sourceWeights.values()].reduce((sum, weight) => sum + weight, 0);
  let bestWeight = 0;
  let bestStart = 0;
  const windowWeights = new Float32Array(tokenHashes.length);
  for (let start = 0; start < tokenHashes.length; start += 1) {
    const sourceEvidence = new Map();
    const end = Math.min(tokenHashes.length, start + windowSize);
    for (let index = start; index < end; index += 1) {
      const featureHash = tokenHashes[index];
      const literalSource = featureHash.toString(36);
      if (plan.literalHashes.has(featureHash) && plan.sourceWeights.has(literalSource)) {
        sourceEvidence.set(literalSource, plan.sourceWeights.get(literalSource));
      }
      for (const [sourceHash, confidence] of plan.crossLanguageSources.get(featureHash) || []) {
        const translatedWeight = (plan.sourceWeights.get(sourceHash) || 0) * confidence * 0.92;
        sourceEvidence.set(sourceHash, Math.max(sourceEvidence.get(sourceHash) || 0, translatedWeight));
      }
    }
    const weight = [...sourceEvidence.values()].reduce((sum, value) => sum + value, 0);
    windowWeights[start] = weight;
    if (weight > bestWeight) {
      bestWeight = weight;
      bestStart = start;
    }
  }

  const eligibleStarts = [...windowWeights.keys()]
    .filter((start) => windowWeights[start] >= bestWeight * 0.9);
  const sampleStride = Math.max(1, Math.ceil(eligibleStarts.length / 24));
  let bestObjective = bestWeight;
  for (let index = 0; index < eligibleStarts.length; index += sampleStride) {
    const candidateStart = eligibleStarts[index];
    const candidateEnd = Math.min(tokens.length, candidateStart + windowSize);
    const phrase = phraseEvidenceForTokens(tokens.slice(candidateStart, candidateEnd), plan);
    const objective = windowWeights[candidateStart] + phrase.ratio * Math.min(7, totalWeight) * 0.24;
    if (objective > bestObjective) {
      bestObjective = objective;
      bestStart = candidateStart;
    }
  }

  const start = Math.max(0, bestStart - 3);
  const end = Math.min(tokens.length, bestStart + windowSize + 3);
  const windowTokens = tokens.slice(start, end);
  const windowHashes = new Set(windowTokens.map((token) => hashFeature(unigramFeature(token))));
  const matchedLiteral = [...plan.literalHashes.keys()].filter((featureHash) => windowHashes.has(featureHash)).length;
  const sourceEvidence = new Map();
  const literalSources = new Set();
  const matchedCrossLanguageSources = new Set();
  for (const featureHash of windowHashes) {
    const literalSource = featureHash.toString(36);
    if (plan.literalHashes.has(featureHash) && plan.sourceWeights.has(literalSource)) {
      literalSources.add(literalSource);
      sourceEvidence.set(literalSource, plan.sourceWeights.get(literalSource));
    }
    for (const [sourceHash, confidence] of plan.crossLanguageSources.get(featureHash) || []) {
      if (literalSources.has(sourceHash)) continue;
      matchedCrossLanguageSources.add(sourceHash);
      const translatedWeight = (plan.sourceWeights.get(sourceHash) || 0) * confidence * 0.92;
      sourceEvidence.set(sourceHash, Math.max(sourceEvidence.get(sourceHash) || 0, translatedWeight));
    }
  }
  for (const sourceHash of literalSources) matchedCrossLanguageSources.delete(sourceHash);
  const crossLanguage = matchedCrossLanguageSources.size;
  const evidenceWeight = [...sourceEvidence.values()].reduce((sum, weight) => sum + weight, 0);
  const phrase = phraseEvidenceForTokens(windowTokens, plan);
  const matchedSources = [...sourceEvidence.keys()];
  return {
    start,
    end,
    coverage: totalWeight ? Math.min(1, evidenceWeight / totalWeight) : 0,
    density: Math.min(1, (matchedLiteral + crossLanguage * 0.65) / Math.max(2, Math.sqrt(windowTokens.length))),
    phraseEvidence: phrase.ratio,
    matchedLiteral,
    crossLanguage,
    matchedSources,
    matchedTerms: matchedSources.map((sourceHash) => plan.sourceTokens.get(sourceHash) || sourceHash),
  };
}

function tokenMatchesSourceSet(token, sourceSet, plan) {
  if (!sourceSet?.size) return false;
  const featureHash = hashFeature(unigramFeature(token));
  if (sourceSet.has(featureHash.toString(36))) return true;
  for (const sourceHash of plan.crossLanguageSources.get(featureHash)?.keys() || []) {
    if (sourceSet.has(sourceHash)) return true;
  }
  return false;
}

function hasSourceProximity(tokens, leftSources, rightSources, plan, maximumDistance = 14) {
  if (!leftSources?.size || !rightSources?.size) return false;
  const leftIndices = [];
  const rightIndices = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (tokenMatchesSourceSet(token, leftSources, plan)) leftIndices.push(index);
    if (tokenMatchesSourceSet(token, rightSources, plan)) rightIndices.push(index);
  }
  let leftCursor = 0;
  let rightCursor = 0;
  while (leftCursor < leftIndices.length && rightCursor < rightIndices.length) {
    const distance = Math.abs(leftIndices[leftCursor] - rightIndices[rightCursor]);
    if (distance <= maximumDistance) return true;
    if (leftIndices[leftCursor] < rightIndices[rightCursor]) leftCursor += 1;
    else rightCursor += 1;
  }
  return false;
}

function overlapRatio(leftTokens, rightTokens) {
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union ? intersection / union : 0;
}

export function rerankLoadedRecords({
  manifest,
  plan,
  candidates,
  records,
  resultLimit = 5,
}) {
  if (!candidates.length) return [];
  const recordMap = records instanceof Map ? records : new Map(records);
  const topCandidateScore = candidates[0]?.candidateScore || 1;
  const ranked = candidates
    .map((candidate) => {
      const metadata = manifest.metadata[candidate.id];
      if (!metadata) return null;
      const text = recordMap.get(candidate.id) || "";
      if (!text) return null;
      const textTokens = tokenize(text.replace(/^###.*$/m, "").replace(/\[Link\].*$/m, ""));
      const evidence = bestEvidenceWindow(textTokens, plan, manifest);
      const [titleIndex, collectionIndex, authorIndex, volumeIndex, chapterIndex, imamMask] = metadata;
      const title = manifest.strings.titles[titleIndex];
      const chapter = manifest.strings.chapters[chapterIndex];
      const titleEvidence = bestEvidenceWindow(tokenize(`${title} ${chapter}`), plan, manifest, 20);
      const matchedSourceSet = new Set([
        ...evidence.matchedSources,
        ...titleEvidence.matchedSources,
      ]);
      const bodySourceSet = new Set(evidence.matchedSources);
      const titleSourceSet = new Set(titleEvidence.matchedSources);
      const facetMatches = [...plan.boostFacetSourceHashes].filter((sourceHash) => matchedSourceSet.has(sourceHash));
      const requiredFacetMatches = [...plan.requiredFacetSourceHashes]
        .filter((sourceHash) => matchedSourceSet.has(sourceHash));
      const bodyFacetMatched = [...plan.requiredFacetSourceHashes].some((sourceHash) => bodySourceSet.has(sourceHash))
        || (!plan.requiredFacetSourceHashes.size
          && [...plan.boostFacetSourceHashes].some((sourceHash) => bodySourceSet.has(sourceHash)));
      const titleFacetMatched = [...plan.requiredFacetSourceHashes].some((sourceHash) => titleSourceSet.has(sourceHash))
        || (!plan.requiredFacetSourceHashes.size
          && [...plan.boostFacetSourceHashes].some((sourceHash) => titleSourceSet.has(sourceHash)));
      const bodyEntityMatched = !plan.entitySourceHashes.size
        || [...plan.entitySourceHashes].some((sourceHash) => bodySourceSet.has(sourceHash));
      const titleEntityMatched = !plan.entitySourceHashes.size
        || [...plan.entitySourceHashes].some((sourceHash) => titleSourceSet.has(sourceHash));
      const trustedEntityTitle = /(?:imam.{0,20}(?:mahdi|time)|master.{0,12}age|al[- ]?qa[’'`]?im|qaim|صاحب الزمان|القائم)/iu.test(`${title} ${chapter}`);
      const closeEntityFacet = hasSourceProximity(
        textTokens,
        plan.entitySourceHashes,
        plan.requiredFacetSourceHashes.size ? plan.requiredFacetSourceHashes : plan.boostFacetSourceHashes,
        plan,
        14,
      );
      const facetCoverage = plan.boostFacetSourceHashes.size
        ? Math.min(1, facetMatches.length / Math.max(1, Math.min(5, plan.boostFacetSourceHashes.size)))
        : 0;
      const facetMatched = plan.requiredFacetSourceHashes.size
        ? requiredFacetMatches.length > 0
        : facetMatches.length > 0;
      const facetEntityProximity = !plan.entitySourceHashes.size
        || closeEntityFacet
        || (bodyFacetMatched && trustedEntityTitle)
        || (titleFacetMatched && bodyEntityMatched && trustedEntityTitle);
      const candidateEvidence = Math.min(1, (candidate.candidateScore || 0) / topCandidateScore);
      const phraseConjunction = evidence.phraseEvidence >= 0.2
        ? Math.min(0.14, evidence.phraseEvidence * 0.42)
        : 0;
      const relationScore = candidate.relationScore || 0;
      const relationBoost = relationScore >= 0.22 ? Math.min(0.3, relationScore * 0.3) : 0;
      const directScore = evidence.coverage * 0.42
        + evidence.phraseEvidence * 0.3
        + evidence.density * 0.1
        + candidateEvidence * 0.07
        + titleEvidence.coverage * 0.02
        + phraseConjunction
        + (evidence.crossLanguage >= 2 ? 0.22 : 0);
      const focusMatched = !plan.focusSourceHash || evidence.matchedSources.includes(plan.focusSourceHash)
        || titleEvidence.matchedSources.includes(plan.focusSourceHash);
      const focusBoost = plan.focusSourceHash && focusMatched ? 0.18 : 0;
      const facetBoost = Math.min(0.32, facetCoverage * 0.24 + (facetMatched ? 0.1 : 0));
      const rawScore = directScore + relationBoost + focusBoost + facetBoost;
      const strategies = [];
      if (evidence.matchedLiteral) strategies.push("literal");
      if (evidence.phraseEvidence > 0.05) strategies.push("phrase");
      if (evidence.crossLanguage) strategies.push("cross-language");
      if (titleEvidence.coverage > 0.1) strategies.push("heading");
      if (relationScore >= 0.22) strategies.push("parallel-report");
      if (facetMatched && plan.retrievalProfile?.facet && plan.retrievalProfile.facet !== "general") {
        strategies.push(`intent-${plan.retrievalProfile.facet}`);
      }
      return {
        id: candidate.id,
        rawScore,
        directScore,
        relationScore,
        relatedTo: candidate.relationTo ?? null,
        score: Math.max(0.01, Math.min(0.99, rawScore)),
        title,
        collection: manifest.strings.collections[collectionIndex],
        author: manifest.strings.authors[authorIndex],
        volume: manifest.strings.volumes[volumeIndex],
        chapter,
        imams: manifest.imams.filter((_, index) => imamMask & (1 << index)),
        link: metadata[7],
        text,
        strategies,
        taqiyyah: taqiyyahEvidence(text),
        _tokens: textTokens,
        _matchedSources: new Set([
          ...evidence.matchedSources,
          ...titleEvidence.matchedSources,
        ]).size,
        _coverage: evidence.coverage,
        _titleCoverage: titleEvidence.coverage,
        _matchedTerms: evidence.matchedTerms,
        _phraseEvidence: evidence.phraseEvidence,
        _matchedLiteral: evidence.matchedLiteral,
        _crossLanguage: evidence.crossLanguage,
        _focusMatched: focusMatched,
        _facetMatched: facetMatched,
        _facetCoverage: facetCoverage,
        _facetEntityProximity: facetEntityProximity,
      };
    })
    .filter(Boolean)
    .filter((result) => (
      result._matchedSources > 0
      && (result.relationScore < 0.42 || result._coverage >= 0.3 || result._titleCoverage >= 0.12)
      && (result._focusMatched || result.relationScore >= 0.75)
      && (!plan.retrievalProfile?.strictFacet
        || (result._facetMatched && result._facetEntityProximity))
    ))
    .sort((left, right) => right.rawScore - left.rawScore);

  if (!ranked.length) return [];
  const topScore = ranked[0].rawScore;
  const directFloorRatio = Math.max(0.25, Math.min(0.75, Number(plan.retrievalProfile?.directFloorRatio) || 0.46));
  const relatedFloorRatio = Math.max(0.2, Math.min(0.7, Number(plan.retrievalProfile?.relatedFloorRatio) || 0.36));
  const directFloor = Math.max(0.12, topScore * directFloorRatio);
  const relatedFloor = Math.max(0.11, topScore * relatedFloorRatio);
  const eligible = ranked.filter((result) => (
    result.relationScore >= 0.22
      ? result.rawScore >= relatedFloor
      : result.rawScore >= directFloor
  ));

  const selected = [];
  const chapterCounts = new Map();
  const shortQuery = plan.uniqueTokens.length <= 2;
  const maxDirectResults = Math.max(1, Math.min(
    resultLimit,
    Number(plan.retrievalProfile?.maxDirectResults)
      || (plan.focusSourceHash ? 1 : shortQuery ? 1 : plan.uniqueTokens.length >= 5 ? 3 : resultLimit),
  ));
  const maxPerChapter = Math.max(1, Number(plan.retrievalProfile?.maxPerChapter) || 2);
  const topPhraseEvidence = eligible[0]?._phraseEvidence || 0;
  const phraseFloor = topPhraseEvidence >= 0.12 ? Math.max(0.06, topPhraseEvidence * 0.35) : 0;
  let nonParallelCount = 0;
  for (const result of eligible) {
    const chapterKey = normalizeText(`${result.collection} ${result.chapter}`);
    const isParallel = selected.length > 0 && result.relationScore >= 0.22;
    if (!isParallel && (chapterCounts.get(chapterKey) || 0) >= maxPerChapter) continue;
    if (!isParallel && nonParallelCount >= maxDirectResults) continue;
    if (!isParallel && selected.length > 0) {
      const secondaryDirectRatio = Math.max(0.45, Math.min(0.9, Number(plan.retrievalProfile?.secondaryDirectRatio) || 0.62));
      if (result.rawScore < topScore * secondaryDirectRatio) continue;
    }
    if (!isParallel && phraseFloor && result._phraseEvidence < phraseFloor) continue;
    if (selected.some((known) => overlapRatio(known._tokens, result._tokens) > 0.985)) continue;
    selected.push(result);
    if (!isParallel) nonParallelCount += 1;
    chapterCounts.set(chapterKey, (chapterCounts.get(chapterKey) || 0) + 1);
    if (selected.length === resultLimit) break;
  }

  const best = selected[0]?.rawScore || 1;
  return selected.map(({
    rawScore,
    directScore,
    _tokens,
    _matchedSources,
    _coverage,
    _titleCoverage,
    _matchedTerms,
    _phraseEvidence,
    _matchedLiteral,
    _crossLanguage,
    _focusMatched,
    _facetMatched,
    _facetCoverage,
    _facetEntityProximity,
    ...result
  }, index) => ({
    ...result,
    score: Math.max(0.05, Math.min(0.98, (rawScore / best) * (index === 0 ? 0.97 : 0.93))),
  }));
}

export function taqiyyahEvidence(text) {
  const normalized = normalizeText(text);
  const explicit = /\b(taqiyya|taqiyyah|taqiyah|dissimulation)\b/.test(normalized)
    || /تقي[هة]/u.test(text);
  const narratorCriticism = /\b(liar|lying|called .{0,50} a liar|accused .{0,50} of lying)\b/i.test(text);
  const contextual = /\b(fear|danger|ruler|secretly|save lives|compelled|contradict(?:s|ed|ory)?)\b/i.test(text);
  if (explicit) return { level: "explicit", note: "The narration explicitly mentions taqiyyah or dissimulation." };
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
