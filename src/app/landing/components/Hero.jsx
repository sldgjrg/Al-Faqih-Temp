"use client";

import React, { useState, useEffect } from "react";
// archaic: import { Montserrat, Inter, Orbitron } from "next/font/google";

// Keep Montserrat for the second title line and Inter Bold for the first title line
// archaic: const montserrat = Montserrat({ subsets: ["latin"], weight: "400" });
// archaic: const inter = Inter({ subsets: ["latin"], weight: "800" });
// Import a cool font for the Get Started button
// archaic: const orbitron = Orbitron({ subsets: ["latin"], weight: "500" });
const montserrat = { className: "font-local-afacad" };
const inter = { className: "font-local-hubot" };
const orbitron = { className: "font-local-hubot" };

export default function TopBar() {
  // Delay rendering until client-side to prevent flash issues
  const [mounted, setMounted] = useState(false);
  // Track whether the page is scrolled down
  const [isScrolled, setIsScrolled] = useState(false);
  // Track if the mouse is hovering the top area
  const [isHovered, setIsHovered] = useState(false);
  // State to trigger the brief slide-up animation on scroll
  const [animateSlideUp, setAnimateSlideUp] = useState(false);

  // Compute whether the topbar should be visible:
  // Show when not scrolled, or when hovered, or when animating
  const topBarVisible = !isScrolled || isHovered || animateSlideUp;

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      if (window.scrollY > 0) {
        if (!isScrolled) setIsScrolled(true);
      } else {
        if (isScrolled) setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isScrolled]);

  useEffect(() => {
    if (isScrolled && !isHovered) {
      // Trigger a quick slide-up animation when scrolling down
      setAnimateSlideUp(true);
      const timer = setTimeout(() => {
        setAnimateSlideUp(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isScrolled, isHovered]);

  if (!mounted) return null;

  return (
    <>
      {/* Persistent hover area: even when the topbar is hidden, hovering over this area will show it */}
      <div
        className="topBarHoverArea"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Top Bar Markup */}
      <div
        className={`topBar ${!topBarVisible ? "hidden" : ""} ${
          animateSlideUp ? "animateSlideUp" : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="logoContainer">
          <img src="/logo.png" alt="Logo" />
        </div>
      </div>

      <span className="updatePill">Beta is Now Live</span>

      <div className="titleContainer">
        <h1 className={`titleLine1 ${inter.className}`}>
          A Sea of Knowledge,
        </h1>
        <h1 className={`titleLine2 ${montserrat.className}`}>
          At Your Fingertips
        </h1>
      </div>

      <div className="heroButtonContainer">
        <a
          href="https://chat.alfaqih.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className={`custom-button big-button ${orbitron.className}`}>
            Get Started
          </button>
        </a>
      </div>

      <div className="heroImageContainer">
        <img src="/hero_image.png" alt="Hero" />
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        @font-face {
          font-family: "Cabin Bold";
          src: url("/Cabin-Bold.ttf") format("truetype");
          font-weight: 700;
          font-style: normal;
        }
        @font-face {
          font-family: "Hubot-Sans Semibold";
          src: url("/HubotSans-SemiBold.ttf") format("truetype");
          font-weight: normal;
          font-style: normal;
        }
        :root {
          font-size: 12px;
          font-family: sans-serif;
          --token-7554137f-8983-4a14-a523-12cc084d7687: rgb(0, 0, 0);
          --token-7893f74b-bd99-4cac-870a-8a1a405b68f3: rgb(0, 17, 51);
          --token-06ecfbc4-0b60-4a91-a41d1efdf6951: rgba(51, 136, 255, 0.09);
          --token-fbe41fd3-b4b8-464e-87f7-1fafed0336eb: rgb(255, 255, 255);
          --token-05187795-315c-4a7c-9499-a4ca4a832de9: rgba(255, 255, 255, 0.5);
          --token-7c31739f-c6bc-4a82-86b6-a3ff1508699f: rgba(0, 111, 255, 0.2);
          --framer-will-change-override: none;
          --framer-aspect-ratio-supported: auto;
          box-sizing: border-box;
          -webkit-font-smoothing: inherit;
        }
      `}</style>

      <style jsx>{`
        @keyframes slideDownFade {
          from {
            transform: translateX(-50%) translateY(-200px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideUpAnimation {
          from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
          to {
            transform: translateX(-50%) translateY(-150px);
            opacity: 0;
          }
        }
        @keyframes slideUpFade {
          from {
            transform: translateX(-50%) translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        /* Hover area always present at the top */
        .topBarHoverArea {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 1400px;
          height: 150px;
          z-index: 900;
          background: transparent;
        }
        .topBar {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%) translateY(0);
          width: 1400px;
          height: 150px;
          background: transparent;
          z-index: 1000;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          box-shadow: none;
          border: none;
          transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
          animation: slideDownFade 1.5s ease forwards;
        }
        .topBar.hidden {
          transform: translateX(-50%) translateY(-150px) !important;
        }
        .topBar.animateSlideUp {
          animation: slideUpAnimation 0.3s ease forwards;
        }
        .topBar > * {
          transform: translateY(0);
          opacity: 1;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .topBar.hidden > * {
          transform: translateY(-20px);
          opacity: 0;
        }
        .logoContainer {
          height: 100%;
          display: flex;
          align-items: center;
        }
        .logoContainer img {
          height: 120px;
          width: auto;
          object-fit: contain;
        }
        .custom-button {
          position: relative;
          font-size: 18px;
          color: white;
          background: linear-gradient(
            90deg,
            rgba(0, 119, 255, 0.4) 0%,
            rgb(0, 17, 51) 50%,
            rgba(0, 119, 255, 0.4) 100%
          );
          border: 1px solid rgba(0, 119, 255, 0.8);
          border-radius: 17px;
          padding: 8px 22px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: inset 0 0 25px 0px rgba(0, 119, 255, 0.7),
            0px 6px 12px 0px rgba(0, 111, 255, 0.3);
          transition: background 0.3s ease, box-shadow 0.3s ease;
          overflow: hidden;
          top: -4px;
          font-family: "Cabin Bold", sans-serif;
        }
        .custom-button:hover {
          box-shadow: inset 0 0 25px 5px rgba(0, 119, 255, 0.9);
        }
        .big-button {
          font-size: 18px;
          padding: 13.5px 30px;
          transition: background 1s ease, box-shadow 1s ease;
        }
        .big-button:hover {
          background: linear-gradient(
            90deg,
            rgba(0, 119, 255, 0.6) 0%,
            rgb(0, 17, 51) 50%,
            rgba(0, 119, 255, 0.6) 100%
          );
        }
        .big-button:hover::after {
          background: linear-gradient(
            to bottom,
            rgba(1, 79, 219, 0.7) 0%,
            rgba(1, 79, 219, 0.4) 20%,
            rgba(1, 79, 219, 0) 100%
          );
          transition: background 1s ease-in-out;
        }
        .custom-button::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 60%;
          background: rgba(173, 216, 230, 0.08);
          border-radius: 0 0 12px 12px;
          pointer-events: none;
          transition: background 0.3s ease;
        }
        .updatePill {
          position: absolute;
          top: 180px;
          left: 50%;
          transform: translateX(-50%);
          display: inline-block;
          padding: 6px 20px;
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          font-family: "Hubot-Sans Semibold", sans-serif;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          background: transparent;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: none;
          text-align: center;
          z-index: 1400;
          position: relative;
        }
        .updatePill::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 2px;
          background: linear-gradient(
            to right,
            transparent,
            #c5ced8,
            transparent
          );
          pointer-events: none;
        }
        .titleContainer {
          position: absolute;
          top: 290px;
          left: 50%;
          transform: translateX(-50%) translateY(30px);
          opacity: 0;
          animation: slideUpFade 1.5s ease forwards;
          animation-delay: 1s;
          text-align: center;
          z-index: 1500;
        }
        .titleLine1 {
          margin: 0;
          font-size: 70px;
          color: #fff;
          line-height: 1.1;
          text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.7);
          padding-top: 10px;
        }
        .titleLine2 {
          margin: 0;
          font-size: 60px;
          color: #fff;
          line-height: 1.1;
          text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.7);
        }
        .heroButtonContainer {
          position: absolute;
          top: 550px;
          left: 50%;
          transform: translateX(-50%) translateY(30px);
          opacity: 0;
          animation: slideUpFade 1.5s ease forwards;
          animation-delay: 1.5s;
          z-index: 1500;
        }
        .heroImageContainer {
          position: absolute;
          top: 700px;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          animation: slideUpFade 1.5s ease forwards;
          animation-delay: 1.2s;
          z-index: 1500;
          width: 1200px; /* reduced from 1800px for desktop */
          overflow: hidden;
          border: 2px solid rgba(66, 125, 248, 0.3);
          border-radius: 20px;
          box-shadow: 
            0 0 20px rgba(66, 125, 248, 0.3),
            0 0 40px rgba(66, 125, 248, 0.15);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.02) 0%,
            rgba(255, 255, 255, 0) 100%
          );
        }
        .heroImageContainer img {
          width: 100%;
          height: auto;
          border-radius: 20px;
          border: none;
          box-shadow: none;
          display: block;
        }

        /* Mobile layout tweaks */
        @media (max-width: 768px) {
          .topBarHoverArea,
          .topBar {
            width: 100%;
          }
          .logoContainer img {
            height: 80px;
          }
          .updatePill {
            top: 120px;
          }
          .titleContainer {
            top: 220px;
          }
          .titleLine1 {
            font-size: 48px;
          }
          .titleLine2 {
            font-size: 40px;
          }
          .heroButtonContainer {
            top: 440px;
          }
          .heroImageContainer {
            top: 520px;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
