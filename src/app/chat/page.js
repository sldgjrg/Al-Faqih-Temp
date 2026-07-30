"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  Database,
  Download,
  Menu,
  MessageSquare,
  Plus,
  SendHorizontal,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { loadConversationState, saveConversationState } from "@/lib/conversation-store";
import { cleanCorpusDisplay, cleanCorpusMarkdown } from "@/lib/corpus-display";
import { resolveElucidation } from "@/lib/hadith-elucidation";
import {
  applyQueryAnalysisToSearchPlan,
  applyMemoryUpdate,
  generateConversationTitle,
  resolveLocalConversation,
  updateConversationMemory,
} from "@/lib/local-conversation";
import {
  conversationMessages,
  elucidationMessages,
  methodEvidenceSynthesis,
  parseElucidationJson,
  parseQueryAnalysisJson,
  queryAnalysisMessages,
  synthesisMessages,
  timeDefinitionEvidenceSynthesis,
} from "@/lib/local-model-prompts";

const THINKING_PHRASES = [
  { text: "Retrieving narrations...", lang: "English", dir: "ltr" },
  { text: "Yastakhrij al-riwayat... · يستخرج الروايات", lang: "العربية", dir: "ltr" },
  { text: "Riwayat ka istikhraj... · روایات کا استخراج", lang: "اردو", dir: "ltr" },
  { text: "Labhna paiya... · روایتاں لبھ ریا آں", lang: "پنجابی", dir: "ltr" },
];

function makeConversation() {
  return {
    id: crypto.randomUUID(),
    title: "New inquiry",
    createdAt: Date.now(),
    calligraphy: Math.random() < 0.5 ? "Ya_Mahdi.png" : "Ya_Qamer-e-bani-hashim.png",
    messages: [],
  };
}

function conversationGenerationOptions(query) {
  const text = String(query || "");
  const detailed = text.length > 180
    || /\b(?:explain|analyze|compare|review|write|draft|create|build|code|script|program|function|component|essay|report|proposal|story|translate|summarize|debug|fix)\b/iu.test(text);
  return {
    maxNewTokens: detailed ? 360 : 96,
    temperature: detailed ? 0.25 : 0.35,
  };
}

function CalligraphyEffect({ source }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const context = canvas.getContext("2d");
    let particles = [];
    let frame;
    const stageOffset = () => window.innerWidth >= 768 ? 143 : 0;
    const pointer = {
      x: window.innerWidth / 2 + stageOffset(),
      y: window.innerHeight * 0.7,
      radius: 120,
    };

    function sizeCanvas() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.resetTransform();
      context.scale(ratio, ratio);
    }

    function buildParticles(image) {
      particles = [];
      const width = window.innerWidth;
      const height = window.innerHeight;
      let widthFraction = source === "Ya_Mahdi.png" ? 0.2 : 0.4;
      if (width < 1024) widthFraction = source === "Ya_Mahdi.png" ? 0.6 : 0.8;
      const imageWidth = width * widthFraction;
      const imageHeight = imageWidth * (image.height / image.width);
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = image.width;
      sourceCanvas.height = image.height;
      const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
      sourceContext.drawImage(image, 0, 0);
      const sourcePixels = sourceContext.getImageData(0, 0, image.width, image.height).data;
      let minX = image.width;
      let maxX = 0;
      let minY = image.height;
      let maxY = 0;
      for (let y = 0; y < image.height; y += 2) {
        for (let x = 0; x < image.width; x += 2) {
          const offset = (y * image.width + x) * 4;
          const distanceFromWhite = Math.hypot(
            255 - sourcePixels[offset],
            255 - sourcePixels[offset + 1],
            255 - sourcePixels[offset + 2],
          );
          if (sourcePixels[offset + 3] > 128 && distanceFromWhite > 40) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
      const hasArtwork = minX <= maxX && minY <= maxY;
      const scale = imageWidth / image.width;
      const artworkCenterX = hasArtwork ? (minX + maxX) / 2 : image.width / 2;
      const artworkCenterY = hasArtwork ? (minY + maxY) / 2 : image.height / 2;
      const drawX = width / 2 + stageOffset() - artworkCenterX * scale;
      const drawY = height / 2 - 52 - artworkCenterY * scale;
      const artworkLeft = drawX + minX * scale;
      const artworkRight = drawX + maxX * scale;
      const artworkBottom = drawY + maxY * scale;
      const formedAt = performance.now();
      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const offscreenContext = offscreen.getContext("2d", { willReadFrequently: true });
      offscreenContext.drawImage(
        image,
        drawX,
        drawY,
        imageWidth,
        imageHeight,
      );
      const pixels = offscreenContext.getImageData(0, 0, width, height).data;
      const gap = width < 768 ? 3 : 2;
      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          const offset = (y * width + x) * 4;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          const alpha = pixels[offset + 3];
          const distanceFromWhite = Math.hypot(255 - red, 255 - green, 255 - blue);
          if (alpha > 128 && distanceFromWhite > 40 && Math.random() < 0.8) {
            const originX = x;
            const originY = y;
            const startX = Math.max(
              artworkLeft,
              Math.min(artworkRight, originX + (Math.random() - 0.5) * Math.min(90, imageWidth * 0.2)),
            );
            const startY = Math.min(height - 105, artworkBottom + 170 + Math.random() * 170);
            particles.push({
              x: startX,
              y: startY,
              startX,
              startY,
              originX,
              originY,
              size: Math.random() * 0.5 + 0.5,
              phase: Math.random() * Math.PI * 2,
              density: 1 + Math.random() * 4,
              rotation: Math.random() * Math.PI * 2,
              bornAt: formedAt,
              delay: Math.random() * 4200,
              riseDuration: 2600 + Math.random() * 2400,
            });
          }
        }
      }
    }

    function load() {
      const image = new Image();
      image.src = `/${source}`;
      image.onload = () => buildParticles(image);
    }

    function animate(time) {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const particle of particles) {
        const age = time - particle.bornAt - particle.delay;
        if (age < 0) continue;
        const progress = Math.min(1, age / particle.riseDuration);
        if (progress < 1) {
          const eased = 1 - (1 - progress) ** 3;
          const remaining = 1 - eased;
          particle.x = particle.startX
            + (particle.originX - particle.startX) * eased
            + Math.sin(progress * Math.PI * 5 + particle.phase) * 10 * remaining;
          particle.y = particle.startY + (particle.originY - particle.startY) * eased;
        } else {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          if (distance < pointer.radius) {
            const force = (pointer.radius - distance) / pointer.radius;
            particle.x += (dx / distance) * force * particle.density;
            particle.y += (dy / distance) * force * particle.density;
          } else {
            particle.x -= (particle.x - particle.originX) * 0.05;
            particle.y -= (particle.y - particle.originY) * 0.05;
          }
        }
        const normalized = (Math.sin((2 * time) / 1000 + particle.phase) + 1) / 2;
        const alpha = Math.min(1, progress * 3) * (0.2 + 0.8 * normalized ** 3);
        context.save();
        context.translate(
          particle.x + Math.sin(time / 850 + particle.phase) * 0.35,
          particle.y + Math.cos(time / 920 + particle.phase) * 0.35,
        );
        context.rotate(particle.rotation);
        context.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        context.beginPath();
        context.arc(0, 0, particle.size, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
      frame = requestAnimationFrame(animate);
    }

    const onPointer = (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const onResize = () => {
      sizeCanvas();
      pointer.x = window.innerWidth / 2 + stageOffset();
      pointer.y = window.innerHeight * 0.7;
      load();
    };

    sizeCanvas();
    load();
    frame = requestAnimationFrame(animate);
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
    };
  }, [source]);

  return <canvas ref={canvasRef} className="calligraphy-canvas" aria-hidden="true" />;
}

