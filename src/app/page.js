// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import LocalHadithChat from "@/components/LocalHadithChat";
// // archaic: import { Poppins } from "next/font/google";
// import { MessageSquare, SendHorizontal, X } from "lucide-react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faPen } from "@fortawesome/free-solid-svg-icons";

// // archaic: Poppins was loaded from Google by Next.js, which prevented a fully local UI.
// // archaic: const poppins = Poppins({
// // archaic:   subsets: ["latin"],
// // archaic:   weight: ["400", "500", "700"],
// // archaic: });
// const poppins = { className: "" };

// export default LocalHadithChat;

// // -------------------------------------------------------------------
// // CalligraphyEffect Component (Desktop Only)
// // This component renders the canvas with the calligraphy particle effect.
// // It sets up the effect on mount and cleans up event listeners on unmount.
// function CalligraphyEffect({ calligraphySrc }) {
//   const canvasRef = useRef(null);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext("2d");

//     let particles = [];
//     const mouse = { x: undefined, y: undefined, radius: 120 };

//     // Determine the desired width fraction.
//     let desiredWidthFraction = calligraphySrc === "Ya_Mahdi.png" ? 0.2 : 0.4;
//     if (window.innerWidth < 1024) {
//       desiredWidthFraction = calligraphySrc === "Ya_Mahdi.png" ? 0.6 : 0.8;
//     }
//     const offsetX = 0;
//     const offsetY = -50;

//     // Update canvas size for a sharper render using devicePixelRatio.
//     function updateCanvasSize() {
//       const dpr = window.devicePixelRatio || 1;
//       const cw = window.innerWidth;
//       const ch = window.innerHeight;
//       canvas.width = cw * dpr;
//       canvas.height = ch * dpr;
//       canvas.style.width = cw + "px";
//       canvas.style.height = ch + "px";
//       ctx.resetTransform();
//       ctx.scale(dpr, dpr);
//     }

//     updateCanvasSize();

//     // Helper: Draw a small circle.
//     function drawCircle(ctx, radius) {
//       ctx.beginPath();
//       ctx.arc(0, 0, radius, 0, Math.PI * 2);
//       ctx.fill();
//     }

//     // Sample the calligraphy image and create particles.
//     const initParticles = (image) => {
//       const cw = window.innerWidth;
//       const ch = window.innerHeight;
//       const scaledWidth = cw * desiredWidthFraction;
//       const aspectRatio = image.height / image.width;
//       const scaledHeight = scaledWidth * aspectRatio;
//       const xPos = (cw - scaledWidth) / 2 + offsetX;
//       const yPos = (ch - scaledHeight) / 2 + offsetY;

//       const offscreen = document.createElement("canvas");
//       offscreen.width = cw;
//       offscreen.height = ch;
//       const offCtx = offscreen.getContext("2d");

//       offCtx.drawImage(image, xPos, yPos, scaledWidth, scaledHeight);
//       const imageData = offCtx.getImageData(0, 0, cw, ch);
//       const data = imageData.data;

//       // Dense sampling with a gap of 2 pixels for more particles.
//       const gap = 2;
//       for (let y = 0; y < ch; y += gap) {
//         for (let x = 0; x < cw; x += gap) {
//           const index = (y * cw + x) * 4;
//           const r = data[index];
//           const g = data[index + 1];
//           const b = data[index + 2];
//           const a = data[index + 3];

//           if (a > 128) {
//             const distanceFromWhite = Math.sqrt(
//               (255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2
//             );
//             if (distanceFromWhite > 40 && Math.random() < 0.8) {
//               const size = Math.random() * 0.5 + 0.5;
//               particles.push({
//                 x: x,
//                 y: y,
//                 baseX: x,
//                 baseY: y,
//                 size,
//                 density: Math.random() * 5 + 1,
//                 rotation: Math.random() * Math.PI * 2,
//                 phase: Math.random() * Math.PI * 2,
//               });
//             }
//           }
//         }
//       }
//     };

