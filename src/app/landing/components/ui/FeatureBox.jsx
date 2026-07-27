// ./ui/FeatureBox.jsx
import React from 'react';

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

export default function FeatureBox({ title, subtitle }) {
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
        <div style={{ position: "absolute", bottom: "16px", left: "16px" }}>
          <h4 style={{ fontSize: "20px", marginBottom: "4px", color: "white" }}>{title}</h4>
          <p style={{ fontSize: "16px", opacity: 0.8, color: "white" }}>{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
