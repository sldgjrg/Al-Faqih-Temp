import React from "react";
import Rays from "./components/rays";
import Hero from "./components/Hero";
import Intro from "./components/Intro";
import Features from "./components/Features";
import Footer from "./components/Footer";

export default function HomePage() {
  // Return both components in a single return
  return (
    <>
      <Hero />
      <Rays />
      <Intro />
      <Features />
      <Footer />
    </>
  );
}
