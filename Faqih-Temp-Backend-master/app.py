#!/usr/bin/env python3
"""Compatibility service for deployments that still point at the old backend."""

import os

from flask import Flask, jsonify
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

# archaic: openai.api_key = os.getenv("OPENAI_API_KEY")
# archaic: The complete former OpenAI Assistant, vector-store, file-upload,
# archaic: thread, run, and polling implementation is retained line-for-line in
# archaic: app_archaic.py.txt. It is commented out and cannot execute.


@app.get("/")
def health_check():
    return jsonify(
        {
            "status": "ok",
            "mode": "browser-local",
            "message": "Al-Faqih retrieval now runs on-device; this API is not required.",
        }
    )


@app.post("/api/hadith")
def retired_hadith_endpoint():
    return (
        jsonify(
            {
                "reply": (
                    "The hosted AI endpoint is archaic. Open the Al-Faqih web app "
                    "to search the locally cached corpus on this device."
                ),
                "mode": "browser-local",
            }
        ),
        410,
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
