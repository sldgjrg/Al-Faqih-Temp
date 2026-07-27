# Al-Faqih Local

Al-Faqih searches the bundled Shia hadith corpus entirely in the browser. Queries,
retrieval scores, filters, cached narrations, and conversation history stay on the
user's device. The active application does not require an OpenAI key or a hosted
AI endpoint.

## How Retrieval Works

The build script converts `hadith_corpus.md` into:

- 192-dimensional local semantic vectors for dense retrieval
- compact lexical signatures for BM25-style keyword retrieval
- collection, author, volume, chapter, and Imam metadata
- 128-narration full-text shards

The browser combines dense, keyword, and metadata scores, takes 20 candidates,
loads their full text from IndexedDB or local static files, and reranks them to
the best five. Results are extractive: the text shown comes directly from the
corpus rather than a generative model.

## Run Locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The first visit stores the roughly 18 MB retrieval index in IndexedDB. Full
narration text is cached as it is used. Choose **Save full corpus offline** in
the sidebar to store every text shard (about 47 MB) for offline use.

For a phone on the same Wi-Fi network, run:

```bash
npm run dev -- --hostname 0.0.0.0
```

Then open `http://YOUR-COMPUTER-LAN-IP:3000` on the phone. Browser storage is
device-specific, so each phone or desktop installs its own local index.

## Rebuild The Index

Run this whenever `hadith_corpus.md` changes:

```bash
npm run index:hadith
```

The generated files live under `public/hadith-data`. They must be deployed with
the Next.js application.

## Production

```bash
npm run build
npm start
```

The old Flask service under `Faqih-Temp-Backend-master` is no longer needed for
search. It remains as a compatibility health endpoint. Its complete former
OpenAI implementation is preserved in `app_archaic.py.txt` and
`split_and_ingest_archaic.py.txt`, with every line marked `archaic`.

## Taqiyyah Labels

The interface distinguishes explicit mentions of taqiyyah from contextual cues.
A narrator being called a liar is never treated as proof by itself; it is marked
for contextual review. Retrieval results are research evidence, not a fatwa or
an authenticity grading.
