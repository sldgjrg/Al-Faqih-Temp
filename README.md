# Al-Faqih Local

Al-Faqih searches the bundled Shia hadith corpus entirely in the browser. Queries,
retrieval scores, filters, cached narrations, and conversation history stay on the
user's device. The active application does not require an OpenAI key or a hosted
AI endpoint.

## How Retrieval Works

The build script converts `hadith_corpus.md` into:

- short, overlapping evidence passages rather than one vector per long record
- compact unigram and ordered-phrase signatures for passage retrieval
- bilingual English-Arabic links learned from reciprocal corpus co-occurrence
- collection, author, volume, chapter, and Imam metadata
- 128-narration full-text shards

The browser retrieves passage-level candidates, preserves literal and logical
terms such as numbers and negation, scores ordered query spans, and reranks the
full narration around its strongest local evidence window. The production ranker
contains no prompt-to-narration IDs or scenario-specific boosts. Results are
extractive: the text shown comes directly from the corpus rather than a
generative model.

## Run Locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The first visit stores the retrieval index in IndexedDB. Full
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

## Optional Local Conversation Model

Hadith retrieval remains fully local and deterministic. For open-ended, non-religious
conversation, the app can also use Ollama on the same computer:

```bash
ollama serve
ollama pull qwen2.5:3b
```

The Next.js route uses `http://127.0.0.1:11434` and `qwen2.5:3b` by default. Override
them with `LOCAL_LLM_BASE_URL` and `LOCAL_LLM_MODEL` when using another Ollama model
or an OpenAI-compatible local server. If the model is not running, the app falls back
to its small deterministic conversation layer.

## Taqiyyah Labels

The interface distinguishes explicit mentions of taqiyyah from contextual cues.
A narrator being called a liar is never treated as proof by itself; it is marked
for contextual review. Retrieval results are research evidence, not a fatwa or
an authenticity grading.