//     let animationFrameId;
//     // Animate particles with jitter and twinkling.
//     const animate = () => {
//       const cw = window.innerWidth;
//       const ch = window.innerHeight;
//       ctx.clearRect(0, 0, cw, ch);
//       const t = performance.now() / 1000;
//       for (let i = 0; i < particles.length; i++) {
//         const p = particles[i];
//         let dx = p.x - mouse.x;
//         let dy = p.y - mouse.y;
//         let distance = Math.sqrt(dx * dx + dy * dy) || 1;
//         let forceDirectionX = dx / distance;
//         let forceDirectionY = dy / distance;
//         const maxDistance = mouse.radius;
//         let force = (maxDistance - distance) / maxDistance;
//         if (force < 0) force = 0;
//         let directionX = forceDirectionX * force * p.density;
//         let directionY = forceDirectionY * force * p.density;

//         if (distance < mouse.radius) {
//           p.x += directionX;
//           p.y += directionY;
//         } else {
//           p.x -= (p.x - p.baseX) * 0.05;
//           p.y -= (p.y - p.baseY) * 0.05;
//         }
//         p.x += (Math.random() - 0.5) * 0.3;
//         p.y += (Math.random() - 0.5) * 0.3;

//         const normalized = (Math.sin(2 * t + p.phase) + 1) / 2;
//         const twinkleAlpha = 0.2 + 0.8 * Math.pow(normalized, 3);

//         ctx.save();
//         ctx.translate(p.x, p.y);
//         ctx.rotate(p.rotation);
//         ctx.fillStyle = `rgba(255, 215, 0, ${twinkleAlpha})`;
//         drawCircle(ctx, p.size);
//         ctx.restore();
//       }
//       animationFrameId = requestAnimationFrame(animate);
//     };

//     // Resize handler.
//     const handleResize = () => {
//       updateCanvasSize();
//       mouse.x = window.innerWidth / 2;
//       mouse.y = window.innerHeight * 0.7;
//       particles = [];
//       loadImage();
//     };

//     function handleMouseMove(e) {
//       mouse.x = e.clientX;
//       mouse.y = e.clientY;
//     }

//     function handleTouchMove(e) {
//       const touch = e.touches[0];
//       mouse.x = touch.clientX;
//       mouse.y = touch.clientY;
//     }

//     const loadImage = () => {
//       const calligraphyImage = new Image();
//       calligraphyImage.src = `/${calligraphySrc}`;
//       calligraphyImage.onerror = () => {
//         console.error(`Error loading image: /${calligraphySrc}`);
//       };
//       calligraphyImage.onload = () => {
//         initParticles(calligraphyImage);
//       };
//     };

//     mouse.x = window.innerWidth / 2;
//     mouse.y = window.innerHeight * 0.7;
//     loadImage();
//     animate();

//     window.addEventListener("resize", handleResize);
//     window.addEventListener("mousemove", handleMouseMove);
//     window.addEventListener("touchmove", handleTouchMove);

//     setTimeout(handleResize, 100);

//     return () => {
//       window.removeEventListener("resize", handleResize);
//       window.removeEventListener("mousemove", handleMouseMove);
//       window.removeEventListener("touchmove", handleTouchMove);
//       cancelAnimationFrame(animationFrameId);
//     };
//   }, [calligraphySrc]);

//   return (
//     <canvas
//       ref={canvasRef}
//       className="gold-text-canvas bump-animation"
//       style={{
//         position: "fixed",
//         top: 0,
//         left: 0,
//         pointerEvents: "none",
//         zIndex: 5,
//         willChange: "transform",
//       }}
//     />
//   );
// }

// // -------------------------------------------------------------------
// // Main Page Component
// // archaic: Retained as the complete pre-local chat implementation for reference.
// function ArchaicPage() {
//   // Chat UI state
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [accountModalOpen, setAccountModalOpen] = useState(false);
//   const [conversations, setConversations] = useState([]);
//   const [currentConversationId, setCurrentConversationId] = useState(null);
//   const [inputText, setInputText] = useState("");
//   const [stars, setStars] = useState([]);
//   const [infoTabOpen, setInfoTabOpen] = useState(false);
//   const [mounted, setMounted] = useState(false);
//   const [isMobile, setIsMobile] = useState(false);
//   const inputRef = useRef(null);

//   // Set mounted flag and detect mobile.
//   useEffect(() => {
//     setMounted(true);
//     const checkMobile = () => setIsMobile(window.innerWidth < 768);
//     checkMobile();
//     window.addEventListener("resize", checkMobile);
//     return () => window.removeEventListener("resize", checkMobile);
//   }, []);

