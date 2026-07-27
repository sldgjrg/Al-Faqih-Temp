import React from 'react';

const integrationIcons = [
  "https://framerusercontent.com/images/EfmkDu7P6lMdmMQJxczvP8CKLI.png",
  "https://framerusercontent.com/images/z54MSDQ03t3nm6RQmBVDgJY7y7k.png",
  "https://framerusercontent.com/images/8qlFDXNkckY7588JXNIrHilsfQ.png",
  "https://framerusercontent.com/images/nJirYKMdmrShhQuHMHU33tSE1o.png",
  "https://framerusercontent.com/images/vBmUMRGpGmjAeaj6ez9FNwF46I.png",
  "https://framerusercontent.com/images/U3VCRxCQA1ahOFTgVjPXBN0o.png",
  "https://framerusercontent.com/images/BLL9NZ8apT7dLzVjG2CV2mksUY.png",
  "https://framerusercontent.com/images/HBcVlCHvgiXsXLxtjJB7NVH7Zrs.png",
  "https://framerusercontent.com/images/JxZUIkgE3AKavwgSxksQbKgis.png",
  "https://framerusercontent.com/images/upq5HUp1jjs16CStmH4qEDwoO0M.png",
  "https://framerusercontent.com/images/xZYEU7lHWYAwCDkvPrUdEMG2DZA.png",
  "https://framerusercontent.com/images/Iw7LVaGnyAsaepd7KzaLoMw.png",
];

const integrationContainerStyle = {
  background: "linear-gradient(225deg, rgba(0,111,255,0.2) 0%, rgba(51,136,255,0.09) 100%)",
  borderRadius: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  height: "388px",
  width: "100%",
  justifyContent: "center",
  overflow: "hidden",
  padding: "24px",
  position: "relative",
  border: "1px solid rgba(0,111,255,0.2)",
  alignItems: "center",
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

const marqueeStyle = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  animation: "marquee 95s linear infinite",
};

const marqueeReverseStyle = {
  ...marqueeStyle,
  animation: "marquee 95s linear infinite reverse",
};

function IntegrationIconBox({ src }) {
  return (
    <div
      style={{
        position: "relative",
        width: 60,
        height: 60,
        borderRadius: 24,
        border: "1px solid #1263c7",
        background: "#000b1f",
        boxShadow: "0 0 8px rgba(0,98,199,0.5)",
        overflow: "hidden",
      }}
    >
      {/* Top and bottom streaks */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 2,
          background: "linear-gradient(to right, transparent, #1263c7, transparent)",
          opacity: 0.8,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: 2,
          background: "linear-gradient(to right, transparent, #1263c7, transparent)",
          opacity: 0.8,
          pointerEvents: "none",
        }}
      />
      {/* Inner squircle */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          right: 8,
          bottom: 8,
          borderRadius: "30%",
          background: "radial-gradient(circle at 50% 50%, #000000 30%, #001022 100%)",
          overflow: "hidden",
        }}
      >
        <img
          src={src}
          alt="Integration Icon"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
          }}
        />
      </div>
      {/* Subtle overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "50%",
          background: "linear-gradient(to bottom, rgba(18,99,199,0.3), transparent)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function renderMarquee() {
  const items = [...integrationIcons, ...integrationIcons];
  return items.map((src, idx) => (
    <div
      key={`icon-${idx}`}
      style={{ display: "inline-flex", alignItems: "center", marginRight: "48px" }}
    >
      <IntegrationIconBox src={src} />
    </div>
  ));
}

export default function IntegrationBox() {
  return (
    <div style={integrationContainerStyle}>
      <div style={topStreakStyle} />
      <div style={bottomStreakStyle} />
      <div style={innerRectStyle}>
        <div style={{ paddingTop: "40px", position: "relative" }}>
          {/* First row of marquee icons */}
          <div style={{ position: "relative", width: "100%", height: 60, overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                transform: "translateY(-50%)",
                width: "100%",
                height: "1px",
                background: "rgba(18,99,199,0.4)",
                zIndex: 1,
              }}
            />
            <div style={{ ...marqueeStyle, zIndex: 2 }}>{renderMarquee()}</div>
          </div>
          {/* Second row of marquee icons */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 60,
              overflow: "hidden",
              marginTop: "48px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                transform: "translateY(-50%)",
                width: "100%",
                height: "1px",
                background: "rgba(18,99,199,0.4)",
                zIndex: 1,
              }}
            />
            <div style={{ ...marqueeReverseStyle, zIndex: 2 }}>{renderMarquee()}</div>
          </div>
        </div>
        {/* Bottom-left text */}
        <div style={{ position: "absolute", bottom: "16px", left: "16px" }}>
          <h4
            style={{
              fontSize: "20px",
              marginBottom: "4px",
              color: "white",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Hadith Collections
          </h4>
          <p
            style={{
              fontSize: "16px",
              opacity: 0.8,
              color: "white",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Search Across Sources
          </p>
        </div>
      </div>
    </div>
  );
}
