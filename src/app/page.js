"use client";

import React, { useState, useEffect, useRef } from "react";
import LocalHadithChat from "@/components/LocalHadithChat";
// archaic: import { Poppins } from "next/font/google";
import { MessageSquare, SendHorizontal, X } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";

// archaic: Poppins was loaded from Google by Next.js, which prevented a fully local UI.
// archaic: const poppins = Poppins({
// archaic:   subsets: ["latin"],
// archaic:   weight: ["400", "500", "700"],
// archaic: });
const poppins = { className: "" };

export default LocalHadithChat;

// -------------------------------------------------------------------
// CalligraphyEffect Component (Desktop Only)
// This component renders the canvas with the calligraphy particle effect.
// It sets up the effect on mount and cleans up event listeners on unmount.
function CalligraphyEffect({ calligraphySrc }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let particles = [];
    const mouse = { x: undefined, y: undefined, radius: 120 };

    // Determine the desired width fraction.
    let desiredWidthFraction = calligraphySrc === "Ya_Mahdi.png" ? 0.2 : 0.4;
    if (window.innerWidth < 1024) {
      desiredWidthFraction = calligraphySrc === "Ya_Mahdi.png" ? 0.6 : 0.8;
    }
    const offsetX = 0;
    const offsetY = -50;

    // Update canvas size for a sharper render using devicePixelRatio.
    function updateCanvasSize() {
      const dpr = window.devicePixelRatio || 1;
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = cw + "px";
      canvas.style.height = ch + "px";
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    }

    updateCanvasSize();

    // Helper: Draw a small circle.
    function drawCircle(ctx, radius) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sample the calligraphy image and create particles.
    const initParticles = (image) => {
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      const scaledWidth = cw * desiredWidthFraction;
      const aspectRatio = image.height / image.width;
      const scaledHeight = scaledWidth * aspectRatio;
      const xPos = (cw - scaledWidth) / 2 + offsetX;
      const yPos = (ch - scaledHeight) / 2 + offsetY;

      const offscreen = document.createElement("canvas");
      offscreen.width = cw;
      offscreen.height = ch;
      const offCtx = offscreen.getContext("2d");

      offCtx.drawImage(image, xPos, yPos, scaledWidth, scaledHeight);
      const imageData = offCtx.getImageData(0, 0, cw, ch);
      const data = imageData.data;

      // Dense sampling with a gap of 2 pixels for more particles.
      const gap = 2;
      for (let y = 0; y < ch; y += gap) {
        for (let x = 0; x < cw; x += gap) {
          const index = (y * cw + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];

          if (a > 128) {
            const distanceFromWhite = Math.sqrt(
              (255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2
            );
            if (distanceFromWhite > 40 && Math.random() < 0.8) {
              const size = Math.random() * 0.5 + 0.5;
              particles.push({
                x: x,
                y: y,
                baseX: x,
                baseY: y,
                size,
                density: Math.random() * 5 + 1,
                rotation: Math.random() * Math.PI * 2,
                phase: Math.random() * Math.PI * 2,
              });
            }
          }
        }
      }
    };

    let animationFrameId;
    // Animate particles with jitter and twinkling.
    const animate = () => {
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      ctx.clearRect(0, 0, cw, ch);
      const t = performance.now() / 1000;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        let dx = p.x - mouse.x;
        let dy = p.y - mouse.y;
        let distance = Math.sqrt(dx * dx + dy * dy) || 1;
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        const maxDistance = mouse.radius;
        let force = (maxDistance - distance) / maxDistance;
        if (force < 0) force = 0;
        let directionX = forceDirectionX * force * p.density;
        let directionY = forceDirectionY * force * p.density;

        if (distance < mouse.radius) {
          p.x += directionX;
          p.y += directionY;
        } else {
          p.x -= (p.x - p.baseX) * 0.05;
          p.y -= (p.y - p.baseY) * 0.05;
        }
        p.x += (Math.random() - 0.5) * 0.3;
        p.y += (Math.random() - 0.5) * 0.3;

        const normalized = (Math.sin(2 * t + p.phase) + 1) / 2;
        const twinkleAlpha = 0.2 + 0.8 * Math.pow(normalized, 3);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = `rgba(255, 215, 0, ${twinkleAlpha})`;
        drawCircle(ctx, p.size);
        ctx.restore();
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    // Resize handler.
    const handleResize = () => {
      updateCanvasSize();
      mouse.x = window.innerWidth / 2;
      mouse.y = window.innerHeight * 0.7;
      particles = [];
      loadImage();
    };

    function handleMouseMove(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function handleTouchMove(e) {
      const touch = e.touches[0];
      mouse.x = touch.clientX;
      mouse.y = touch.clientY;
    }

    const loadImage = () => {
      const calligraphyImage = new Image();
      calligraphyImage.src = `/${calligraphySrc}`;
      calligraphyImage.onerror = () => {
        console.error(`Error loading image: /${calligraphySrc}`);
      };
      calligraphyImage.onload = () => {
        initParticles(calligraphyImage);
      };
    };

    mouse.x = window.innerWidth / 2;
    mouse.y = window.innerHeight * 0.7;
    loadImage();
    animate();

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);

    setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [calligraphySrc]);

  return (
    <canvas
      ref={canvasRef}
      className="gold-text-canvas bump-animation"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 5,
        willChange: "transform",
      }}
    />
  );
}