//   // Info tab for desktop only.
//   useEffect(() => {
//     if (!isMobile && mounted && !localStorage.getItem("infoTabSeen")) {
//       setInfoTabOpen(true);
//       setTimeout(() => {
//         setInfoTabOpen(false);
//         localStorage.setItem("infoTabSeen", "true");
//       }, 3000);
//     }
//   }, [mounted, isMobile]);

//   // Rising stars effect – desktop only.
//   useEffect(() => {
//     if (isMobile) return;
//     const numStars = 100;
//     const animationNames = ["rise1", "rise2", "rise3", "rise4", "rise5"];
//     const starsArray = Array.from({ length: numStars }).map((_, i) => {
//       const left = Math.random() * 100;
//       const animationName =
//         animationNames[Math.floor(Math.random() * animationNames.length)];
//       const animationDelay = `${(Math.random() * 3).toFixed(2)}s`;
//       const animationDuration = `${(Math.random() * 3 + 4).toFixed(2)}s`;
//       return (
//         <div
//           key={i}
//           className="star"
//           style={{
//             left: `${left}%`,
//             animationName,
//             animationDelay,
//             animationDuration,
//           }}
//         ></div>
//       );
//     });
//     setStars(starsArray);
//   }, [isMobile]);

//   // Helper to randomly choose a calligraphy image.
//   const randomCalligraphy = () =>
//     Math.random() < 0.5 ? "Ya_Mahdi.png" : "Ya_Qamer-e-bani-hashim.png";

//   // Load saved conversations on mount.
//   useEffect(() => {
//     const saved = localStorage.getItem("conversations");
//     if (saved) {
//       const parsed = JSON.parse(saved);
//       if (parsed.length > 0) {
//         setConversations(parsed);
//         setCurrentConversationId(parsed[0].id);
//       } else {
//         const newConversation = {
//           id: Date.now().toString(),
//           title: "New Chat",
//           messages: [],
//           calligraphy: randomCalligraphy(),
//         };
//         setConversations([newConversation]);
//         setCurrentConversationId(newConversation.id);
//       }
//     } else {
//       const newConversation = {
//         id: Date.now().toString(),
//         title: "New Chat",
//         messages: [],
//         calligraphy: randomCalligraphy(),
//       };
//       setConversations([newConversation]);
//       setCurrentConversationId(newConversation.id);
//     }
//   }, []);

//   // Save conversations to localStorage on change.
//   useEffect(() => {
//     localStorage.setItem("conversations", JSON.stringify(conversations));
//   }, [conversations]);

//   const currentConversation = conversations.find(
//     (conv) => conv.id === currentConversationId
//   );

//   // Create a new chat.
//   const handleNewChat = () => {
//     const newConversation = {
//       id: Date.now().toString(),
//       title: "New Chat",
//       messages: [],
//       calligraphy: randomCalligraphy(),
//     };
//     setConversations([newConversation, ...conversations]);
//     setCurrentConversationId(newConversation.id);
//   };

//   // Delete a conversation.
//   const handleDeleteChat = (id) => {
//     const filtered = conversations.filter((conv) => conv.id !== id);
//     setConversations(filtered);
//     if (currentConversationId === id) {
//       setCurrentConversationId(filtered.length > 0 ? filtered[0].id : null);
//     }
//   };

//   // Send a message.
//   async function handleSendMessage() {
//   if (!inputText.trim()) return;

//   const userMessage = {
//     id: Date.now().toString(),
//     role: "user",
//     text: inputText,
//   };
//   const placeholderId = Date.now().toString() + "-assistant-loading";
//   const assistantPlaceholder = {
//     id: placeholderId,
//     role: "assistant",
//     text: "Thinking…",
//   };

//   setConversations(prev =>
//     prev.map(conv =>
//       conv.id === currentConversation.id
//         ? {
//             ...conv,
//             title: conv.messages.length === 0 ? inputText : conv.title,
//             messages: [...conv.messages, userMessage, assistantPlaceholder],
//           }
//         : conv
//     )
//   );
//   setInputText("");

