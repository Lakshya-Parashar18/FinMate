import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaGithub, FaLinkedin, FaInstagram,
  FaEnvelope, FaMapMarkerAlt, FaPhoneAlt, FaArrowRight, FaCheckCircle
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './Footer.css';

/** Match `index.css` → `[id] { scroll-margin-top: 100px }` for section anchors */
const NAV_SCROLL_MARGIN = 100;
const SCROLL_DURATION_MS = 1150;

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function getScrollParent(el) {
  let p = el.parentElement;
  while (p) {
    const { overflowY } = getComputedStyle(p);
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      p.scrollHeight > p.clientHeight + 1
    ) {
      return p;
    }
    p = p.parentElement;
  }
  return null;
}

const Footer = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const scrollAnimRef = useRef(null);

  const cancelScrollAnim = () => {
    if (scrollAnimRef.current != null) {
      cancelAnimationFrame(scrollAnimRef.current);
      scrollAnimRef.current = null;
    }
  };

  const animateScroll = (start, end, duration, apply) => {
    cancelScrollAnim();
    const dist = end - start;
    if (Math.abs(dist) < 1) {
      apply(end);
      return;
    }
    let t0 = null;
    const step = (ts) => {
      if (t0 === null) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const eased = easeInOutCubic(p);
      apply(start + dist * eased);
      if (p < 1) {
        scrollAnimRef.current = requestAnimationFrame(step);
      } else {
        scrollAnimRef.current = null;
      }
    };
    scrollAnimRef.current = requestAnimationFrame(step);
  };

  const scrollWindowTo = (targetY) => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const end = Math.max(0, Math.min(targetY, max));
    const start = window.scrollY;
    animateScroll(start, end, SCROLL_DURATION_MS, (y) => {
      window.scrollTo(0, Math.round(y));
    });
  };

  const scrollElementTo = (parent, targetTop) => {
    const max = Math.max(0, parent.scrollHeight - parent.clientHeight);
    const end = Math.max(0, Math.min(targetTop, max));
    const start = parent.scrollTop;
    animateScroll(start, end, SCROLL_DURATION_MS, (y) => {
      parent.scrollTop = Math.round(y);
    });
  };

  const scrollToElementSmooth = (el) => {
    const parent = getScrollParent(el);
    const rect = el.getBoundingClientRect();

    if (!parent) {
      const targetY = window.scrollY + rect.top - NAV_SCROLL_MARGIN;
      scrollWindowTo(targetY);
      return;
    }

    const prect = parent.getBoundingClientRect();
    const relativeTop = rect.top - prect.top + parent.scrollTop;
    const targetTop = relativeTop - NAV_SCROLL_MARGIN;
    scrollElementTo(parent, targetTop);
  };

  useEffect(() => () => cancelScrollAnim(), []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const res = await axios.post(`${API_URL}/subscribers`, { email });
      setStatus({ type: 'success', message: res.data.message });
      setEmail('');
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.response?.data?.message || 'Subscription failed. Try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToTop = (e) => {
    if (e) e.preventDefault();
    scrollWindowTo(0);
  };

  const handleInternalLink = (id, e) => {
    if (e) e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      scrollToElementSmooth(element);
      if (window.history?.replaceState) {
        window.history.replaceState(null, '', `#${id}`);
      }
    } else {
      window.location.href = `/#${id}`;
    }
  };

  return (
    <footer className="footer-root">
      <div className="footer-content" id="footer">
        {/* Brand Column */}
        <div className="footer-column brand-col">
          <div className="footer-logo" onClick={scrollToTop} style={{ cursor: 'pointer' }}>
            <img src="/logo.png" alt="FinMate Logo" />
            <span>FinMate</span>
          </div>
          <p className="brand-desc">
            Empowering students to take control of their financial future through
            intelligent tracking and AI-driven insights.
          </p>
          <div className="social-links">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer"><FaGithub /></a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><FaLinkedin /></a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><FaXTwitter /></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-column">
          <h4>Platform</h4>
          <ul>
            <li><a href="#features" onClick={(e) => handleInternalLink('features', e)}>Features</a></li>
            <li><a href="#demo" onClick={(e) => handleInternalLink('demo', e)}>Interactive Demo</a></li>
            <li><a href="#testimonials" onClick={(e) => handleInternalLink('testimonials', e)}>Wall of Trust</a></li>
            <li><Link to="/signup">Get Started</Link></li>
          </ul>
        </div>

        {/* Support/Company */}
        <div className="footer-column">
          <h4>Company</h4>
          <ul>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact Support</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
          </ul>
        </div>

        {/* Newsletter / Contact */}
        <div className="footer-column newsletter-col" id="newsletter">
          <div className="newsletter-card">
            <h4>Join the Future</h4>
            <p>Get the latest financial tips and feature updates.</p>

            <form className="footer-newsletter" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
              <button type="submit" disabled={loading}>
                {loading ? <div className="btn-spinner" /> : <FaArrowRight />}
              </button>
            </form>

            <AnimatePresence>
              {status.message && (
                <motion.div
                  className={`subscribe-status ${status.type}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {status.type === 'success' && <FaCheckCircle />} {status.message}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="contact-mini">
              <span>
                <FaEnvelope /> 
                <a 
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=finmate.support01@gmail.com&su=Support%20Inquiry%3A%20FinMate" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="email-link"
                >
                  finmate.support01@gmail.com
                </a>
              </span>
              <span><FaMapMarkerAlt /> Global Student Community</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="copyright">
          © {new Date().getFullYear()} FinMate. Created with ❤️ for Students.
        </div>
        <div className="footer-theme-tag"> DARK MODE ACTIVE </div>
      </div>
    </footer>
  );
};

export default Footer;
