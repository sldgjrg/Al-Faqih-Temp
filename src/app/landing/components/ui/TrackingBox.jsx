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

function InvertedPartialCircle({ progress = 80, size = 160, strokeWidth = 16 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(180deg)" }}
    >
      <defs>
        <linearGradient id="invertedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#222" />
          <stop offset="100%" stopColor="#fff" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#2f2f2f"
        strokeWidth={strokeWidth}
        style={{ opacity: 0.4 }}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#invertedGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: offset,
          transition: "stroke-dashoffset 0.6s ease",
        }}
      />
    </svg>
  );
}

export default function TrackingBox() {
  const boxStyle = {
    background: "linear-gradient(225deg, rgba(0,111,255,0.2) 0%, rgba(51,136,255,0.09) 100%)",
    borderRadius: "24px",
    position: "relative",
    height: "388px",
    width: "100%",
    overflow: "hidden",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    border: "1px solid rgba(0,111,255,0.2)",
  };

  const pillTopStreak = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "1px",
    background: "linear-gradient(to right, transparent 0%, #1263c7 50%, transparent 100%)",
    zIndex: 2,
  };

  return (
    <div style={boxStyle}>
      <div style={topStreakStyle} />
      <div style={bottomStreakStyle} />
      <div style={innerRectStyle} />
      {/* Inverted partial circle with overlay image */}
      <div
        style={{
          position: "absolute",
          bottom: "160px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "160px",
          height: "160px",
          zIndex: 10,
        }}
      >
        <InvertedPartialCircle progress={80} size={160} strokeWidth={16} />
        <img
          src="https://framerusercontent.com/images/bovyPXD22jpcnAWTZuyUiSfxDc4.svg"
          alt="Tracking Icon"
          style={{
            position: "absolute",
            width: "52px",
            height: "52px",
            top: "50%",
            left: "48%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
      {/* Pill with numbers */}
      <div
        style={{
          position: "absolute",
          bottom: "90px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "300px",
          height: "48px",
          borderRadius: "9999px",
          background: "linear-gradient(225deg, #000000 0%, #000000 60%, #001022 100%)",
          boxShadow: "inset 0 0 29px 0 #003ea1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 20,
        }}
      >
        <div style={pillTopStreak} />
        <p
          style={{
            margin: 0,
            color: "rgb(0,111,255)",
            fontSize: "14px",
            fontWeight: 500,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          0
        </p>
        <h3
          style={{
            margin: 0,
            fontSize: "24px",
            fontWeight: 400,
            backgroundImage: "linear-gradient(225deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.5) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          95%
        </h3>
        <p
          style={{
            margin: 0,
            color: "rgb(0,111,255)",
            fontSize: "14px",
            fontWeight: 500,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          100
        </p>
      </div>
      {/* Bottom-left text */}
      <div style={{ position: "absolute", bottom: "16px", left: "16px", zIndex: 25 }}>
        <h4
          style={{
            fontSize: "20px",
            marginBottom: "4px",
            color: "white",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Search Processing
        </h4>
        <p
          style={{
            fontSize: "16px",
            opacity: 0.8,
            color: "white",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Retrieving Relevant Hadith
        </p>
      </div>
    </div>
  );
}
