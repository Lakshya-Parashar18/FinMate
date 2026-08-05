import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import FloatingDemo from "../components/FloatingDemo";
import "./Login.css";
import Lenis from 'lenis';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState(false);   // true = show 2FA input screen
  const [twoFACode, setTwoFACode] = useState("");      // 6-digit TOTP from user
  const [pendingCredentials, setPendingCredentials] = useState(null); // {email, password} saved for 2FA retry

  const navigate = useNavigate();
  const { login, demoLogin } = useAuth();

  // Initialize Lenis for smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 2.0,
      touchMultiplier: 2,
      infinite: false,
    });

    let frameId;
    function raf(time) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }

    frameId = requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const savedEmail = localStorage.getItem("finmate_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    setNeedsVerification(false);
    setResendStatus("");
    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      // Backend signals 2FA is required
      if (response.data?.requires2FA) {
        setPendingCredentials({ email, password });
        setTwoFAStep(true);
        setIsSubmitting(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem("finmate_remembered_email", email);
      } else {
        localStorage.removeItem("finmate_remembered_email");
      }

      login(response.data.user, response.data.token);
      window.location.replace("/dashboard");
    } catch (err) {
      const data = err.response?.data;
      if (data?.needsVerification) {
        setNeedsVerification(true);
        setError(data.message || "Email verification required before login.");
      } else {
        setError(data?.message || "Login failed. Please verify your credentials.");
      }
      localStorage.removeItem("token");
      localStorage.removeItem("userData");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !twoFACode.trim() || !pendingCredentials) return;
    setError("");
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: pendingCredentials.email,
        password: pendingCredentials.password,
        twoFAToken: twoFACode.trim(),
      });
      if (rememberMe) {
        localStorage.setItem("finmate_remembered_email", pendingCredentials.email);
      } else {
        localStorage.removeItem("finmate_remembered_email");
      }
      login(response.data.user, response.data.token);
      window.location.replace("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid 2FA code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError("");
      if (!credentialResponse.credential) {
        setError("Google authentication failed. No token received.");
        return;
      }
      const response = await axios.post(`${API_URL}/auth/google`, {
        token: credentialResponse.credential,
        credential: credentialResponse.credential
      }, { withCredentials: true });

      login(response.data.user, response.data.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.response?.data?.message || "Google login failed. Please try traditional login.");
    }
  };

  const handleResendVerification = async () => {
    setResendStatus("sending");
    try {
      await axios.post(`${API_URL}/auth/resend-verification`, { email });
      setResendStatus("sent");
    } catch (err) {
      setResendStatus("error");
    }
  };

  const handleDemoClick = () => {
    setIsDemoOpen(true);
  };

  return (
    <AuthLayout activeTab="login">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="auth-card"
      >
        <div className="auth-card-accent" />

        {/* ── 2FA Step Screen ── */}
        {twoFAStep ? (
          <form onSubmit={handle2FASubmit}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem', fontSize: 24,
              }}>🔐</div>
              <h2 className="auth-card-title" style={{ fontSize: '1.35rem' }}>Two-Factor Auth</h2>
              <p className="auth-card-sub">Open your Google Authenticator app and enter the 6-digit code for <strong>FinMate</strong>.</p>
            </div>

            {error && (
              <div style={{
                marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 10,
                background: 'rgba(159,18,57,0.35)', border: '1px solid rgba(244,63,94,0.4)',
                color: '#fda4af', fontSize: '0.85rem', textAlign: 'center',
              }}>{error}</div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={twoFACode}
                onChange={e => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
                style={{
                  width: '100%', textAlign: 'center', letterSpacing: '0.5rem',
                  fontSize: '1.6rem', fontWeight: 700, padding: '0.9rem',
                  borderRadius: 12, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace',
                }}
              />
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting || twoFACode.length < 6}
            >
              {isSubmitting ? <Loader2 className="spin-icon" size={18} /> : null}
              {isSubmitting ? 'Verifying…' : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              onClick={() => { setTwoFAStep(false); setTwoFACode(''); setPendingCredentials(null); setError(''); }}
              style={{
                display: 'block', width: '100%', marginTop: '0.75rem',
                background: 'none', border: 'none', color: '#64748b',
                fontSize: '0.83rem', cursor: 'pointer', textAlign: 'center',
              }}
            >
              ← Back to login
            </button>
          </form>
        ) : (
        <>

        {/* Card Header */}
        <div style={{ marginBottom: "1.25rem", textAlign: "left" }}>
          <h2 className="auth-card-title">Welcome Back</h2>
          <p className="auth-card-sub">
            Your finances are just one sign-in away.
          </p>
        </div>

        {/* Error / Alert Banner with Horizontal Shake */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: [-8, 8, -6, 6, 0] }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.45 }}
              style={{
                marginBottom: '1rem',
                padding: '0.85rem',
                borderRadius: '12px',
                background: needsVerification ? 'rgba(120, 53, 15, 0.4)' : 'rgba(159, 18, 57, 0.4)',
                border: needsVerification ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)',
                color: needsVerification ? '#fde68a' : '#fecdd3',
                fontSize: '0.8rem',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0, color: '#f43f5e' }} />
                <span style={{ leadingHeight: 1.4 }}>{error}</span>
              </div>

              {needsVerification && resendStatus !== "sent" && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendStatus === "sending"}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.25)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fef3c7',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  {resendStatus === "sending" ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Resend Verification Email
                    </>
                  )}
                </button>
              )}

              {resendStatus === "sent" && (
                <div style={{ marginTop: '0.4rem', color: '#34d399', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle size={14} />
                  Verification email sent! Check your inbox.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Login Form */}
        <form onSubmit={handleSubmit}>

          {/* Email / Username Field */}
          <div className="auth-input-group">
            <label className="auth-input-label">Email Address / Username</label>
            <div className="auth-input-wrapper">
              <Mail className="auth-input-icon" size={18} />
               <input
                type="text"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email or username"
                autoComplete="username"
                className="auth-input"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="auth-input-group">
            <div style={{ display: 'flex', itemsCenter: 'center', justifyContent: 'space-between' }}>
              <label className="auth-input-label">Password</label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="auth-link"
                style={{ fontSize: '0.75rem' }}
              >
                Forgot password?
              </button>
            </div>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="auth-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-toggle-btn"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={showPassword ? "hide" : "show"}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>
          </div>

          {/* Options Row: Remember Me with Custom Animated SVG Checkbox */}
          <div className="auth-checkbox-row">
            <label className="auth-checkbox-label">
              <div
                onClick={() => setRememberMe(!rememberMe)}
                className={`auth-custom-checkbox ${rememberMe ? 'checked' : ''}`}
              >
                {rememberMe && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="auth-checkbox-svg">
                    <motion.path
                      d="M20 6L9 17l-5-5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                    />
                  </svg>
                )}
              </div>
              <span className="auth-checkbox-text" onClick={() => setRememberMe(!rememberMe)}>
                Remember me on this browser
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="auth-submit-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} className="auth-btn-arrow" />
              </>
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">Or Continue With</span>
        </div>

        {/* Google OAuth & Demo Action Buttons */}
        <div>
          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google Sign In failed. Please try again.")}
              useOneTap
              theme="outline"
              shape="pill"
              text="continue_with"
            />
          </div>

          <button
            type="button"
            onClick={handleDemoClick}
            className="auth-demo-btn"
          >
            <Sparkles size={14} style={{ color: '#34d399' }} />
            <span>Try Demo Account (Instant Access)</span>
          </button>
        </div>

        {/* Card Footer Link */}
        <div className="auth-footer-text">
          Don't have an account?{" "}
          <Link to="/signup" className="auth-footer-link">
            Create one free <ArrowRight size={14} />
          </Link>
        </div>
        </>)}
      </motion.div>

      {/* Forgot Password Help Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForgotModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '20px',
                padding: '1.5rem',
                maxWidth: '420px',
                width: '100%',
                textAlign: 'left',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>Reset Password</h3>
                <button
                  onClick={() => setShowForgotModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '1rem', lineHeight: 1.6 }}>
                If you have forgotten your password, please contact support or use your registered email address to verify your account.
              </p>
              <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                <button
                  onClick={() => setShowForgotModal(false)}
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '10px', background: '#10b981', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Floating Demo Portal (Same as Landing Page) */}
      <FloatingDemo
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
      />
    </AuthLayout>
  );
}