//   /* archaic: hosted OpenAI/Render request retained verbatim below.
//   try {
//     const res = await fetch(
//       "https://faqih-temp-backend.onrender.com/api/hadith",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           query: userMessage.text,
//           conversationId: currentConversation.id,
//         }),
//       }
//     );

//     let replyText;
//     if (!res.ok) {
//       // capture 500 or other error payload
//       const errBody = await res.text();
//       console.error("API error", res.status, errBody);
//       replyText = `⚠️ Server Error (${res.status}): ${errBody}`;
//     } else {
//       const data = await res.json();
//       // guard in case reply is missing
//       replyText =
//         typeof data.reply === "string"
//           ? data.reply
//           : "⚠️ Unexpected server response";
//     }

//     setConversations(prev =>
//       prev.map(conv =>
//         conv.id === currentConversation.id
//           ? {
//               ...conv,
//               messages: conv.messages.map(m =>
//                 m.id === placeholderId ? { ...m, text: replyText } : m
//               ),
//             }
//           : conv
//       )
//     );
//   } catch (error) {
//     console.error("Fetch failed:", error);
//     const networkErr = "⚠️ Network error. Please try again.";
//     setConversations(prev =>
//       prev.map(conv =>
//         conv.id === currentConversation.id
//           ? {
//               ...conv,
//               messages: conv.messages.map(m =>
//                 m.id === placeholderId ? { ...m, text: networkErr } : m
//               ),
//             }
//           : conv
//       )
//     );
//   }
//   */
// }
  

//   return (
//     <div
//       className={`${poppins.className} relative flex h-screen text-white`}
//       style={{ backgroundColor: "transparent" }}
//     >
//       {/* Desktop Background Elements */}
//       {!isMobile && (
//         <>
//           <div
//             className="absolute inset-0 flex items-center justify-center pointer-events-none"
//             style={{ zIndex: 0 }}
//           >
//             <div
//               className="framer-wGF1H framer-pmg2x0"
//               style={{ minHeight: "100vh", width: "1200px" }}
//             >
//               <div
//                 className="framer-eu0l83"
//                 data-border="true"
//                 data-framer-name="Hero"
//                 name="Hero"
//               >
//                 <div
//                   className="framer-11253p8"
//                   data-framer-name="Background"
//                   name="Background"
//                 >
//                   <div
//                     className="framer-1liu9c4"
//                     data-framer-appear-id="12bsmsa"
//                     name="Radial"
//                     style={{ opacity: 1, transform: "perspective(1200px)" }}
//                   ></div>
//                   <div
//                     className="framer-9dhxaz"
//                     data-framer-name="Elipse"
//                     name="Elipse"
//                   ></div>
//                   <div
//                     className="framer-ct3gpt"
//                     data-framer-name="Base"
//                     name="Base"
//                   ></div>
//                   {/* Rising Stars effect container */}
//                   <div className="rising-stars">{stars}</div>
//                   <div
//                     className="framer-1f3m948"
//                     data-framer-name="Fade"
//                     name="Fade"
//                   >
//                     <div
//                       className="framer-xfsdgu"
//                       data-framer-name="Left"
//                       name="Left"
//                     ></div>
//                     <div
//                       className="framer-17qwwh1"
//                       data-framer-name="Right"
//                       name="Right"
//                     ></div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//           {currentConversation &&
//             currentConversation.messages.length === 0 && (
//               <CalligraphyEffect calligraphySrc={currentConversation.calligraphy} />
//             )}
//         </>
//       )}

