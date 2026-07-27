"use client";

import React from "react";
import "tailwindcss/tailwind.css";
// archaic: import { DM_Sans } from "next/font/google";
import IntegrationBox from "./ui/IntegrationBox";
import TrackingBox from "./ui/TrackingBox";
import TokenManagementBox from "./ui/TokenManagementBox";
import AnalyticsBox from "./ui/AnalyticsBox";
import FeatureBox from "./ui/FeatureBox";

// Import the new AI Automation box and SecurityBox
import AIAutomationBox from "./ui/AIAutomationBox";
import SecurityBox from "./ui/SecurityBox";

// archaic: const dmSans = DM_Sans({
// archaic:   subsets: ["latin"],
// archaic:   weight: "600",
// archaic:   variable: "--font-dm-sans",
// archaic: });
const dmSans = { variable: "font-local-hubot" };

export default function Features() {
  return (
    <section
      className={`w-full bg-black text-white py-16 px-4 ${dmSans.variable}`}
      style={{
        paddingTop: "14rem",
        fontSize: "24px",
        boxSizing: "border-box",
        WebkitFontSmoothing: "antialiased",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Global keyframes */}
      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes rotateArc {
          0% {
            transform: translateX(-50%) rotate(0deg);
          }
          100% {
            transform: translateX(-50%) rotate(360deg);
          }
        }
      `}</style>

      <div className="mx-auto" style={{ maxWidth: "1400px", width: "100%" }}>
        <div className="flex flex-col items-center">
          {/* Features Pill */}
          <div className="mb-20 relative inline-block">
            <div
              style={{
                position: "relative",
                zIndex: 10,
                background: "linear-gradient(to bottom, #1a1a1a, #000000)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "9999px",
                overflow: "hidden",
                boxShadow: "inset 0 0 9px 0 rgba(255,255,255,0.1)",
                padding: "0.8rem 1.4rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-dm-sans)",
              }}
            >
              <p className="text-xl leading-none">Features</p>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "1px",
                  background:
                    "linear-gradient(to right, transparent 25%, #ffffff 50%, transparent 75%)",
                  pointerEvents: "none",
                  opacity: 1,
                }}
              />
            </div>
          </div>

          {/* Main Heading */}
          <h2
            className="text-4xl sm:text-5xl md:text-[5.75rem] mb-4 text-center leading-tight"
            style={{
              backgroundImage:
                "linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.55) 100%)",
              WebkitBackgroundClip: "text",
              color: "transparent",
              lineHeight: "1.2",
              fontFamily: "var(--font-dm-sans)",
              fontVariationSettings: '"wght" 450',
            }}
          >
            Fully Packed with <br />
            Amazing Features
          </h2>

          {/* Feature Boxes */}
          <div className="w-full mt-16">
            {/* Row 1: Integrations (spanning 2 cols) & Tracking */}
            <div
              className="grid gap-8 grid-cols-1 md:grid-cols-3 w-full"
              style={{ alignItems: "start" }}
            >

              <div className="md:col-span-2">
                <IntegrationBox />
              </div>
              <TrackingBox />
            </div>

            {/* Row 2: Token Management & Analytics */}
            <div className="grid gap-8 mt-8 grid-cols-1 md:grid-cols-2 w-full">
              <TokenManagementBox />
              <AnalyticsBox />
            </div>

            {/* Row 3: AI Automation and the wider Security Box */}
            <div className="grid gap-8 mt-8 grid-cols-1 md:grid-cols-2 w-full">
              <AIAutomationBox />
              <SecurityBox />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