function Atmosphere({ showCalligraphy, calligraphy }) {
  return (
    <div className="atmosphere legacy-atmosphere" aria-hidden="true">
      <div className="legacy-framer-shell">
        <div className="legacy-hero">
          <div className="legacy-background">
            <div className="legacy-radial" />
            <div className="legacy-ellipse" />
            <div className="legacy-base" />
            {/* archaic: unconstrained CSS stars were replaced by canvas particles that settle into the calligraphy. */}
            <div className="legacy-fade">
              <div className="legacy-fade-left" />
              <div className="legacy-fade-right" />
            </div>
          </div>
        </div>
      </div>
      {showCalligraphy && <CalligraphyEffect source={calligraphy} />}
    </div>
  );
}

function ThinkingStatus({ status }) {
  const [phraseIndex, setPhraseIndex] = useState(() => Math.floor(Math.random() * THINKING_PHRASES.length));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhraseIndex((current) => {
        const jump = 1 + Math.floor(Math.random() * (THINKING_PHRASES.length - 1));
        return (current + jump) % THINKING_PHRASES.length;
      });
    }, 2100);
    return () => window.clearInterval(timer);
  }, []);

  const phrase = THINKING_PHRASES[phraseIndex];
  return (
    <div className="thinking-card" role="status">
      <div className="thinking-beam"><span /></div>
      <div className="thinking-copy">
        <Sparkles size={16} />
        <span dir={phrase.dir}>{phrase.text}</span>
        <small>{status || "Local model is searching"}</small>
      </div>
    </div>
  );
}

function TypeLine({ children }) {
  const [visible, setVisible] = useState("");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(children);
      return undefined;
    }
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisible(children.slice(0, index));
      if (index >= children.length) window.clearInterval(timer);
    }, 23);
    return () => window.clearInterval(timer);
  }, [children]);
  return <span>{visible}<i className="type-caret" /></span>;
}

function ResultCard({ result, index, open = false, parallel = false }) {
  const displayTitle = cleanCorpusDisplay(result.title);
  return (
    <article
      className={`result-card ${parallel ? "parallel-result-card" : ""}`}
      style={{ "--result-delay": `${index * 85}ms` }}
    >
      <details open={open}>
        <summary>
          <span className="result-number">{parallel ? "↳" : String(index + 1).padStart(2, "0")}</span>
          <span className="result-heading">
            <strong>{displayTitle}</strong>
            <span>{result.collection} · {result.author}</span>
          </span>
          <span
            className="result-score"
            title="Relative retrieval relevance; this is not an authenticity grade or legal confidence."
          >
            {Math.max(1, Math.min(99, Math.round(result.score * 100)))}%
          </span>
        </summary>
        <div className="result-detail">
          <div className="result-tags">
            {result.imams.map((imam) => <span key={imam}>{imam}</span>)}
            {result.strategies.map((strategy) => <span key={strategy}>{strategy}</span>)}
            {result.taqiyyah && (
              <span className={`taqiyyah-tag taqiyyah-${result.taqiyyah.level}`}>
                {result.taqiyyah.level === "explicit" ? "Explicit taqiyyah" : "Context review"}
              </span>
            )}
          </div>
          {result.taqiyyah && <p className="evidence-note">{result.taqiyyah.note}</p>}
          <div className="hadith-markdown">
            <ReactMarkdown>{cleanCorpusMarkdown(result.text)}</ReactMarkdown>
          </div>
        </div>
      </details>
    </article>
  );
}

function groupNarrationResults(results = []) {
  const groups = [];
  const byId = new Map();
  for (const result of results) {
    const clusterId = result.clusterId || `narration-${result.id}`;
    let group = byId.get(clusterId);
    if (!group) {
      group = { id: clusterId, anchor: null, parallels: [] };
      byId.set(clusterId, group);
      groups.push(group);
    }
    if (result.clusterRole === "parallel") group.parallels.push(result);
    else if (!group.anchor) group.anchor = result;
    else group.parallels.push(result);
  }
  return groups.map((group) => ({
    ...group,
    anchor: group.anchor || group.parallels.shift(),
  })).filter((group) => group.anchor);
}

