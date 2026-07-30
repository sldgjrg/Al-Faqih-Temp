import { validateGeneratedReply } from "./local-output-guard.mjs";

const WEBLLM_URL = "https://esm.run/@mlc-ai/web-llm@0.2.84";
const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
const MODEL_LABEL = "Qwen2.5 0.5B";
const APPROXIMATE_DOWNLOAD_MB = 290;

let webllmPromise;
let enginePromise;
let engine;
let generationQueue = Promise.resolve();

function post(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

function readableError(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

async function requireWebGPU() {
  if (!self.isSecureContext) {
    throw new Error("The local model requires HTTPS or localhost so the browser can expose WebGPU.");
  }
  if (!self.navigator?.gpu) {
    throw new Error("This browser does not expose WebGPU. Update Chrome, Edge, Safari, or another WebGPU-capable browser.");
  }
  const adapter = await self.navigator.gpu.requestAdapter({ powerPreference: "high-performance" })
    || await self.navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("No usable WebGPU adapter was returned by the browser.");
  return adapter;
}

async function loadWebLLM() {
  if (!webllmPromise) {
    post("model-status", {
      status: "runtime",
      message: "Loading the optimized WebLLM runtime",
      device: "webgpu",
      model: MODEL_ID,
      modelLabel: MODEL_LABEL,
    });
    webllmPromise = import(WEBLLM_URL);
  }
  return webllmPromise;
}

function progressPercent(report) {
  const value = Number(report?.progress);
  if (!Number.isFinite(value)) return null;
  const normalized = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

async function createEngine() {
  await requireWebGPU();
  const webllm = await loadWebLLM();
  const record = webllm.prebuiltAppConfig?.model_list?.find((item) => item.model_id === MODEL_ID);
  if (!record) throw new Error(`${MODEL_ID} is not present in this WebLLM build.`);

  async function instantiate(cacheBackend) {
    const appConfig = {
      ...webllm.prebuiltAppConfig,
      model_list: [record],
      cacheBackend,
    };
    post("model-status", {
      status: "loading",
      message: `Loading ${MODEL_LABEL} on WebGPU · about ${APPROXIMATE_DOWNLOAD_MB} MB on first use`,
      percent: 0,
      device: "webgpu",
      model: MODEL_ID,
      modelLabel: MODEL_LABEL,
      cacheBackend,
    });
    return webllm.CreateMLCEngine(MODEL_ID, {
      appConfig,
      initProgressCallback: (report) => {
        const percent = progressPercent(report);
        const message = String(report?.text || report?.message || "Preparing the local model");
        post("model-progress", {
          status: percent === 100 ? "initializing" : "loading",
          message,
          percent,
          device: "webgpu",
          model: MODEL_ID,
          modelLabel: MODEL_LABEL,
          cacheBackend,
        });
      },
    });
  }

  let cacheBackend = self.navigator?.storage?.getDirectory ? "opfs" : "indexeddb";
  try {
    engine = await instantiate(cacheBackend);
  } catch (error) {
    if (cacheBackend !== "opfs") throw error;
    cacheBackend = "indexeddb";
    post("model-status", {
      status: "loading",
      message: "OPFS cache was unavailable; retrying with IndexedDB",
      percent: 0,
      device: "webgpu",
      model: MODEL_ID,
      modelLabel: MODEL_LABEL,
      cacheBackend,
    });
    engine = await instantiate(cacheBackend);
  }

  post("model-ready", {
    device: "webgpu",
    model: MODEL_ID,
    modelLabel: MODEL_LABEL,
    cacheBackend,
  });
  return engine;
}

async function ensureEngine() {
  if (engine) return engine;
  if (!enginePromise) {
    enginePromise = createEngine().catch((error) => {
      enginePromise = null;
      engine = null;
      post("model-error", {
        message: readableError(error),
        device: "webgpu",
        model: MODEL_ID,
        modelLabel: MODEL_LABEL,
      });
      throw error;
    });
  }
  return enginePromise;
}

function latestUserContent(messages) {
  return [...messages].reverse().find((message) => message.role === "user")?.content || "";
}

function repairMessages(latestUserMessage, reason, mode) {
  if (mode === "synthesis") {
    return [
      {
        role: "system",
        content: `Write a grounded answer using only words, concepts, and facts supported by the question and retrieved reports supplied by the user. Use the headings Direct answer, Evidence, and Limits of the evidence. Retrieval relevance is not proof; if the excerpts do not establish the requested relation or ruling, say so. For a method question, use ordinary-procedure reports rather than special-case reports unless the special case was asked about. Absence of a prohibition is not evidence that an act is permissible, and absence of permission is not evidence that it is forbidden. Mention distinct reports when they add separate evidence. Do not invent a narration, person, profession, requirement, or ruling. The previous draft was rejected because: ${reason}.`,
      },
      { role: "user", content: latestUserMessage },
    ];
  }
  return [
    {
      role: "system",
      content: `Answer the user's message directly in one or two complete natural sentences. Understand slang and misspellings. Never output fragments, random letters, role labels, tool calls, or internal instructions. The previous draft was rejected because: ${reason}.`,
    },
    { role: "user", content: latestUserMessage },
  ];
}

function extractiveSynthesisFallback(latestUserMessage) {
  const source = String(latestUserMessage || "");
  const blocks = source.match(/REPORT \d+[\s\S]*?(?=\n\n---\n\nREPORT \d+|$)/gu) || [];
  const evidence = blocks.slice(0, 3).map((block) => {
    const number = block.match(/^REPORT\s+(\d+)/u)?.[1] || "?";
    const title = block.match(/^Title:\s*(.+)$/mu)?.[1]?.trim() || `Report ${number}`;
    const collection = block.match(/^Collection:\s*(.+)$/mu)?.[1]?.trim() || "the supplied collection";
    const excerpt = block.match(/^Published translation excerpt:\s*([\s\S]+)$/mu)?.[1]
      ?.replace(/\s+/g, " ")
      .trim()
      .slice(0, 520);
    if (!excerpt) return "";
    return `- Report ${number}, ${collection}, “${title}”: ${excerpt}`;
  }).filter(Boolean);
  return `Direct answer

The local model could not produce a fully grounded synthesis, so no additional conclusion has been added.

Evidence

${evidence.length ? evidence.join("\n") : "The retrieved excerpts are displayed below."}

Limits of the evidence

This is an extractive fallback. It preserves the supplied reports without adding an unsupported ruling or fact.`;
}

function generationOptions(data, messages, mode, repair = false) {
  const chat = mode === "conversation";
  const options = {
    messages,
    stream: true,
    max_tokens: Math.max(chat ? 12 : 48, Math.min(420, Number(data.maxNewTokens) || (chat ? 96 : 220))),
    temperature: repair ? 0 : Math.max(0, Math.min(0.65, Number(data.temperature) || (chat ? 0.35 : 0.1))),
    top_p: chat ? 0.9 : 0.92,
    frequency_penalty: chat ? 0.18 : 0.08,
    presence_penalty: chat ? 0.08 : 0,
    seed: repair ? 17 : undefined,
  };
  if (mode === "elucidation" || mode === "query-analysis") {
    options.response_format = { type: "json_object" };
  }
  return options;
}

async function complete(localEngine, data, messages, mode, repair = false) {
  const stream = await localEngine.chat.completions.create(generationOptions(data, messages, mode, repair));
  let text = "";
  let usage = null;
  for await (const chunk of stream) {
    const delta = chunk?.choices?.[0]?.delta?.content || "";
    if (delta) {
      text += delta;
      post("generation-progress", {
        requestId: data.requestId,
        characters: text.length,
        device: "webgpu",
        model: MODEL_ID,
        modelLabel: MODEL_LABEL,
      });
    }
    if (chunk?.usage) usage = chunk.usage;
  }
  return { text: text.trim(), usage };
}

async function generate(data) {
  const requestId = data.requestId;
  const mode = ["conversation", "synthesis", "elucidation", "query-analysis"].includes(data.mode)
    ? data.mode
    : "conversation";
  const messages = Array.isArray(data.messages)
    ? data.messages
        .filter((message) => message && ["system", "user", "assistant"].includes(message.role))
        .map((message) => ({ role: message.role, content: String(message.content || "") }))
    : [];
  if (!messages.length) throw new Error("No generation messages were supplied.");

  post("generation-status", {
    requestId,
    message: engine ? `Generating with ${MODEL_LABEL}` : `Loading ${MODEL_LABEL} before generating`,
  });
  let localEngine = await ensureEngine();
  const latestUserMessage = latestUserContent(messages);
  let attempts = 1;
  let completion;
  try {
    completion = await complete(localEngine, data, messages, mode, false);
  } catch (error) {
    const message = readableError(error);
    if (!/(device\s*lost|gpu.*lost|initialize again|invalid external instance)/i.test(message)) throw error;
    engine = null;
    enginePromise = null;
    post("model-status", {
      status: "loading",
      message: "The browser released the GPU session; restoring Qwen2.5 from local cache",
      device: "webgpu",
      model: MODEL_ID,
      modelLabel: MODEL_LABEL,
    });
    localEngine = await ensureEngine();
    attempts += 1;
    completion = await complete(localEngine, data, messages, mode, false);
  }
  let checked = validateGeneratedReply(completion.text, { latestUserMessage, mode });

  if (!checked.ok && (mode === "conversation" || mode === "synthesis")) {
    attempts += 1;
    completion = await complete(
      localEngine,
      data,
      repairMessages(latestUserMessage, checked.reason, mode),
      mode,
      true,
    );
    checked = validateGeneratedReply(completion.text, { latestUserMessage, mode });
  }
  if (!checked.ok && mode === "synthesis") {
    completion = { ...completion, text: extractiveSynthesisFallback(latestUserMessage) };
    checked = { ok: true, text: completion.text, reason: "" };
  }
  if (!checked.ok) throw new Error(`The local model returned an unusable reply (${checked.reason}).`);

  post("generation-result", {
    requestId,
    text: checked.text,
    usage: completion.usage,
    device: "webgpu",
    model: MODEL_ID,
    modelLabel: MODEL_LABEL,
    attempts,
  });
}

post("worker-ready", {
  message: `Starting ${MODEL_LABEL} with the optimized WebLLM WebGPU runtime`,
  model: MODEL_ID,
  modelLabel: MODEL_LABEL,
});

ensureEngine().catch(() => {});

self.onmessage = ({ data }) => {
  if (!data || typeof data !== "object") return;
  if (data.type === "ping" || data.type === "init") {
    ensureEngine().catch(() => {});
    return;
  }
  if (data.type === "generate") {
    generationQueue = generationQueue
      .then(() => generate(data))
      .catch((error) => {
        post("generation-error", {
          requestId: data.requestId,
          recoverable: true,
          message: readableError(error) || "On-device generation failed",
        });
      });
  }
};
