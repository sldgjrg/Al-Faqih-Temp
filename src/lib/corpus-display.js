const FATWA_TITLE_NOTE = /\s*\(\s*fatwa\s+best\s+explains\s+ahadith[^)]*\)/gi;

export function cleanCorpusDisplay(value = "") {
  return value
    .replace(FATWA_TITLE_NOTE, "")
    .replace(/[ \t]+(?=\n|$)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function cleanCorpusMarkdown(value = "") {
  return value.replace(FATWA_TITLE_NOTE, "");
}