function ResultCluster({ group, index }) {
  return (
    <section className="result-cluster">
      <div className="result-cluster-heading">
        <span>Distinct narration {index + 1}</span>
        {group.parallels.length > 0 && (
          <small>{group.parallels.length} parallel transmission{group.parallels.length === 1 ? "" : "s"}</small>
        )}
      </div>
      <ResultCard result={group.anchor} index={index} open={index === 0} />
      {group.parallels.length > 0 && (
        <div className="parallel-results">
          <div className="parallel-results-label">Same report preserved through other corpus records</div>
          {group.parallels.map((result, parallelIndex) => (
            <ResultCard
              key={result.id}
              result={result}
              index={parallelIndex}
              parallel
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ElucidationMessage({ elucidation }) {
  if (elucidation.end) {
    return <div className="conversation-response">{elucidation.message}</div>;
  }
  return (
    <article className="elucidation-card">
      <header>
        <span>Elucidation · {elucidation.position} of {elucidation.total}</span>
        <h3>{cleanCorpusDisplay(elucidation.title)}</h3>
        <p>{elucidation.collection} · {elucidation.author}</p>
      </header>

      <section className="elucidation-explanation">
        <h4>What the narration is explaining</h4>
        {elucidation.generating && (
          <p className="evidence-note">The on-device language model is refining this explanation from the supplied narration.</p>
        )}
        {elucidation.error && <p className="assistant-error">{elucidation.error}</p>}
        {elucidation.explanation && (
          <>
            <p className="explanation-overview">{elucidation.explanation.overview}</p>
            <div className="explanation-points">
              {elucidation.explanation.points.map((point, index) => (
                <div key={`${point.title}-${index}`}>
                  <strong>{point.title}</strong>
                  <p>{point.text}</p>
                </div>
              ))}
            </div>
            <div className="explanation-takeaway">
              <span>In essence</span>
              <p>{elucidation.explanation.takeaway}</p>
            </div>
          </>
        )}
      </section>

      {(elucidation.parallel.arabic || elucidation.parallel.english) && (
        <details className="source-text-details">
          <summary>View source wording</summary>
          <section className="parallel-text">
            <div>
              <span>Original Arabic</span>
              <p dir="rtl" lang="ar">{elucidation.parallel.arabic || "Arabic text unavailable in this record."}</p>
            </div>
            <div>
              <span>Published translation</span>
              <p>{cleanCorpusMarkdown(elucidation.parallel.english || "")}</p>
            </div>
          </section>
        </details>
      )}

      {elucidation.phrase && (
        <section className="phrase-analysis">
          <h4>Phrase</h4>
          <blockquote dir={/[\u0600-\u06FF]/u.test(elucidation.phrase.phrase) ? "rtl" : "ltr"}>
            {elucidation.phrase.phrase}
          </blockquote>
          {elucidation.phrase.context && <p>{elucidation.phrase.context}</p>}
          {elucidation.phrase.words.length > 0 && (
            <div className="word-grid">
              <div className="word-grid-head"><span>Arabic</span><span>Reading</span><span>Meaning</span></div>
              {elucidation.phrase.words.map((word, index) => (
                <div key={`${word.word}-${index}`}>
                  <strong dir="rtl">{word.word}</strong>
                  <span>{word.transliteration}</span>
                  <span>{word.gloss}</span>
                </div>
              ))}
            </div>
          )}
          {elucidation.phrase.idioms.map((idiom, index) => (
            <div className="idiom-note" key={`${idiom.literal}-${index}`}>
              <span>Literal</span><p>{idiom.literal}</p>
              <span>Idiomatic sense</span><p>{idiom.meaning}</p>
            </div>
          ))}
        </section>
      )}

      {elucidation.link && <a className="elucidation-source" href={elucidation.link} target="_blank" rel="noreferrer">Source</a>}
      <div className="elucidation-followup">
        {elucidation.hasNext
          ? "Would you like me to explain the next narration?"
          : "That was the last narration in this result set."}
      </div>
    </article>
  );
}

function ConversationMessage({ response }) {
  const provenance = response.source === "online-bibliography"
    ? `Online bibliography · ${response.catalog || "library catalog"}`
    : response.source === "corpus metadata" || response.source === "verified local bibliography"
      ? `Local bibliography · ${response.source}`
      : response.modelLabel
        ? `Local model · ${response.modelLabel}${response.device ? ` · ${response.device}` : ""}`
        : "Local WebGPU model";
  return (
    <div className="conversation-response" lang={response.language === "arabic" ? "ar" : undefined}>
      <ReactMarkdown>{response.text}</ReactMarkdown>
      <small className="response-provenance">{provenance}</small>
    </div>
  );
}

function AssistantMessage({ message }) {
  if (message.loading) return <ThinkingStatus status={message.status} />;
  if (message.error) return <div className="assistant-error">{message.error}</div>;
  if (message.conversation) return <ConversationMessage response={message.conversation} />;
  if (message.elucidation) return <ElucidationMessage elucidation={message.elucidation} />;
  return (
    <div className="assistant-response">
      <div className="answer-intro">
        <BookOpen size={18} />
        <div>
          <span className="retrieval-language" dir={message.retrievalPhrase?.dir || "ltr"}>
            {message.retrievalPhrase?.text || "Retrieving narrations..."}
          </span>
          <TypeLine>
            {message.results.length
              ? `Retrieved ${message.results.length} ranked narrations across ${message.clusterCount || groupNarrationResults(message.results).length} distinct report families from ${message.candidateCount} direct candidates${message.expandedCandidateCount ? ` and ${message.expandedCandidateCount - message.candidateCount} corpus-linked candidates` : ""}. Relevance is not a legal verdict.`
              : "No sufficiently close narration was found with the current query and filters."}
          </TypeLine>
        </div>
      </div>
      {message.synthesis?.loading && (
        <div className="conversation-response">The on-device language model is reading the retrieved reports together…</div>
      )}
      {message.synthesis?.error && <div className="assistant-error">{message.synthesis.error}</div>}
      {message.synthesis?.text && (
        <section className="conversation-response hadith-synthesis">
          <ReactMarkdown>{message.synthesis.text}</ReactMarkdown>
          <small>{message.synthesis.sourceOnly ? "Built directly from the displayed narration" : "Generated locally from the displayed narrations"}{message.synthesis.modelLabel ? ` · ${message.synthesis.modelLabel}` : ""}; not a chain grading or fatwa.</small>
        </section>
      )}
      {groupNarrationResults(message.results).map((group, index) => (
        <ResultCluster key={group.id} group={group} index={index} />
      ))}
      <div className="local-proof">
        <Database size={13} />
        Local retrieval · dense + keyword + metadata · {message.elapsedMs} ms · no prompt left this device
      </div>
    </div>
  );
}

function Filters({ manifest, filters, onChange, onClose }) {
  const field = (label, key, values) => (
    <label>
      <span>{label}</span>
      <select value={filters[key]} onChange={(event) => onChange({ ...filters, [key]: event.target.value })}>
        <option value="">All {label.toLowerCase()}</option>
        {values.map((value, index) => (
          <option key={value} value={key === "imam" ? String(index) : value}>{value}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="filter-panel">
      <div className="filter-title">
        <div><SlidersHorizontal size={16} /> Retrieval filters</div>
        <button onClick={onClose} aria-label="Close filters"><X size={17} /></button>
      </div>
      {field("Collections", "collection", manifest?.collections || [])}
      {field("Authors", "author", manifest?.authors || [])}
      {field("Imams", "imam", manifest?.imams || [])}
      <button className="clear-filters" onClick={() => onChange({ collection: "", author: "", imam: "" })}>
        Clear filters
      </button>
    </div>
  );
}

export default function LocalHadithChat() {
  const [conversations, setConversations] = useState([]);
  const [globalMemory, setGlobalMemory] = useState({ profile: {}, facts: [] });
  const [currentId, setCurrentId] = useState("");
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ collection: "", author: "", imam: "" });
  const [manifest, setManifest] = useState(null);
  const [engineError, setEngineError] = useState("");
  const [engineStatus, setEngineStatus] = useState("Starting local search");
  const [modelState, setModelState] = useState({
    status: "starting",
    message: "Starting Qwen2.5 on the local GPU",
    percent: 0,
    device: "webgpu",
    detail: "",
  });
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [download, setDownload] = useState({ active: false, current: 0, total: 0, complete: false });
  const workerRef = useRef(null);
  const pendingRef = useRef(new Map());
  const chatWorkerRef = useRef(null);
  const modelReadyRef = useRef(false);
  const llmPendingRef = useRef(new Map());
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const current = conversations.find((conversation) => conversation.id === currentId);

  function requestLocalGeneration(messages, options = {}) {
    const mode = options.mode || "conversation";
    const worker = chatWorkerRef.current;
    if (!worker) return Promise.reject(new Error("The local WebGPU model worker is not available."));
    const requestId = crypto.randomUUID();
    setModelState((known) => ({
      ...known,
      message: known.status === "ready" ? "Generating locally with Qwen2.5" : known.message,
    }));
    return new Promise((resolve, reject) => {
      const timeoutMs = Number(options.timeoutMs)
        || (modelReadyRef.current
          ? mode === "conversation" ? 45000 : 150000
          : 360000);
      const timer = window.setTimeout(() => {
        if (!llmPendingRef.current.has(requestId)) return;
        llmPendingRef.current.delete(requestId);
        reject(new Error("The local WebGPU model did not finish before the timeout."));
      }, timeoutMs);
      llmPendingRef.current.set(requestId, { resolve, reject, timer });
      worker.postMessage({
        type: "generate",
        requestId,
        messages,
        mode,
        maxNewTokens: options.maxNewTokens,
        temperature: options.temperature,
      });
    });
  }

  function startModelLoad() {
    const worker = chatWorkerRef.current;
    if (!worker) return;
    modelReadyRef.current = false;
    setModelState({
      status: "starting",
      message: "Restarting Qwen2.5 on the local GPU",
      percent: 0,
      device: "webgpu",
      detail: "",
    });
    worker.postMessage({ type: "init" });
  }

  useEffect(() => {
    let active = true;
    loadConversationState()
      .then((stored) => {
        if (!active) return;
        const initial = stored?.conversations?.length ? stored.conversations : [makeConversation()];
        setConversations(initial);
        setGlobalMemory(stored?.memory || { profile: {}, facts: [] });
        setCurrentId(stored?.currentId && initial.some(({ id }) => id === stored.currentId) ? stored.currentId : initial[0].id);
      })
      .catch(() => {
        const initial = makeConversation();
        setConversations([initial]);
        setCurrentId(initial.id);
      })
      .finally(() => active && setHistoryLoaded(true));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!historyLoaded || !conversations.length) return;
    const timer = window.setTimeout(() => {
      saveConversationState({ conversations, currentId, memory: globalMemory }).catch(() => {});
    }, 250);
    return () => window.clearTimeout(timer);
  }, [conversations, currentId, globalMemory, historyLoaded]);

  useEffect(() => {
    let chatWorker;

    function updateWaitingMessages(status) {
      setConversations((items) => items.map((conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) => (
          message.loading && message.waitingForModel ? { ...message, status } : message
        )),
      })));
    }

    function handleWorkerMessage(data) {
      if (data.type === "worker-ready") {
        setModelState((known) => ({
          ...known,
          status: "starting",
          message: data.message || "Starting the local WebGPU model",
        }));
      }
      if (data.type === "model-status") {
        setModelState((known) => ({
          ...known,
          status: data.status || "loading",
          message: data.message || known.message,
          percent: data.percent ?? known.percent,
          device: data.device || known.device || "webgpu",
          detail: data.detail || "",
        }));
        updateWaitingMessages(data.message || "Loading the local language model");
      }
      if (data.type === "model-progress") {
        const message = data.message || (data.percent === null
          ? "Preparing Qwen2.5"
          : `Preparing Qwen2.5 · ${data.percent}%`);
        setModelState({
          status: data.status || "loading",
          message,
          percent: data.percent,
          device: data.device || "webgpu",
          detail: data.cacheBackend ? `Persistent cache: ${data.cacheBackend}` : "",
        });
        updateWaitingMessages(data.percent === null ? message : `${message} · ${data.percent}%`);
      }
      if (data.type === "model-ready") {
        modelReadyRef.current = true;
        setModelState({
          status: "ready",
          message: `${data.modelLabel || "Qwen2.5"} ready on the local GPU`,
          percent: 100,
          device: data.device || "webgpu",
          detail: data.cacheBackend ? `Persistent cache: ${data.cacheBackend}` : "",
        });
        updateWaitingMessages("Generating locally with Qwen2.5");
      }
      if (data.type === "generation-status") {
        updateWaitingMessages(data.message || "Generating locally with Qwen2.5");
      }
      if (data.type === "generation-result") {
        const pending = llmPendingRef.current.get(data.requestId);
        llmPendingRef.current.delete(data.requestId);
        if (pending?.timer) window.clearTimeout(pending.timer);
        pending?.resolve({
          text: data.text,
          model: data.model,
          modelLabel: data.modelLabel,
          device: data.device,
          attempts: data.attempts || 1,
          usage: data.usage || null,
        });
        setModelState((known) => ({
          ...known,
          status: "ready",
          message: `${data.modelLabel || "Qwen2.5"} ready on the local GPU`,
          percent: 100,
          device: data.device || "webgpu",
        }));
      }
      if (data.type === "generation-error") {
        const pending = llmPendingRef.current.get(data.requestId);
        llmPendingRef.current.delete(data.requestId);
        if (pending?.timer) window.clearTimeout(pending.timer);
        pending?.reject(new Error(data.message || "On-device generation failed"));
        setModelState((known) => ({
          ...known,
          message: known.status === "ready" ? "The model is ready; the last generation failed validation" : known.message,
          detail: data.message || known.detail,
        }));
      }
      if (data.type === "model-error") {
        modelReadyRef.current = false;
        setModelState({
          status: "error",
          message: "The real local model could not start",
          percent: null,
          device: "webgpu",
          detail: data.message || "Unknown WebGPU model error",
        });
        updateWaitingMessages("The local model failed to start");
      }
    }

    try {
      chatWorker = new Worker("/local-llm.worker.js?v=25", {
        name: "al-faqih-qwen-webgpu",
        type: "module",
      });
    } catch (error) {
      setModelState({
        status: "error",
        message: "The real local model worker could not start",
        percent: null,
        device: "webgpu",
        detail: error instanceof Error ? error.message : "Could not create the WebGPU worker",
      });
      return undefined;
    }

    chatWorkerRef.current = chatWorker;
    chatWorker.onmessage = ({ data }) => handleWorkerMessage(data);
    chatWorker.onerror = (event) => {
      modelReadyRef.current = false;
      setModelState({
        status: "error",
        message: "The local WebGPU worker crashed",
        percent: null,
        device: "webgpu",
        detail: event.message || "Unknown worker error",
      });
    };
    chatWorker.onmessageerror = () => {
      setModelState({
        status: "error",
        message: "The local WebGPU worker returned unreadable data",
        percent: null,
        device: "webgpu",
        detail: "",
      });
    };

    navigator.storage?.persist?.().catch(() => {});
    chatWorker.postMessage({ type: "init" });

    return () => {
      chatWorkerRef.current = null;
      chatWorker.terminate();
      for (const pending of llmPendingRef.current.values()) {
        if (pending.timer) window.clearTimeout(pending.timer);
        pending.reject(new Error("The on-device model worker was closed."));
      }
      llmPendingRef.current.clear();
    };
  }, []);

  useEffect(() => {
    // Load the shared retrieval module directly so build-time regression tests
    // and the browser use the same tokenizer and scorer.
    let worker;
    try {
      worker = new Worker("/hadith-search.worker.js?v=25", { name: "hadith-search", type: "module" });
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : "Could not start local search");
      setEngineStatus("");
      return undefined;
    }
    workerRef.current = worker;
    worker.onerror = (event) => {
      setEngineError(event.message || "Could not start local search");
      setEngineStatus("");
    };
    worker.onmessageerror = () => {
      setEngineError("The local search worker returned an unreadable response");
      setEngineStatus("");
    };
    worker.onmessage = ({ data }) => {
      if (data.type === "ready") {
        setManifest(data.manifest);
        setEngineError("");
        setEngineStatus("Passage retrieval index ready");
      }
      if (data.type === "status" && !data.requestId) setEngineStatus(data.message);
      if (data.type === "status" && data.requestId) {
        const conversationId = pendingRef.current.get(data.requestId)?.conversationId;
        setConversations((items) => items.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, messages: conversation.messages.map((message) =>
                message.id === data.requestId ? { ...message, status: data.message } : message) }
            : conversation));
      }
      if (data.type === "rewrite-needed") {
        const pending = pendingRef.current.get(data.requestId);
        if (!pending) return;
        setConversations((items) => items.map((conversation) =>
          conversation.id === pending.conversationId
            ? { ...conversation, messages: conversation.messages.map((message) =>
                message.id === data.requestId
                  ? { ...message, status: "Resolving spelling and the exact requested subject locally" }
                  : message) }
            : conversation));
        requestLocalGeneration(
          queryAnalysisMessages(pending.synthesisQuery || pending.query),
          { mode: "query-analysis", maxNewTokens: 260, temperature: 0 },
        )
          .then((generation) => {
            const analysis = parseQueryAnalysisJson(generation.text);
            const refined = applyQueryAnalysisToSearchPlan(
              pending.retrievalQuery,
              pending.retrievalProfile || {},
              analysis,
            );
            pendingRef.current.set(data.requestId, {
              ...pending,
              retrievalQuery: refined.searchQuery,
              retrievalProfile: refined.retrievalProfile,
              queryAnalysis: analysis,
            });
            worker.postMessage({
              type: "search",
              requestId: data.requestId,
              query: refined.searchQuery,
              filters: pending.filters,
              retrievalProfile: refined.retrievalProfile,
            });
          })
          .catch(() => {
            const retrievalProfile = { ...(pending.retrievalProfile || {}), rewritten: true };
            worker.postMessage({
              type: "search",
              requestId: data.requestId,
              query: pending.retrievalQuery,
              filters: pending.filters,
              retrievalProfile,
            });
          });
      }
      if (data.type === "results") {
        const pending = pendingRef.current.get(data.requestId);
        const conversationId = pending?.conversationId;
        const synthesisEvidence = data.synthesisResults || data.results;
        const methodSynthesis = data.results.length && pending?.retrievalProfile?.facet === "method"
          ? methodEvidenceSynthesis(synthesisEvidence)
          : "";
        const timeSynthesis = data.results.length && pending?.retrievalProfile?.facet === "time-definition"
          ? timeDefinitionEvidenceSynthesis(synthesisEvidence)
          : "";
        const sourceSynthesis = methodSynthesis || timeSynthesis;
        pendingRef.current.delete(data.requestId);
        setConversations((items) => items.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                title: generateConversationTitle(conversation, pending?.query || "", data.results),
                memory: updateConversationMemory(conversation, pending?.query || "", "retrieval", pending?.language),
                messages: conversation.messages.map((message) =>
                message.id === data.requestId
                  ? {
                      ...message,
                      loading: false,
                      results: data.results,
                      candidateCount: data.candidateCount,
                      expandedCandidateCount: data.expandedCandidateCount,
                      clusterCount: data.clusterCount,
                      elapsedMs: data.elapsedMs,
                      synthesis: data.results.length
                        ? sourceSynthesis
                          ? { loading: false, text: sourceSynthesis, sourceOnly: true }
                          : { loading: true, text: "" }
                        : null,
                      retrievalPhrase: THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)],
                    }
                  : message),
              }
            : conversation));
        if (data.results.length && pending?.query && !sourceSynthesis) {
          requestLocalGeneration(synthesisMessages(pending.synthesisQuery || pending.query, synthesisEvidence), {
            mode: "synthesis",
            maxNewTokens: synthesisEvidence.length >= 6 ? 460 : 360,
            temperature: 0,
          })
            .then((generation) => {
              setConversations((items) => items.map((conversation) =>
                conversation.id === conversationId
                  ? { ...conversation, messages: conversation.messages.map((message) =>
                      message.id === data.requestId ? { ...message, synthesis: { loading: false, text: generation.text, modelLabel: generation.modelLabel } } : message) }
                  : conversation));
            })
            .catch((error) => {
              setConversations((items) => items.map((conversation) =>
                conversation.id === conversationId
                  ? { ...conversation, messages: conversation.messages.map((message) =>
                      message.id === data.requestId
                        ? { ...message, synthesis: { loading: false, text: "", error: error instanceof Error ? error.message : "The local model could not synthesize these reports." } }
                        : message) }
                  : conversation));
            });
        }
      }
      if (data.type === "error") {
        if (!data.requestId) {
          setEngineError(data.message);
          setEngineStatus("");
          setDownload((value) => ({ ...value, active: false }));
        }
        const conversationId = pendingRef.current.get(data.requestId)?.conversationId;
        pendingRef.current.delete(data.requestId);
        setConversations((items) => items.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, messages: conversation.messages.map((message) =>
                message.id === data.requestId ? { ...message, loading: false, error: data.message } : message) }
            : conversation));
      }
      if (data.type === "download-progress") {
        setDownload({ active: true, current: data.current, total: data.total, complete: false });
      }
      if (data.type === "download-complete") {
        setDownload((value) => ({ ...value, active: false, complete: true }));
      }
    };
    worker.postMessage({ type: "init" });
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      } else {
        // A production service worker from an earlier localhost session must
        // never cache or serve Next's changing development/HMR chunks.
        navigator.serviceWorker.getRegistrations()
          .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
          .catch(() => {});
      }
    }
    return () => {
      workerRef.current = null;
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [current?.messages.length]);

  function newChat() {
    const conversation = makeConversation();
    setConversations((items) => [conversation, ...items]);
    setCurrentId(conversation.id);
    setSidebarOpen(false);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function deleteChat(id) {
    setConversations((items) => {
      const remaining = items.filter((conversation) => conversation.id !== id);
      if (remaining.length) {
        if (id === currentId) setCurrentId(remaining[0].id);
        return remaining;
      }
      const replacement = makeConversation();
      setCurrentId(replacement.id);
      return [replacement];
    });
  }

  async function sendMessage() {
    const query = input.trim();
    if (!query || !current) return;
    const userMessage = { id: crypto.randomUUID(), role: "user", text: query };
    const elucidation = resolveElucidation(query, current);

    if (elucidation) {
      const elucidationMessageId = crypto.randomUUID();
      const priorResults = [...current.messages]
        .reverse()
        .find((message) => message.role === "assistant" && Array.isArray(message.results) && message.results.length)?.results || [];

      if (elucidation.end) {
        setConversations((items) => items.map((conversation) =>
          conversation.id === current.id
            ? { ...conversation, messages: [...conversation.messages, userMessage, { id: elucidationMessageId, role: "assistant", elucidation }] }
            : conversation));
        setInput("");
        return;
      }

      const preparedElucidation = {
        ...elucidation,
        generating: true,
        explanation: null,
        error: "",
      };
      setConversations((items) => items.map((conversation) =>
        conversation.id === current.id
          ? {
              ...conversation,
              title: generateConversationTitle(conversation, query),
              memory: updateConversationMemory(conversation, query, "elucidation", conversation.memory?.language),
              messages: [
                ...conversation.messages,
                userMessage,
                { id: elucidationMessageId, role: "assistant", elucidation: preparedElucidation },
              ],
            }
          : conversation));
      setInput("");

      requestLocalGeneration(
        elucidationMessages(query, elucidation, priorResults),
        { mode: "elucidation", maxNewTokens: 360, temperature: 0.05 },
      )
        .then((generation) => {
          const explanation = parseElucidationJson(generation.text);
          if (!explanation) throw new Error("The local model did not return a valid structured explanation.");
          setConversations((items) => items.map((conversation) =>
            conversation.id === current.id
              ? { ...conversation, messages: conversation.messages.map((message) =>
                  message.id === elucidationMessageId
                    ? { ...message, elucidation: { ...message.elucidation, generating: false, explanation, explanationMode: "on-device-llm", error: "" } }
                    : message) }
              : conversation));
        })
        .catch((error) => {
          setConversations((items) => items.map((conversation) =>
            conversation.id === current.id
              ? { ...conversation, messages: conversation.messages.map((message) =>
                  message.id === elucidationMessageId
                    ? { ...message, elucidation: { ...message.elucidation, generating: false, explanation: null, error: error instanceof Error ? error.message : "The local model could not explain this narration." } }
                    : message) }
              : conversation));
        });
      return;
    }

    const localResponse = resolveLocalConversation(query, current, globalMemory, manifest);
    if (localResponse.memoryUpdate) {
      setGlobalMemory((memory) => applyMemoryUpdate(memory, localResponse.memoryUpdate, current.id));
    }

    if (localResponse.intent === "book-info") {
      setConversations((items) => items.map((conversation) =>
        conversation.id === current.id
          ? {
              ...conversation,
              title: generateConversationTitle(conversation, query),
              memory: updateConversationMemory(conversation, query, "book-info", localResponse.language),
              messages: [
                ...conversation.messages,
                userMessage,
                { id: crypto.randomUUID(), role: "assistant", conversation: localResponse },
              ],
            }
          : conversation));
      setInput("");
      return;
    }

    if (localResponse.intent === "book-lookup") {
      const lookupMessageId = crypto.randomUUID();
      setConversations((items) => items.map((conversation) =>
        conversation.id === current.id
          ? {
              ...conversation,
              title: generateConversationTitle(conversation, query),
              memory: updateConversationMemory(conversation, query, "book-lookup", localResponse.language),
              messages: [
                ...conversation.messages,
                userMessage,
                {
                  id: lookupMessageId,
                  role: "assistant",
                  loading: true,
                  status: "Checking online library catalogs for this title",
                },
              ],
            }
          : conversation));
      setInput("");
      try {
        const response = await fetch("/api/book-lookup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: localResponse.lookupQuery || query }),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.found) {
          throw new Error(payload?.error || "No verified online bibliography result was found.");
        }
        const safeTitle = String(payload.title || "").replace(/[*_[\]`<>]/g, "");
        const safeAuthors = (payload.authors || [])
          .map((author) => String(author).replace(/[*_[\]`<>]/g, ""))
          .join(", ");
        const safeUrl = /^https:\/\/(?:openlibrary\.org|(?:books|www)\.google\.[^/]+)\//i.test(payload.sourceUrl || "")
          ? payload.sourceUrl
          : "";
        const corroboration = (payload.corroboratedBy || []).length > 1
          ? ` The same title-author entry was found in ${payload.corroboratedBy.join(" and ")}.`
          : "";
        const text = `${safeTitle} is cataloged under ${safeAuthors}.${corroboration}${safeUrl ? ` [Open the ${payload.catalog} record](${safeUrl}).` : ""}`;
        setConversations((items) => items.map((conversation) =>
          conversation.id === current.id
            ? { ...conversation, messages: conversation.messages.map((message) =>
                message.id === lookupMessageId
                  ? {
                      id: lookupMessageId,
                      role: "assistant",
                      conversation: {
                        intent: "book-info",
                        known: true,
                        language: localResponse.language,
                        text,
                        source: "online-bibliography",
                        catalog: payload.catalog,
                      },
                    }
                  : message) }
            : conversation));
      } catch (error) {
        setConversations((items) => items.map((conversation) =>
          conversation.id === current.id
            ? { ...conversation, messages: conversation.messages.map((message) =>
                message.id === lookupMessageId
                  ? {
                      id: lookupMessageId,
                      role: "assistant",
                      conversation: {
                        intent: "book-info",
                        known: false,
                        language: localResponse.language,
                        text: `I could not verify that title in either the local bibliography or the online library catalogs. ${error instanceof Error ? error.message : ""}`.trim(),
                        source: "online-bibliography",
                        catalog: "lookup attempted",
                      },
                    }
                  : message) }
            : conversation));
      }
      return;
    }

    if (localResponse.intent === "local-llm") {
      const localMessageId = crypto.randomUUID();
      setConversations((items) => items.map((conversation) =>
        conversation.id === current.id
          ? {
              ...conversation,
              title: generateConversationTitle(conversation, query),
              memory: updateConversationMemory(conversation, query, "local-llm", localResponse.language),
              messages: [
                ...conversation.messages,
                userMessage,
                {
                  id: localMessageId,
                  role: "assistant",
                  loading: true,
                  waitingForModel: true,
                  status: modelReadyRef.current ? "Generating locally with Qwen2.5" : modelState.message,
                },
              ],
            }
          : conversation));
      setInput("");

      try {
        const history = current.messages
          .map((message) => ({
            role: message.role,
            content: message.text || message.conversation?.text || "",
          }))
          .filter((message) => message.content);
        const generation = await requestLocalGeneration(
          conversationMessages(query, history, localResponse.language, globalMemory),
          {
            mode: "conversation",
            ...conversationGenerationOptions(query),
          },
        );
        setConversations((items) => items.map((conversation) =>
          conversation.id === current.id
            ? { ...conversation, messages: conversation.messages.map((message) =>
                message.id === localMessageId
                  ? {
                      id: localMessageId,
                      role: "assistant",
                      conversation: {
                        intent: "local-llm",
                        language: localResponse.language,
                        text: generation.text,
                        source: "local-model",
                        modelLabel: generation.modelLabel,
                        device: generation.device,
                        attempts: generation.attempts,
                      },
                    }
                  : message) }
            : conversation));
      } catch (error) {
        setConversations((items) => items.map((conversation) =>
          conversation.id === current.id
            ? { ...conversation, messages: conversation.messages.map((message) =>
                message.id === localMessageId
                  ? { id: localMessageId, role: "assistant", error: error instanceof Error ? error.message : "The local model could not answer." }
                  : message) }
            : conversation));
      }
      return;
    }

    const retrievalQuery = localResponse.searchQuery || query;
    if (!manifest) {
      setConversations((items) => items.map((conversation) =>
        conversation.id === current.id
          ? {
              ...conversation,
              messages: [
                ...conversation.messages,
                userMessage,
                { id: crypto.randomUUID(), role: "assistant", error: "The local hadith index is still preparing." },
              ],
            }
          : conversation));
      setInput("");
      return;
    }

    const requestId = crypto.randomUUID();
    pendingRef.current.set(requestId, {
      conversationId: current.id,
      query,
      synthesisQuery: localResponse.synthesisQuery || query,
      retrievalQuery,
      retrievalProfile: localResponse.retrievalProfile || null,
      language: localResponse.language,
      filters,
    });
    setConversations((items) => items.map((conversation) =>
      conversation.id === current.id
        ? {
            ...conversation,
            messages: [
              ...conversation.messages,
              userMessage,
          { id: requestId, role: "assistant", loading: true, status: localResponse.retrievalProfile?.needsQueryAnalysis
            ? "Analyzing the exact subject and requested evidence"
            : "Preparing the local index" },
            ],
          }
        : conversation));
    setInput("");
    if (!localResponse.retrievalProfile?.needsQueryAnalysis) {
      workerRef.current?.postMessage({
        type: "search",
        requestId,
        query: retrievalQuery,
        filters,
        retrievalProfile: localResponse.retrievalProfile || null,
      });
      return;
    }
    try {
      const generation = await requestLocalGeneration(
        queryAnalysisMessages(localResponse.synthesisQuery || query),
        { mode: "query-analysis", maxNewTokens: 260, temperature: 0 },
      );
      const analysis = parseQueryAnalysisJson(generation.text);
      if (!analysis) throw new Error("The local query analysis was not valid JSON.");
      const refined = applyQueryAnalysisToSearchPlan(
        retrievalQuery,
        localResponse.retrievalProfile || {},
        analysis,
      );
      pendingRef.current.set(requestId, {
        ...pendingRef.current.get(requestId),
        retrievalQuery: refined.searchQuery,
        retrievalProfile: refined.retrievalProfile,
        queryAnalysis: analysis,
      });
      workerRef.current?.postMessage({
        type: "search",
        requestId,
        query: refined.searchQuery,
        filters,
        retrievalProfile: refined.retrievalProfile,
      });
    } catch {
      workerRef.current?.postMessage({
        type: "search",
        requestId,
        query: retrievalQuery,
        filters,
        retrievalProfile: localResponse.retrievalProfile || null,
      });
    }
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const emptyConversation = !current?.messages.length;

  return (
    <div className="faqih-shell">
      <style jsx global>{`
        .result-cluster {
          margin: 22px 0 30px;
        }
        .result-cluster-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 0 4px 9px;
          color: rgba(255, 255, 255, 0.68);
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .result-cluster-heading small {
          color: rgba(255, 215, 0, 0.78);
          letter-spacing: 0;
          text-transform: none;
        }
        .parallel-results {
          margin: 10px 0 0 24px;
          padding-left: 14px;
          border-left: 1px solid rgba(255, 215, 0, 0.24);
        }
        .parallel-results-label {
          margin: 0 0 8px 2px;
          color: rgba(255, 255, 255, 0.48);
          font-size: 0.74rem;
        }
        .parallel-result-card {
          opacity: 0.92;
          transform: scale(0.995);
          transform-origin: top left;
        }
        .parallel-result-card .result-number {
          color: rgba(255, 215, 0, 0.82);
          font-size: 1rem;
        }
        @media (max-width: 700px) {
          .parallel-results {
            margin-left: 8px;
            padding-left: 8px;
          }
          .result-cluster-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 3px;
          }
        }
      `}</style>
      <Atmosphere showCalligraphy={emptyConversation} calligraphy={current?.calligraphy || "Ya_Mahdi.png"} />

      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" />}
      <aside className={`chat-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><BookOpen size={21} /></div>
          <div><strong>AL-FAQIH</strong><span>Local riwayah engine</span></div>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <button className="new-chat" onClick={newChat}><Plus size={17} /> New inquiry</button>
        <div className="history-label">Library history</div>
        <nav className="history-list">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={conversation.id === currentId ? "active" : ""}
              onClick={() => { setCurrentId(conversation.id); setSidebarOpen(false); }}
            >
              <MessageSquare size={15} />
              <span>{conversation.title}</span>
              <i
                role="button"
                tabIndex={0}
                onClick={(event) => { event.stopPropagation(); deleteChat(conversation.id); }}
                onKeyDown={(event) => event.key === "Enter" && deleteChat(conversation.id)}
                aria-label="Delete conversation"
              >
                <Trash2 size={14} />
              </i>
            </button>
          ))}
        </nav>
        <div className="local-status">
          <div className={manifest ? "status-dot ready" : "status-dot"} />
          <div>
            <strong>
              {manifest
                ? manifest.mode === "hybrid-related" ? "Local evidence index ready" : "Semantic search ready"
                : engineError || engineStatus || "Installing index"}
            </strong>
            <span>
              {manifest
                ? manifest.mode === "hybrid-related"
                  ? `${manifest.documentCount.toLocaleString()} ahadith · parallel-report graph ready`
                  : `${manifest.documentCount.toLocaleString()} ahadith · keyword index loading`
                : engineStatus && !engineError ? "Preparing on-device search" : "One-time setup"}
            </span>
          </div>
        </div>
        <div className="local-status" style={{ alignItems: "flex-start" }}>
          <div className={`status-dot ${modelState.status === "ready" ? "ready" : ""}`} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong>
              {modelState.status === "ready"
                ? "Local language model ready"
                : modelState.status === "error"
                  ? "Local model error"
                  : "Loading local language model"}
            </strong>
            <span>
              {modelState.message}
              {modelState.device ? ` · ${modelState.device}` : ""}
            </span>
            {["starting", "runtime", "loading", "initializing"].includes(modelState.status) && modelState.percent !== null ? (
              <div
                aria-label={`Model loading ${modelState.percent}%`}
                style={{
                  height: 5,
                  marginTop: 8,
                  overflow: "hidden",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                }}
              >
                <div
                  style={{
                    width: `${modelState.percent}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "currentColor",
                    transition: "width 180ms ease",
                  }}
                />
              </div>
            ) : null}
            {modelState.detail ? <span title={modelState.detail}>{modelState.detail}</span> : null}
            {modelState.status === "error" ? (
              <button
                type="button"
                onClick={startModelLoad}
                style={{
                  marginTop: 8,
                  padding: "6px 9px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 8,
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                Retry local model
              </button>
            ) : null}
          </div>
        </div>
        <button
          className="download-corpus"
          disabled={!manifest || download.active || download.complete}
          onClick={() => {
            setDownload({ active: true, current: 0, total: manifest?.shardCount || 0, complete: false });
            workerRef.current?.postMessage({ type: "download-all" });
          }}
        >
          <Download size={15} />
          {download.complete
            ? "Corpus saved offline"
            : download.active
              ? `Saving ${download.current}/${download.total || "..."}`
              : "Save full corpus offline"}
        </button>
      </aside>

      <section className="chat-stage">
        <header className="chat-header">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open conversations">
            <Menu size={20} />
          </button>
          <div className="header-title">
            <span>Research session</span>
            <strong>{current?.title || "New inquiry"}</strong>
          </div>
          <div className="privacy-pill"><Database size={13} /> On-device</div>
        </header>

        <main className={`message-scroll ${emptyConversation ? "empty" : ""}`} ref={scrollRef}>
          {!emptyConversation && (
            <div className="message-column">
              {current.messages.map((message) => (
                <div key={message.id} className={`message-row ${message.role}`}>
                  {message.role === "user"
                    ? <div className="user-message">{message.text}</div>
                    : <AssistantMessage message={message} />}
                </div>
              ))}
            </div>
          )}
        </main>

        <div className="composer-zone">
          {filtersOpen && (
            <Filters
              manifest={manifest}
              filters={filters}
              onChange={setFilters}
              onClose={() => setFiltersOpen(false)}
            />
          )}
          <div className="composer">
            <button
              className={`filter-button ${activeFilterCount ? "active" : ""}`}
              onClick={() => setFiltersOpen((open) => !open)}
              aria-label="Retrieval filters"
            >
              <SlidersHorizontal size={18} />
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={manifest ? "Ask or search the hadith corpus..." : "Chat while the local corpus prepares..."}
            />
            <button className="send-button" onClick={sendMessage} disabled={!input.trim()} aria-label="Send">
              <SendHorizontal size={19} />
            </button>
          </div>
          <p className="composer-note">
            Results are retrieval evidence, not a fatwa; however, the words of the Imams are hujjah. Taqiyyah flags require contextual review.
          </p>
        </div>
      </section>
    </div>
  );
}
