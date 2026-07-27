// ./ui/SecurityBox.jsx
import React from "react";

const topStreakStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "1px",
  background: "linear-gradient(to right, transparent 0%, #1263c7 50%, transparent 100%)",
  zIndex: 2,
};

const bottomStreakStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  width: "100%",
  height: "1px",
  background: "linear-gradient(to right, transparent 0%, #1263c7 50%, transparent 100%)",
  zIndex: 2,
};

const innerRectStyle = {
  width: "100%",
  height: "100%",
  background: "linear-gradient(180deg, #000000 0%, rgba(0,36,120,0) 100%)",
  borderRadius: "8px",
  position: "relative",
  overflow: "hidden",
  maskImage: "linear-gradient(180deg, #000 90%, transparent 100%)",
  WebkitMaskImage: "linear-gradient(180deg, #000 90%, transparent 100%)",
};

// Container for the image with a subtle radial mask at the edges
const imageContainerStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "80%", // Adjust as needed
  maskImage: "radial-gradient(circle, white 95%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(circle, white 95%, transparent 100%)",
};

// The image now fills its container fully
const imageStyle = {
  width: "100%",
  height: "auto",
};

// Text container with DM Sans font and text moved down a little more
const textContainerStyle = {
  position: "absolute",
  bottom: "8px", // Moved down from 16px to 32px
  left: "16px",
  fontFamily: "var(--font-dm-sans), sans-serif",
};

const titleStyle = {
  fontSize: "20px",
  marginBottom: "4px",
  color: "white",
};

const subtitleStyle = {
  fontSize: "16px",
  opacity: 0.8,
  color: "white",
};

export default function SecurityBox({ title, subtitle }) {
  const boxStyle = {
    background: "linear-gradient(225deg, rgba(0,111,255,0.2) 0%, rgba(51,136,255,0.09) 100%)",
    borderRadius: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    height: "388px",
    width: "100%",
    placeContent: "center",
    overflow: "hidden",
    padding: "24px",
    position: "relative",
    border: "1px solid rgba(0,111,255,0.2)",
    alignItems: "center",
  };

  return (
    <div style={boxStyle}>
      <div style={topStreakStyle} />
      <div style={bottomStreakStyle} />
      <div style={innerRectStyle}>
        {/* Image container with radial mask */}
        <div style={imageContainerStyle}>
          <img src="/security.png" alt="Security" style={imageStyle} />
        </div>

        {/* Text in the bottom-left corner, moved a little down */}
        <div style={textContainerStyle}>
          <h4 style={titleStyle}>
            {title || "Hadith Integrity"}
          </h4>
          <p style={subtitleStyle}>
            {subtitle || "Sourced with Transparency"}
          </p>
        </div>
      </div>
    </div>
  );
}