// -------------------------------------------------------------------
// Main Page Component
// archaic: Retained as the complete pre-local chat implementation for reference.
function ArchaicPage() {
  // Chat UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [inputText, setInputText] = useState("");
  const [stars, setStars] = useState([]);
  const [infoTabOpen, setInfoTabOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef(null);

  // Set mounted flag and detect mobile.
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Info tab for desktop only.
  useEffect(() => {
    if (!isMobile && mounted && !localStorage.getItem("infoTabSeen")) {
      setInfoTabOpen(true);
      setTimeout(() => {
        setInfoTabOpen(false);
        localStorage.setItem("infoTabSeen", "true");
      }, 3000);
    }
  }, [mounted, isMobile]);

  // Rising stars effect – desktop only.
  useEffect(() => {
    if (isMobile) return;
    const numStars = 100;
    const animationNames = ["rise1", "rise2", "rise3", "rise4", "rise5"];
    const starsArray = Array.from({ length: numStars }).map((_, i) => {
      const left = Math.random() * 100;
      const animationName =
        animationNames[Math.floor(Math.random() * animationNames.length)];
      const animationDelay = `${(Math.random() * 3).toFixed(2)}s`;
      const animationDuration = `${(Math.random() * 3 + 4).toFixed(2)}s`;
      return (
        <div
          key={i}
          className="star"
          style={{
            left: `${left}%`,
            animationName,
            animationDelay,
            animationDuration,
          }}
        ></div>
      );
    });
    setStars(starsArray);
  }, [isMobile]);

  // Helper to randomly choose a calligraphy image.
  const randomCalligraphy = () =>
    Math.random() < 0.5 ? "Ya_Mahdi.png" : "Ya_Qamer-e-bani-hashim.png";

  // Load saved conversations on mount.
  useEffect(() => {
    const saved = localStorage.getItem("conversations");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) {
        setConversations(parsed);
        setCurrentConversationId(parsed[0].id);
      } else {
        const newConversation = {
          id: Date.now().toString(),
          title: "New Chat",
          messages: [],
          calligraphy: randomCalligraphy(),
        };
        setConversations([newConversation]);
        setCurrentConversationId(newConversation.id);
      }
    } else {
      const newConversation = {
        id: Date.now().toString(),
        title: "New Chat",
        messages: [],
        calligraphy: randomCalligraphy(),
      };
      setConversations([newConversation]);
      setCurrentConversationId(newConversation.id);
    }
  }, []);

  // Save conversations to localStorage on change.
  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations]);

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  // Create a new chat.
  const handleNewChat = () => {
    const newConversation = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      calligraphy: randomCalligraphy(),
    };
    setConversations([newConversation, ...conversations]);
    setCurrentConversationId(newConversation.id);
  };

  // Delete a conversation.
  const handleDeleteChat = (id) => {
    const filtered = conversations.filter((conv) => conv.id !== id);
    setConversations(filtered);
    if (currentConversationId === id) {
      setCurrentConversationId(filtered.length > 0 ? filtered[0].id : null);
    }
  };

  // Send a message.
  async function handleSendMessage() {
  if (!inputText.trim()) return;

  const userMessage = {
    id: Date.now().toString(),
    role: "user",
    text: inputText,
  };
  const placeholderId = Date.now().toString() + "-assistant-loading";
  const assistantPlaceholder = {
    id: placeholderId,
    role: "assistant",
    text: "Thinking…",
  };

  setConversations(prev =>
    prev.map(conv =>
      conv.id === currentConversation.id
        ? {
            ...conv,
            title: conv.messages.length === 0 ? inputText : conv.title,
            messages: [...conv.messages, userMessage, assistantPlaceholder],
          }
        : conv
    )
  );
  setInputText("");

  /* archaic: hosted OpenAI/Render request retained verbatim below.
  try {
    const res = await fetch(
      "https://faqih-temp-backend.onrender.com/api/hadith",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMessage.text,
          conversationId: currentConversation.id,
        }),
      }
    );

    let replyText;
    if (!res.ok) {
      // capture 500 or other error payload
      const errBody = await res.text();
      console.error("API error", res.status, errBody);
      replyText = `⚠️ Server Error (${res.status}): ${errBody}`;
    } else {
      const data = await res.json();
      // guard in case reply is missing
      replyText =
        typeof data.reply === "string"
          ? data.reply
          : "⚠️ Unexpected server response";
    }

    setConversations(prev =>
      prev.map(conv =>
        conv.id === currentConversation.id
          ? {
              ...conv,
              messages: conv.messages.map(m =>
                m.id === placeholderId ? { ...m, text: replyText } : m
              ),
            }
          : conv
      )
    );
  } catch (error) {
    console.error("Fetch failed:", error);
    const networkErr = "⚠️ Network error. Please try again.";
    setConversations(prev =>
      prev.map(conv =>
        conv.id === currentConversation.id
          ? {
              ...conv,
              messages: conv.messages.map(m =>
                m.id === placeholderId ? { ...m, text: networkErr } : m
              ),
            }
          : conv
      )
    );
  }
  */
}
  

  return (
    <div
      className={`${poppins.className} relative flex h-screen text-white`}
      style={{ backgroundColor: "transparent" }}
    >
      {/* Desktop Background Elements */}
      {!isMobile && (
        <>
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 0 }}
          >
            <div
              className="framer-wGF1H framer-pmg2x0"
              style={{ minHeight: "100vh", width: "1200px" }}
            >
              <div
                className="framer-eu0l83"
                data-border="true"
                data-framer-name="Hero"
                name="Hero"
              >
                <div
                  className="framer-11253p8"
                  data-framer-name="Background"
                  name="Background"
                >
                  <div
                    className="framer-1liu9c4"
                    data-framer-appear-id="12bsmsa"
                    name="Radial"
                    style={{ opacity: 1, transform: "perspective(1200px)" }}
                  ></div>
                  <div
                    className="framer-9dhxaz"
                    data-framer-name="Elipse"
                    name="Elipse"
                  ></div>
                  <div
                    className="framer-ct3gpt"
                    data-framer-name="Base"
                    name="Base"
                  ></div>
                  {/* Rising Stars effect container */}
                  <div className="rising-stars">{stars}</div>
                  <div
                    className="framer-1f3m948"
                    data-framer-name="Fade"
                    name="Fade"
                  >
                    <div
                      className="framer-xfsdgu"
                      data-framer-name="Left"
                      name="Left"
                    ></div>
                    <div
                      className="framer-17qwwh1"
                      data-framer-name="Right"
                      name="Right"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {currentConversation &&
            currentConversation.messages.length === 0 && (
              <CalligraphyEffect calligraphySrc={currentConversation.calligraphy} />
            )}
        </>
      )}

      {/* Chat UI Container */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Sidebar */}
        <aside
          className={`w-80 bg-sidebar p-4 flex flex-col transition-transform duration-300 transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-end mt-5 mb-4">
            {sidebarOpen && (
              <FontAwesomeIcon
                icon={faPen}
                onClick={handleNewChat}
                className="cursor-pointer text-white text-xl"
              />
            )}
          </div>
          <nav className="mt-6 flex-1">
            {conversations.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-400">No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded hover:bg-white/10 cursor-pointer ${
                      conv.id === currentConversationId ? "bg-white/10" : ""
                    }`}
                    onClick={() => setCurrentConversationId(conv.id)}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare size={16} />
                      <span>{conv.title}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(conv.id);
                      }}
                      className="p-1 hover:bg-red-500 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </nav>
        </aside>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="fixed left-4 top-4 p-2 bg-card rounded z-20"
        >
          <img src="/sidebar.png" alt="Toggle Sidebar" className="w-10 h-10" />
        </button>

        {/* Account Icon (Desktop Only) */}
        {!isMobile && (
          <button
            onClick={() => setAccountModalOpen(true)}
            className="fixed right-4 top-4 p-2 bg-card rounded-full z-10"
          >
            <img
              src="/account.png"
              alt="Account Icon"
              className="w-10 h-10 rounded-full"
            />
          </button>
        )}

        {/* Main Chat Content */}
        <main className="flex-1 flex flex-col relative z-10">
          <div
            className="flex-1 overflow-auto p-4"
            style={{ paddingBottom: "150px" }}
          >
            {currentConversation && (
              <div className="max-w-3xl mx-auto flex flex-col space-y-4">
                {currentConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`chat-bubble ${
                        msg.role === "user"
                          ? "chat-bubble-user"
                          : "chat-bubble-assistant"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Mobile-friendly Input Section */}
        {isMobile ? (
          <>
            {/* Decorative curved light above the input */}
            <div
              style={{
                position: "fixed",
                left: "50%",
                transform: "translateX(-50%)",
                bottom: "120px",
                width: "90%",
                maxWidth: "350px",
                height: "6px",
                background:
                  "linear-gradient(90deg, rgba(255,215,0,0.8) 0%, rgba(255,215,0,0) 100%)",
                borderRadius: "3px",
                zIndex: 50,
              }}
            ></div>
            {/* Curved and floating input bar */}
            <div
              onClick={() => inputRef.current?.focus()}
              className="fixed left-1/2 transform -translate-x-1/2 w-11/12 max-w-md p-4 z-50"
              style={{
                bottom: "60px",
                backgroundColor: "#303030",
                borderRadius: "50px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  className="flex-1 bg-transparent outline-none text-white p-2"
                  style={{ fontSize: "16px" }}
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 hover:bg-white/10 rounded"
                  disabled={!inputText.trim()}
                >
                  <SendHorizontal size={20} />
                </button>
              </div>
            </div>
            {/* Disclaimer at the very bottom without a background banner */}
            <div
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                width: "100%",
                padding: "10px",
                textAlign: "center",
                zIndex: 50,
                fontSize: "14px",
                color: "white",
              }}
            >
              Disclaimer: This mobile view is simplified.
            </div>
          </>
        ) : (
          // Desktop Input Bar
          <div
            onClick={() => inputRef.current?.focus()}
            className="fixed bottom-10 left-1/2 transform -translate-x-1/2 w-3/4 max-w-2xl z-50"
          >
            <div className="flex items-center gap-2 px-6 py-4 bg-[#303030] rounded-full shadow-2xl">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type message"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                className="flex-1 bg-transparent outline-none text-white"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 hover:bg-white/10 rounded-full"
                disabled={!inputText.trim()}
              >
                <SendHorizontal size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Modal */}
      {accountModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg w-80">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Account Details</h2>
              <button onClick={() => setAccountModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="mt-4">
              <p className="font-medium">John Doe</p>
              <p className="text-sm text-gray-400">john.doe@example.com</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full">
                Delete Account
              </button>
              <button className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-full">
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS */}
      <style jsx global>{`
        * {
          box-sizing: border-box;
          -webkit-font-smoothing: inherit;
        }
        .framer-wGF1H [data-border="true"]:after {
          content: "";
          border-width: var(--border-top-width, 0) var(--border-right-width, 0)
            var(--border-bottom-width, 0) var(--border-left-width, 0);
          border-color: var(--border-color, none);
          border-style: var(--border-style, none);
          width: 100%;
          height: 100%;
          position: absolute;
          box-sizing: border-box;
          left: 0;
          top: 0;
          border-radius: inherit;
          pointer-events: none;
        }
        .framer-wGF1H.framer-pmg2x0 {
          align-content: center;
          align-items: center;
          background-color: var(
            --token-0a0787f4-acc7-4c77-bc44-5077db5742f9,
            #000000
          );
          display: flex;
          flex-direction: column;
          flex-wrap: nowrap;
          gap: 0px;
          height: min-content;
          justify-content: flex-start;
          overflow: hidden;
          padding: 0;
          position: relative;
          width: 1200px;
        }
        .framer-wGF1H .framer-eu0l83 {
          --border-bottom-width: 1px;
          --border-color: var(
            --token-02b1808e-ab0e-4234-87f9-3d206b3bfdb7,
            rgba(0, 0, 0, 0.07)
          );
          --border-left-width: 0px;
          --border-right-width: 0px;
          --border-style: solid;
          --border-top-width: 0px;
          align-content: center;
          align-items: center;
          display: flex;
          flex: none;
          flex-direction: column;
          flex-wrap: nowrap;
          gap: 0px;
          height: 100vh;
          justify-content: center;
          max-width: 1440px;
          overflow: visible;
          padding: 0;
          position: relative;
          width: 100%;
        }
        .framer-wGF1H .framer-11253p8 {
          background-color: var(
            --token-0a0787f4-acc7-4c77-bc44-5077db5742f9,
            #000000
          );
          bottom: -100px;
          flex: none;
          height: 800px;
          left: calc(50% - 600px);
          overflow: hidden;
          position: absolute;
          width: 1200px;
          z-index: 0;
        }
        .framer-wGF1H .framer-1liu9c4 {
          -webkit-filter: blur(57px);
          filter: blur(57px);
          background: radial-gradient(
            50% 50% at 50% 50%,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(10, 10, 10, 0) 100%
          );
          bottom: 265px;
          flex: none;
          height: 111px;
          left: calc(47.91666666666669% - 393.5px);
          overflow: hidden;
          position: absolute;
          transform: perspective(1200px);
          width: 787px;
        }
        .framer-wGF1H .framer-9dhxaz {
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            rgba(10, 10, 10, 0) 100%
          );
          border-radius: 100%;
          bottom: -662px;
          flex: none;
          height: 955px;
          left: -443px;
          position: absolute;
          right: -443px;
        }
        .framer-wGF1H .framer-ct3gpt {
          aspect-ratio: 2.346820809248555 / 1;
          background-color: var(
            --token-0a0787f4-acc7-4c77-bc44-5077db5742f9,
            #000000
          );
          border-radius: 100%;
          bottom: -668px;
          box-shadow: inset 0 2px 20px #fff, 0 -10px 50px 1px #ffffff7d;
          flex: none;
          height: var(--framer-aspect-ratio-supported, 956px);
          left: -521px;
          position: absolute;
          right: -521px;
        }
        .framer-wGF1H .framer-1f3m948 {
          align-content: center;
          align-items: center;
          display: flex;
          flex: none;
          flex-direction: row;
          flex-wrap: nowrap;
          gap: 0px;
          justify-content: center;
          inset: 0;
          overflow: hidden;
          padding: 0;
          position: absolute;
        }
        .framer-wGF1H .framer-xfsdgu {
          background: linear-gradient(
            90deg,
            #000000 0%,
            rgba(10, 10, 10, 0) 100%
          );
          flex: none;
          height: 100%;
          overflow: hidden;
          position: relative;
          width: 600px;
        }
        .framer-wGF1H .framer-17qwwh1 {
          background: linear-gradient(
            270deg,
            #000000 0%,
            rgba(10, 10, 10, 0) 100%
          );
          flex: none;
          height: 100%;
          overflow: hidden;
          position: relative;
          width: 600px;
        }
        .rising-stars {
          position: absolute;
          bottom: 260px;
          left: 50%;
          transform: translateX(-50%);
          width: 20vw;
          height: 400px;
          pointer-events: none;
          z-index: 2;
        }
        .rising-stars .star {
          position: absolute;
          bottom: 0;
          width: 2px;
          height: 2px;
          background: #FFD700;
          border-radius: 50%;
          opacity: 0;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
        @keyframes rise1 {
          0% {
            transform: translate(0, 0);
            opacity: 0;
            filter: brightness(100%);
          }
          5% {
            transform: translate(2px, -75px);
            opacity: 0.7;
            filter: brightness(150%);
          }
          10% {
            transform: translate(3px, -150px);
            opacity: 1;
            filter: brightness(200%);
          }
          20% {
            transform: translate(6px, -300px);
            opacity: 1;
            filter: brightness(200%);
          }
          30% {
            transform: translate(8px, -450px);
            opacity: 0.8;
            filter: brightness(150%);
          }
          40% {
            transform: translate(10px, -600px);
            opacity: 1;
            filter: brightness(200%);
          }
          60% {
            transform: translate(16px, -900px);
            opacity: 1;
            filter: brightness(200%);
          }
          70% {
            transform: translate(18px, -1050px);
            opacity: 0.8;
            filter: brightness(150%);
          }
          80% {
            transform: translate(20px, -1200px);
            opacity: 1;
            filter: brightness(200%);
          }
          90% {
            transform: translate(22px, -1350px);
            opacity: 0.7;
            filter: brightness(150%);
          }
          95% {
            transform: translate(23px, -1425px);
            opacity: 0.3;
            filter: brightness(120%);
          }
          100% {
            transform: translate(24px, -1500px);
            opacity: 0;
            filter: brightness(100%);
          }
        }
        .chat-bubble {
          position: relative;
          padding: 12px 16px;
          border-radius: 16px;
          max-width: 100%;
          word-wrap: break-word;
          white-space: pre-wrap;
        }
        .chat-bubble.chat-bubble-user {
          background-color: #4a90e2;
          color: white;
        }
        .chat-bubble.chat-bubble-user::after {
          content: "";
          position: absolute;
          right: -10px;
          top: 10px;
          border-width: 10px;
          border-style: solid;
          border-color: transparent transparent transparent #4a90e2;
        }
        .chat-bubble.chat-bubble-assistant {
          background-color: #555;
          color: white;
        }
        .chat-bubble.chat-bubble-assistant::before {
          content: "";
          position: absolute;
          left: -10px;
          top: 10px;
          border-width: 10px;
          border-style: solid;
          border-color: transparent #555 transparent transparent;
        }
        @keyframes bump {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.98);
          }
          100% {
            transform: scale(1);
          }
        }
        .bump-animation {
          animation: bump 0.3s ease;
        }
        .info-tab-container {
          position: fixed;
          bottom: 20px;
          left: 40px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          z-index: 100;
        }
        .info-tab {
          background: black;
          color: white;
          padding: 8px 12px;
          cursor: pointer;
          border: 1px solid white;
          border-radius: 4px;
          transition: transform 0.3s ease;
          z-index: 101;
        }
        .info-message {
          background: black;
          color: white;
          padding: 10px;
          border: 1px solid white;
          border-radius: 4px;
          margin-bottom: 8px;
          transform: translateY(100%);
          opacity: 0;
          transition: transform 0.3s ease, opacity 0.3s ease;
          white-space: pre-wrap;
          max-width: 300px;
        }
        .info-message.open {
          transform: translateY(0);
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
