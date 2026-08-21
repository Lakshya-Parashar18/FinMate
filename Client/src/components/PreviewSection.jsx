import React from 'react';
import { motion } from 'framer-motion';
import { FaPlay, FaRocket, FaMousePointer } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PreviewSection.css';

const PreviewSection = ({ onLaunchDemo }) => {
  const navigate = useNavigate();

  return (
    <section className="preview-section">
      <div className="preview-content">
        <div className="preview-text">
          <div className="demo-tag">LIVE PREVIEW</div>
          <h2>Experience the <span className="text-gradient">Power</span> in Real-Time</h2>
          <p>
            Don't just take our word for it. Dive into the FinMate ecosystem right now 
            with our interactive demo. No sign-up required, no strings attached.
          </p>
          
          <div className="preview-actions">
            <button 
              className="demo-launch-btn"
              onClick={onLaunchDemo}
            >
              Try Free Demo <FaPlay className="btn-icon" />
            </button>
            <div className="demo-hint">
              <FaMousePointer /> Instant access, 0s setup
            </div>
          </div>
        </div>

        <div className="preview-mockup-container">
          <div className="mockup-window">
            <div className="window-header">
              <div className="windows-tab-info">
                <img src="/logo.png" className="tab-logo-icon" alt="Logo" />
                <span>FinMate - Dashboard</span>
              </div>
              <div className="window-address">finmate.app/dashboard</div>
              <div className="windows-controls">
                <div className="win-btn win-min">
                  <span className="win-icon-min" />
                </div>
                <div className="win-btn win-max">
                  <span className="win-icon-max" />
                </div>
                <div className="win-btn win-close">
                  <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</span>
                </div>
              </div>
            </div>
            <div className="mockup-image-wrapper">
              <img 
                src="/real_dashboard.png" 
                alt="FinMate Live Dashboard" 
                className="mockup-img"
              />
              <div className="mockup-overlay-glow" />
            </div>
          </div>
          
          {/* Floating Feature Tags */}
          <motion.div 
            className="floating-tag t1"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <FaRocket /> AI Insights Active
          </motion.div>
          <motion.div 
            className="floating-tag t2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            💰 Real-time Budgeting
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PreviewSection;
