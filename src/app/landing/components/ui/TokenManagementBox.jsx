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

function CircleIconBox({ src, size = 48, style = {} }) {
  const baseStyle = {
    position: "absolute",
    width: size,
    height: size,
    borderRadius: "50%",
    border: "1px solid #1263c7",
    background: "#000b1f",
    boxShadow: "0 0 8px rgba(0,98,199,0.5)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={{ ...baseStyle, ...style }}>
      <img
        src={src}
        alt="Circle Icon"
        style={{
          width: "70%",
          height: "70%",
          objectFit: "contain",
          objectPosition: "center",
        }}
      />
    </div>
  );
}

function CircleWithIcons({
  radius = 200,
  borderStyle = "solid",
  animationDuration = 30,
  bottomOffset = -100,
  iconPositions = [],
  borderColor = "#0050aa",
  boxShadowColor = "rgba(0,111,255,0.2)",
  glow = false, // New prop for glowing effect
}) {
  const containerStyle = {
    position: "absolute",
    zIndex: 1,
    bottom: `${bottomOffset}px`,
    left: "50%",
    width: `${radius * 2}px`,
    height: `${radius * 2}px`,
    transform: `translateX(-50%)`,
    animation: `rotateArc ${animationDuration}s linear infinite`,
  };

  const ringStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    border: `1px ${borderStyle} ${borderColor}`,
    boxShadow: glow
      ? `0 0 20px 10px ${borderColor}`
      : `0 0 5px ${boxShadowColor}`,
  };

  return (
    <div style={containerStyle}>
      <div style={ringStyle} />
      {iconPositions.map((icon, i) => {
        const angleDeg = icon.angle;
        const angleRad = (angleDeg * Math.PI) / 180;
        const iconX = radius + radius * Math.cos(angleRad);
        const iconY = radius + radius * Math.sin(angleRad);

        return (
          <CircleIconBox
            key={`icon-${i}`}
            src={icon.src}
            style={{
              left: iconX - 24,
              top: iconY - 24,
            }}
          />
        );
      })}
    </div>
  );
}

export default function TokenManagementBox() {
  const containerStyle = {
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

  const circle1Icons = [
    { angle: 15, src: "https://framerusercontent.com/images/EfmkDu7P6lMdmMQJxczvP8CKLI.png" },
    { angle: 120, src: "https://framerusercontent.com/images/z54MSDQ03t3nm6RQmBVDgJY7y7k.png" },
  ];
  const circle2Icons = [
    { angle: 0, src: "https://framerusercontent.com/images/8qlFDXNkckY7588JXNIrHilsfQ.png" },
    { angle: 180, src: "https://framerusercontent.com/images/nJirYKMdmrShhQuHMHU33tSE1o.png" },
  ];
  const circle3Icons = [
    { angle: 45, src: "https://framerusercontent.com/images/vBmUMRGpGmjAeaj6ez9FNwF46I.png" },
  ];

  return (
    <div style={containerStyle}>
      <div style={topStreakStyle} />
      <div style={bottomStreakStyle} />
      <div style={innerRectStyle}>
        <CircleWithIcons
          radius={275}
          borderStyle="solid"
          animationDuration={50}
          bottomOffset={-220}
          iconPositions={circle1Icons}
          borderColor="#0050aa"
        />
        <CircleWithIcons
          radius={200}
          borderStyle="dashed"
          animationDuration={40}
          bottomOffset={-160}
          iconPositions={circle2Icons}
          borderColor="#0050aa"
        />
        <CircleWithIcons
          radius={125}
          borderStyle="dashed"
          animationDuration={30}
          bottomOffset={-100}
          iconPositions={circle3Icons}
          borderColor="#0050aa"
        />
        {/* Innermost circle with glow */}
        <CircleWithIcons
          radius={50}
          borderStyle="dashed"
          animationDuration={20}
          bottomOffset={-40}
          iconPositions={[]}
          borderColor="#006fff"
          glow={true}
        />
        <div style={{ position: "absolute", bottom: "16px", left: "16px", zIndex: 3 }}>
          <h4
            style={{
              fontSize: "20px",
              marginBottom: "4px",
              color: "white",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Multilingual Access
          </h4>
          <p
            style={{
              fontSize: "16px",
              opacity: 0.8,
              color: "white",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Translations in Multiple Languages
          </p>
        </div>
      </div>
      {/* Blue streak positioned absolutely within the container */}
      <div
        style={{
          position: "absolute",
          bottom: "-8px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "300px",
          height: "1px",
          background: "linear-gradient(to right, transparent, #006fff, transparent)",
          zIndex: 2,
        }}
      />
    </div>
  );
}
