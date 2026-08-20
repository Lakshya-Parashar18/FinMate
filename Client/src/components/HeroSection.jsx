import React, { useState, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import AnimatedBackground from "./AnimatedBackground";
import "./HeroSection.css";

const originalChars = "FinMate".split("");
const japaneseChars = ["フ", "ィ", "ン", "メ", "イ", "ト", "ー"];

export default function HeroSection() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      // Calculate cursor position from center (-1 to 1) and scale to degrees tilt
      const x = ((e.clientX - innerWidth / 2) / (innerWidth / 2)) * 12;
      const y = ((e.clientY - innerHeight / 2) / (innerHeight / 2)) * -12;
      setTilt({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="hero-section">
      <AnimatedBackground />
      <div className="hero-center-anchor">
        <div
          className="static-hero-container"
          style={{
            transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
            transition: "transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)",
            transformStyle: "preserve-3d"
          }}
        >
          <div className="hero-text brand-name">
            {originalChars.map((char, i) => (
              <div
                key={i}
                className="char-cube"
              >
                <span className="char-en">{char}</span>
                <span className="char-jp">{japaneseChars[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="scroll-indicator">
        <span className="scroll-label">Scroll to explore</span>
        <div className="scroll-chevrons">
          <span className="chevron-arrow" />
          <span className="chevron-arrow" />
          <span className="chevron-arrow" />
        </div>
      </div>
    </div>
  );
}
