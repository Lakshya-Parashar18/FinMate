import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";
import "./VerifyEmail.css";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");
  const hasVerified = useRef(false); // Prevent double-fire in React Strict Mode

  useEffect(() => {
    const verify = async () => {
      if (hasVerified.current) return; // Skip if already called
      hasVerified.current = true;

      try {
        const response = await axios.get(`${API_URL}/auth/verify/${token}`);
        setStatus("success");
        setMessage(response.data.message);
      } catch (err) {
        setStatus("error");
        setMessage(err.response?.data?.message || "Verification failed. The link may be invalid or expired.");
      }
    };

    if (token) {
      verify();
    }
  }, [token]);

  return (
    <div className="verify-container">
      <div className="verify-card">
        {status === "verifying" && (
          <>
            <div className="verify-spinner"></div>
            <h2>Verifying your email...</h2>
            <p>Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="verify-icon success">✓</div>
            <h2>Email Verified!</h2>
            <p>{message}</p>
            <Link to="/login" className="verify-button">
              Continue to Login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="verify-icon error">✗</div>
            <h2>Verification Failed</h2>
            <p>{message}</p>
            <Link to="/signup" className="verify-button secondary">
              Try Signing Up Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
