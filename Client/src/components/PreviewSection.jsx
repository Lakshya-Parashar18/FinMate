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
        <motion.div 
          className="preview-text"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
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
        </motion.div>

        <motion.div 
          className="preview-mockup-container"
          initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
          whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, type: 'spring' }}
        >
          <div className="mockup-window">
            <div className="window-header">
              <div className="window-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="window-address">finmate.app/dashboard</div>
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
        </motion.div>
      </div>
    </section>
  );
};

export default PreviewSection;
