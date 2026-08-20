import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import CustomGoogleButton from "../components/CustomGoogleButton";
import axios from "axios";
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MailCheck,
  Sparkles,
  Shield,
  Zap
} from "lucide-react";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import FloatingDemo from "../components/FloatingDemo";
import TurnstileWidget from "../components/TurnstileWidget";
import "./Login.css";
import "./Signup.css";


const passwordRules = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "One number (0-9)", test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "One special character (!@#$...)", test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export default function Signup() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState(null);


  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  /* ── Username States ── */
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameMessage, setUsernameMessage] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  // Debounced live username availability check
  useEffect(() => {
    if (!username.trim()) {
      setUsernameAvailable(null);
      setUsernameMessage("");
      return;
    }

    const formatted = username.toLowerCase().replace(/\s+/g, '');
    if (formatted !== username) {
      setUsername(formatted);
      return;
    }

    if (!/^[a-z0-9_.]+$/.test(username)) {
      setUsernameAvailable(false);
      setUsernameMessage("Only letters, numbers, underscores, and periods allowed");
      return;
    }

    if (username.length < 3) {
      setUsernameAvailable(false);
      setUsernameMessage("Username must be at least 3 characters");
      return;
    }

    const checkTimer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const res = await axios.get(`${API_URL}/auth/check-username`, {
          params: { username }
        });
        if (res.data.available) {
          setUsernameAvailable(true);
          setUsernameMessage("Username is available");
        } else {
          setUsernameAvailable(false);
          setUsernameMessage("Username is already taken");
        }
      } catch (err) {
        setUsernameAvailable(false);
        setUsernameMessage(err.response?.data?.message || "Username is already taken");
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(checkTimer);
  }, [username]);

  // Username generator button handler
  const handleGenerateUsername = async () => {
    if (!name.trim()) {
      setError("Please enter your Full Name first to generate a username.");
      return;
    }

    setError("");
    setIsCheckingUsername(true);
    let base = name.trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (!base) base = 'user';

    let generated = base;
    let attempts = 0;
    let isAvailable = false;

    while (!isAvailable && attempts < 8) {
      if (attempts > 0) {
        const rand = Math.floor(10 + Math.random() * 900);
        generated = `${base}${rand}`;
      }

      try {
        const res = await axios.get(`${API_URL}/auth/check-username`, {
          params: { username: generated }
        });
        if (res.data.available) {
          isAvailable = true;
        }
      } catch {
        // Taken, try another suffix
      }
      attempts++;
    }

    setUsername(generated);
    setUsernameAvailable(true);
    setUsernameMessage("Unique username generated!");
    setIsCheckingUsername(false);
  };




  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    const passed = passwordRules.filter((r) => r.test(password)).length;
    if (passed <= 1) return { score: 1, label: "Weak", color: "#f43f5e" };
    if (passed <= 2) return { score: 2, label: "Fair", color: "#f97316" };
    if (passed <= 3) return { score: 3, label: "Good", color: "#eab308" };
    if (passed <= 4) return { score: 4, label: "Strong", color: "#3b82f6" };
    return { score: 5, label: "Excellent", color: "#10b981" };
  }, [password]);

  const allRulesPassed = useMemo(() => {
    return passwordRules.every((r) => r.test(password));
  }, [password]);

  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return true;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    setSuccessMessage("");

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    if (isCheckingUsername) {
      setError("Please wait while we verify your username availability.");
      return;
    }

    if (usernameAvailable !== true) {
      setError("Please choose a valid and available username.");
      return;
    }

    if (!allRulesPassed) {
      setError("Please meet all password requirements before signing up.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!agreeTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name,
        username,
        email,
        password,
        turnstileToken,
      });

      setSuccessMessage(response.data.message || "Registered successfully! Check your email to verify account.");
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred during account registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError("");
      if (!credentialResponse.credential) {
        setError("Google authentication failed.");
        return;
      }
      const response = await axios.post(`${API_URL}/auth/google`, {
        token: credentialResponse.credential,
        credential: credentialResponse.credential
      }, { withCredentials: true });

      login(response.data.user, response.data.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Google signup error:", err);
      setError(err.response?.data?.message || "Google authentication failed.");
    }
  };

  if (successMessage) {
    return (
      <AuthLayout activeTab="signup">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="auth-card"
          style={{ textAlign: 'center' }}
        >
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#34d399'
          }}>
            <MailCheck size={32} />
          </div>
          <h2 className="auth-card-title">Check Your Inbox</h2>
          <p className="auth-card-sub" style={{ marginTop: '0.5rem', lineHeight: 1.6 }}>
            We've sent a verification link to <strong style={{ color: '#34d399' }}>{email}</strong>. Please click the link to activate your FinMate account.
          </p>
          <div style={{
            marginTop: '1.25rem',
            padding: '1rem',
            background: 'rgba(2,6,23,0.6)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.78rem',
            color: '#94a3b8',
            textAlign: 'left'
          }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem' }}>Didn't receive the email?</div>
            <div>• Check your spam or junk folder</div>
            <div>• Ensure your email address was typed correctly</div>
          </div>
          <Link
            to="/login"
            className="auth-submit-btn"
            style={{ textDecoration: 'none', marginTop: '1.5rem' }}
          >
            <span>Proceed to Login</span>
            <ArrowRight size={18} className="auth-btn-arrow" />
          </Link>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout activeTab="signup">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3 }}
        className="auth-card"
      >
        <div className="auth-card-accent" />

        {/* Card Header */}
        <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
          <h2 className="auth-card-title">Create Your Account</h2>
          <p className="auth-card-sub">
            Manage money with confidence.
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
                background: 'rgba(159, 18, 57, 0.4)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                color: '#fecdd3',
                fontSize: '0.8rem',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0, color: '#f43f5e' }} />
                <span style={{ lineHeight: 1.4 }}>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Signup Form */}
        <form onSubmit={handleSubmit}>

          {/* Full Name */}
          <div className="auth-input-group">
            <label className="auth-input-label">Full Name</label>
            <div className="auth-input-wrapper">
              <User className="auth-input-icon" size={18} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="auth-input"
              />
            </div>
          </div>

          {/* Username */}
          <div className="auth-input-group">
            <label className="auth-input-label">Username</label>
            <div className="auth-input-wrapper">
              <User className="auth-input-icon" size={18} style={{ color: usernameAvailable === true ? '#34d399' : usernameAvailable === false ? '#f87171' : '' }} />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className={`auth-input ${usernameAvailable === false ? 'auth-input-error' : ''}`}
                style={{ paddingRight: '2.85rem' }}
              />
              <button
                type="button"
                onClick={handleGenerateUsername}
                className={`auth-generate-btn ${isCheckingUsername ? 'spinning' : ''}`}
                title="Auto-generate username"
                aria-label="Auto-generate username"
              >
                <Sparkles size={16} />
              </button>
            </div>
            {usernameMessage && (
              <div className={`auth-input-feedback ${usernameAvailable ? 'available' : 'taken'}`}>
                {usernameAvailable ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                <span>{usernameMessage}</span>
              </div>
            )}
          </div>

          {/* Email Address */}
          <div className="auth-input-group">
            <label className="auth-input-label">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail className="auth-input-icon" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="auth-input"
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-input-group">
            <label className="auth-input-label">Password</label>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                className="auth-input"
                style={{ fontFamily: 'monospace' }}
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

          {/* Confirm Password */}
          <div className="auth-input-group">
            <label className="auth-input-label">Confirm Password</label>
            <div className="auth-input-wrapper">
              <ShieldCheck className="auth-input-icon" size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className={`auth-input ${confirmPassword && !passwordsMatch ? 'auth-input-error' : ''}`}
                style={{ fontFamily: 'monospace' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="auth-toggle-btn"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={showConfirmPassword ? "hide" : "show"}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <span style={{ fontSize: '0.72rem', color: '#f43f5e', fontWeight: 600, marginTop: '2px' }}>
                Passwords do not match
              </span>
            )}
          </div>

          {/* Password Strength Indicator & Checklist */}
          {password && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="auth-strength-section"
            >
              <div className="auth-strength-header">
                <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                  Password Strength
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="auth-strength-track">
                <div
                  className="auth-strength-fill"
                  style={{
                    width: `${(passwordStrength.score / 5) * 100}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </div>

              {/* Rules Checklist */}
              <div className="auth-rules-grid">
                {passwordRules.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <div
                      key={rule.id}
                      className={`auth-rule-item ${passed ? 'auth-rule-pass' : 'auth-rule-fail'}`}
                    >
                      {passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      <span>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Terms & Conditions Checkbox with Animated SVG Checkmark */}
          <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
            <label className="auth-checkbox-label">
              <div
                onClick={() => setAgreeTerms(!agreeTerms)}
                className={`auth-custom-checkbox ${agreeTerms ? 'checked' : ''}`}
                style={{ marginTop: '2px' }}
              >
                {agreeTerms && (
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
              <span className="auth-checkbox-text" style={{ fontSize: '0.78rem', lineHeight: 1.4 }} onClick={() => setAgreeTerms(!agreeTerms)}>
                I agree to the{" "}
                <Link to="/terms" className="auth-link">Terms of Service</Link>{" "}
                and{" "}
                <Link to="/privacy" className="auth-link">Privacy Policy</Link>.
              </span>
            </label>
          </div>

          {/* Cloudflare Turnstile Verification */}
          <TurnstileWidget onVerify={setTurnstileToken} />

          {/* Submit Button */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting || !allRulesPassed || !passwordsMatch || !agreeTerms || !turnstileToken}
            className="auth-submit-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Free Account</span>
                <ArrowRight size={18} className="auth-btn-arrow" />
              </>
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">Or Sign Up With</span>
        </div>

        {/* Google OAuth Button & Demo Action */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <CustomGoogleButton
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google Sign Up failed. Please try again.")}
            text="Sign Up with Google"
          />

          <button
            type="button"
            onClick={() => setIsDemoOpen(true)}
            className="auth-demo-btn"
          >
            <Sparkles size={14} style={{ color: '#34d399' }} />
            <span>Try Demo Account (Instant Access)</span>
          </button>
        </div>

        {/* Card Footer Link */}
        <div className="auth-footer-text">
          Already have an account?{" "}
          <Link to="/login" className="auth-footer-link">
            Log in here <ArrowRight size={14} />
          </Link>
        </div>
      </motion.div>

      {/* Interactive Floating Demo Portal (Same as Landing Page) */}
      <FloatingDemo
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
      />
    </AuthLayout>
  );
}
