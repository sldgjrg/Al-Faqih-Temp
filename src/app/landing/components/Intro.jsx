"use client";

import React, { useState, useEffect, useRef } from "react";

export default function Intro() {
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  // Transition duration used in inline styles.
  const [transitionDuration, setTransitionDuration] = useState("1s");
  const wrapperRef = useRef(null);
  const prevProgressRef = useRef(0);
  const prevTimeRef = useRef(Date.now());

  // Increase scroll distance factor for a slower, more gradual reveal.
  const extraScrollFactor = 2.5;
  // Velocity threshold (in progress units per second) above which we speed up the transition.
  const VELOCITY_THRESHOLD = 0.5; // Adjust as needed

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const extraScroll = window.innerHeight * extraScrollFactor;
      // Calculate overall progress (0 to 1) over the extra scroll distance.
      const progress = Math.min(Math.max(-rect.top / extraScroll, 0), 1);
      setScrollProgress(progress);

      // Compute scroll velocity.
      const now = Date.now();
      const deltaTime = (now - prevTimeRef.current) / 1000; // seconds
      const deltaProgress = Math.abs(progress - prevProgressRef.current);
      const velocity = deltaTime ? deltaProgress / deltaTime : 0;

      // For slow scroll, use a gradual 1s transition. For fast scroll, shorten it.
      if (velocity > VELOCITY_THRESHOLD) {
        setTransitionDuration("0.1s");
      } else {
        setTransitionDuration("1s");
      }

      // Update refs.
      prevProgressRef.current = progress;
      prevTimeRef.current = now;
    };

    window.addEventListener("scroll", handleScroll);
    // Initialize once.
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) return null;

  // Sorted text lines from shortest to longest.
  const sortedTextLines = [
    "Uncover narrations with advanced AI precision.",
    "Explore centuries of guidance, reimagined for today.",
    "Discover the timeless wisdom of hadith with Al Faqih.",
    "Empowering seekers of truth through technology and faith.",
    "Your digital gateway to the revered traditions of the Prophet and the Imams."
  ];

  // Rebuild items array: insert a circle between each text line except after the last one.
  const items = [];
  sortedTextLines.forEach((text, index) => {
    items.push({ type: "line", text });
    if (index !== sortedTextLines.length - 1) {
      items.push({ type: "circle" });
    }
  });

  // For a top-to-bottom "wave" of reveal, each item brightens (opacity from 0.3 to 1)
  // over its own segment of the overall scroll progress.
  function getItemOpacity(index) {
    const step = 1 / items.length;
    const start = index * step;
    const end = (index + 1) * step;
    let opacity = 0.3;
    if (scrollProgress <= start) {
      opacity = 0.3;
    } else if (scrollProgress >= end) {
      opacity = 1;
    } else {
      const rangeProgress = (scrollProgress - start) / (end - start);
      opacity = 0.3 + rangeProgress * (1 - 0.3);
    }
    return opacity;
  }

  return (
    <>
      {/* Global Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        :root {
          font-size: 12px;
          font-family: "DM Sans", sans-serif;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }
        *,
        *:before,
        *:after {
          box-sizing: inherit;
        }
        html,
        body,
        #__next {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
        }
      `}</style>

      {/* The pinned wrapper creates extra scroll space and pins the content */}
      <div
        ref={wrapperRef}
        className="pinnedWrapper"
        style={{
          paddingTop: "480px",
          height: `calc(100vh + ${extraScrollFactor} * 100vh)`
        }}
      >
        <div className="introOuterContainer">
          <div className="introGradient" />
          <div className="introContentContainer">
            <div className="introInnerSection">
              {items.map((item, i) => {
                const opacity = getItemOpacity(i);
                const commonStyle = {
                  opacity,
                  transition: `opacity ${transitionDuration} ease`
                };
                if (item.type === "line") {
                  return (
                    <p key={i} className="dm-sans-unique" style={commonStyle}>
                      {item.text}
                    </p>
                  );
                }
                return (
                  <div key={i} className="circle" style={commonStyle} />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pinnedWrapper {
          position: relative;
        }
        .introOuterContainer {
          position: sticky;
          top: 0;
          width: 100%;
          height: 100vh;
          overflow: hidden;
        }
        .introGradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            315deg,
            rgba(51, 136, 255, 0) 0%,
            rgba(0, 111, 255, 1) 20%,
            rgba(51, 136, 255, 0) 27%,
            rgba(0, 111, 255, 1) 30%,
            rgba(51, 136, 255, 0) 37%,
            rgba(0, 62, 161, 1) 40%,
            rgba(0, 119, 255, 0) 47%,
            rgba(0, 62, 161, 1) 50%,
            rgba(51, 136, 255, 0) 57%,
            rgba(0, 62, 161, 1) 60%,
            rgba(51, 136, 255, 0) 67%,
            rgba(0, 111, 255, 1) 70%,
            rgba(51, 136, 255, 0) 100%
          );
          mask: radial-gradient(
            50% 50% at 50% 50%,
            #000000 0%,
            rgba(0, 0, 0, 0) 100%
          );
          pointer-events: none;
          z-index: 0;
        }
        .introContentContainer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        .introInnerSection {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          text-align: center;
          margin-top: 10vh;
        }
        .introInnerSection p {
          color: #ffffff;
          font-size: 2.5rem;
          margin: 0 0 1rem 0; /* Added bottom margin for spacing */
        }
        .circle {
          width: 6px;
          height: 6px;
          border: 1px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
        }
        .dm-sans-unique {
          font-family: "DM Sans", sans-serif;
          font-weight: 400;
          font-style: normal;
        }
      `}</style>
    </>
  );
}
