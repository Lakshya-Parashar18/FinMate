import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUsers, FaLightbulb, FaShieldAlt, FaRocket } from 'react-icons/fa';
import CustomCursor from '../components/CustomCursor';
import Footer from '../components/Footer';
import './AboutPage.css';

const AboutPage = () => {
  return (
    <div className="about-page">
      <CustomCursor />
      <div className="about-hero">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Our Mission: <span className="text-gradient">Financial Freedom</span> for Everyone
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          FinMate was born out of a simple observation: personal finance is complex, and tracking money shouldn't be a chore.
        </motion.p>
      </div>

      <div className="about-grid">
        <motion.div className="about-card glass" whileHover={{ y: -10 }}>
          <FaUsers className="about-icon" />
          <h3>Who We Are</h3>
          <p>A team of engineers and finance enthusiasts dedicated to solving complex budgeting problems for modern individuals and teams.</p>
        </motion.div>

        <motion.div className="about-card glass" whileHover={{ y: -10 }}>
          <FaLightbulb className="about-icon" />
          <h3>Why FinMate?</h3>
          <p>We combine cutting-edge AI insights with a dead-simple interface, turning boring data into actionable savings strategies.</p>
        </motion.div>

        <motion.div className="about-card glass" whileHover={{ y: -10 }}>
          <FaShieldAlt className="about-icon" />
          <h3>Our Values</h3>
          <p>Transparency, security, and user empowerment. We never sell your data; we only help you grow your savings.</p>
        </motion.div>

        <motion.div className="about-card glass" whileHover={{ y: -10 }}>
          <FaRocket className="about-icon" />
          <h3>The Vision</h3>
          <p>To become the global standard for personal financial health, empowering everyone to build lasting financial independence.</p>
        </motion.div>
      </div>

      <div className="about-story glass">
        <h2>The FinMate Story</h2>
        <p>
          It started in a hostel room with a pile of receipts and a sense of "where did my money go?". 
          Traditional apps were too complex or too clinical. We wanted something that felt like a friend—a mate—who 
          watches your back. That’s why we call it FinMate.
        </p>
      </div>

      <Footer />
    </div>
  );
};

export default AboutPage;
