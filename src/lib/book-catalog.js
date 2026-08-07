const VERIFIED_BOOKS = [
  {
    title: "Wasāʾil al-Shīʿa",
    author: "Muhammad ibn al-Hasan al-Hurr al-Amili (Shaykh al-Hurr al-Amili)",
    aliases: ["wasail al shia", "wasa il al shia", "wasael al shia", "wasail as shia", "wasaa il al shiah"],
  },
  {
    title: "Bihār al-Anwār",
    author: "Muhammad Baqir al-Majlisi (Allama al-Majlisi)",
    aliases: ["bihar al anwar", "biharul anwar", "behar al anwar"],
  },
  {
    title: "Man lā Yaḥḍuruhu al-Faqīh",
    author: "Muhammad ibn Ali ibn Babawayh al-Qummi (Shaykh al-Saduq)",
    aliases: ["man la yahduruhu al faqih", "man la yahzaruhu al faqih", "al faqih"],
  },
  {
    title: "Tahdhīb al-Aḥkām",
    author: "Muhammad ibn al-Hasan al-Tusi (Shaykh al-Tusi)",
    aliases: ["tahdhib al ahkam", "tahzeeb al ahkam"],
  },
  {
    title: "al-Istibṣār",
    author: "Muhammad ibn al-Hasan al-Tusi (Shaykh al-Tusi)",
    aliases: ["al istibsar", "istibsar"],
  },
  {
    title: "Nahj al-Balāgha",
    author: "compiled by al-Sharif al-Radi",
    aliases: ["nahj al balagha", "nahjul balagha", "nahj ul balagha"],
  },
  {
    title: "al-Irshād",
    author: "Muhammad ibn Muhammad ibn al-Nu'man (Shaykh al-Mufid)",
    aliases: ["al irshad", "kitab al irshad"],
  },
  {
    title: "Mafātīḥ al-Jinān",
    author: "Shaykh Abbas al-Qummi",
    aliases: ["mafatih al jinan", "mafatihul jinan"],
  },
  {
    title: "Kāmil al-Ziyārāt",
    author: "Ja'far ibn Muhammad ibn Qulawayh al-Qummi",
    aliases: ["kamil al ziyarat", "kamil uz ziyarat"],
  },
  {
    title: "Maʿānī al-Akhbār",
    author: "Muhammad ibn Ali ibn Babawayh al-Qummi (Shaykh al-Saduq)",
    aliases: ["maani al akhbar", "ma ani al akhbar"],
  },
  {
    title: "Thawāb al-Aʿmāl wa ʿIqāb al-Aʿmāl",
    author: "Muhammad ibn Ali ibn Babawayh al-Qummi (Shaykh al-Saduq)",
    aliases: ["thawab al amal", "thawab al amal wa iqab al amal", "sawab al amal"],
  },
  {
    title: "ʿUyūn Akhbār al-Riḍā",
    author: "Muhammad ibn Ali ibn Babawayh al-Qummi (Shaykh al-Saduq)",
    aliases: ["uyun akhbar al rida", "oyoun akhbar al reza"],
  },
  {
    title: "Faḍāʾil al-Shīʿa",
    author: "Muhammad ibn Ali ibn Babawayh al-Qummi (Shaykh al-Saduq)",
    aliases: ["fadail al shia", "fazail al shia"],
  },
  {
    title: "Ṣifāt al-Shīʿa",
    author: "Muhammad ibn Ali ibn Babawayh al-Qummi (Shaykh al-Saduq)",
    aliases: ["sifat al shia"],
  },
  {
    title: "Tafsīr al-Qummī",
    author: "Ali ibn Ibrahim al-Qummi",
    aliases: ["tafsir al qummi", "tafsir e qummi"],
  },
  {
    title: "Tafsīr al-ʿAyyāshī",
    author: "Muhammad ibn Mas'ud al-Ayyashi",
    aliases: ["tafsir al ayyashi", "tafsir e ayyashi"],
  },
  {
    title: "Baṣāʾir al-Darajāt",
    author: "Muhammad ibn al-Hasan al-Saffar al-Qummi",
    aliases: ["basair al darajat", "basair ud darajat"],
  },
  {
    title: "al-Iḥtijāj",
    author: "Ahmad ibn Ali al-Tabrisi",
    aliases: ["al ihtijaj", "kitab al ihtijaj"],
  },
  {
    title: "al-Wāfī",
    author: "Muhammad Muhsin al-Fayd al-Kashani",
    aliases: ["al wafi", "kitab al wafi"],
  },
  {
    title: "Mustadrak al-Wasāʾil",
    author: "Mirza Husayn al-Nuri al-Tabrisi",
    aliases: ["mustadrak al wasail", "mustadrakul wasail"],
  },
  {
    title: "Kitab Sulaym ibn Qays",
    author: "attributed to Sulaym ibn Qays al-Hilali",
    aliases: ["kitab sulaym", "kitab sulaymn", "book of sulaym", "sulaym ibn qays"],
  },
  {
    title: "Nafs al-Mahmum",
    author: "Shaykh Abbas al-Qummi",
    aliases: ["nafs al mahmum", "nafsul mahmoom", "nafs ul mahmum"],
  },
];

