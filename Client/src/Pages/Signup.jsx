import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import axios from "axios";
import { API_URL } from "../config";
import "./Signup.css";

const passwordRules = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "One number (0-9)", test: (p) => /[0-9]/.test(p) },
  { label: "One special character (!@#$...)", test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    const passed = passwordRules.filter((r) => r.test(password)).length;
    if (passed <= 1) return { score: 1, label: "Weak", color: "#ef4444" };
    if (passed <= 2) return { score: 2, label: "Fair", color: "#f97316" };
    if (passed <= 3) return { score: 3, label: "Good", color: "#eab308" };
    if (passed <= 4) return { score: 4, label: "Strong", color: "#22c55e" };
    return { score: 5, label: "Excellent", color: "#10b981" };
  }, [password]);

  const allRulesPassed = passwordRules.every((r) => r.test(password));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!allRulesPassed) {
      setError("Please meet all password requirements.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password,
      });

      setSuccessMessage(response.data.message || "Registered successfully! Check your email.");
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred during signup");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If registration was successful, show success screen
  if (successMessage) {
    return (
      <div className="signup-container">
        <div className="signup-form-container success-state">
          <div className="success-icon">✉️</div>
          <h2 className="signup-title" style={{ color: "#10b981" }}>Check Your Email!</h2>
          <p className="success-description">
            We've sent a verification link to <strong>{email}</strong>. 
            Click the link in the email to activate your account.
          </p>
          <p className="success-note">
            Didn't receive it? Check your spam folder or wait a minute.
          </p>
          <Link to="/login" className="signup-button" style={{ textDecoration: "none", display: "block", textAlign: "center" }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-container">
      <div className="signup-form-container">
        <h2 className="signup-title">Create Your Account</h2>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            className="signup-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            className="signup-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="signup-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {/* Password Strength Indicator */}
          {password && (
            <div className="password-strength-section">
              <div className="strength-bar-container">
                <div
                  className="strength-bar-fill"
                  style={{
                    width: `${(passwordStrength.score / 5) * 100}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </div>
              <span className="strength-label" style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </span>

              <ul className="password-rules">
                {passwordRules.map((rule, i) => (
                  <li key={i} className={rule.test(password) ? "rule-pass" : "rule-fail"}>
                    <span className="rule-icon">{rule.test(password) ? "✓" : "✗"}</span>
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            className="signup-button"
            disabled={isSubmitting || !allRulesPassed}
          >
            {isSubmitting ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="signup-link">
          Already have an account?{" "}
          <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}
