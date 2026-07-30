import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const lookupCache = new Map();
const TITLE_STOP_WORDS = new Set(
  "a an and author book by compiled compiler is of the title was who wrote written".split(" "),
);

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ʿ|ʾ|['’`]/gu, " ")
    .replace(/[^a-z0-9\u0600-\u06ff]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((token) => /^(?:as|ash|az|ar|an|ad|at|ul|us|ud)$/u.test(token) ? "al" : token)
    .join(" ");
}

function extractRequestedTitle(query) {
  return String(query || "")
    .replace(/\bwho\s+(?:is|was)\s+(?:the\s+)?(?:author|compiler)\s+of\b/giu, " ")
    .replace(/\bwho\s+(?:wrote|compiled)\b/giu, " ")
    .replace(/\b(?:what\s+is\s+)?(?:the\s+)?(?:author|compiler)\s+of\b/giu, " ")
    .replace(/\b(?:book\s+)?author\b/giu, " ")
    .replace(/[?؟]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function titleTokens(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 1 && !TITLE_STOP_WORDS.has(token));
}

function titleScore(requestedTitle, candidateTitle) {
  const requested = titleTokens(requestedTitle);
  const candidate = titleTokens(candidateTitle);
  if (!requested.length || !candidate.length) return 0;
  const candidateSet = new Set(candidate);
  const overlap = requested.filter((token) => candidateSet.has(token)).length;
  const coverage = overlap / requested.length;
  const precision = overlap / candidate.length;
  const exact = normalize(requestedTitle) === normalize(candidateTitle);
  if (!exact && coverage < 0.72) return 0;
  return (exact ? 3 : 0) + coverage * 2 + precision;
}

async function openLibraryCandidates(title) {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("title", title);
  url.searchParams.set("limit", "10");
  url.searchParams.set("fields", "key,title,author_name");
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Open Library returned ${response.status}`);
  const payload = await response.json();
  return (payload?.docs || []).flatMap((book) => {
    const authors = Array.isArray(book?.author_name) ? book.author_name.filter(Boolean) : [];
    if (!book?.title || !authors.length || !book?.key) return [];
    return [{
      title: book.title,
      authors,
      catalog: "Open Library",
      url: `https://openlibrary.org${book.key}`,
    }];
  });
}

async function googleBooksCandidates(title) {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", `intitle:${title}`);
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("printType", "books");
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Google Books returned ${response.status}`);
  const payload = await response.json();
  return (payload?.items || []).flatMap((item) => {
    const info = item?.volumeInfo;
    const authors = Array.isArray(info?.authors) ? info.authors.filter(Boolean) : [];
    if (!info?.title || !authors.length || !item?.id) return [];
    return [{
      title: info.title,
      authors,
      catalog: "Google Books",
      url: (info.infoLink || `https://books.google.com/books?id=${encodeURIComponent(item.id)}`)
        .replace(/^http:/u, "https:"),
    }];
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, 300) : "";
  const title = extractRequestedTitle(query);
  if (!title) return NextResponse.json({ error: "A book title is required." }, { status: 400 });

  const cacheKey = normalize(title);
  const cached = lookupCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return NextResponse.json(cached.payload);
  }

  const settled = await Promise.allSettled([
    openLibraryCandidates(title),
    googleBooksCandidates(title),
  ]);
  const candidates = settled
    .flatMap((result) => result.status === "fulfilled" ? result.value : [])
    .map((candidate) => ({ ...candidate, score: titleScore(title, candidate.title) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!candidates.length) {
    const unavailable = settled.every((result) => result.status === "rejected");
    return NextResponse.json(
      {
        found: false,
        title,
        error: unavailable
          ? "The online library catalogs are currently unavailable."
          : "No sufficiently close title with author metadata was found in the online library catalogs.",
      },
      { status: unavailable ? 503 : 404 },
    );
  }

  const best = candidates[0];
  const matchingCatalogs = [...new Set(candidates
    .filter((candidate) => (
      normalize(candidate.title) === normalize(best.title)
      && normalize(candidate.authors.join(" ")) === normalize(best.authors.join(" "))
    ))
    .map((candidate) => candidate.catalog))];
  const payload = {
    found: true,
    requestedTitle: title,
    title: best.title,
    authors: best.authors,
    catalog: best.catalog,
    sourceUrl: best.url,
    corroboratedBy: matchingCatalogs,
  };
  lookupCache.set(cacheKey, { createdAt: Date.now(), payload });
  return NextResponse.json(payload);
}