const AUTHORSHIP_INTENT = /\b(?:who\s+(?:is|was)\s+(?:the\s+)?(?:author|compiler)|who\s+(?:wrote|compiled)|(?:author|compiler)\s+of|(?:book\s+)?author|written\s+by|wrote|compiled)\b/i;
const BOOK_ASSESSMENT_INTENT = /\b(?:how\s+(?:good|reliable|authentic|sound|weak)|is\s+(?:the\s+)?(?:book\s+)?(?:reliable|authentic|sound|weak)|reliability|authenticity|grade|grading|assessment)\b/i;

function normalize(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ʿ|ʾ|['’`]/gu, " ")
    .replace(/[^a-z0-9\u0600-\u06ff]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized
    .split(" ")
    .map((token) => {
      if (/^(?:as|ash|az|ar|an|ad|at|ul|us|ud)$/u.test(token)) return "al";
      const vowelFolded = token
        .replace(/aa+/gu, "a")
        .replace(/ee+/gu, "i")
        .replace(/oo+/gu, "u");
      if (vowelFolded.length < 7) return vowelFolded;
      const suffixFolded = vowelFolded.replace(/(?:ullahi|ullah|uhu|ihi|ahu|ul)$/u, "");
      return suffixFolded.length >= 4 ? suffixFolded : vowelFolded;
    })
    .join(" ");
}

function candidateScore(query, alias) {
  if (!alias) return 0;
  if (query.includes(alias)) return 1000 + alias.length;
  const queryTokens = new Set(query.split(" ").filter((token) => token.length > 1 && token !== "al"));
  const aliasTokens = alias.split(" ").filter((token) => token.length > 1 && token !== "al");
  if (!aliasTokens.length) return 0;
  const overlap = aliasTokens.filter((token) => queryTokens.has(token)).length;
  const coverage = overlap / aliasTokens.length;
  return coverage >= 0.75 ? coverage * 100 + overlap : 0;
}

function corpusBooks(manifest) {
  if (Array.isArray(manifest?.bibliography)) {
    return manifest.bibliography
      .filter(([title, author]) => title && author && !/not identified/i.test(author))
      .map(([title, author]) => ({
        title,
        author,
        aliases: [title],
        source: "corpus metadata",
      }));
  }
  if (!Array.isArray(manifest?.metadata) || !manifest?.strings) return [];
  const books = new Map();
  for (const metadata of manifest.metadata) {
    const title = manifest.strings.collections?.[metadata[1]];
    const author = manifest.strings.authors?.[metadata[2]];
    if (!title || !author || /not identified/i.test(author)) continue;
    const key = normalize(title);
    if (!books.has(key)) books.set(key, {
      title,
      author,
      aliases: [title],
      source: "corpus metadata",
    });
  }
  return [...books.values()];
}

export function resolveBookAuthorship(query, manifest) {
  const raw = String(query || "").trim();
  const asksAuthorship = AUTHORSHIP_INTENT.test(raw);
  const asksAssessment = BOOK_ASSESSMENT_INTENT.test(raw);
  if (!asksAuthorship && !asksAssessment) return null;
  const normalizedQuery = normalize(raw);
  const external = VERIFIED_BOOKS.map((book) => ({ ...book, source: "verified local bibliography" }));
  const candidates = [...corpusBooks(manifest), ...external]
    .map((book) => {
      const aliases = [book.title, ...(book.aliases || [])].map(normalize);
      return {
        ...book,
        score: Math.max(...aliases.map((alias) => candidateScore(normalizedQuery, alias))),
      };
    })
    .filter((book) => book.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!candidates.length) {
    if (/\b(?:hadith|ahadith|narration|narrations|report|reports|riwaya|riwayat)\b/i.test(raw)) {
      return null;
    }
    return {
      intent: "book-lookup",
      known: false,
      lookupQuery: raw,
      text: "That title is not in the local bibliography. Looking it up in online library catalogs…",
    };
  }

  const match = candidates[0];
  if (asksAssessment) {
    return {
      intent: "book-info",
      known: true,
      title: match.title,
      author: match.author,
      source: match.source,
      text: `${match.title} is ${/^attributed to\b/i.test(match.author) ? match.author : `written or compiled by ${match.author}`}. A bibliography entry cannot establish a blanket authenticity grade for every report in a book; that requires report-by-report chain and text evaluation. Source: ${match.source}.`,
    };
  }
  return {
    intent: "book-info",
    known: true,
    title: match.title,
    author: match.author,
    source: match.source,
    text: `${match.title} was ${/^compiled by\b/i.test(match.author) ? match.author : `written or compiled by ${match.author}`}. Source: ${match.source}.`,
  };
}

export const VERIFIED_BOOK_COUNT = VERIFIED_BOOKS.length;
