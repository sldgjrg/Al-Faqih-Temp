"use client";

import React from "react";

export default function AIAutomationBox() {
  //
  // Container (outer card)
  //
  const containerStyle = {
    background:
      "linear-gradient(225deg, rgba(0,111,255,0.2) 0%, rgba(51,136,255,0.09) 100%)",
    borderRadius: "24px",
    position: "relative",
    width: "100%",
    height: "388px",
    overflow: "hidden",
    border: "1px solid rgba(0,111,255,0.2)",
  };

  //
  // Inner dark rectangle
  //
  const innerRectStyle = {
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(180deg, #000000 0%, rgba(0,36,120,0) 100%)",
    borderRadius: "8px",
    position: "relative",
    overflow: "hidden",
    // Fade out at the bottom
    maskImage:
      "linear-gradient(180deg, #000 90%, transparent 100%)",
    WebkitMaskImage:
      "linear-gradient(180deg, #000 90%, transparent 100%)",
  };

  //
  // Horizontal shimmering streaks at top/bottom
  //
  const topStreakStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "1px",
    background:
      "linear-gradient(to right, transparent 0%, #1263c7 50%, transparent 100%)",
    zIndex: 2,
  };
  const bottomStreakStyle = {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: "1px",
    background:
      "linear-gradient(to right, transparent 0%, #1263c7 50%, transparent 100%)",
    zIndex: 2,
  };

  //
  // Circle (centered above the dotted line)
  //
  const circleContainerStyle = {
    position: "absolute",
    top: "20%", // Adjust as needed
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };
  const circleStyle = {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "1px dashed rgba(0,111,255,0.8)",
    background:
      "radial-gradient(circle at center, rgba(0,111,255,0.3) 0%, transparent 70%)",
    position: "relative",
    zIndex: 2,
  };

  //
  // Dotted line from the circle to the pill
  //
  const dottedLineStyle = {
    width: "2px",
    height: "70px",
    borderRight: "2px dotted rgba(0,111,255,0.7)",
    marginTop: "4px",
    opacity: 0.8,
  };

  //
  // Pill container
  //
  const pillContainerStyle = {
    position: "absolute",
    bottom: "110px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "60%",
    height: "80px",
    borderRadius: "9999px", // fully pill-shaped
    background:
      "linear-gradient(180deg, rgba(0,111,255,0.15), rgba(0,62,161,0.15))",
    boxShadow: "0 0 16px 0 rgba(0,111,255,0.3)",
    border: "1px solid rgba(0,111,255,0.4)",
    overflow: "hidden",
  };

  //
  // Inner “glassy” layer of the pill
  // with a dark black radial gradient
  //
  const innerPillStyle = {
    position: "absolute",
    top: "8px",
    left: "8px",
    right: "8px",
    bottom: "8px",
    borderRadius: "9999px",
    background:
      "radial-gradient(circle at center, #000000 0%, #000000 100%)",
    boxShadow: "inset 0 0 16px 0 rgba(0,111,255,0.3)",
    border: "1px solid rgba(0,111,255,0.2)",
    overflow: "hidden",
  };

  //
  // Subtle overlay inside the pill
  //
  const subtleOverlayStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: "9999px",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0))",
    mixBlendMode: "overlay",
    pointerEvents: "none",
  };

  //
  // Face container (eyes + mouth) inside the pill
  //
  const pillContentStyle = {
    position: "relative",
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  };

  // Face row: [Left Eye] [Mouth] [Right Eye]
  const faceStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "16px", // reduced gap to bring elements closer
  };

  // Larger ring-like eyes (20×20) with a blue glow
  const eyeStyle = {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: "transparent",
    border: "2px solid rgba(0,111,255,0.9)",
    boxShadow: "0 0 6px rgba(0,111,255,0.6)",
  };

  // Mouth container to adjust vertical position
  const mouthContainerStyle = {
    marginTop: "16px", // move mouth a little more down
  };

  //
  // Mouth as a smiling arc that looks like a ")" rotated 90°.
  // Uses an inline SVG with a quadratic Bézier curve.
  //
  function MouthSVG() {
    return (
      <svg
        width="24"
        height="16"
        viewBox="0 0 24 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 4px rgba(0,111,255,0.6))" }}
      >
        <path
          d="M4 4 Q12 12 20 4"
          stroke="rgba(0,111,255,0.9)"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    );
  }

  //
  // Bottom-left text (outside the pill)
  //
  const textContainerStyle = {
    position: "absolute",
    bottom: "24px",
    left: "24px",
    color: "white",
    fontFamily: "DM Sans, sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };
  const headingStyle = {
    fontSize: "18px",
    margin: 0,
    padding: 0,
  };
  const subheadingStyle = {
    fontSize: "14px",
    opacity: 0.8,
    margin: 0,
    padding: 0,
  };

  return (
    <div style={containerStyle}>
      {/* Top/Bottom shimmering streaks */}
      <div style={topStreakStyle} />
      <div style={bottomStreakStyle} />

      {/* Inner rectangle */}
      <div style={innerRectStyle}>
        {/* Circle + dotted line (centered) */}
        <div style={circleContainerStyle}>
          <div style={circleStyle} />
          <div style={dottedLineStyle} />
        </div>

        {/* Pill (with face) */}
        <div style={pillContainerStyle}>
          <div style={innerPillStyle}>
            <div style={subtleOverlayStyle} />
          </div>

          {/* The face: Left Eye, Mouth, Right Eye */}
          <div style={pillContentStyle}>
            <div style={faceStyle}>
              <div style={eyeStyle} />
              <div style={mouthContainerStyle}>
                <MouthSVG />
              </div>
              <div style={eyeStyle} />
            </div>
          </div>
        </div>

        {/* Text in the bottom-left corner */}
        <div style={textContainerStyle}>
          <h4 style={headingStyle}>AI Interpretation</h4>
          <p style={subheadingStyle}>Contextual Summaries & Insights</p>
        </div>
      </div>
    </div>
  );
}
