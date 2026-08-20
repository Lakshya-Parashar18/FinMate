import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaArrowRight } from 'react-icons/fa';
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import HeroSection from "../components/HeroSection";
import CustomCursor from "../components/CustomCursor";
import CustomGoogleButton from "../components/CustomGoogleButton";
import FeaturesSection from "../components/FeaturesSection";
import PreviewSection from "../components/PreviewSection";
import FloatingDemo from "../components/FloatingDemo";
import TestimonialsSection from "../components/TestimonialsSection";
import Footer from "../components/Footer";
import "./LandingPage.css";

export default function LandingPage() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [error, setError] = useState('');
  const [showDeletedMessage, setShowDeletedMessage] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  // Hide scrollbar completely on landing page & enforce dark mode
  useEffect(() => {
    document.documentElement.classList.add('hide-landing-scrollbar');
    document.body.classList.add('hide-landing-scrollbar');
    document.documentElement.setAttribute('data-theme', 'dark');
    return () => {
      document.documentElement.classList.remove('hide-landing-scrollbar');
      document.body.classList.remove('hide-landing-scrollbar');
    };
  }, []);

  // Handle scrolling to URL hash sections on load (e.g. from footer links on other pages)
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          window.lenis?.scrollTo(element, { offset: 60, duration: 1.2 });
        }, 150);
      }
    }
  }, []);

  // Lock background scroll when Interactive Demo modal is open
  useEffect(() => {
    if (isDemoOpen) {
      window.lenis?.stop();
      document.body.style.overflow = 'hidden';
    } else {
      window.lenis?.start();
      document.body.style.overflow = '';
    }

    return () => {
      window.lenis?.start();
      document.body.style.overflow = '';
    };
  }, [isDemoOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const hero = document.querySelector(".hero-section");
      if (hero) {
        const rect = hero.getBoundingClientRect();
        // If the top of the hero has moved up 20px, we've scrolled
        setIsScrolled(rect.top < -20);
      }
    };

    window.addEventListener("scroll", handleScroll, true); // Use capture to catch events bubbling from containers
    // Initial check
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  // Auto-dismiss error banner after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (location.state?.accountDeleted) {
      setShowDeletedMessage(true);
      window.history.replaceState({}, document.title);
      setTimeout(() => {
        setShowDeletedMessage(false);
      }, 5000);
    }
  }, [location]);

  const responseGoogle = async (googleResponse) => {
    setError('');
    if (!googleResponse.credential) {
      setError('Google login failed: No credential received.');
      return;
    }
    const idToken = googleResponse.credential;

    try {
      const response = await axios.post(`${API_URL}/auth/google`, 
        { token: idToken },
        { withCredentials: true }
      );
      
      login(response.data.user, response.data.token); 
      
      navigate("/dashboard", { replace: true });

    } catch (err) {
      console.error('Error authenticating user:', err);
      setError(err.response?.data?.message || "Google Authentication failed. Please try again.");
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
    }
  };

  return (
    <div className="landing-page">
      <CustomCursor />
      <div className="overlay" />
      <HeroSection />

      {error && (
        <div className="landing-error-toast">
          <span>{error}</span>
          <button className="toast-close-btn" onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {showDeletedMessage && (
        <div className="delete-success-message">
          Your account has been successfully deleted
        </div>
      )}
      <header className={`navbar glass ${isScrolled ? "scrolling-navbar" : "hidden-navbar"}`}>
        <div className="logo-container">
          <img src="/logo.png" alt="FinMate Logo" className="logo-icon" />
          <div className="logo-text">
            <div className="brand-name">FinMate</div>
            <div className="slogan">Let the SAVINGS Begin!!</div>
          </div>
        </div>

        <div className="nav-group">
          <Link to="/signup" className="get-started-button">
            Get Started <FaArrowRight className="cta-arrow" />
          </Link>
          <CustomGoogleButton
            onSuccess={responseGoogle}
            onError={() => setError('Google login failed. Please try again.')}
            text="Sign in with Google"
            variant="filled_blue"
          />
        </div>
      </header>

      <main className="landing-main-content glass">
        <h1>Stop Guessing Your Spending. Start Controlling It.</h1>
        <p>Your intelligent expense companion built for smart money management.</p>
        
        <div className="auth-boxes">
          <div className="landing-action-card landing-signup-card">
            <h3>New to <span className="brand-gradient-emerald">FinMate?</span></h3>
            <p>Create an account and start mastering your personal finances today.</p>
            <Link to="/signup" className="landing-action-btn emerald-btn">
              <span>Sign Up</span>
              <FaArrowRight className="btn-arrow" />
            </Link>
          </div>
          
          <div className="landing-action-card landing-login-card">
            <h3>Already a <span className="brand-gradient-indigo">Member?</span></h3>
            <p>Welcome back! Sign in to access your financial dashboard & AI insights.</p>
            <Link to="/login" className="landing-action-btn indigo-btn">
              <span>Login</span>
              <FaArrowRight className="btn-arrow" />
            </Link>
          </div>
        </div>
      </main>

      <div id="features"><FeaturesSection /></div>
      <div id="demo"><PreviewSection onLaunchDemo={() => setIsDemoOpen(true)} /></div>
      <div id="testimonials"><TestimonialsSection /></div>
      <Footer />
      
      <FloatingDemo 
        isOpen={isDemoOpen} 
        onClose={() => setIsDemoOpen(false)} 
      />
    </div>
  );
}