//       {/* Chat UI Container */}
//       <div className="relative z-10 w-full h-full flex flex-col">
//         {/* Sidebar */}
//         <aside
//           className={`w-80 bg-sidebar p-4 flex flex-col transition-transform duration-300 transform ${
//             sidebarOpen ? "translate-x-0" : "-translate-x-full"
//           }`}
//         >
//           <div className="flex items-center justify-end mt-5 mb-4">
//             {sidebarOpen && (
//               <FontAwesomeIcon
//                 icon={faPen}
//                 onClick={handleNewChat}
//                 className="cursor-pointer text-white text-xl"
//               />
//             )}
//           </div>
//           <nav className="mt-6 flex-1">
//             {conversations.length === 0 ? (
//               <div className="flex h-full items-center justify-center">
//                 <p className="text-gray-400">No conversations yet</p>
//               </div>
//             ) : (
//               <div className="space-y-2">
//                 {conversations.map((conv) => (
//                   <div
//                     key={conv.id}
//                     className={`flex items-center justify-between gap-3 p-3 rounded hover:bg-white/10 cursor-pointer ${
//                       conv.id === currentConversationId ? "bg-white/10" : ""
//                     }`}
//                     onClick={() => setCurrentConversationId(conv.id)}
//                   >
//                     <div className="flex items-center gap-3">
//                       <MessageSquare size={16} />
//                       <span>{conv.title}</span>
//                     </div>
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         handleDeleteChat(conv.id);
//                       }}
//                       className="p-1 hover:bg-red-500 rounded"
//                     >
//                       <X size={16} />
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </nav>
//         </aside>

//         {/* Sidebar Toggle Button */}
//         <button
//           onClick={() => setSidebarOpen((prev) => !prev)}
//           className="fixed left-4 top-4 p-2 bg-card rounded z-20"
//         >
//           <img src="/sidebar.png" alt="Toggle Sidebar" className="w-10 h-10" />
//         </button>

//         {/* Account Icon (Desktop Only) */}
//         {!isMobile && (
//           <button
//             onClick={() => setAccountModalOpen(true)}
//             className="fixed right-4 top-4 p-2 bg-card rounded-full z-10"
//           >
//             <img
//               src="/account.png"
//               alt="Account Icon"
//               className="w-10 h-10 rounded-full"
//             />
//           </button>
//         )}

//         {/* Main Chat Content */}
//         <main className="flex-1 flex flex-col relative z-10">
//           <div
//             className="flex-1 overflow-auto p-4"
//             style={{ paddingBottom: "150px" }}
//           >
//             {currentConversation && (
//               <div className="max-w-3xl mx-auto flex flex-col space-y-4">
//                 {currentConversation.messages.map((msg) => (
//                   <div
//                     key={msg.id}
//                     className={`flex ${
//                       msg.role === "user" ? "justify-end" : "justify-start"
//                     }`}
//                   >
//                     <div
//                       className={`chat-bubble ${
//                         msg.role === "user"
//                           ? "chat-bubble-user"
//                           : "chat-bubble-assistant"
//                       }`}
//                     >
//                       {msg.text}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </main>

