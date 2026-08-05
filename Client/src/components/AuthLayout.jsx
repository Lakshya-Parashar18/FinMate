import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BarChart3, ShieldCheck, PieChart } from 'lucide-react';
import DashboardPreview from './DashboardPreview';
import AnimatedBackground from './AnimatedBackground';
import '../Pages/Login.css';

export default function AuthLayout({ children, activeTab = 'login' }) {
  const location = useLocation();

  return (
    <div className="auth-page-root">

      {/* Premium Ambient Background with Framer Motion Drifting Blobs & Mouse Parallax */}
      <AnimatedBackground />

      {/* Main Container */}
      <div className="auth-container">
        <div className="auth-split-grid">

          {/* LEFT SIDE: Branding, Visual Preview & Value Props */}
          <div className="auth-left-brand">

            {/* Top Brand Header */}
            <div className="auth-brand-header">

              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link to="/" className="auth-brand-logo">
                  <div className="auth-logo-icon">
                    <div className="auth-logo-icon-inner">
                      <img src="/logo.png" alt="FinMate Logo" className="auth-logo-img" />
                    </div>
                  </div>
                  <div className="auth-brand-title-group">
                    <span className="auth-brand-title">FinMate</span>
                    <span className="auth-brand-sub">Finance, Simplified.</span>
                  </div>
                </Link>
              </motion.div>

              {/* Tagline Pill */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="auth-tagline-pill"
              >
                <span className="auth-ping-dot" />
                Track · Save · Grow
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="auth-headline"
              >
                <span className="auth-gradient-text">
                  Understand Every Rupee
                </span>
              </motion.h1>

              {/* Subtitle description */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="auth-description"
              >
                Your AI-powered personal finance companion that helps you understand spending, build better habits and reach your financial goals.
              </motion.p>
            </div>

            {/* Authentic Live Product Showcase Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <DashboardPreview />
            </motion.div>

            {/* Feature List with Staggered Entrance */}
            <div className="auth-features-grid">
              {[
                { icon: Sparkles, title: "AI Insights", desc: "Realtime spending intelligence" },
                { icon: BarChart3, title: "Expense Flow", desc: "Interactive cashflow curves" },
                { icon: ShieldCheck, title: "Bank Security", desc: "Encrypted & private" },
                { icon: PieChart, title: "Budget Goals", desc: "Automated progress tracking" },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="auth-feature-item"
                >
                  <div className="auth-feature-icon">
                    <item.icon size={16} />
                  </div>
                  <div>
                    <div className="auth-feature-title">{item.title}</div>
                    <div className="auth-feature-desc">{item.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>

          {/* RIGHT SIDE: Auth Card with Smooth Page Transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -20, y: -10 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '100%' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
