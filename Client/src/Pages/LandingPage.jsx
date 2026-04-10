import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { FaArrowRight } from 'react-icons/fa';
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import HeroSection from "../components/HeroSection";
import CustomCursor from "../components/CustomCursor";
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
          <div className="google-login-container">
            <GoogleLogin
              onSuccess={responseGoogle}
              onError={() => setError('Google login failed. Please try again.')}
              useOneTap
              theme="filled_blue"
              shape="pill"
              text="signin_with"
              size="large"
            />
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      </header>

      <main className="landing-main-content glass">
        <h1>Stop Guessing Your Spending. Start Controlling It.</h1>
        <p>Your intelligent expense companion built for student life.</p>
        
        <div className="auth-boxes">
          <div className="auth-box signup-box">
            <h2>New to FinMate?</h2>
            <p>Create an account and start managing your finances today.</p>
            <Link to="/signup" className="cta-button signup">Sign Up</Link>
          </div>
          
          <div className="auth-box login-box">
            <h2>Already a Member?</h2>
            <p>Welcome back! Sign in to continue your financial journey.</p>
            <Link to="/login" className="cta-button login">Login</Link>
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