//         {/* Mobile-friendly Input Section */}
//         {isMobile ? (
//           <>
//             {/* Decorative curved light above the input */}
//             <div
//               style={{
//                 position: "fixed",
//                 left: "50%",
//                 transform: "translateX(-50%)",
//                 bottom: "120px",
//                 width: "90%",
//                 maxWidth: "350px",
//                 height: "6px",
//                 background:
//                   "linear-gradient(90deg, rgba(255,215,0,0.8) 0%, rgba(255,215,0,0) 100%)",
//                 borderRadius: "3px",
//                 zIndex: 50,
//               }}
//             ></div>
//             {/* Curved and floating input bar */}
//             <div
//               onClick={() => inputRef.current?.focus()}
//               className="fixed left-1/2 transform -translate-x-1/2 w-11/12 max-w-md p-4 z-50"
//               style={{
//                 bottom: "60px",
//                 backgroundColor: "#303030",
//                 borderRadius: "50px",
//                 boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
//               }}
//             >
//               <div className="flex items-center gap-2">
//                 <input
//                   ref={inputRef}
//                   type="text"
//                   placeholder="Type a message..."
//                   value={inputText}
//                   onChange={(e) => setInputText(e.target.value)}
//                   onKeyDown={(e) => {
//                     if (e.key === "Enter") handleSendMessage();
//                   }}
//                   className="flex-1 bg-transparent outline-none text-white p-2"
//                   style={{ fontSize: "16px" }}
//                 />
//                 <button
//                   onClick={handleSendMessage}
//                   className="p-2 hover:bg-white/10 rounded"
//                   disabled={!inputText.trim()}
//                 >
//                   <SendHorizontal size={20} />
//                 </button>
//               </div>
//             </div>
//             {/* Disclaimer at the very bottom without a background banner */}
//             <div
//               style={{
//                 position: "fixed",
//                 bottom: 0,
//                 left: 0,
//                 width: "100%",
//                 padding: "10px",
//                 textAlign: "center",
//                 zIndex: 50,
//                 fontSize: "14px",
//                 color: "white",
//               }}
//             >
//               Disclaimer: This mobile view is simplified.
//             </div>
//           </>
//         ) : (
//           // Desktop Input Bar
//           <div
//             onClick={() => inputRef.current?.focus()}
//             className="fixed bottom-10 left-1/2 transform -translate-x-1/2 w-3/4 max-w-2xl z-50"
//           >
//             <div className="flex items-center gap-2 px-6 py-4 bg-[#303030] rounded-full shadow-2xl">
//               <input
//                 ref={inputRef}
//                 type="text"
//                 placeholder="Type message"
//                 value={inputText}
//                 onChange={(e) => setInputText(e.target.value)}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter") handleSendMessage();
//                 }}
//                 className="flex-1 bg-transparent outline-none text-white"
//               />
//               <button
//                 onClick={handleSendMessage}
//                 className="p-2 hover:bg-white/10 rounded-full"
//                 disabled={!inputText.trim()}
//               >
//                 <SendHorizontal size={20} />
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Account Modal */}
//       {accountModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
//           <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg w-80">
//             <div className="flex justify-between items-center">
//               <h2 className="text-lg font-bold">Account Details</h2>
//               <button onClick={() => setAccountModalOpen(false)}>
//                 <X size={20} />
//               </button>
//             </div>
//             <div className="mt-4">
//               <p className="font-medium">John Doe</p>
//               <p className="text-sm text-gray-400">john.doe@example.com</p>
//             </div>
//             <div className="mt-6 flex flex-col gap-3">
//               <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full">
//                 Delete Account
//               </button>
//               <button className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-full">
//                 Log Out
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Global CSS */}
//       <style jsx global>{`
//         * {
//           box-sizing: border-box;
//           -webkit-font-smoothing: inherit;
//         }
//         .framer-wGF1H [data-border="true"]:after {
//           content: "";
//           border-width: var(--border-top-width, 0) var(--border-right-width, 0)
//             var(--border-bottom-width, 0) var(--border-left-width, 0);
//           border-color: var(--border-color, none);
//           border-style: var(--border-style, none);
//           width: 100%;
//           height: 100%;
//           position: absolute;
//           box-sizing: border-box;
//           left: 0;
//           top: 0;
//           border-radius: inherit;
//           pointer-events: none;
//         }
//         .framer-wGF1H.framer-pmg2x0 {
//           align-content: center;
//           align-items: center;
//           background-color: var(
//             --token-0a0787f4-acc7-4c77-bc44-5077db5742f9,
//             #000000
//           );
//           display: flex;
//           flex-direction: column;
//           flex-wrap: nowrap;
//           gap: 0px;
//           height: min-content;
//           justify-content: flex-start;
//           overflow: hidden;
//           padding: 0;
//           position: relative;
//           width: 1200px;
//         }
//         .framer-wGF1H .framer-eu0l83 {
//           --border-bottom-width: 1px;
//           --border-color: var(
//             --token-02b1808e-ab0e-4234-87f9-3d206b3bfdb7,
//             rgba(0, 0, 0, 0.07)
//           );
//           --border-left-width: 0px;
//           --border-right-width: 0px;
//           --border-style: solid;
//           --border-top-width: 0px;
//           align-content: center;
//           align-items: center;
//           display: flex;
//           flex: none;
//           flex-direction: column;
//           flex-wrap: nowrap;
//           gap: 0px;
//           height: 100vh;
//           justify-content: center;
//           max-width: 1440px;
//           overflow: visible;
//           padding: 0;
//           position: relative;
//           width: 100%;
//         }
//         .framer-wGF1H .framer-11253p8 {
//           background-color: var(
//             --token-0a0787f4-acc7-4c77-bc44-5077db5742f9,
//             #000000
//           );
//           bottom: -100px;
//           flex: none;
//           height: 800px;
//           left: calc(50% - 600px);
//           overflow: hidden;
//           position: absolute;
//           width: 1200px;
//           z-index: 0;
//         }
//         .framer-wGF1H .framer-1liu9c4 {
//           -webkit-filter: blur(57px);
//           filter: blur(57px);
//           background: radial-gradient(
//             50% 50% at 50% 50%,
//             rgba(255, 255, 255, 0.8) 0%,
//             rgba(10, 10, 10, 0) 100%
//           );
//           bottom: 265px;
//           flex: none;
//           height: 111px;
//           left: calc(47.91666666666669% - 393.5px);
//           overflow: hidden;
//           position: absolute;
//           transform: perspective(1200px);
//           width: 787px;
//         }
//         .framer-wGF1H .framer-9dhxaz {
//           background: linear-gradient(
//             180deg,
//             #ffffff 0%,
//             rgba(10, 10, 10, 0) 100%
//           );
//           border-radius: 100%;
//           bottom: -662px;
//           flex: none;
//           height: 955px;
//           left: -443px;
//           position: absolute;
//           right: -443px;
//         }
//         .framer-wGF1H .framer-ct3gpt {
//           aspect-ratio: 2.346820809248555 / 1;
//           background-color: var(
//             --token-0a0787f4-acc7-4c77-bc44-5077db5742f9,
//             #000000
//           );
//           border-radius: 100%;
//           bottom: -668px;
//           box-shadow: inset 0 2px 20px #fff, 0 -10px 50px 1px #ffffff7d;
//           flex: none;
//           height: var(--framer-aspect-ratio-supported, 956px);
//           left: -521px;
//           position: absolute;
//           right: -521px;
//         }
//         .framer-wGF1H .framer-1f3m948 {
//           align-content: center;
//           align-items: center;
//           display: flex;
//           flex: none;
//           flex-direction: row;
//           flex-wrap: nowrap;
//           gap: 0px;
//           justify-content: center;
//           inset: 0;
//           overflow: hidden;
//           padding: 0;
//           position: absolute;
//         }
//         .framer-wGF1H .framer-xfsdgu {
//           background: linear-gradient(
//             90deg,
//             #000000 0%,
//             rgba(10, 10, 10, 0) 100%
//           );
//           flex: none;
//           height: 100%;
//           overflow: hidden;
//           position: relative;
//           width: 600px;
//         }
//         .framer-wGF1H .framer-17qwwh1 {
//           background: linear-gradient(
//             270deg,
//             #000000 0%,
//             rgba(10, 10, 10, 0) 100%
//           );
//           flex: none;
//           height: 100%;
//           overflow: hidden;
//           position: relative;
//           width: 600px;
//         }
//         .rising-stars {
//           position: absolute;
//           bottom: 260px;
//           left: 50%;
//           transform: translateX(-50%);
//           width: 20vw;
//           height: 400px;
//           pointer-events: none;
//           z-index: 2;
//         }
//         .rising-stars .star {
//           position: absolute;
//           bottom: 0;
//           width: 2px;
//           height: 2px;
//           background: #FFD700;
//           border-radius: 50%;
//           opacity: 0;
//           animation-timing-function: linear;
//           animation-iteration-count: infinite;
//           will-change: transform, opacity;
//         }
//         @keyframes rise1 {
//           0% {
//             transform: translate(0, 0);
//             opacity: 0;
//             filter: brightness(100%);
//           }
//           5% {
//             transform: translate(2px, -75px);
//             opacity: 0.7;
//             filter: brightness(150%);
//           }
//           10% {
//             transform: translate(3px, -150px);
//             opacity: 1;
//             filter: brightness(200%);
//           }
//           20% {
//             transform: translate(6px, -300px);
//             opacity: 1;
//             filter: brightness(200%);
//           }
//           30% {
//             transform: translate(8px, -450px);
//             opacity: 0.8;
//             filter: brightness(150%);
//           }
//           40% {
//             transform: translate(10px, -600px);
//             opacity: 1;
//             filter: brightness(200%);
//           }
//           60% {
//             transform: translate(16px, -900px);
//             opacity: 1;
//             filter: brightness(200%);
//           }
//           70% {
//             transform: translate(18px, -1050px);
//             opacity: 0.8;
//             filter: brightness(150%);
//           }
//           80% {
//             transform: translate(20px, -1200px);
//             opacity: 1;
//             filter: brightness(200%);
//           }
//           90% {
//             transform: translate(22px, -1350px);
//             opacity: 0.7;
//             filter: brightness(150%);
//           }
//           95% {
//             transform: translate(23px, -1425px);
//             opacity: 0.3;
//             filter: brightness(120%);
//           }
//           100% {
//             transform: translate(24px, -1500px);
//             opacity: 0;
//             filter: brightness(100%);
//           }
//         }
//         .chat-bubble {
//           position: relative;
//           padding: 12px 16px;
//           border-radius: 16px;
//           max-width: 100%;
//           word-wrap: break-word;
//           white-space: pre-wrap;
//         }
//         .chat-bubble.chat-bubble-user {
//           background-color: #4a90e2;
//           color: white;
//         }
//         .chat-bubble.chat-bubble-user::after {
//           content: "";
//           position: absolute;
//           right: -10px;
//           top: 10px;
//           border-width: 10px;
//           border-style: solid;
//           border-color: transparent transparent transparent #4a90e2;
//         }
//         .chat-bubble.chat-bubble-assistant {
//           background-color: #555;
//           color: white;
//         }
//         .chat-bubble.chat-bubble-assistant::before {
//           content: "";
//           position: absolute;
//           left: -10px;
//           top: 10px;
//           border-width: 10px;
//           border-style: solid;
//           border-color: transparent #555 transparent transparent;
//         }
//         @keyframes bump {
//           0% {
//             transform: scale(1);
//           }
//           50% {
//             transform: scale(0.98);
//           }
//           100% {
//             transform: scale(1);
//           }
//         }
//         .bump-animation {
//           animation: bump 0.3s ease;
//         }
//         .info-tab-container {
//           position: fixed;
//           bottom: 20px;
//           left: 40px;
//           display: flex;
//           flex-direction: column;
//           align-items: flex-start;
//           z-index: 100;
//         }
//         .info-tab {
//           background: black;
//           color: white;
//           padding: 8px 12px;
//           cursor: pointer;
//           border: 1px solid white;
//           border-radius: 4px;
//           transition: transform 0.3s ease;
//           z-index: 101;
//         }
//         .info-message {
//           background: black;
//           color: white;
//           padding: 10px;
//           border: 1px solid white;
//           border-radius: 4px;
//           margin-bottom: 8px;
//           transform: translateY(100%);
//           opacity: 0;
//           transition: transform 0.3s ease, opacity 0.3s ease;
//           white-space: pre-wrap;
//           max-width: 300px;
//         }
//         .info-message.open {
//           transform: translateY(0);
//           opacity: 1;
//         }
//       `}</style>
//     </div>
//   );
// }

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
import {
  conversationMessages,
  elucidationMessages,
  parseElucidationJson,
  synthesisMessages,
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
              <p>{elucidation.parallel.english}</p>
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
  const provenance = response.modelLabel
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
              ? `Retrieved ${message.results.length} closely supported narrations from ${message.candidateCount} direct candidates${message.expandedCandidateCount ? ` and ${message.expandedCandidateCount - message.candidateCount} corpus-linked candidates` : ""}.`
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
          <small>Generated locally from the displayed narrations{message.synthesis.modelLabel ? ` · ${message.synthesis.modelLabel}` : ""}; not a chain grading or fatwa.</small>
        </section>
      )}
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
      chatWorker = new Worker("/local-llm.worker.js?v=14", {
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
                      expandedCandidateCount: data.expandedCandidateCount,
                      elapsedMs: data.elapsedMs,
                      synthesis: data.results.length ? { loading: true, text: "" } : null,
                      retrievalPhrase: THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)],
                    }
                  : message),
              }
            : conversation));
        if (data.results.length && pending?.query) {
          requestLocalGeneration(synthesisMessages(pending.query, data.results), {
            mode: "synthesis",
            maxNewTokens: 220,
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

    const localResponse = resolveLocalConversation(query, current, globalMemory);
    if (localResponse.memoryUpdate) {
      setGlobalMemory((memory) => applyMemoryUpdate(memory, localResponse.memoryUpdate, current.id));
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
      retrievalQuery,
      language: localResponse.language,
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
    workerRef.current?.postMessage({ type: "search", requestId, query: retrievalQuery, filters });
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
