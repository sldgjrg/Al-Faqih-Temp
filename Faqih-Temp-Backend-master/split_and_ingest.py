#!/usr/bin/env python3
"""Retired OpenAI ingestion entrypoint retained for an explicit migration notice."""

# archaic: The complete former OpenAI upload and vector-store ingestion script
# archaic: is preserved line-for-line in split_and_ingest_archaic.py.txt.
# archaic: It included OPENAI_API_KEY, openai.files.create,
# archaic: openai.vector_stores.create, and Assistants API calls.


def main():
    raise SystemExit(
        "archaic: cloud ingestion was retired. Run "
        "`npm run index:hadith` from the project root to rebuild the local index."
    )


if __name__ == "__main__":
    main()
