// import { NextResponse } from "next/server";

// export const runtime = "nodejs";

// const DEFAULT_SYSTEM = "You are Al-Faqih, a concise and warm local conversation assistant. Answer the user's actual request directly. Do not describe your capabilities unless asked. Do not invent hadith citations or religious rulings; religious questions are handled by the local hadith retrieval system.";

// export async function POST(request) {
//   let body;
//   try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
//   const query = typeof body?.query === "string" ? body.query.trim() : "";
//   if (!query) return NextResponse.json({ error: "A message is required." }, { status: 400 });
//   const baseUrl = (process.env.LOCAL_LLM_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
//   const model = process.env.LOCAL_LLM_MODEL || "qwen2.5:3b";
//   const history = Array.isArray(body?.history) ? body.history : [];
//   const messages = [
//     { role: "system", content: typeof body?.system === "string" ? body.system : DEFAULT_SYSTEM },
//     ...history.filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string").slice(-8),
//     { role: "user", content: query },
//   ];
//   try {
//     const response = await fetch(`${baseUrl}/api/chat`, {
//       method: "POST",
//       headers: { "content-type": "application/json" },
//       body: JSON.stringify({ model, messages, stream: false, options: { temperature: 0.35 } }),
//       signal: AbortSignal.timeout(45_000),
//     });
//     if (!response.ok) return NextResponse.json({ error: `Local model returned ${response.status}.` }, { status: 502 });
//     const payload = await response.json();
//     const text = payload?.message?.content?.trim();
//     if (!text) return NextResponse.json({ error: "The local model returned no text." }, { status: 502 });
//     return NextResponse.json({ text, provider: "ollama", model });
//   } catch (error) {
//     return NextResponse.json({ error: "Local model is unavailable. Start Ollama and download the configured model.", detail: error instanceof Error ? error.message : "unknown error" }, { status: 503 });
//   }
// }

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error: "Server-side local chat is disabled. Al-Faqih now runs its language model inside the user's browser worker.",
    },
    { status: 410 },
  );
}
