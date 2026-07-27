"use client";

import React from "react";

// Reusable Ray component that handles the entry animation for both transform and opacity.
function Ray({
  initialTransform,
  finalTransform,
  style,
  animationDelay,
  finalOpacity = 1,
  initialOpacity = 0.1,
  ...rest
}) {
  const [loaded, setLoaded] = React.useState(false);
  const initialDuration = 2; // seconds for the initial transition

  // Generate random values once per ray to randomize the fluctuation animation.
  const randomDuration = React.useMemo(() => {
    // Random duration between 2.5s and 4s
    return (Math.random() * (4 - 2.5) + 2.5).toFixed(2) + "s";
  }, []);

  const randomDelayOffset = React.useMemo(() => {
    // Random additional delay between 0s and 1s
    return (Math.random() * 1).toFixed(2) + "s";
  }, []);

  React.useEffect(() => {
    const timeout = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  // Convert the provided animationDelay string (like "0.3s") to a number.
  const delayFloat = parseFloat(animationDelay) || 0;
  // Each ray's fluctuation animation starts after the initial animation plus its own delay.
  const baseFluctuationDelay = `${initialDuration + delayFloat}s`;
  // Then add a random extra offset to further desynchronize.
  const finalAnimationDelay = `calc(${baseFluctuationDelay} + ${randomDelayOffset})`;

  return (
    <div
      style={{
        ...style,
        transition: `transform ${initialDuration}s ease-out, opacity ${initialDuration}s ease-out`,
        transitionDelay: animationDelay || "0s",
        transform: loaded ? finalTransform : initialTransform,
        opacity: loaded ? finalOpacity : initialOpacity,
        "--start-opacity": finalOpacity, // custom property for keyframes
        ...(loaded && {
          animation: `fluctuateOpacity ${randomDuration} infinite`,
          animationDelay: finalAnimationDelay,
        }),
      }}
      {...rest}
    />
  );
}

// Outer container styles.
const outerDivStyle = {
  minHeight: "100vh",
  width: "100vw",
  margin: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  backgroundColor: "rgb(0, 0, 0)",
  overflowX: "hidden",
};

// Background container styles.
const bgStyle = {
  alignContent: "center",
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  height: "180vh",
  justifyContent: "center",
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  overflow: "hidden",
  pointerEvents: "none",
  zIndex: 0,
};

// Container for the rays.
const raysStyle = {
  position: "relative",
  width: "100%",
  height: "100%",
  maxWidth: "1366px",
  overflow: "visible",
};

// Base ray style for constant properties.
const baseRayStyle = {
  WebkitMask:
    "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.86) 10.53%, rgba(0,0,0,0.85) 33.76%, rgb(0,0,0) 50.45%, rgba(0,0,0,0.7) 79.16%, rgba(0,0,0,0.07) 100%) add",
  background:
    "linear-gradient(180deg, rgb(0,111,255) 55.13%, rgba(0,36,120,0) 100%)",
  mixBlendMode: "screen",
  overflow: "hidden",
  position: "absolute",
  willChange: "transform",
};

// Array of ray definitions.
const rays = [
  {
    key: "ray10",
    style: {
      ...baseRayStyle,
      height: "847px",
      width: "223px",
      top: "-470px",
      left: "calc(62.225% - 111.5px)",
    },
    finalTransform: "perspective(500px) scale(1.04395) rotateX(49deg) skewX(23deg)",
    initialTransform: "perspective(500px) scale(0.8) rotateX(49deg) skewX(0deg)",
    animationDelay: "0s",
  },
  {
    key: "ray16",
    style: {
      ...baseRayStyle,
      height: "881px",
      width: "122px",
      top: "-470px",
      left: "calc(56.076% - 61px)",
      WebkitMask:
        "linear-gradient(90deg, rgba(0,0,0,0) 3.72%, rgba(0,0,0,0.64) 17.05%, rgba(0,0,0,0.85) 33.21%, rgb(0,0,0) 50.45%, rgba(0,0,0,0.7) 70.11%, rgba(0,0,0,0.07) 91.15%) add",
    },
    finalTransform: "perspective(500px) scale(1.09098) rotateX(49deg) skewX(15deg)",
    initialTransform: "perspective(500px) scale(0.8) rotateX(49deg) skewX(0deg)",
    animationDelay: "0.3s",
  },
  {
    key: "ray1d",
    style: {
      ...baseRayStyle,
      height: "667px",
      width: "84px",
      top: "-391px",
      left: "calc(59.59% - 42px)",
      WebkitMask:
        "linear-gradient(90deg, rgba(0,0,0,0) 3.72%, rgba(0,0,0,0.64) 17.05%, rgba(0,0,0,0.85) 33.21%, rgb(0,0,0) 50.45%, rgba(0,0,0,0.7) 70.11%, rgba(0,0,0,0.07) 91.15%) add",
    },
    finalTransform: "perspective(500px) scale(1.06837) rotateX(49deg) skewX(23deg)",
    initialTransform: "perspective(500px) scale(0.8) rotateX(49deg) skewX(0deg)",
    animationDelay: "0.6s",
  },
  {
    key: "ray8",
    style: {
      ...baseRayStyle,
      height: "951px",
      width: "84px",
      top: "-470px",
      left: "calc(51.977% - 42px)",
      WebkitMask:
        "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.53) 13.98%, rgb(0,0,0) 19.67%, rgb(0,0,0) 32.17%, rgba(0,0,0,0.55) 54.05%, rgba(0,0,0,0.93) 74.32%, rgba(0,0,0,0.7) 79.16%, rgba(0,0,0,0.07) 99.05%) add",
    },
    finalTransform: "perspective(500px) scale(1.09098) rotateX(49deg) skewX(8deg)",
    initialTransform: "perspective(500px) scale(0.8) rotateX(49deg) skewX(0deg)",
    animationDelay: "0.2s",
  },
  {
    key: "ray19",
    style: {
      ...baseRayStyle,
      height: "752px",
      width: "29px",
      top: "-448px",
      left: "calc(47.511% - 14.5px)",
    },
    finalTransform: "perspective(500px) scale(1.0717) rotateX(70deg)",
    initialTransform: "perspective(500px) scale(0.8) rotateX(70deg)",
    animationDelay: "0.7s",
  },
  {
    key: "ray2",
    style: {
      ...baseRayStyle,
      height: "968px",
      width: "179px",
      top: "-535px",
      left: "calc(50% - 89.5px)",
    },
    finalTransform: "perspective(500px) scale(1.00971) rotateX(39deg)",
    initialTransform: "perspective(500px) scale(0.8) rotateX(39deg)",
    animationDelay: "0.5s",
  },
  {
    key: "ray5",
    style: {
      ...baseRayStyle,
      height: "893px",
      width: "88px",
      top: "-461px",
      left: "calc(44.949% - 44px)",
      WebkitMask:
        "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 12.61%, rgba(0,0,0,0.85) 33.76%, rgba(0,0,0,0.53) 66.82%, rgba(0,0,0,0.4) 79.16%, rgba(0,0,0,0.07) 100%) add",
    },
    finalTransform: "perspective(500px) scale(1.04523) rotateX(49deg) skewX(-9deg)",
    initialTransform: "perspective(500px) scale(0.8) rotateX(49deg) skewX(0deg)",
    animationDelay: "0.1s",
  },
  {
    key: "rayCbldiq",
    style: {
      ...baseRayStyle,
      height: "645px",
      width: "88px",
      top: "-370px",
      left: "calc(42.679% - 44px)",
      WebkitMask:
        "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 12.61%, rgba(0,0,0,0.85) 33.76%, rgba(0,0,0,0.53) 66.82%, rgba(0,0,0,0.4) 79.16%, rgba(0,0,0,0.07) 100%) add",
    },
    finalTransform: "perspective(500px) scale(1.07338) rotateX(49deg) skewX(-15deg)",
    initialTransform: "perspective(500px) scale(0.8) rotateX(49deg) skewX(0deg)",
    animationDelay: "0.4s",
  },
  {
    key: "ray1g9z0ho",
    style: {
      ...baseRayStyle,
      height: "866px",
      width: "159px",
      top: "-464px",
      left: "calc(41.654% - 79.5px)",
      WebkitMask:
        "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.57) 6.03%, rgba(0,0,0,0.61) 23.83%, rgba(0,0,0,0.53) 53.53%, rgba(0,0,0,0.87) 74.6%, rgba(0,0,0,0.07) 100%) add",
    },
    finalTransform: "perspective(500px) scale(1.09104) rotateX(49deg) skewX(-17deg)",
    initialTransform: "perspective(500px) scale(0.8) rotateX(49deg) skewX(0deg)",
    animationDelay: "0.8s",
  },
  {
    key: "rayY26",
    style: {
      ...baseRayStyle,
      height: "592px",
      width: "71px",
      top: "-365px",
      left: "calc(37.335% - 35.5px)",
      WebkitMask:
        "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.57) 6.03%, rgba(0,0,0,0.61) 23.83%, rgba(0,0,0,0.53) 53.53%, rgba(0,0,0,0.87) 74.6%, rgba(0,0,0,0.07) 100%) add",
    },
    finalTransform: "perspective(500px) scale(1.01584) rotateX(49deg) skewX(-23deg)",
    initialTransform: "perspective(500px) scale(0.8) rotateX(49deg) skewX(0deg)",
    animationDelay: "0.9s",
  },
  {
    key: "ray6",
    style: {
      ...baseRayStyle,
      height: "825px",
      width: "260px",
      top: "-470px",
      left: "calc(36.823% - 130px)",
      WebkitMask:
        "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.57) 12.61%, rgba(0,0,0,0.85) 33.76%, rgba(0,0,0,0.53) 50.45%, rgba(0,0,0,0.87) 79.16%, rgba(0,0,0,0.07) 100%) add",
    },
    finalTransform: "perspective(500px) scale(1.00174) rotateX(49deg) skewX(-20deg)",
    initialTransform: "perspective(500px) scale(0.8) rotateX(49deg) skewX(0deg)",
    animationDelay: "0.15s",
  },
];

export default function Rays() {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) return null;

  const responsiveRaysStyle = { ...raysStyle };

  return (
    <>
      <style>{`
        @keyframes fluctuateOpacity {
          0% { opacity: var(--start-opacity); }
          50% { opacity: calc(var(--start-opacity) * 0.5); }
          100% { opacity: var(--start-opacity); }
        }
      `}</style>
      <div style={outerDivStyle}>
        <div style={bgStyle} data-framer-name="bg" name="bg">
          <div style={responsiveRaysStyle} data-framer-name="rays" name="rays">
            {rays.map((ray) => (
              <div key={ray.key} className="ssr-variant hidden-zahnp7">
                <Ray
                  initialTransform={ray.initialTransform}
                  finalTransform={ray.finalTransform}
                  style={ray.style}
                  animationDelay={ray.animationDelay}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
