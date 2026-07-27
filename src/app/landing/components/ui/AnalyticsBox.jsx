import React from "react";

export default function AnalyticsBox() {
  // Adjust the bar heights here (in pixels)
  // to match your desired proportions.
  const barHeights = [180, 120, 200, 80, 160, 100, 180];

  // Outer container (the card)
  const containerStyle = {
    background:
      "linear-gradient(225deg, rgba(0,111,255,0.2) 0%, rgba(51,136,255,0.09) 100%)",
    borderRadius: "24px",
    display: "flex",
    flexDirection: "column",
    height: "388px",
    width: "100%",
    overflow: "hidden",
    position: "relative",
    border: "1px solid rgba(0,111,255,0.2)",
  };

  // Dark rectangle inside the card
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

  // The horizontal shimmering lines at the top/bottom of the card
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

  // Outer bar style (semi-transparent gradient)
  const outerBarStyle = {
    position: "relative",
    width: "18px",
    borderRadius: "8px",
    background:
      "linear-gradient(180deg, rgba(0,62,161,0.7) 0%, rgba(0,111,255,0.2) 100%)",
    boxShadow: "inset 0px 0px 16px 0px rgb(0,62,161)",
    border: "1px solid rgba(0,111,255,0.2)",
  };

  // Inner bar style (solid bright fill)
  const innerBarStyle = {
    position: "absolute",
    bottom: 0,
    left: "2px",
    right: "2px",
    borderRadius: "6px",
    background: "linear-gradient(180deg, rgb(0,111,255) 0%, rgb(0,62,161) 100%)",
  };

  return (
    <div style={containerStyle}>
      {/* Shimmer lines at very top/bottom */}
      <div style={topStreakStyle} />
      <div style={bottomStreakStyle} />

      <div style={innerRectStyle}>
        {/* Split the card into two vertical sections:
            (1) Bars up top, (2) Text area at bottom-left. */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Bars container */}
          <div style={{ flex: 1, position: "relative", padding: "0 24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                height: "100%",
              }}
            >
              {barHeights.map((height, index) => (
                <div
                  key={index}
                  style={{
                    ...outerBarStyle,
                    height: `${height}px`, // Outer bar's total height
                  }}
                >
                  <div
                    style={{
                      ...innerBarStyle,
                      height: `${height * 0.6}px`, 
                      // ^ Adjust the multiplier (0.6) to control how much
                      // of the outer bar is filled by the bright inner bar
                    }}
                  />
                </div>
              ))}
            </div>

            {/* The thin bright-blue streak beneath the bars */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: "100%",
                height: "1px",
                background:
                  "linear-gradient(to right, transparent, #1263c7, transparent)",
              }}
            />
          </div>

          {/* Bottom text area */}
          <div style={{ padding: "24px", textAlign: "left" }}>
            <h4
              style={{
                fontSize: "20px",
                marginBottom: "8px",
                color: "white",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Related Hadiths
            </h4>
            <p
              style={{
                fontSize: "16px",
                marginBottom: "0",
                opacity: 0.8,
                color: "white",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Discover Similar Narrations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
