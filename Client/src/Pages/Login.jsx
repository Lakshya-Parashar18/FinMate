import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState(""); // "" | "sending" | "sent" | "error"
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setResendStatus("");

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      login(response.data.user, response.data.token);
      navigate("/dashboard", { replace: true });

    } catch (err) {
      const data = err.response?.data;
      if (data?.needsVerification) {
        setNeedsVerification(true);
        setError(data.message);
      } else {
        setError(data?.message || "Login failed. Please try again.");
      }
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
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

  return (
    <div className="login-container">
      <div className="login-form-container">
        <h2 className="login-title">Welcome Back</h2>

        {error && (
          <div className={`alert ${needsVerification ? 'alert-warning' : 'alert-error'}`}>
            {error}
            {needsVerification && resendStatus !== "sent" && (
              <button
                className="resend-button"
                onClick={handleResendVerification}
                disabled={resendStatus === "sending"}
              >
                {resendStatus === "sending" ? "Sending..." : "Resend Verification Email"}
              </button>
            )}
            {resendStatus === "sent" && (
              <p className="resend-success">✓ Verification email sent! Check your inbox.</p>
            )}
            {resendStatus === "error" && (
              <p className="resend-error">Failed to resend. Please try again later.</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email Address"
            className="login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="login-button">
            Log In
          </button>
        </form>

        <p className="login-link">
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </p>
      </div>
    </div>
  );
}
