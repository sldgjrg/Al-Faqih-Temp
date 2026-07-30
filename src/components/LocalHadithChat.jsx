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
  applyMemoryUpdate,
  generateConversationTitle,
  resolveLocalConversation,
  updateConversationMemory,
} from "@/lib/local-conversation";

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

function ResultCard({ result, index }) {
  const displayTitle = cleanCorpusDisplay(result.title);
  return (
    <article className="result-card" style={{ "--result-delay": `${index * 85}ms` }}>
      <details open={index === 0}>
        <summary>
          <span className="result-number">{String(index + 1).padStart(2, "0")}</span>
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
  return (
    <div className="conversation-response" lang={response.language === "arabic" ? "ar" : undefined}>
      <ReactMarkdown>{response.text}</ReactMarkdown>
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
              ? `Retrieved ${message.results.length} narrations from ${message.candidateCount} reranked candidates.`
              : "No close narration was found with the current query and filters."}
          </TypeLine>
        </div>
      </div>
      {message.results.map((result, index) => (
        <ResultCard key={result.id} result={result} index={index} />
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
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [download, setDownload] = useState({ active: false, current: 0, total: 0, complete: false });
  const workerRef = useRef(null);
  const pendingRef = useRef(new Map());
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const current = conversations.find((conversation) => conversation.id === currentId);

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
    // Load the shared retrieval module directly so build-time regression tests
    // and the browser use the same tokenizer and scorer.
    let worker;
    try {
      worker = new Worker("/hadith-search.worker.js", { name: "hadith-search", type: "module" });
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
      if (data.type === "results") {
        const pending = pendingRef.current.get(data.requestId);
        const conversationId = pending?.conversationId;
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
                      elapsedMs: data.elapsedMs,
                      retrievalPhrase: THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)],
                    }
                  : message),
              }
            : conversation));
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
      setConversations((items) => items.map((conversation) =>
        conversation.id === current.id
          ? {
              ...conversation,
              title: generateConversationTitle(conversation, query),
              memory: updateConversationMemory(conversation, query, "elucidation", conversation.memory?.language),
              messages: [
                ...conversation.messages,
                userMessage,
                { id: crypto.randomUUID(), role: "assistant", elucidation },
              ],
            }
          : conversation));
      setInput("");
      return;
    }

    const localResponse = resolveLocalConversation(query, current, globalMemory);
    if (localResponse) {
      if (localResponse.memoryUpdate) {
        setGlobalMemory((memory) => applyMemoryUpdate(memory, localResponse.memoryUpdate, current.id));
      }
      const localMessageId = crypto.randomUUID();
      if (localResponse.intent === "local-llm") {
        setConversations((items) => items.map((conversation) =>
          conversation.id === current.id
            ? {
                ...conversation,
                title: generateConversationTitle(conversation, query),
                memory: updateConversationMemory(conversation, query, localResponse.intent, localResponse.language),
                messages: [...conversation.messages, userMessage, { id: localMessageId, role: "assistant", loading: true, status: "Asking the local model" }],
              }
            : conversation));
        setInput("");
        try {
          const response = await fetch("/api/local-chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              query,
              history: current.messages.map((message) => ({
                role: message.role,
                content: message.text || message.conversation?.text || "",
              })).filter((message) => message.content),
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload.text) throw new Error(payload.error || "Local model unavailable");
          setConversations((items) => items.map((conversation) =>
            conversation.id === current.id
              ? { ...conversation, messages: conversation.messages.map((message) => message.id === localMessageId ? { id: localMessageId, role: "assistant", conversation: { intent: "local-llm", language: localResponse.language, text: payload.text } } : message) }
              : conversation));
        } catch {
          setConversations((items) => items.map((conversation) =>
            conversation.id === current.id
              ? { ...conversation, messages: conversation.messages.map((message) => message.id === localMessageId ? { id: localMessageId, role: "assistant", conversation: { intent: "conversation", language: localResponse.language, text: localResponse.fallbackText || localResponse.text } } : message) }
              : conversation));
        }
        return;
      }
      setConversations((items) => items.map((conversation) =>
        conversation.id === current.id
          ? {
              ...conversation,
              title: generateConversationTitle(conversation, query),
              memory: updateConversationMemory(conversation, query, localResponse.intent, localResponse.language),
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

    if (!manifest) {
      setConversations((items) => items.map((conversation) =>
        conversation.id === current.id
          ? {
              ...conversation,
              messages: [
                ...conversation.messages,
                userMessage,
                { id: crypto.randomUUID(), role: "assistant", error: "The local hadith index is still preparing. Conversational messages are available now; retrieval will be ready shortly." },
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
      language: current.memory?.language,
    });
    setConversations((items) => items.map((conversation) =>
      conversation.id === current.id
        ? {
            ...conversation,
            messages: [
              ...conversation.messages,
              userMessage,
              { id: requestId, role: "assistant", loading: true, status: "Preparing the local index" },
            ],
          }
        : conversation));
    setInput("");
    workerRef.current?.postMessage({ type: "search", requestId, query, filters });
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const emptyConversation = !current?.messages.length;

  return (
    <div className="faqih-shell">
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
                ? manifest.mode === "hybrid" ? "Local index ready" : "Semantic search ready"
                : engineError || engineStatus || "Installing index"}
            </strong>
            <span>
              {manifest
                ? manifest.mode === "hybrid"
                  ? `${manifest.documentCount.toLocaleString()} ahadith in this corpus · ${manifest.version}`
                  : `${manifest.documentCount.toLocaleString()} ahadith · keyword index loading`
                : engineStatus && !engineError ? "Preparing on-device search" : "One-time setup"}
            </span>
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
