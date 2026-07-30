const FATWA_EDITORIAL_NOTE = /\s*\([^()]*\b(?:fatwa\s+best\s+explains?|best\s+explained\s+by\s+fatwa|consult\s+fatwas?\s+of\s+(?:one['’]s|your)\s+mujtahid)\b[^()]*\)/giu;
const FATWA_EDITORIAL_SENTENCE = /\s*\(?[^\n.]*\b(?:fatwa\s+best\s+explains?|best\s+explained\s+by\s+fatwa)\b[^\n.]*\.?\)?/giu;

export function cleanCorpusDisplay(value = "") {
  return value
    .replace(FATWA_EDITORIAL_NOTE, "")
    .replace(FATWA_EDITORIAL_SENTENCE, "")
    .replace(/[ \t]+(?=\n|$)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function cleanCorpusMarkdown(value = "") {
  return value
    .replace(FATWA_EDITORIAL_NOTE, "")
    .replace(FATWA_EDITORIAL_SENTENCE, "");
}
