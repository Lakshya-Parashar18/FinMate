import React from "react";
import { FaChevronDown } from "react-icons/fa";
import "./HeroSection.css";

const originalChars = "FinMate".split("");
const japaneseChars = ["フ", "ィ", "ン", "メ", "イ", "ト", "ー"];

export default function HeroSection() {
  return (
    <div className="hero-section">
      <div className="static-hero-container">
        <div className="hero-text brand-name hero-gradient">
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
      <div className="scroll-indicator">
        <FaChevronDown className="arrow-down" />
        <p>Scroll down</p>
      </div>
    </div>
  );
}
